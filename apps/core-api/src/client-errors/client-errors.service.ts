import { Injectable, Logger } from '@nestjs/common';
import type { ClientErrorEntryDto } from './dto/report-client-error.dto';

/**
 * In-memory sliding-window rate limiter.
 * Key = IP address, Value = array of timestamps within the window.
 */
interface RateLimitEntry {
  timestamps: number[];
}

@Injectable()
export class ClientErrorsService {
  private readonly logger = new Logger('ClientError');

  /** Max error reports per IP within the time window. */
  private readonly MAX_REPORTS_PER_WINDOW = 30;
  /** Sliding window duration in milliseconds (1 minute). */
  private readonly WINDOW_MS = 60_000;
  /** In-memory store; keys are IP addresses. */
  private readonly rateLimitMap = new Map<string, RateLimitEntry>();

  /**
   * Returns `true` if the IP is allowed (under rate limit), `false` otherwise.
   */
  checkRateLimit(ip: string): boolean {
    const now = Date.now();
    let entry = this.rateLimitMap.get(ip);

    if (!entry) {
      entry = { timestamps: [] };
      this.rateLimitMap.set(ip, entry);
    }

    // Prune timestamps outside the window.
    entry.timestamps = entry.timestamps.filter((t) => now - t < this.WINDOW_MS);

    if (entry.timestamps.length >= this.MAX_REPORTS_PER_WINDOW) {
      return false;
    }

    entry.timestamps.push(now);
    return true;
  }

  /**
   * Process a batch of client error entries, logging each one.
   */
  processBatch(
    errors: ClientErrorEntryDto[],
    meta: { ip: string; userId?: string },
  ): { accepted: number } {
    let accepted = 0;

    for (const entry of errors) {
      const severity = entry.severity ?? this.inferSeverity(entry);
      const logPayload = {
        source: entry.source,
        severity,
        message: entry.message,
        url: entry.url,
        stack: entry.stack?.slice(0, 4000),
        componentStack: entry.componentStack?.slice(0, 1000),
        userAgent: entry.userAgent,
        clientTimestamp: entry.timestamp,
        ip: meta.ip,
        userId: meta.userId ?? 'anonymous',
        metadata: entry.metadata,
      };

      const logLine = JSON.stringify(logPayload);

      switch (severity) {
        case 'critical':
        case 'high':
          this.logger.error(logLine);
          break;
        case 'medium':
          this.logger.warn(logLine);
          break;
        default:
          this.logger.log(logLine);
      }

      accepted++;
    }

    return { accepted };
  }

  /**
   * Infer severity from error characteristics when not explicitly provided.
   */
  private inferSeverity(entry: ClientErrorEntryDto): string {
    if (entry.source === 'react_error_boundary') return 'high';
    if (entry.source === 'unhandled_rejection') return 'medium';
    if (entry.source === 'network_error') return 'medium';
    if (entry.message.toLowerCase().includes('chunk')) return 'low'; // chunk load failures
    return 'medium';
  }
}

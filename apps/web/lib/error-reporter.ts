/**
 * Client-side error reporter — captures JS errors, unhandled rejections,
 * React Error Boundary crashes, network failures, and resource load errors.
 *
 * Features:
 *   • Batched reporting — flushes every 5 s or when buffer hits 10 entries.
 *   • Deduplication — same (message + source) won't be sent twice within 60 s.
 *   • Retry with exponential back-off (max 2 retries).
 *   • Uses `navigator.sendBeacon` on page unload for reliability.
 *   • Sends to `POST <CORE_URL>/client-errors` with `{ errors: [...] }`.
 *
 * This module is designed to be imported once from a client-side provider.
 */

import { getPublicCoreUrl } from '@/lib/public-config';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ErrorSource =
  | 'js_error'
  | 'unhandled_rejection'
  | 'react_error_boundary'
  | 'network_error'
  | 'resource_error';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface ClientErrorEntry {
  message: string;
  stack?: string;
  source: ErrorSource;
  severity?: Severity;
  componentStack?: string;
  url: string;
  timestamp: string;
  userAgent: string;
  metadata?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Configuration                                                      */
/* ------------------------------------------------------------------ */

const FLUSH_INTERVAL_MS = 5_000;
const MAX_BUFFER_SIZE = 10;
const DEDUP_WINDOW_MS = 60_000;
const MAX_RETRIES = 2;
const ENDPOINT = `${getPublicCoreUrl()}/client-errors`;

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

let buffer: ClientErrorEntry[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let installed = false;

/** Dedup map: fingerprint → last reported timestamp. */
const recentErrors = new Map<string, number>();

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fingerprint(entry: Pick<ClientErrorEntry, 'message' | 'source'>): string {
  return `${entry.source}::${entry.message.slice(0, 200)}`;
}

function isDuplicate(entry: ClientErrorEntry): boolean {
  const key = fingerprint(entry);
  const last = recentErrors.get(key);
  if (last && Date.now() - last < DEDUP_WINDOW_MS) return true;
  recentErrors.set(key, Date.now());
  return false;
}

/** Prune stale dedup entries every minute to prevent memory leaks. */
function pruneDedup() {
  const now = Date.now();
  for (const [key, ts] of recentErrors) {
    if (now - ts > DEDUP_WINDOW_MS) recentErrors.delete(key);
  }
}

/* ------------------------------------------------------------------ */
/*  Core                                                               */
/* ------------------------------------------------------------------ */

/**
 * Enqueue a single error entry. Automatically flushes when buffer is full.
 */
export function reportError(entry: ClientErrorEntry): void {
  if (isDuplicate(entry)) return;
  buffer.push(entry);
  if (buffer.length >= MAX_BUFFER_SIZE) flush();
}

/**
 * Convenience helper — build an entry from common parameters and enqueue it.
 */
export function captureError(
  message: string,
  source: ErrorSource,
  options: Partial<Omit<ClientErrorEntry, 'message' | 'source' | 'url' | 'timestamp' | 'userAgent'>> = {},
): void {
  reportError({
    message: message.slice(0, 2000),
    source,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    ...options,
    stack: options.stack?.slice(0, 8000),
    componentStack: options.componentStack?.slice(0, 1000),
  });
}

/**
 * Send buffered errors to the backend.
 */
async function flush(retryCount = 0): Promise<void> {
  if (buffer.length === 0) return;

  const batch = buffer.splice(0); // take all and clear

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ errors: batch }),
    });

    if (!res.ok && retryCount < MAX_RETRIES) {
      // Put entries back and schedule a retry with exponential back-off.
      buffer.unshift(...batch);
      const delay = 1000 * 2 ** retryCount;
      setTimeout(() => flush(retryCount + 1), delay);
    }
  } catch {
    // Network failure — retry if attempts remain.
    if (retryCount < MAX_RETRIES) {
      buffer.unshift(...batch);
      const delay = 1000 * 2 ** retryCount;
      setTimeout(() => flush(retryCount + 1), delay);
    }
    // Otherwise silently drop — we can't report errors about reporting errors.
  }
}

/**
 * Use `sendBeacon` for a best-effort flush when the tab is closing.
 */
function beaconFlush(): void {
  if (buffer.length === 0) return;
  const batch = buffer.splice(0);
  try {
    navigator.sendBeacon(ENDPOINT, JSON.stringify({ errors: batch }));
  } catch {
    // Best effort — nothing we can do here.
  }
}

/* ------------------------------------------------------------------ */
/*  Global listeners                                                   */
/* ------------------------------------------------------------------ */

/**
 * Install global error listeners. Safe to call multiple times — only installs once.
 */
export function installGlobalErrorHandlers(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  // 1. Uncaught JS errors
  window.addEventListener('error', (event: ErrorEvent) => {
    // Ignore resource load errors (handled separately below).
    if (event.target && event.target !== window) return;

    captureError(event.message || 'Unknown JS error', 'js_error', {
      stack: event.error?.stack,
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  // 2. Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === 'string'
          ? reason
          : 'Unhandled promise rejection';
    const stack = reason instanceof Error ? reason.stack : undefined;

    captureError(message, 'unhandled_rejection', { stack });
  });

  // 3. Resource load failures (images, scripts, stylesheets)
  window.addEventListener(
    'error',
    (event: Event) => {
      const target = event.target as unknown;
      if (!target || target === window) return; // Handled by ErrorEvent listener above.
      if (!(target instanceof HTMLImageElement || target instanceof HTMLScriptElement || target instanceof HTMLLinkElement)) {
        return;
      }

      const resourceUrl =
        (target as HTMLImageElement | HTMLScriptElement).src ??
        (target as HTMLLinkElement).href ??
        'unknown';

      captureError(`Resource failed to load: ${resourceUrl}`, 'resource_error', {
        severity: 'low',
        metadata: {
          tagName: target.tagName,
          resourceUrl,
        },
      });
    },
    true, // capture phase to catch resource errors
  );

  // 4. Flush on page unload
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') beaconFlush();
  });
  window.addEventListener('pagehide', beaconFlush);

  // 5. Periodic flush
  flushTimer = setInterval(() => {
    flush();
    pruneDedup();
  }, FLUSH_INTERVAL_MS);
}

/**
 * Tear down listeners and flush remaining errors. Useful for testing.
 */
export function uninstallGlobalErrorHandlers(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  flush();
  installed = false;
}

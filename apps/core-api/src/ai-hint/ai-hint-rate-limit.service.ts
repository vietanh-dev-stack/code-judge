import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type IORedis from 'ioredis';
import { EnvKeys } from '../common';
import { REDIS_CONNECTION } from '../queues/tokens';

const KEY_PREFIX = 'ai-hint';
const WINDOW_SECONDS = 3600;

@Injectable()
export class AiHintRateLimitService {
  private readonly logger = new Logger(AiHintRateLimitService.name);

  constructor(
    @Inject(REDIS_CONNECTION) private readonly redis: IORedis,
    private readonly config: ConfigService,
  ) {}

  private getMaxPerHour(): number {
    const raw = this.config.get<string>(EnvKeys.AI_HINT_MAX_PER_PROBLEM_PER_HOUR);
    const parsed = raw ? Number.parseInt(raw, 10) : 10;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
  }

  private buildKey(userId: string, problemId: string): string {
    return `${KEY_PREFIX}:${userId}:${problemId}`;
  }

  /** Increments counter and throws 429 if over limit within the hour window. */
  async assertWithinLimit(userId: string, problemId: string): Promise<void> {
    const key = this.buildKey(userId, problemId);
    const max = this.getMaxPerHour();

    try {
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.expire(key, WINDOW_SECONDS);
      }
      if (count > max) {
        throw new HttpException(
          `Bạn đã dùng tối đa ${max} gợi ý AI cho bài này trong 1 giờ. Hãy thử tự suy nghĩ thêm hoặc quay lại sau.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.warn(
        `Redis rate limit unavailable for ${key}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}

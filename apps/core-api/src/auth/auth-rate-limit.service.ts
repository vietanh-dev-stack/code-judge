import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type IORedis from 'ioredis';
import { EnvKeys } from '../common';
import { REDIS_CONNECTION } from '../queues/tokens';

const PREFIX = 'auth';

@Injectable()
export class AuthRateLimitService {
  private readonly logger = new Logger(AuthRateLimitService.name);

  constructor(
    @Inject(REDIS_CONNECTION) private readonly redis: IORedis,
    private readonly config: ConfigService,
  ) {}

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private getLoginMaxAttempts(): number {
    const raw = this.config.get<string>(EnvKeys.AUTH_LOGIN_MAX_ATTEMPTS);
    const parsed = raw ? Number.parseInt(raw, 10) : 10;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
  }

  private getLoginWindowSeconds(): number {
    const raw = this.config.get<string>(EnvKeys.AUTH_LOGIN_WINDOW_SECONDS);
    const parsed = raw ? Number.parseInt(raw, 10) : 900;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 900;
  }

  private getRegisterMaxPerIp(): number {
    const raw = this.config.get<string>(EnvKeys.AUTH_REGISTER_MAX_PER_IP);
    const parsed = raw ? Number.parseInt(raw, 10) : 5;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
  }

  private getRegisterWindowSeconds(): number {
    const raw = this.config.get<string>(EnvKeys.AUTH_REGISTER_WINDOW_SECONDS);
    const parsed = raw ? Number.parseInt(raw, 10) : 3600;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 3600;
  }

  async assertLoginAllowed(ip: string, email: string): Promise<void> {
    const max = this.getLoginMaxAttempts();
    const emailKey = `${PREFIX}:login:email:${this.normalizeEmail(email)}`;
    const ipKey = `${PREFIX}:login:ip:${ip}`;

    try {
      const [emailCount, ipCount] = await Promise.all([
        this.redis.get(emailKey),
        this.redis.get(ipKey),
      ]);
      if (Number(emailCount) >= max || Number(ipCount) >= max) {
        this.throwTooManyAttempts();
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logRedisUnavailable('assertLoginAllowed', error);
    }
  }

  async recordLoginFailure(ip: string, email: string): Promise<void> {
    const window = this.getLoginWindowSeconds();
    const emailKey = `${PREFIX}:login:email:${this.normalizeEmail(email)}`;
    const ipKey = `${PREFIX}:login:ip:${ip}`;

    try {
      await Promise.all([
        this.incrWithExpire(emailKey, window),
        this.incrWithExpire(ipKey, window),
      ]);
    } catch (error) {
      this.logRedisUnavailable('recordLoginFailure', error);
    }
  }

  async recordLoginSuccess(ip: string, email: string): Promise<void> {
    const emailKey = `${PREFIX}:login:email:${this.normalizeEmail(email)}`;
    try {
      await this.redis.del(emailKey);
    } catch (error) {
      this.logRedisUnavailable('recordLoginSuccess', error);
    }
  }

  async assertRegisterAllowed(ip: string): Promise<void> {
    const max = this.getRegisterMaxPerIp();
    const window = this.getRegisterWindowSeconds();
    const key = `${PREFIX}:register:ip:${ip}`;

    try {
      const count = await this.incrWithExpire(key, window);
      if (count > max) {
        this.throwTooManyAttempts();
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logRedisUnavailable('assertRegisterAllowed', error);
    }
  }

  private async incrWithExpire(key: string, windowSeconds: number): Promise<number> {
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, windowSeconds);
    }
    return count;
  }

  private throwTooManyAttempts(): never {
    throw new HttpException(
      'Quá nhiều lần thử. Vui lòng đợi vài phút rồi thử lại.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private logRedisUnavailable(op: string, error: unknown): void {
    this.logger.warn(
      `${op}: Redis rate limit unavailable — ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

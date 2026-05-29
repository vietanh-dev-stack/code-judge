/**
 * AUTH-F-01
 */
import { HttpException, HttpStatus } from '@nestjs/common';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { EnvKeys } from '../common';

describe('AuthRateLimitService', () => {
  let redis: { get: jest.Mock; incr: jest.Mock; expire: jest.Mock; del: jest.Mock };
  let config: { get: jest.Mock };
  let service: AuthRateLimitService;

  beforeEach(() => {
    redis = {
      get: jest.fn(),
      incr: jest.fn(),
      expire: jest.fn(),
      del: jest.fn(),
    };
    config = {
      get: jest.fn((key: string) => {
        if (key === EnvKeys.AUTH_LOGIN_MAX_ATTEMPTS) return '3';
        if (key === EnvKeys.AUTH_LOGIN_WINDOW_SECONDS) return '900';
        if (key === EnvKeys.AUTH_REGISTER_MAX_PER_IP) return '2';
        if (key === EnvKeys.AUTH_REGISTER_WINDOW_SECONDS) return '3600';
        return undefined;
      }),
    };
    service = new AuthRateLimitService(redis as any, config as any);
  });

  it('AUTH-F-01: blocks login when email attempt count exceeds max', async () => {
    redis.get.mockResolvedValueOnce('3').mockResolvedValueOnce('0');

    await expect(service.assertLoginAllowed('1.2.3.4', 'user@test.com')).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
  });

  it('AUTH-F-01: blocks register when IP exceeds max', async () => {
    redis.incr.mockResolvedValue(3);

    await expect(service.assertRegisterAllowed('1.2.3.4')).rejects.toBeInstanceOf(HttpException);
  });

  it('allows login when under threshold', async () => {
    redis.get.mockResolvedValue('1');
    await expect(service.assertLoginAllowed('1.2.3.4', 'user@test.com')).resolves.toBeUndefined();
  });
});

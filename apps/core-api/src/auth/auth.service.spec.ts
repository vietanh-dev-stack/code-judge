/**
 * Maps to SYSTEM-TEST-SCENARIOS: SEC-AUTH-02, SEC-AUTH-03
 */
import { UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { EnvKeys } from '../common';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const refreshSecret = 'test-refresh-secret';
  const jwtSecret = 'test-jwt-secret';

  let prisma: { user: { findUnique: jest.Mock; update: jest.Mock } };
  let jwt: { verify: jest.Mock; sign: jest.Mock; signAsync: jest.Mock };
  let config: { get: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn() },
    };
    jwt = {
      verify: jest.fn(),
      sign: jest.fn().mockReturnValue('signed-token'),
      signAsync: jest.fn().mockResolvedValue('signed-token'),
    };
    config = {
      get: jest.fn((key: string) => {
        if (key === EnvKeys.JWT_REFRESH_SECRET) return refreshSecret;
        if (key === EnvKeys.JWT_SECRET) return jwtSecret;
        if (key === EnvKeys.JWT_REFRESH_EXPIRES_IN) return '604800';
        return undefined;
      }),
    };
    service = new AuthService(prisma as any, jwt as any, config as any);
  });

  it('SEC-AUTH-02: rejects invalid or expired refresh token', async () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('jwt expired');
    });
    await expect(service.refresh('bad-token')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('SEC-AUTH-03: rejects refresh when user is inactive (locked)', async () => {
    jwt.verify.mockReturnValue({ sub: 'user-1', role: Role.CLIENT });
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'x@test.com',
      role: Role.CLIENT,
      isActive: false,
    });

    await expect(service.refresh('valid-jwt')).rejects.toThrow(UnauthorizedException);
  });

  it('SEC-AUTH-03: issues new pair when user is active', async () => {
    jwt.verify.mockReturnValue({ sub: 'user-1', role: Role.CLIENT });
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'x@test.com',
      role: Role.CLIENT,
      isActive: true,
    });

    const pair = await service.refresh('valid-jwt');
    expect(pair.accessToken).toBe('signed-token');
    expect(pair.refreshToken).toBe('signed-token');
    expect(jwt.signAsync).toHaveBeenCalled();
  });
});

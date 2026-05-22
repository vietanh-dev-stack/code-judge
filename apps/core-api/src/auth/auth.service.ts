/**
 * Auth service: register, login (email/password), Google OAuth, token pair (access + refresh).
 *
 * Flow:
 *  1. Register → hash password → create user (role=CLIENT, emailVerified=false, isActive=true)
 *               → issue stateless JWT pair.
 *  2. Login    → check isActive → verify password → update lastLoginAt → issue pair.
 *  3. Refresh  → verify refresh JWT signature/expiry → load user → check isActive → issue pair.
 *  4. Google   → find-or-create user + OAuthAccount → issue pair.
 *
 * NOTE: RefreshToken model was removed from Prisma schema.
 *       Refresh tokens are now stateless JWTs stored only in HttpOnly cookies.
 *       To revoke all sessions for a user, rotate JWT_REFRESH_SECRET.
 */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, type User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EnvKeys, hashPassword, validatePasswordPolicy, verifyPassword } from '../common';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

/** Shape returned by Google Passport strategy → `request.user`. */
export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  image: string | null;
}

/** Token pair returned to the client. */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
}

@Injectable()
export class AuthService {
  /** Refresh token secret (separate from access token secret). */
  private readonly refreshSecret: string;
  /** Refresh token expiry in seconds. Default: 7 days. */
  private readonly refreshExpiresIn: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    this.refreshSecret =
      this.config.get<string>(EnvKeys.JWT_REFRESH_SECRET) ??
      this.config.get<string>(EnvKeys.JWT_SECRET)! + '-refresh';

    const rawExpiry = this.config.get<string>(EnvKeys.JWT_REFRESH_EXPIRES_IN);
    this.refreshExpiresIn =
      rawExpiry && !Number.isNaN(Number(rawExpiry)) ? Number(rawExpiry) : 604800;
  }

  // ---------------------------------------------------------------------------
  // Register
  // ---------------------------------------------------------------------------

  async register(name: string, email: string, password: string): Promise<TokenPair> {
    validatePasswordPolicy(password);
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email đã được sử dụng');
    }

    const passwordHash = await hashPassword(password);

    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: Role.CLIENT,
        emailVerified: false,
        isActive: true,
      },
    });

    return this.issueTokenPair(user);
  }

  // ---------------------------------------------------------------------------
  // Login (email + password)
  // ---------------------------------------------------------------------------

  async login(email: string, password: string): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị khoá. Vui lòng liên hệ quản trị viên');
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    // Update last login (fire & forget)
    this.prisma.user
      .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
      .catch(() => {
        /* best effort */
      });

    return this.issueTokenPair(user);
  }

  // ---------------------------------------------------------------------------
  // Refresh token (stateless JWT — no DB lookup)
  // ---------------------------------------------------------------------------

  async refresh(refreshToken: string): Promise<TokenPair> {
    // 1. Verify JWT signature + expiry
    let payload: JwtPayload;
    try {
      payload = this.jwt.verify<JwtPayload>(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    // Defensive: Prisma `findUnique` requires a defined unique field.
    // If refresh token was minted by an older version or different config,
    // `sub` may be missing and would otherwise cause a 500.
    if (!payload?.sub || typeof payload.sub !== 'string') {
      throw new UnauthorizedException('Refresh token không hợp lệ (thiếu subject)');
    }

    // 2. Load user & check still active
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị khoá');
    }

    return this.issueTokenPair(user);
  }

  // ---------------------------------------------------------------------------
  // Google OAuth — find or create
  // ---------------------------------------------------------------------------

  async googleLogin(profile: GoogleProfile): Promise<TokenPair> {
    const { googleId, email, name, image } = profile;

    // Check if OAuth link already exists
    const oauthAccount = await this.prisma.oAuthAccount.findUnique({
      where: { provider_providerUserId: { provider: 'google', providerUserId: googleId } },
      include: { user: true },
    });

    if (oauthAccount) {
      let existingUser = oauthAccount.user;
      if (!existingUser.isActive) {
        throw new UnauthorizedException('Tài khoản đã bị khoá. Vui lòng liên hệ quản trị viên');
      }
      // Cập nhật ảnh Google khi chưa upload MinIO (imageObjectKey)
      if (!existingUser.imageObjectKey && image) {
        existingUser = await this.prisma.user.update({
          where: { id: existingUser.id },
          data: { image, lastLoginAt: new Date() },
        });
      } else {
        this.prisma.user
          .update({ where: { id: existingUser.id }, data: { lastLoginAt: new Date() } })
          .catch(() => {
            /* best effort */
          });
      }
      return this.issueTokenPair(existingUser);
    }

    // Check if email already used (email/password account → link Google)
    let user = await this.prisma.user.findUnique({ where: { email } });

    if (user) {
      if (!user.isActive) {
        throw new UnauthorizedException('Tài khoản đã bị khoá. Vui lòng liên hệ quản trị viên');
      }
      // Link Google OAuth to existing account
      await this.prisma.oAuthAccount.create({
        data: {
          userId: user.id,
          provider: 'google',
          providerUserId: googleId,
        },
      });
      if (!user.imageObjectKey && image && !user.image) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { image },
        });
      }
    } else {
      // Create brand new user + OAuth link in a single transaction
      user = await this.prisma.user.create({
        data: {
          name,
          email,
          image,
          role: Role.CLIENT,
          emailVerified: true, // Google email is verified
          isActive: true,
          oauthAccounts: {
            create: { provider: 'google', providerUserId: googleId },
          },
        },
      });
    }

    // Update lastLoginAt (fire & forget)
    this.prisma.user
      .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
      .catch(() => {
        /* best effort */
      });

    return this.issueTokenPair(user);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) {
      throw new BadRequestException(
        'Tài khoản đăng nhập bằng Google — không thể đổi mật khẩu tại đây',
      );
    }

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng');
    }

    validatePasswordPolicy(newPassword);
    const passwordHash = await hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { success: true };
  }

  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /**
   * Issue stateless access + refresh JWT pair.
   * RefreshToken is NOT stored in the database — it is a signed JWT kept
   * exclusively in an HttpOnly cookie. To revoke all sessions for a user,
   * rotate JWT_REFRESH_SECRET in the environment.
   */
  private async issueTokenPair(user: Pick<User, 'id' | 'email' | 'role'>): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload),
      this.jwt.signAsync(payload, {
        secret: this.refreshSecret,
        expiresIn: this.refreshExpiresIn,
      }),
    ]);

    return { accessToken, refreshToken, tokenType: 'Bearer' };
  }
}

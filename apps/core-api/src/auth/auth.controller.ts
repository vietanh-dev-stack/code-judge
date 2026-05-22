/**
 * Auth controller: register, login, refresh, Google OAuth, me, logout.
 *
 * Routes:
 *  POST /auth/register        — public, tạo tài khoản email/password.
 *  POST /auth/login           — public, đăng nhập email/password.
 *  POST /auth/refresh         — public, đổi refresh token (cookie) lấy cặp mới.
 *  GET  /auth/google          — public, redirect sang Google consent.
 *  GET  /auth/google/callback — public, Google gọi lại, set cookie, redirect frontend.
 *  GET  /auth/me              — protected (JWT), trả thông tin user hiện tại.
 *  POST /auth/logout          — public, xoá cookie refreshToken.
 */
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, getClientIp } from '../common';
import type { RequestUser } from '../common/interfaces/request-user.interface';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { AuthService, type GoogleProfile } from './auth.service';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

/** Cookie options shared across set/clear. */
const COOKIE_OPTS = (secure: boolean, domain?: string) => {
  // Cùng registrable domain (COOKIE_DOMAIN=.example.com): dùng Lax — Chrome chặn cookie SameSite=None
  // giữa subdomain (coi như third-party). Chỉ dùng None khi API và web là domain khác hẳn.
  const sameSite = secure ? (domain ? ('lax' as const) : ('none' as const)) : ('lax' as const);
  const base = {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
  };
  return domain ? ({ ...base, domain } as const) : base;
};

/** Lấy origin frontend đầu tiên (FRONTEND_URL có thể là danh sách phân tách bằng dấu phẩy). */
function primaryFrontendUrl(raw: string | undefined): string {
  return (raw ?? 'http://localhost:3001').split(',')[0]?.trim() || 'http://localhost:3001';
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly isProduction: boolean;
  private readonly cookieDomain: string | undefined;

  constructor(
    private readonly auth: AuthService,
    private readonly authRateLimit: AuthRateLimitService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {
    this.isProduction = process.env.NODE_ENV === 'production';
    const domain = this.config.get<string>('COOKIE_DOMAIN')?.trim();
    this.cookieDomain = domain || undefined;
  }

  private cookieOpts() {
    return COOKIE_OPTS(this.isProduction, this.cookieDomain);
  }

  // ---------------------------------------------------------------------------
  // Email / Password
  // ---------------------------------------------------------------------------

  @Public()
  @ApiOperation({ summary: 'Đăng ký tài khoản mới' })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authRateLimit.assertRegisterAllowed(getClientIp(req));
    const tokens = await this.auth.register(dto.name, dto.email, dto.password);
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return { success: true };
  }

  @Public()
  @ApiOperation({ summary: 'Đăng nhập email/password' })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = getClientIp(req);
    await this.authRateLimit.assertLoginAllowed(ip, dto.email);
    try {
      const tokens = await this.auth.login(dto.email, dto.password);
      await this.authRateLimit.recordLoginSuccess(ip, dto.email);
      this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
      return { success: true };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        await this.authRateLimit.recordLoginFailure(ip, dto.email);
      }
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Refresh
  // ---------------------------------------------------------------------------

  @Public()
  @ApiOperation({ summary: 'Đổi refresh token (cookie) lấy cặp access + refresh mới' })
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refreshToken as string | undefined;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token không tìm thấy trong cookie');
    }
    const tokens = await this.auth.refresh(refreshToken);
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Google OAuth
  // ---------------------------------------------------------------------------

  @Public()
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Redirect sang Google consent screen' })
  @Get('google')
  google() {
    // Guard sẽ redirect — method body không chạy.
  }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google callback — set cookie, redirect frontend' })
  @Get('google/callback')
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const profile = req.user as unknown as GoogleProfile;

    const tokens = await this.auth.googleLogin(profile);

    // Set HttpOnly refresh token and access token cookies
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    const frontendUrl = primaryFrontendUrl(this.config.get<string>('FRONTEND_URL'));

    // NO accessToken in URL
    res.redirect(`${frontendUrl}/auth/callback`);
  }

  // ---------------------------------------------------------------------------
  // Me (protected)
  // ---------------------------------------------------------------------------

  @ApiOperation({ summary: 'Đổi mật khẩu (tài khoản email/password)' })
  @Post('change-password')
  changePassword(@CurrentUser() requestUser: RequestUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(requestUser.userId, dto.currentPassword, dto.newPassword);
  }

  @ApiOperation({ summary: 'Trả thông tin user đang đăng nhập' })
  @Get('me')
  me(@CurrentUser() requestUser: RequestUser) {
    return this.users.findPublicById(requestUser.userId);
  }

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------

  @Public()
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    const opts = this.cookieOpts();

    res.clearCookie('refreshToken', opts);
    res.clearCookie('accessToken', opts);

    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Internal Helpers
  // ---------------------------------------------------------------------------

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const opts = this.cookieOpts();

    // Refresh token (7 days)
    res.cookie('refreshToken', refreshToken, {
      ...opts,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Access token (15 mins - khớp với cấu hình JWT)
    res.cookie('accessToken', accessToken, {
      ...opts,
      maxAge: 15 * 60 * 1000,
    });
  }
}

/**
 * Đọc Bearer token, verify chữ ký, gọi `validate` → gán `request.user` (`RequestUser`).
 * Tên strategy `'jwt'` khớp `AuthGuard('jwt')`.
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { EnvKeys } from '../../common';
import type { RequestUser } from '../../common/interfaces/request-user.interface';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = config.get<string>(EnvKeys.JWT_SECRET);
    if (!secret) {
      throw new Error(`${EnvKeys.JWT_SECRET} is required for JWT authentication`);
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req.cookies?.accessToken || null,
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Payload đã được verify; check user vẫn tồn tại và isActive.
   * Nếu user bị lock giữa chừng, accessToken sẽ bị từ chối ngay lập tức.
   */
  async validate(payload: JwtPayload): Promise<RequestUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, isActive: true, role: true, email: true },
    });

    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị khoá. Vui lòng liên hệ quản trị viên');
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
  }
}

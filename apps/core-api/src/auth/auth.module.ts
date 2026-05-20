/**
 * Auth module: JWT + Google OAuth.
 *
 * - `JwtAuthGuard` (global): mọi route cần JWT, trừ `@Public()`.
 * - `RolesGuard` (global): kiểm `@Roles(...)` nếu có.
 * - `GoogleStrategy`: passport-google-oauth20.
 * - `JwtStrategy`: passport-jwt (Bearer token).
 *
 * Export `AuthService` / `JwtModule` để module khác tái sử dụng ký token.
 */
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { EnvKeys } from '../common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>(EnvKeys.JWT_SECRET);
        if (!secret) {
          throw new Error(`${EnvKeys.JWT_SECRET} is required`);
        }
        const expiresRaw = config.get<string>(EnvKeys.JWT_EXPIRES_IN);
        /** Access token expiry in seconds; default 15 minutes. */
        const expiresIn = expiresRaw !== undefined && expiresRaw !== '' ? Number(expiresRaw) : 900;
        if (Number.isNaN(expiresIn) || expiresIn <= 0) {
          throw new Error(`${EnvKeys.JWT_EXPIRES_IN} must be a positive number (seconds)`);
        }
        return {
          secret,
          signOptions: { expiresIn },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    GoogleStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}

/**
 * Guard cho Google OAuth flow — kích hoạt Passport `google` strategy.
 * Dùng trên GET /auth/google (redirect) và GET /auth/google/callback.
 */
import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    return {
      prompt: 'select_account',
    };
  }
}

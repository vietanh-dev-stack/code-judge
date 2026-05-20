/**
 * Passport Google OAuth 2.0 strategy.
 *
 * Xử lý redirect → Google consent → callback với profile.
 * `validate()` trả data gắn vào `request.user` cho controller.
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { EnvKeys } from '../../common';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    const clientID = config.get<string>(EnvKeys.GOOGLE_CLIENT_ID);
    const clientSecret = config.get<string>(EnvKeys.GOOGLE_CLIENT_SECRET);
    const callbackURL =
      config.get<string>(EnvKeys.GOOGLE_CALLBACK_URL) ??
      'http://localhost:3000/auth/google/callback';

    if (!clientID || !clientSecret) {
      throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required');
    }

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    });
  }

  /** Profile Google đã xác thực → gắn vào `request.user`. */
  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: {
      id: string;
      displayName: string;
      emails?: Array<{ value: string; verified: boolean }>;
      photos?: Array<{ value: string }>;
    },
    done: VerifyCallback,
  ): void {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error('Google account has no email'), undefined);
      return;
    }

    const user = {
      googleId: profile.id,
      email,
      name: profile.displayName,
      image: profile.photos?.[0]?.value ?? null,
    };

    done(null, user as unknown as Express.User);
  }
}

import { verify } from 'jsonwebtoken';
import type { Request } from 'express';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

export function parseCookieHeader(header: string | undefined): Record<string, string> {
  if (!header?.trim()) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Verify HttpOnly accessToken from Express cookies or raw Cookie header (e.g. Socket handshake).
 */
export function verifyAccessTokenCookie(
  req: Pick<Request, 'cookies' | 'headers'> | { cookies?: { accessToken?: string }; headers?: { cookie?: string } },
  secret: string,
): JwtPayload | null {
  const headerCookies = parseCookieHeader(
    typeof req.headers?.cookie === 'string' ? req.headers.cookie : undefined,
  );
  const token = req.cookies?.accessToken ?? headerCookies.accessToken;
  if (!token) {
    return null;
  }
  try {
    const payload = verify(token, secret) as JwtPayload;
    if (!payload?.sub || typeof payload.sub !== 'string') {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

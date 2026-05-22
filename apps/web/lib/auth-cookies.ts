import type { NextRequest, NextResponse } from 'next/server';

/** Decode JWT payload (no signature verify — Edge middleware only). */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(jsonPayload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** True when `exp` is missing or in the past (invalid / rotated secret still decodes). */
export function isJwtExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  if (typeof exp !== 'number') return true;
  return exp * 1000 < Date.now();
}

/**
 * Domain for clearing HttpOnly cookies set by API with COOKIE_DOMAIN (e.g. `.code-judge.io.vn`).
 * Prefer NEXT_PUBLIC_COOKIE_DOMAIN; fallback infers parent domain on multi-label hosts.
 */
export function resolveCookieDomain(hostname: string): string | undefined {
  const fromEnv = process.env.NEXT_PUBLIC_COOKIE_DOMAIN?.trim();
  if (fromEnv) return fromEnv;

  if (hostname === 'localhost' || hostname.endsWith('.local')) return undefined;

  const parts = hostname.split('.');
  if (parts.length <= 2) return undefined;

  const base =
    parts.length > 3 && parts[0] === 'www' ? parts.slice(1).join('.') : hostname;
  return base.includes('.') ? `.${base}` : undefined;
}

/** Clear auth cookies (host-only + shared domain) so stale tokens stop redirect loops. */
export function clearAuthCookies(
  response: NextResponse,
  request: NextRequest,
): void {
  const domain = resolveCookieDomain(request.nextUrl.hostname);
  const domains = new Set<string | undefined>([undefined, domain]);

  for (const d of domains) {
    if (d) {
      response.cookies.delete({ name: 'refreshToken', path: '/', domain: d });
      response.cookies.delete({ name: 'accessToken', path: '/', domain: d });
    } else {
      response.cookies.delete('refreshToken');
      response.cookies.delete('accessToken');
    }
  }
}

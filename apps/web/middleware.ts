import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  clearAuthCookies,
  decodeJwtPayload,
  isJwtExpired,
} from '@/lib/auth-cookies';

const PUBLIC_PATHS = new Set(['/', '/login', '/register', '/locked']);

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname);
}

async function trySilentRefresh(
  apiBaseUrl: string,
  refreshToken: string,
): Promise<{ ok: true; setCookieHeaders: string[] } | { ok: false }> {
  try {
    const res = await fetch(`${apiBaseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refreshToken=${refreshToken}` },
    });

    if (!res.ok) return { ok: false };

    const setCookieHeaders =
      typeof res.headers.getSetCookie === 'function'
        ? res.headers.getSetCookie()
        : ([res.headers.get('set-cookie')].filter(Boolean) as string[]);

    return { ok: true, setCookieHeaders };
  } catch (error) {
    console.error('Middleware silent refresh failed:', error);
    return { ok: false };
  }
}

function applySetCookies(response: NextResponse, setCookieHeaders: string[]): void {
  setCookieHeaders.forEach((cookieStr) => {
    response.headers.append('Set-Cookie', cookieStr);
  });
}

function buildRefreshedNextResponse(
  request: NextRequest,
  setCookieHeaders: string[],
  refreshToken: string,
): NextResponse | null {
  let newAccessToken = '';
  let newRefreshToken = refreshToken;

  setCookieHeaders.forEach((str) => {
    if (str.startsWith('accessToken=')) {
      newAccessToken = str.split(';')[0].split('=')[1];
    }
    if (str.startsWith('refreshToken=')) {
      newRefreshToken = str.split(';')[0].split('=')[1];
    }
  });

  if (!newAccessToken) return null;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('Cookie', `accessToken=${newAccessToken}; refreshToken=${newRefreshToken}`);

  const finalResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });
  applySetCookies(finalResponse, setCookieHeaders);
  return finalResponse;
}

export async function middleware(request: NextRequest) {
  const refreshToken = request.cookies.get('refreshToken')?.value;
  const accessToken = request.cookies.get('accessToken')?.value;
  const { pathname } = request.nextUrl;
  const apiBaseUrl = process.env.NEXT_PUBLIC_CORE_URL || 'http://localhost:3000';

  // ─── No refresh cookie ───────────────────────────────────────────────────
  if (!refreshToken) {
    if (isPublicPath(pathname)) {
      return NextResponse.next();
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // Stale refresh (expired) or missing access — call API (handles rotated JWT_REFRESH_SECRET).
  const needsRefresh = !accessToken || isJwtExpired(accessToken);
  let sessionValid = !needsRefresh;

  if (needsRefresh) {
    const refreshed = await trySilentRefresh(apiBaseUrl, refreshToken);
    if (refreshed.ok) {
      const nextRes = buildRefreshedNextResponse(request, refreshed.setCookieHeaders, refreshToken);
      if (nextRes) return nextRes;
      sessionValid = true;
    } else {
      sessionValid = false;
    }
  }

  // Invalid session: clear cookies so /login does not bounce back to /dashboard.
  if (!sessionValid) {
    if (isPublicPath(pathname)) {
      const response = NextResponse.next();
      clearAuthCookies(response, request);
      return response;
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('sessionExpired', '1');
    const response = NextResponse.redirect(loginUrl);
    clearAuthCookies(response, request);
    return response;
  }

  const decodedToken = decodeJwtPayload(refreshToken);
  const userRole = (decodedToken?.role as string) || 'CLIENT';

  if (pathname === '/login' || pathname === '/register') {
    if (userRole === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (pathname.startsWith('/admin') && userRole !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

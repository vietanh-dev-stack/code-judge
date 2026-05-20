/**
 * HTTP client for Core API: cookie session (`accessToken` / `refreshToken` HttpOnly),
 * refresh on 401, envelope unwrap. JWT is read from cookies by the backend, not Bearer.
 */

import { getPublicCoreUrl } from '@/lib/public-config';

const BASE_URL = getPublicCoreUrl();

let refreshPromise: Promise<boolean> | null = null;

/** Exchange refresh cookie for a new pair (sets cookies on success). Used after 401 and OAuth callback. */
export async function tryRefresh(): Promise<boolean> {
  // Nếu đang ở server và không có window, việc fetch này thường sẽ không có cookies trừ khi được truyền vào
  // Tuy nhiên, middleware đã xử lý refresh cho Server Components, nên ta chủ yếu chạy ở client.
  if (typeof window === 'undefined') return false;

  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export function getApiBaseUrl(): string {
  return BASE_URL;
}

export interface ApiError {
  code: number;
  message: string;
}

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiError,
    /** Đường dẫn API (không gồm BASE_URL), ví dụ `/storage/presign/upload` */
    public readonly path?: string,
  ) {
    super(body.message);
    this.name = 'ApiRequestError';
  }
}

interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

/**
 * Wrapper around `fetch` with auto-auth and retry on 401.
 * Returns the unwrapped `result` from the API envelope.
 */
export async function apiFetch<T = unknown>(path: string, options: FetchOptions = {}): Promise<T> {
  const doFetch = async (): Promise<Response> => {
    const headers = new Headers(options.headers);
    if (!headers.has('Content-Type') && options.body) {
      headers.set('Content-Type', 'application/json');
    }

    return fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      credentials: 'include',
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  };

  let res = await doFetch();

  if (res.status === 401) {
    // Nếu đang ở client, chúng ta có thể thử refresh
    // Nếu đang ở server, tryRefresh thường sẽ thất bại trừ khi ta truyền headers thủ công (đã xử lý ở middleware)
    const refreshed = await tryRefresh();
    if (refreshed) {
      // Quan trọng: Khi retry trên client, chúng ta không được gửi header Cookie cũ
      // Browser sẽ tự động đính kèm cookies mới từ Set-Cookie của tryRefresh
      if (typeof window !== 'undefined' && options.headers) {
        const newHeaders = new Headers(options.headers);
        newHeaders.delete('Cookie');
        options.headers = Object.fromEntries(newHeaders.entries());
      }
      res = await doFetch();
    }
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const errorBody: ApiError = {
      code: res.status,
      message: data?.message ?? res.statusText,
    };

    // If account is locked, force redirect to locked page
    if (typeof window !== 'undefined' && res.status === 401 && errorBody.message.includes('khoá')) {
      if (window.location.pathname !== '/locked') {
        window.location.href = '/locked';
      }
      // Return a promise that never resolves to stop execution of the caller
      return new Promise(() => {});
    }

    throw new ApiRequestError(res.status, errorBody, path);
  }

  return (data?.result ?? data) as T;
}
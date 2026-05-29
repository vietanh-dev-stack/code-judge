import { ApiRequestError } from '@/services/api-client';

/**
 * Trích message lỗi từ API envelope hoặc Error — dùng chung admin/dashboard.
 */
export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof ApiRequestError) {
    const msg = error.body.message?.trim();
    return msg || fallback;
  }
  if (error instanceof Error) {
    const msg = error.message?.trim();
    if (msg) return msg;
  }
  if (error && typeof error === 'object' && 'body' in error) {
    const body = (error as { body?: { message?: unknown } }).body;
    if (typeof body?.message === 'string') {
      const msg = body.message.trim();
      if (msg) return msg;
    }
  }
  return fallback;
}

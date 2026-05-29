import type { Request } from 'express';

/** Client IP — respects `trust proxy` when behind nginx. */
export function getClientIp(req: Pick<Request, 'ip' | 'headers' | 'socket'>): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return String(forwarded[0]).trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

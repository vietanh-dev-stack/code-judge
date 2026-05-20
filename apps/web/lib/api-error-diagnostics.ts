import { ApiRequestError, getApiBaseUrl } from '@/services/api-client';

/** Nhóm lỗi để log / hiển thị gợi ý sửa. */
export type ApiErrorCategory =
  | 'AUTH_SESSION'
  | 'AUTH_FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'SERVER'
  | 'NETWORK'
  | 'UNKNOWN';

export interface ApiErrorDiagnostics {
  category: ApiErrorCategory;
  /** Tiêu đề ngắn cho UI */
  title: string;
  /** Mô tả cho người dùng */
  userMessage: string;
  /** Gợi ý kỹ thuật (dev / copy log) */
  fixHint: string;
  httpStatus?: number;
  apiPath?: string;
  coreUrl: string;
  rawMessage: string;
}

function normalizePath(path: string): string {
  const q = path.indexOf('?');
  return q >= 0 ? path.slice(0, q) : path;
}

/**
 * Phân loại lỗi gọi Core API (401 cookie, 404, CORS, v.v.) để hiển thị hoặc `console.error` có cấu trúc.
 */
export function diagnoseApiError(
  error: unknown,
  context?: { operation?: string; path?: string },
): ApiErrorDiagnostics {
  const coreUrl = getApiBaseUrl();
  const op = context?.operation ?? 'API';

  if (error instanceof ApiRequestError) {
    const path = error.path ?? context?.path ?? '';
    const p = normalizePath(path);
    const msg = (error.body?.message ?? error.message ?? '').toString();
    const s = error.status;

    if (s === 401) {
      const isStorage = p.includes('/storage/');
      return {
        category: 'AUTH_SESSION',
        title: 'Chưa đăng nhập hoặc phiên hết hạn',
        userMessage: isStorage
          ? 'Không thể lấy URL upload: server từ chối (401). Cookie đăng nhập (accessToken) không hợp lệ hoặc đã hết hạn.'
          : `${op}: server trả 401 — cần đăng nhập lại hoặc làm mới phiên.`,
        fixHint: [
          `Kiểm tra NEXT_PUBLIC_CORE_URL=${coreUrl} trùng port Core API.`,
          'DevTools → Application → Cookies → host của API: có accessToken / refreshToken?',
          'Đăng nhập qua cùng origin API để cookie được set (web :3001, API :3000 + CORS FRONTEND_URL).',
          'Thử đăng xuất và đăng nhập lại.',
        ].join(' '),
        httpStatus: s,
        apiPath: path || undefined,
        coreUrl,
        rawMessage: msg,
      };
    }

    if (s === 403) {
      return {
        category: 'AUTH_FORBIDDEN',
        title: 'Không đủ quyền',
        userMessage: msg || 'Server từ chối thao tác (403).',
        fixHint: 'Kiểm tra đúng tài khoản sở hữu resource (submission, file, …).',
        httpStatus: s,
        apiPath: path || undefined,
        coreUrl,
        rawMessage: msg,
      };
    }

    if (s === 404) {
      return {
        category: 'NOT_FOUND',
        title: 'Không tìm thấy',
        userMessage: msg || 'Tài nguyên không tồn tại (404).',
        fixHint:
          p.includes('/storage/presign') && msg.toLowerCase().includes('submission')
            ? 'Presign submission-source yêu cầu bản ghi Submission đã tồn tại và trùng user — không dùng UUID client trước khi create.'
            : 'Kiểm tra id trong URL / body.',
        httpStatus: s,
        apiPath: path || undefined,
        coreUrl,
        rawMessage: msg,
      };
    }

    if (s === 400 || s === 422) {
      return {
        category: 'VALIDATION',
        title: 'Dữ liệu không hợp lệ',
        userMessage: msg || `Lỗi validate (${s}).`,
        fixHint: 'Đọc message từ server; kiểm tra DTO / field bắt buộc.',
        httpStatus: s,
        apiPath: path || undefined,
        coreUrl,
        rawMessage: msg,
      };
    }

    if (s >= 500) {
      return {
        category: 'SERVER',
        title: 'Lỗi máy chủ',
        userMessage: msg || `Server lỗi (${s}).`,
        fixHint: 'Xem log core-api và stack trace.',
        httpStatus: s,
        apiPath: path || undefined,
        coreUrl,
        rawMessage: msg,
      };
    }

    return {
      category: 'UNKNOWN',
      title: `Lỗi HTTP ${s}`,
      userMessage: msg || `Yêu cầu thất bại (${s}).`,
      fixHint: 'Mở tab Network xem response body đầy đủ.',
      httpStatus: s,
      apiPath: path || undefined,
      coreUrl,
      rawMessage: msg,
    };
  }

  if (error instanceof TypeError && String((error as Error).message).includes('fetch')) {
    return {
      category: 'NETWORK',
      title: 'Không kết nối được API',
      userMessage: 'Trình duyệt không gọi được Core API (mạng, CORS, hoặc sai URL).',
      fixHint: `BASE_URL hiện tại: ${coreUrl}. Kiểm tra core-api đã chạy và NEXT_PUBLIC_CORE_URL.`,
      coreUrl,
      rawMessage: (error as Error).message,
    };
  }

  const fallback = error instanceof Error ? error.message : String(error);
  return {
    category: 'UNKNOWN',
    title: 'Lỗi không xác định',
    userMessage: fallback,
    fixHint: context?.operation
      ? `Thao tác: ${context.operation}. Gắn breakpoint và xem stack.`
      : 'Kiểm tra console và Network.',
    coreUrl,
    rawMessage: fallback,
  };
}

/** Log có cấu trúc cho DevTools — tìm prefix `[api-error]`. */
export function logApiErrorDiagnostics(d: ApiErrorDiagnostics, extra?: Record<string, unknown>) {
  console.error('[api-error]', {
    category: d.category,
    httpStatus: d.httpStatus,
    apiPath: d.apiPath,
    coreUrl: d.coreUrl,
    title: d.title,
    userMessage: d.userMessage,
    fixHint: d.fixHint,
    rawMessage: d.rawMessage,
    ...extra,
  });
}

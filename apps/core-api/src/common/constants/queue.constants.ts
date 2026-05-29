/**
 * Hằng số liên quan tới hàng đợi BullMQ.
 *
 * Giữ tên queue ở một nơi để Core API và Worker luôn khớp nhau
 * (Worker hiện khai báo lại cùng giá trị trong `apps/worker/src/lib/constants.ts`).
 * Tên không được chứa `:` (giới hạn BullMQ).
 */
export const JUDGE_SUBMISSIONS_QUEUE_NAME = 'judge-submissions' as const;

/** Queue chạy verify testcase với golden (worker xử lý — phải trùng `apps/worker/src/lib/constants.ts`). */
export const GOLDEN_VERIFY_QUEUE_NAME = 'golden-verify' as const;

/** Đo và gợi ý time/memory limit từ golden — worker xử lý. */
export const CALIBRATE_LIMITS_QUEUE_NAME = 'calibrate-limits' as const;

/** Xuất báo cáo contest (XLSX) — worker chạy trong core-api. */
export const REPORT_EXPORT_QUEUE_NAME = 'report-export' as const;

/**
 * Số lần BullMQ thử chạy job chấm (1 lần chạy + retry).
 * Giữ khớp `JUDGE_JOB_MAX_ATTEMPTS` trong `apps/worker/src/lib/constants.ts`.
 */
export const JUDGE_JOB_MAX_ATTEMPTS = 3;

export const REPORT_EXPORT_JOB_ATTEMPTS = 3;

/** PENDING quá thời gian này sẽ được đánh FAILED hoặc re-queue khi API khởi động. */
export const REPORT_EXPORT_STALE_PENDING_MS = 60 * 60 * 1000;

/** Object export trên MinIO giữ tối đa (cron xóa file cũ hơn). */
export const REPORT_EXPORT_RETENTION_MS = 24 * 60 * 60 * 1000;

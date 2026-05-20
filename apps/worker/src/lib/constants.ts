/**
 * Hằng số dùng chung trong worker.
 *
 * QUAN TRỌNG: `JUDGE_SUBMISSIONS_QUEUE_NAME` phải trùng với
 * `apps/core-api/src/common/constants/queue.constants.ts` — nếu lệch, job sẽ không được consume.
 */
export const JUDGE_SUBMISSIONS_QUEUE_NAME = 'judge-submissions' as const;

/** Phải trùng `apps/core-api/src/common/constants/queue.constants.ts`. */
export const GOLDEN_VERIFY_QUEUE_NAME = 'golden-verify' as const;

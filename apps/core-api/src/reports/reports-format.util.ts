import type { SubmissionContext } from '@prisma/client';

/** Nhãn ngữ cảnh nộp bài trên báo cáo. */
export function formatSubmissionContextLabel(context: SubmissionContext | string): string {
  const map: Record<string, string> = {
    PRACTICE: 'Luyện tập (Problem)',
    CONTEST: 'Kỳ thi (Contest)',
    CLASS_ASSIGNMENT: 'Giao bài lớp (Class assignment)',
  };
  return map[context] ?? String(context);
}

/** Nhãn trạng thái submission hiển thị trên báo cáo (tiếng Việt). */
export function formatSubmissionStatusLabel(status: string): string {
  const map: Record<string, string> = {
    Accepted: 'Đạt (Accepted)',
    Wrong: 'Sai (Wrong Answer)',
    RuntimeError: 'Lỗi runtime',
    Error: 'Lỗi hệ thống',
    CompilationError: 'Lỗi biên dịch',
    TimeLimitExceeded: 'Quá thời gian',
    MemoryLimitExceeded: 'Quá bộ nhớ',
    Pending: 'Đang chấm (Pending)',
    Running: 'Đang chấm (Running)',
  };
  return map[status] ?? status;
}

export function formatDifficultyLabel(difficulty: string): string {
  const map: Record<string, string> = {
    EASY: 'Dễ',
    MEDIUM: 'Trung bình',
    HARD: 'Khó',
  };
  return map[difficulty] ?? difficulty;
}

export function formatContestStatusLabel(status: string): string {
  const map: Record<string, string> = {
    DRAFT: 'Nháp',
    PUBLISHED: 'Đã công bố',
    RUNNING: 'Đang diễn ra',
    ENDED: 'Đã kết thúc',
  };
  return map[status] ?? status;
}

export type ReportAuthor = { name: string; email: string };

export function formatReportAuthor(author?: ReportAuthor | null): string | undefined {
  if (!author) return undefined;
  return author.name ? `${author.name} (${author.email})` : author.email;
}

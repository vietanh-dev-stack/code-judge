import type { SubmissionContext } from '@prisma/client';
import {
  formatSubmissionContextLabel,
  formatSubmissionStatusLabel,
} from './reports-format.util';

/** Một dòng submission trên báo cáo (đã loại dry-run). */
export type SubmissionAttemptDetail = {
  id: string;
  userId: string;
  userName: string;
  email: string;
  problemTitle: string;
  submittedAt: Date;
  status: string;
  score: number | null;
  context: SubmissionContext;
  contestId: string | null;
  contestTitle: string | null;
  classAssignmentId: string | null;
  classAssignmentTitle: string | null;
};

export type SubmissionAttemptsTableOptions = {
  /** Chỉ báo cáo lớp (giáo viên / chủ lớp). */
  includeClassAssignment: boolean;
  /** Ẩn cột tên bài khi báo cáo chỉ một problem. Mặc định hiện. */
  hideProblemTitle?: boolean;
};

export function mapSubmissionAttemptsTableRows(
  attempts: SubmissionAttemptDetail[],
  options: SubmissionAttemptsTableOptions,
) {
  return attempts.map((a, i) => {
    const row: Record<string, string | number> = {
      stt: i + 1,
      name: a.userName,
      email: a.email,
      submittedAt: a.submittedAt.toISOString(),
      statusLabel: formatSubmissionStatusLabel(a.status),
      score: a.score ?? '—',
      contextLabel: formatSubmissionContextLabel(a.context),
      contestName: a.contestTitle ?? '—',
    };
    if (!options.hideProblemTitle) {
      row.problemTitle = a.problemTitle;
    }
    if (options.includeClassAssignment) {
      row.classAssignment =
        a.classAssignmentTitle ??
        (a.classAssignmentId ? a.classAssignmentId : '—');
    }
    return row;
  });
}

export function submissionAttemptsTableColumns(options: SubmissionAttemptsTableOptions) {
  const cols: Array<{
    key: string;
    header: string;
    width: number;
    align?: 'center';
    format?: 'datetime';
  }> = [
    { key: 'stt', header: 'STT', width: 6, align: 'center' },
    { key: 'name', header: 'Họ và tên', width: 24 },
    { key: 'email', header: 'Email', width: 28 },
  ];
  if (!options.hideProblemTitle) {
    cols.push({ key: 'problemTitle', header: 'Câu hỏi / Bài', width: 28 });
  }
  cols.push(
    { key: 'submittedAt', header: 'Thời gian nộp', width: 22, format: 'datetime' },
    { key: 'statusLabel', header: 'Trạng thái', width: 22 },
    { key: 'score', header: 'Điểm', width: 10, align: 'center' },
    { key: 'contextLabel', header: 'Loại nộp', width: 22 },
    { key: 'contestName', header: 'Contest', width: 28 },
  );
  if (options.includeClassAssignment) {
    cols.push({ key: 'classAssignment', header: 'Giao bài lớp', width: 32 });
  }
  return cols;
}

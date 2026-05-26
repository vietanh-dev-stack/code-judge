import type {
  ProfessionalReportSheet,
  ReportContextBlock,
} from '../common/utils/excel-professional-report';
import {
  formatContestStatusLabel,
  formatDifficultyLabel,
  formatSubmissionStatusLabel,
  type ReportAuthor,
} from './reports-format.util';
import type { SubmissionAttemptDetail } from './reports-submission-detail';
import {
  mapSubmissionAttemptsTableRows,
  submissionAttemptsTableColumns,
} from './reports-submission-detail';
import {
  buildClassroomEntityInfo,
  buildContestEntityInfo,
  buildProblemEntityInfoForAdmin,
  buildProblemEntityInfoForClass,
  buildReportSheetContext,
} from './reports-entity-info';

export type ProblemStudentRow = {
  userId: string;
  name: string;
  email: string;
  attempted: boolean;
  solved: boolean;
  attempts: number;
  bestStatus: string;
  bestScore: number | null;
  lastSubmittedAt: string | null;
};

export type ProblemClassStats = {
  classRoomId: string;
  className: string;
  classCode: string;
  problemId: string;
  problemTitle: string;
  difficulty: string;
  totalStudents: number;
  attemptedCount: number;
  solvedCount: number;
  passRateAttemptedPct: number;
  passRateEnrolledPct: number;
  students: ProblemStudentRow[];
  /** Submission thử bài của chủ lớp / giáo viên — sheet riêng, không vào KPI học viên. */
  staffActivity: ProblemStudentRow[];
  submissionAttempts: SubmissionAttemptDetail[];
  staffSubmissionAttempts: SubmissionAttemptDetail[];
};

function submissionAttemptsTable(
  attempts: SubmissionAttemptDetail[],
  includeClassAssignment: boolean,
  sectionTitle: string,
  hideProblemTitle = false,
) {
  if (attempts.length === 0) {
    return null;
  }
  const tableOpts = { includeClassAssignment, hideProblemTitle };
  return {
    sectionTitle,
    columns: submissionAttemptsTableColumns(tableOpts),
    rows: mapSubmissionAttemptsTableRows(attempts, tableOpts),
  };
}

const STUDENT_DETAIL_TABLE = {
  sectionTitle: 'Chi tiết theo học viên',
  statusColumnKey: 'statusLabel' as const,
  columns: [
    { key: 'stt', header: 'STT', width: 6, align: 'center' as const },
    { key: 'name', header: 'Họ và tên', width: 28 },
    { key: 'email', header: 'Email', width: 32 },
    { key: 'attempted', header: 'Đã nộp', width: 10, align: 'center' as const },
    { key: 'solved', header: 'Đạt', width: 10, align: 'center' as const },
    { key: 'attempts', header: 'Số lần nộp', width: 12, align: 'center' as const },
    { key: 'statusLabel', header: 'Kết quả tốt nhất', width: 22 },
    { key: 'bestScore', header: 'Điểm', width: 10, align: 'center' as const },
    { key: 'lastSubmittedAt', header: 'Lần nộp cuối', width: 22, format: 'datetime' as const },
  ],
};

function mapStudentRows(students: ProblemStudentRow[]) {
  return students.map((s, i) => ({
    stt: i + 1,
    name: s.name,
    email: s.email,
    attempted: s.attempted ? 'Có' : 'Không',
    solved: s.solved ? 'Có' : 'Không',
    attempts: s.attempts,
    statusLabel: s.attempted ? formatSubmissionStatusLabel(s.bestStatus) : 'Chưa nộp',
    bestScore: s.bestScore ?? '—',
    lastSubmittedAt: s.lastSubmittedAt,
  }));
}

export function buildProblemReportDocument(
  stats: ProblemClassStats,
  author?: ReportAuthor | null,
  generatedAt: Date = new Date(),
): ProfessionalReportSheet[] {
  const notAttempted = stats.totalStudents - stats.attemptedCount;

  const problemEntity = buildProblemEntityInfoForClass(stats);

  return [
    {
      tabName: 'Báo cáo bài tập',
      context: buildReportSheetContext({
        reportType: 'BÁO CÁO KẾT QUẢ BÀI TẬP',
        title: stats.problemTitle,
        subtitle: `${stats.className} (${stats.classCode})`,
        entityInfo: problemEntity,
        generatedAt,
        generatedBy: author,
        kpis: [
          { label: 'Tổng học viên', value: stats.totalStudents },
          { label: 'Đã nộp bài', value: stats.attemptedCount },
          { label: 'Đạt (Accepted)', value: stats.solvedCount },
          { label: 'Chưa nộp', value: notAttempted },
          { label: 'Pass rate (đã nộp)', value: `${stats.passRateAttemptedPct}%` },
          { label: 'Pass rate (cả lớp)', value: `${stats.passRateEnrolledPct}%` },
        ],
      }),
      tables: [
        {
          ...STUDENT_DETAIL_TABLE,
          rows: mapStudentRows(stats.students),
        },
        ...(() => {
          const t = submissionAttemptsTable(
            stats.submissionAttempts,
            true,
            'Chi tiết từng lần nộp (học viên)',
            true,
          );
          return t ? [t] : [];
        })(),
      ],
    },
    ...(stats.staffActivity.length > 0
      ? [
          {
            tabName: 'Giáo viên (tham khảo)',
            context: buildReportSheetContext({
              reportType: 'BÁO CÁO KẾT QUẢ BÀI TẬP',
              title: stats.problemTitle,
              subtitle: 'Giáo viên / chủ lớp (tham khảo)',
              entityInfo: {
                ...problemEntity,
                note: 'Chỉ tham khảo khi giáo viên tự thử bài. Không tính vào KPI học viên.',
              },
              generatedAt,
              generatedBy: author,
            }),
            tables: [
              {
                ...STUDENT_DETAIL_TABLE,
                sectionTitle: 'Chủ lớp & giáo viên (OWNER)',
                rows: mapStudentRows(stats.staffActivity),
              },
              ...(() => {
                const t = submissionAttemptsTable(
                  stats.staffSubmissionAttempts,
                  true,
                  'Chi tiết từng lần nộp (giáo viên)',
                  true,
                );
                return t ? [t] : [];
              })(),
            ],
          } satisfies ProfessionalReportSheet,
        ]
      : []),
  ];
}

export type ContestReportRosterMode = 'classroom' | 'public';

export function buildContestReportDocument(
  contest: { id: string; title: string; startAt: Date; endAt: Date },
  submissionAttempts: SubmissionAttemptDetail[],
  leaderboard: Array<{
    userName: string;
    userId: string;
    solvedCount: number;
    totalScore: number;
    totalPenalty: number;
    problems: Array<{
      problemTitle: string;
      isSolved: boolean;
      attempts: number;
      points: number;
    }>;
  }>,
  author?: ReportAuthor | null,
  generatedAt: Date = new Date(),
  options?: {
    scopeNote?: string;
    rosterMode?: ContestReportRosterMode;
  },
): ProfessionalReportSheet[] {
  const scopeNote = options?.scopeNote;
  const rosterMode = options?.rosterMode ?? 'public';
  const problemTitles = leaderboard[0]?.problems.map((p) => p.problemTitle) ?? [];
  const totalParticipants = leaderboard.length;
  const totalSolved = leaderboard.reduce((s, r) => s + r.solvedCount, 0);
  const submittedCount = leaderboard.filter((r) =>
    r.problems.some((p) => p.attempts > 0),
  ).length;

  const passRateRows = problemTitles.map((title, idx) => {
    const withAttempts = leaderboard.filter((r) => r.problems[idx]?.attempts > 0).length;
    const solved = leaderboard.filter((r) => r.problems[idx]?.isSolved).length;
    const rate = withAttempts > 0 ? Math.round((solved / withAttempts) * 100) : 0;
    return {
      stt: idx + 1,
      problem: title,
      submitted: withAttempts,
      accepted: solved,
      passRate: rate,
    };
  });

  const rankRows = leaderboard.map((row, index) => ({
    rank: index + 1,
    name: row.userName,
    userId: row.userId,
    solved: row.solvedCount,
    score: row.totalScore,
    penaltyMin: Math.floor(row.totalPenalty / 60000),
  }));

  const detailColumns = [
    { key: 'name', header: 'Họ và tên', width: 24 },
    ...problemTitles.flatMap((t, idx) => [
      {
        key: `p${idx}_pts`,
        header: `${t} — Điểm`,
        width: 14,
        align: 'center' as const,
      },
      {
        key: `p${idx}_att`,
        header: `${t} — Lần nộp`,
        width: 12,
        align: 'center' as const,
      },
    ]),
  ];

  const detailRows = leaderboard.map((row) => {
    const rec: Record<string, string | number> = { name: row.userName };
    row.problems.forEach((p, idx) => {
      rec[`p${idx}_pts`] = p.isSolved ? p.points : 0;
      rec[`p${idx}_att`] = p.attempts;
    });
    return rec;
  });

  const contestEntity = buildContestEntityInfo(contest, {
    problemCount: problemTitles.length,
    scopeNote,
    rosterMode,
  });

  const contestContextBase = (subtitle: string, kpis?: ReportContextBlock['kpis']) =>
    buildReportSheetContext({
      reportType: 'BÁO CÁO KỲ THI (CONTEST)',
      title: contest.title,
      subtitle,
      entityInfo: contestEntity,
      generatedAt,
      generatedBy: author,
      kpis,
    });

  return [
    {
      tabName: 'Tổng quan',
      context: contestContextBase('Thống kê điểm, xếp hạng và pass rate', [
        rosterMode === 'classroom'
          ? { label: 'Học viên trong lớp', value: totalParticipants }
          : { label: 'Thí sinh tham gia', value: totalParticipants },
        ...(rosterMode === 'classroom'
          ? [{ label: 'Đã nộp bài', value: submittedCount }]
          : []),
        { label: 'Tổng bài đã giải (Accepted)', value: totalSolved },
        { label: 'Tổng lần nộp', value: submissionAttempts.length },
      ]),
      tables: [
        {
          sectionTitle: 'Pass rate theo từng câu hỏi',
          columns: [
            { key: 'stt', header: 'STT', width: 6, align: 'center' },
            { key: 'problem', header: 'Câu hỏi', width: 36 },
            { key: 'submitted', header: 'Đã nộp', width: 12, align: 'center' },
            { key: 'accepted', header: 'Accepted', width: 12, align: 'center' },
            { key: 'passRate', header: 'Pass rate', width: 12, align: 'center', format: 'percent' },
          ],
          rows: passRateRows,
        },
        {
          sectionTitle: 'Bảng xếp hạng',
          columns: [
            { key: 'rank', header: 'Hạng', width: 8, align: 'center' },
            { key: 'name', header: 'Thí sinh', width: 28 },
            { key: 'userId', header: 'Mã người dùng', width: 38 },
            { key: 'solved', header: 'Bài đúng', width: 12, align: 'center' },
            { key: 'score', header: 'Tổng điểm', width: 12, align: 'center' },
            { key: 'penaltyMin', header: 'Penalty (phút)', width: 14, align: 'center' },
          ],
          rows: rankRows,
        },
      ],
    },
    ...(submissionAttempts.length > 0
      ? [
          {
            tabName: 'Chi tiết lần nộp',
            context: contestContextBase('Chi tiết từng lần nộp'),
            tables: [
              submissionAttemptsTable(
                submissionAttempts,
                false,
                'Danh sách submission',
              )!,
            ],
          } satisfies ProfessionalReportSheet,
        ]
      : []),
    {
      tabName: 'Ma trận điểm',
      context: contestContextBase('Ma trận điểm theo thí sinh × câu hỏi'),
      tables: [
        {
          sectionTitle: 'Chi tiết điểm & lần nộp',
          columns: detailColumns,
          rows: detailRows,
        },
      ],
    },
  ];
}

export type AdminProblemStats = {
  problemId: string;
  problemTitle: string;
  slug: string;
  difficulty: string;
  visibility: string;
  /** Khớp dashboard Top Problems — tổng số bản ghi Submission. */
  totalSubmissionRows: number;
  contestSubmissionRows: number;
  practiceSubmissionRows: number;
  classAssignmentSubmissionRows: number;
  submissionAttempts: SubmissionAttemptDetail[];
  totalParticipants: number;
  attemptedCount: number;
  solvedCount: number;
  acceptedRows: number;
  passRateAttemptedPct: number;
  passRateOnTotalRowsPct: number;
  participants: ProblemStudentRow[];
};

export function buildAdminProblemReportDocument(
  stats: AdminProblemStats,
  author?: ReportAuthor | null,
  generatedAt: Date = new Date(),
): ProfessionalReportSheet[] {
  return [
    {
      tabName: 'Tổng quan (Admin)',
      context: buildReportSheetContext({
        reportType: 'BÁO CÁO BÀI TẬP (ADMIN)',
        title: stats.problemTitle,
        subtitle: 'Khu vực quản trị hệ thống',
        entityInfo: buildProblemEntityInfoForAdmin(stats),
        generatedAt,
        generatedBy: author,
        kpis: [
          { label: 'Tổng lần nộp', value: stats.totalSubmissionRows },
          { label: 'Trong contest', value: stats.contestSubmissionRows },
          { label: 'Giao bài lớp', value: stats.classAssignmentSubmissionRows },
          { label: 'Luyện tập (không contest)', value: stats.practiceSubmissionRows },
          { label: 'Số người dùng', value: stats.totalParticipants },
          { label: 'AC trên tổng dòng', value: `${stats.passRateOnTotalRowsPct}%` },
        ],
      }),
      tables: [
        {
          ...STUDENT_DETAIL_TABLE,
          sectionTitle: 'Tổng hợp theo người dùng',
          rows: mapStudentRows(stats.participants),
        },
        ...(() => {
          const t = submissionAttemptsTable(
            stats.submissionAttempts,
            false,
            'Chi tiết từng lần nộp',
            true,
          );
          return t ? [t] : [];
        })(),
      ],
    },
  ];
}

/** @deprecated */
export type AdminPublicProblemStats = AdminProblemStats;

export function buildAdminPublicProblemReportDocument(
  stats: AdminProblemStats,
  author?: ReportAuthor | null,
  generatedAt?: Date,
): ProfessionalReportSheet[] {
  return buildAdminProblemReportDocument(stats, author, generatedAt);
}

export function buildClassroomReportDocument(
  data: {
    className: string;
    classCode: string;
    academicYear: string | null;
    studentCount: number;
    problemSummaries: Array<{
      title: string;
      difficulty: string;
      attempted: number;
      solved: number;
      passRatePct: number;
    }>;
    contestSummaries: Array<{
      title: string;
      status: string;
      participants: number;
      submitted: number;
      startAt: string;
      endAt: string;
    }>;
    dataScopeNote?: string;
  },
  author?: ReportAuthor | null,
  generatedAt: Date = new Date(),
): ProfessionalReportSheet[] {
  const totalProblems = data.problemSummaries.length;
  const avgPass =
    totalProblems > 0
      ? Math.round(
          data.problemSummaries.reduce((s, p) => s + p.passRatePct, 0) / totalProblems,
        )
      : 0;

  return [
    {
      tabName: 'Tổng quan lớp',
      context: buildReportSheetContext({
        reportType: 'BÁO CÁO TỔNG HỢP LỚP HỌC',
        title: data.className,
        subtitle: data.classCode,
        entityInfo: buildClassroomEntityInfo({
          className: data.className,
          classCode: data.classCode,
          academicYear: data.academicYear,
          studentCount: data.studentCount,
          problemCount: data.problemSummaries.length,
          contestCount: data.contestSummaries.length,
          dataScopeNote: data.dataScopeNote,
        }),
        generatedAt,
        generatedBy: author,
        kpis: [
          { label: 'Học viên', value: data.studentCount },
          { label: 'Bài tập', value: data.problemSummaries.length },
          { label: 'Contest', value: data.contestSummaries.length },
          { label: 'Pass rate TB (bài tập)', value: `${avgPass}%` },
        ],
      }),
      tables: [
        {
          sectionTitle: 'Thống kê bài tập (classwork)',
          columns: [
            { key: 'stt', header: 'STT', width: 6, align: 'center' },
            { key: 'title', header: 'Bài tập', width: 40 },
            { key: 'difficulty', header: 'Độ khó', width: 14, align: 'center' },
            { key: 'attempted', header: 'Đã nộp', width: 12, align: 'center' },
            { key: 'solved', header: 'Accepted', width: 12, align: 'center' },
            { key: 'passRate', header: 'Pass rate', width: 12, align: 'center', format: 'percent' },
          ],
          rows: data.problemSummaries.map((p, i) => ({
            stt: i + 1,
            title: p.title,
            difficulty: formatDifficultyLabel(p.difficulty),
            attempted: p.attempted,
            solved: p.solved,
            passRate: p.passRatePct,
          })),
        },
        {
          sectionTitle: 'Thống kê contest',
          columns: [
            { key: 'stt', header: 'STT', width: 6, align: 'center' },
            { key: 'title', header: 'Contest', width: 36 },
            { key: 'status', header: 'Trạng thái', width: 16, align: 'center' },
            { key: 'participants', header: 'Đăng ký', width: 12, align: 'center' },
            { key: 'submitted', header: 'Đã nộp', width: 12, align: 'center' },
            { key: 'startAt', header: 'Bắt đầu', width: 22, format: 'datetime' },
            { key: 'endAt', header: 'Kết thúc', width: 22, format: 'datetime' },
          ],
          rows: data.contestSummaries.map((c, i) => ({
            stt: i + 1,
            title: c.title,
            status: formatContestStatusLabel(c.status),
            participants: c.participants,
            submitted: c.submitted,
            startAt: c.startAt,
            endAt: c.endAt,
          })),
        },
      ],
    },
  ];
}

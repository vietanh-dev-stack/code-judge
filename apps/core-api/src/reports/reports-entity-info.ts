import type { ReportContextBlock, ReportEntityInfoForm } from '../common/utils/excel-professional-report';
import { formatContestStatusLabel, formatDifficultyLabel, formatReportAuthor, type ReportAuthor } from './reports-format.util';

export function buildProblemEntityInfoForClass(stats: {
  problemTitle: string;
  problemId: string;
  difficulty: string;
  className: string;
  classCode: string;
}): ReportEntityInfoForm {
  return {
    sectionTitle: 'THÔNG TIN BÀI TẬP',
    fields: [
      { label: 'Tên bài', value: stats.problemTitle },
      { label: 'Mã bài (Problem ID)', value: stats.problemId },
      { label: 'Độ khó', value: formatDifficultyLabel(stats.difficulty) },
      { label: 'Lớp học', value: stats.className },
      { label: 'Mã lớp', value: stats.classCode },
      {
        label: 'Phạm vi thống kê',
        value: 'Học viên (MEMBER); không gồm chủ lớp / giáo viên',
      },
    ],
    note: 'Submission: luyện tập / giao bài lớp trong phạm vi lớp. Không contest, không dry-run.',
  };
}

export function buildProblemEntityInfoForAdmin(stats: {
  problemTitle: string;
  slug: string;
  problemId: string;
  difficulty: string;
  visibility: string;
}): ReportEntityInfoForm {
  return {
    sectionTitle: 'THÔNG TIN BÀI TẬP',
    fields: [
      { label: 'Tên bài', value: stats.problemTitle },
      { label: 'Slug', value: stats.slug },
      { label: 'Problem ID', value: stats.problemId },
      { label: 'Độ khó', value: formatDifficultyLabel(stats.difficulty) },
      { label: 'Hiển thị (Visibility)', value: stats.visibility },
      {
        label: 'Phạm vi dữ liệu',
        value: 'Toàn hệ thống (admin); không dry-run',
      },
    ],
    note: 'Gồm luyện tập, contest và giao bài lớp trên bài này.',
  };
}

export function buildContestEntityInfo(
  contest: { id: string; title: string; startAt: Date; endAt: Date },
  options?: {
    problemCount?: number;
    scopeNote?: string;
    status?: string;
    rosterMode?: 'classroom' | 'public';
  },
): ReportEntityInfoForm {
  const fields: ReportEntityInfoForm['fields'] = [
    { label: 'Tên contest', value: contest.title },
    { label: 'Mã contest', value: contest.id },
    { label: 'Bắt đầu', value: contest.startAt.toLocaleString('vi-VN') },
    { label: 'Kết thúc', value: contest.endAt.toLocaleString('vi-VN') },
  ];
  if (options?.status) {
    fields.push({ label: 'Trạng thái', value: formatContestStatusLabel(options.status) });
  }
  if (options?.problemCount != null) {
    fields.push({ label: 'Số câu trong đề', value: options.problemCount });
  }
  if (options?.scopeNote) {
    fields.push({ label: 'Phạm vi báo cáo', value: options.scopeNote });
  }
  return {
    sectionTitle: 'THÔNG TIN CONTEST',
    fields,
    note:
      options?.rosterMode === 'classroom'
        ? 'Danh sách theo học viên đăng ký lớp (MEMBER ACTIVE). Submission trong contest; không dry-run.'
        : 'Theo người tham gia contest (BXH). Submission trong contest; không dry-run.',
  };
}

export function buildClassroomEntityInfo(data: {
  className: string;
  classCode: string;
  academicYear: string | null;
  studentCount: number;
  problemCount: number;
  contestCount: number;
  dataScopeNote?: string;
}): ReportEntityInfoForm {
  return {
    sectionTitle: 'THÔNG TIN LỚP HỌC',
    fields: [
      { label: 'Tên lớp', value: data.className },
      { label: 'Mã lớp', value: data.classCode },
      { label: 'Niên khóa', value: data.academicYear ?? '—' },
      { label: 'Số học viên', value: data.studentCount },
      { label: 'Số bài tập', value: data.problemCount },
      { label: 'Số contest', value: data.contestCount },
    ],
    note: data.dataScopeNote,
  };
}

export function buildReportSheetContext(params: {
  reportType: string;
  title: string;
  subtitle?: string;
  entityInfo: ReportEntityInfoForm;
  generatedAt: Date;
  generatedBy?: ReportAuthor | null;
  kpis?: ReportContextBlock['kpis'];
}): ReportContextBlock {
  return {
    reportType: params.reportType,
    title: params.title,
    subtitle: params.subtitle,
    generatedAt: params.generatedAt,
    generatedBy: formatReportAuthor(params.generatedBy),
    entityInfo: params.entityInfo,
    kpis: params.kpis,
  };
}

import { Injectable, NotFoundException } from '@nestjs/common';
import type { SubmissionContext } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ProblemClassStats, ProblemStudentRow } from './reports-builders';
import type { SubmissionAttemptDetail } from './reports-submission-detail';
import {
  isStaffUser,
  resolveClassroomReportScope,
  type ClassroomReportScope,
} from './reports-classroom-scope';

const GRADED_STATUSES = new Set([
  'Accepted',
  'Wrong',
  'RuntimeError',
  'Error',
  'CompilationError',
  'TimeLimitExceeded',
  'MemoryLimitExceeded',
]);

const IN_FLIGHT_STATUSES = new Set(['Pending', 'Running']);

type SubmissionSlice = {
  userId: string;
  status: string;
  score: number | null;
  createdAt: Date;
};

type SubmissionDetailSlice = SubmissionSlice & {
  id: string;
  context: SubmissionContext;
  contestId: string | null;
  classAssignmentId: string | null;
  problemTitle: string;
  userName: string;
  email: string;
  contestTitle: string | null;
  classAssignmentTitle: string | null;
};

const SUBMISSION_DETAIL_SELECT = {
  id: true,
  userId: true,
  status: true,
  score: true,
  createdAt: true,
  context: true,
  contestId: true,
  classAssignmentId: true,
  user: { select: { name: true, email: true } },
  problem: { select: { title: true } },
  contest: { select: { title: true } },
  classAssignment: { select: { title: true } },
} as const;

@Injectable()
export class ReportsAggregationService {
  constructor(private readonly prisma: PrismaService) {}

  private toSubmissionSlice(row: SubmissionDetailSlice): SubmissionSlice {
    return {
      userId: row.userId,
      status: row.status,
      score: row.score,
      createdAt: row.createdAt,
    };
  }

  private mapDetailRows(rows: SubmissionDetailSlice[]): SubmissionAttemptDetail[] {
    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.userName,
      email: r.email,
      problemTitle: r.problemTitle,
      submittedAt: r.createdAt,
      status: r.status,
      score: r.score,
      context: r.context,
      contestId: r.contestId,
      contestTitle: r.contestTitle,
      classAssignmentId: r.classAssignmentId,
      classAssignmentTitle: r.classAssignmentTitle,
    }));
  }

  private normalizeSubmissionDetail(
    row: {
      id: string;
      userId: string;
      status: string;
      score: number | null;
      createdAt: Date;
      context: SubmissionContext;
      contestId: string | null;
      classAssignmentId: string | null;
      user: { name: string; email: string };
      problem: { title: string };
      contest: { title: string } | null;
      classAssignment: { title: string } | null;
    },
  ): SubmissionDetailSlice {
    return {
      id: row.id,
      userId: row.userId,
      status: row.status,
      score: row.score,
      createdAt: row.createdAt,
      context: row.context,
      contestId: row.contestId,
      classAssignmentId: row.classAssignmentId,
      problemTitle: row.problem.title,
      userName: row.user.name,
      email: row.user.email,
      contestTitle: row.contest?.title ?? null,
      classAssignmentTitle: row.classAssignment?.title ?? null,
    };
  }

  private buildRowFromSubs(
    userId: string,
    name: string,
    email: string,
    userSubs: SubmissionSlice[],
  ): ProblemStudentRow {
    const graded = userSubs.filter((s) => GRADED_STATUSES.has(s.status));
    const inFlight = userSubs.filter((s) => IN_FLIGHT_STATUSES.has(s.status));
    const accepted = userSubs.find((s) => s.status === 'Accepted');
    const attempted = graded.length > 0 || inFlight.length > 0;
    const best =
      accepted ??
      graded.reduce<SubmissionSlice | null>((acc, cur) => {
        if (!acc) return cur;
        if (cur.status === 'Accepted') return cur;
        return acc;
      }, null);
    const latestInFlight = inFlight.length > 0 ? inFlight[inFlight.length - 1]! : null;

    let bestStatus = 'Chưa nộp';
    if (best) {
      bestStatus = best.status;
    } else if (latestInFlight) {
      bestStatus = latestInFlight.status;
    } else if (attempted && userSubs.length > 0) {
      bestStatus = userSubs[userSubs.length - 1]!.status;
    }

    return {
      userId,
      name,
      email,
      attempted,
      solved: !!accepted,
      attempts: userSubs.length,
      bestStatus,
      bestScore: best?.score ?? null,
      lastSubmittedAt: userSubs.length
        ? userSubs[userSubs.length - 1]!.createdAt.toISOString()
        : null,
    };
  }

  /**
   * Lấy submission luyện tập của học viên trong lớp.
   * Khớp classRoomId trên bản ghi HOẶC bài được gán lớp (submission cũ thiếu classRoomId).
   */
  private async fetchClassProblemSubmissionDetails(
    classRoomId: string,
    problemId: string,
    enrollments: { userId: string }[],
    scope: ClassroomReportScope,
  ): Promise<SubmissionDetailSlice[]> {
    const studentUserIds = enrollments
      .map((e) => e.userId)
      .filter((id) => !isStaffUser(id, scope));

    if (studentUserIds.length === 0) {
      return [];
    }

    const rows = await this.prisma.submission.findMany({
      where: {
        problemId,
        isDryRun: false,
        contestId: null,
        userId: { in: studentUserIds },
        OR: [
          { classRoomId },
          {
            classRoomId: null,
            problem: {
              assignments: { some: { classRoomId, problemId } },
            },
          },
        ],
      },
      orderBy: { createdAt: 'asc' },
      select: SUBMISSION_DETAIL_SELECT,
    });

    return rows.map((r) => this.normalizeSubmissionDetail(r));
  }

  private partitionSubmissions(
    submissions: SubmissionDetailSlice[],
    scope: ClassroomReportScope,
  ): { studentSubs: SubmissionDetailSlice[]; staffSubs: SubmissionDetailSlice[] } {
    const studentSubs: SubmissionDetailSlice[] = [];
    const staffSubs: SubmissionDetailSlice[] = [];
    for (const s of submissions) {
      if (isStaffUser(s.userId, scope)) {
        staffSubs.push(s);
      } else {
        studentSubs.push(s);
      }
    }
    return { studentSubs, staffSubs };
  }

  async getProblemClassStats(classRoomId: string, problemId: string): Promise<ProblemClassStats> {
    const scope = await resolveClassroomReportScope(this.prisma, classRoomId);

    const [classRoom, problem, enrollments, staffUsers] = await Promise.all([
      this.prisma.classRoom.findUnique({
        where: { id: classRoomId },
        select: { id: true, name: true, classCode: true, ownerId: true },
      }),
      this.prisma.problem.findUnique({
        where: { id: problemId },
        select: { id: true, title: true, difficulty: true },
      }),
      this.prisma.classEnrollment.findMany({
        where: { classRoomId, status: 'ACTIVE', role: 'MEMBER' },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { user: { name: 'asc' } },
      }),
      this.prisma.user.findMany({
        where: { id: { in: [...scope.staffUserIds] } },
        select: { id: true, name: true, email: true },
      }),
    ]);

    const submissions = await this.fetchClassProblemSubmissionDetails(
      classRoomId,
      problemId,
      enrollments,
      scope,
    );

    if (!classRoom || !problem) {
      throw new NotFoundException('Lớp hoặc bài tập không tồn tại');
    }

    const { studentSubs, staffSubs } = this.partitionSubmissions(submissions, scope);

    const studentSubsByUser = new Map<string, SubmissionDetailSlice[]>();
    for (const s of studentSubs) {
      const list = studentSubsByUser.get(s.userId) ?? [];
      list.push(s);
      studentSubsByUser.set(s.userId, list);
    }

    const students: ProblemStudentRow[] = enrollments
      .filter((e) => !isStaffUser(e.userId, scope))
      .map((e) =>
        this.buildRowFromSubs(
          e.userId,
          e.user.name,
          e.user.email,
          (studentSubsByUser.get(e.userId) ?? []).map((s) => this.toSubmissionSlice(s)),
        ),
      );

    const staffSubsByUser = new Map<string, SubmissionDetailSlice[]>();
    for (const s of staffSubs) {
      const list = staffSubsByUser.get(s.userId) ?? [];
      list.push(s);
      staffSubsByUser.set(s.userId, list);
    }

    const staffActivity: ProblemStudentRow[] = staffUsers
      .filter((u) => (staffSubsByUser.get(u.id)?.length ?? 0) > 0)
      .map((u) =>
        this.buildRowFromSubs(
          u.id,
          u.name,
          u.email,
          (staffSubsByUser.get(u.id) ?? []).map((s) => this.toSubmissionSlice(s)),
        ),
      );

    const attemptedCount = students.filter((s) => s.attempted).length;
    const solvedCount = students.filter((s) => s.solved).length;
    const totalStudents = students.length;

    return {
      classRoomId,
      className: classRoom.name,
      classCode: classRoom.classCode,
      problemId,
      problemTitle: problem.title,
      difficulty: problem.difficulty,
      totalStudents,
      attemptedCount,
      solvedCount,
      passRateAttemptedPct:
        attemptedCount > 0 ? Math.round((solvedCount / attemptedCount) * 100) : 0,
      passRateEnrolledPct:
        totalStudents > 0 ? Math.round((solvedCount / totalStudents) * 100) : 0,
      students,
      staffActivity,
      submissionAttempts: this.mapDetailRows(studentSubs),
      staffSubmissionAttempts: this.mapDetailRows(staffSubs),
    };
  }

  /** Chi tiết từng lần nộp trong contest (không dry-run). */
  async getContestSubmissionAttempts(
    contestId: string,
    excludeUserIds: string[] = [],
  ): Promise<SubmissionAttemptDetail[]> {
    const rows = await this.prisma.submission.findMany({
      where: {
        contestId,
        isDryRun: false,
        ...(excludeUserIds.length > 0 ? { userId: { notIn: excludeUserIds } } : {}),
      },
      orderBy: [{ createdAt: 'asc' }],
      select: SUBMISSION_DETAIL_SELECT,
    });
    return this.mapDetailRows(rows.map((r) => this.normalizeSubmissionDetail(r)));
  }

  async getClassroomOverview(classRoomId: string) {
    const scope = await resolveClassroomReportScope(this.prisma, classRoomId);

    const classRoom = await this.prisma.classRoom.findUnique({
      where: { id: classRoomId },
      select: { name: true, classCode: true, academicYear: true, ownerId: true },
    });
    if (!classRoom) {
      throw new NotFoundException('Classroom not found');
    }

    const enrollments = await this.prisma.classEnrollment.findMany({
      where: { classRoomId, status: 'ACTIVE', role: 'MEMBER' },
      select: { userId: true },
    });
    const studentCount = enrollments.filter((e) => !isStaffUser(e.userId, scope)).length;

    const assignments = await this.prisma.classAssignment.findMany({
      where: { classRoomId, problemId: { not: null } },
      include: { problem: { select: { id: true, title: true, difficulty: true } } },
      orderBy: { publishedAt: 'desc' },
    });

    const problemSummaries = await this.buildProblemSummariesBatch(
      classRoomId,
      assignments,
      scope,
      enrollments,
    );

    const contestAssignments = await this.prisma.classAssignment.findMany({
      where: { classRoomId, contestId: { not: null } },
      include: {
        contest: {
          select: {
            id: true,
            title: true,
            status: true,
            startAt: true,
            endAt: true,
            _count: { select: { participants: true } },
          },
        },
      },
      orderBy: { publishedAt: 'desc' },
    });

    const contestSummaries = await this.buildContestSummariesBatch(
      contestAssignments,
      scope,
    );

    return {
      className: classRoom.name,
      classCode: classRoom.classCode,
      academicYear: classRoom.academicYear,
      studentCount,
      problemSummaries,
      contestSummaries,
      dataScopeNote:
        'Thống kê học viên (MEMBER): không gồm submission của chủ lớp và giáo viên (OWNER).',
    };
  }

  /**
   * Một query submissions cho mọi bài trong lớp — tránh N+1 khi export tổng hợp lớp.
   */
  private async buildProblemSummariesBatch(
    classRoomId: string,
    assignments: Array<{
      problemId: string | null;
      problem: { id: string; title: string; difficulty: string } | null;
    }>,
    scope: ClassroomReportScope,
    enrollments: { userId: string }[],
  ) {
    const studentUserIds = enrollments
      .map((e) => e.userId)
      .filter((id) => !isStaffUser(id, scope));

    const problemIds = assignments.map((a) => a.problemId!).filter(Boolean);
    if (problemIds.length === 0) {
      return [];
    }

    const allSubs =
      studentUserIds.length === 0
        ? []
        : await this.prisma.submission.findMany({
            where: {
              problemId: { in: problemIds },
              isDryRun: false,
              contestId: null,
              userId: { in: studentUserIds },
              OR: [
                { classRoomId },
                {
                  classRoomId: null,
                  problem: {
                    assignments: { some: { classRoomId, problemId: { in: problemIds } } },
                  },
                },
              ],
            },
            select: {
              problemId: true,
              userId: true,
              status: true,
            },
          });

    const subsByProblem = new Map<string, Map<string, string[]>>();
    for (const s of allSubs) {
      if (!subsByProblem.has(s.problemId)) {
        subsByProblem.set(s.problemId, new Map());
      }
      const byUser = subsByProblem.get(s.problemId)!;
      const statuses = byUser.get(s.userId) ?? [];
      statuses.push(s.status);
      byUser.set(s.userId, statuses);
    }

    return assignments.map((a) => {
      const problemId = a.problemId!;
      const byUser = subsByProblem.get(problemId) ?? new Map();
      let attemptedCount = 0;
      let solvedCount = 0;

      for (const userId of studentUserIds) {
        const statuses = byUser.get(userId) ?? [];
        const attempted = statuses.some(
          (st: string) => GRADED_STATUSES.has(st) || IN_FLIGHT_STATUSES.has(st),
        );
        const solved = statuses.includes('Accepted');
        if (attempted) attemptedCount++;
        if (solved) solvedCount++;
      }

      return {
        title: a.problem!.title,
        difficulty: a.problem!.difficulty,
        attempted: attemptedCount,
        solved: solvedCount,
        passRatePct:
          attemptedCount > 0 ? Math.round((solvedCount / attemptedCount) * 100) : 0,
      };
    });
  }

  private async buildContestSummariesBatch(
    contestAssignments: Array<{
      contestId: string | null;
      contest: {
        id: string;
        title: string;
        status: string;
        startAt: Date;
        endAt: Date;
        _count: { participants: number };
      } | null;
    }>,
    scope: ClassroomReportScope,
  ) {
    const staffIdList = [...scope.staffUserIds];
    const contestIds = contestAssignments.map((a) => a.contestId!).filter(Boolean);
    if (contestIds.length === 0) {
      return [];
    }

    const submitterPairs =
      staffIdList.length > 0
        ? await this.prisma.submission.findMany({
            where: {
              contestId: { in: contestIds },
              isDryRun: false,
              userId: { notIn: staffIdList },
            },
            distinct: ['contestId', 'userId'],
            select: { contestId: true, userId: true },
          })
        : await this.prisma.submission.findMany({
            where: { contestId: { in: contestIds }, isDryRun: false },
            distinct: ['contestId', 'userId'],
            select: { contestId: true, userId: true },
          });

    const submittedByContest = new Map<string, number>();
    for (const row of submitterPairs) {
      if (!row.contestId) continue;
      submittedByContest.set(row.contestId, (submittedByContest.get(row.contestId) ?? 0) + 1);
    }

    const participantGroups = await this.prisma.contestParticipant.groupBy({
      by: ['contestId'],
      where: {
        contestId: { in: contestIds },
        ...(staffIdList.length > 0 ? { userId: { notIn: staffIdList } } : {}),
      },
      _count: { _all: true },
    });
    const participantsByContest = new Map(
      participantGroups.map((g) => [g.contestId, g._count._all]),
    );

    return contestAssignments.map((a) => {
      const contestId = a.contestId!;
      return {
        title: a.contest!.title,
        status: a.contest!.status,
        participants:
          participantsByContest.get(contestId) ?? a.contest!._count.participants,
        submitted: submittedByContest.get(contestId) ?? 0,
        startAt: a.contest!.startAt.toISOString(),
        endAt: a.contest!.endAt.toISOString(),
      };
    });
  }

  /**
   * Thống kê admin theo problem — khớp dashboard (đếm mọi submission row theo problemId).
   * Bảng chi tiết gom theo user trên submission thật (không dry-run).
   */
  async getAdminProblemStats(problemId: string) {
    const problem = await this.prisma.problem.findUnique({
      where: { id: problemId },
      select: { id: true, title: true, difficulty: true, visibility: true, slug: true },
    });
    if (!problem) {
      throw new NotFoundException('Problem not found');
    }

    const detailRows = await this.prisma.submission.findMany({
      where: { problemId, isDryRun: false },
      orderBy: { createdAt: 'asc' },
      select: SUBMISSION_DETAIL_SELECT,
    });
    const reportRows = detailRows.map((r) => this.normalizeSubmissionDetail(r));

    const totalSubmissionRows = reportRows.length;
    const contestRows = reportRows.filter((s) => s.contestId != null).length;
    const practiceSubmissionRows = reportRows.filter((s) => s.contestId == null).length;
    const classAssignmentRows = reportRows.filter(
      (s) => s.context === 'CLASS_ASSIGNMENT' || s.classAssignmentId != null,
    ).length;

    const byUser = new Map<string, SubmissionSlice[]>();
    const userMeta = new Map<string, { name: string; email: string }>();
    for (const s of reportRows) {
      const list = byUser.get(s.userId) ?? [];
      list.push(this.toSubmissionSlice(s));
      byUser.set(s.userId, list);
      userMeta.set(s.userId, { name: s.userName, email: s.email });
    }

    const participants: ProblemStudentRow[] = [...byUser.entries()]
      .map(([userId, subs]) => {
        const meta = userMeta.get(userId)!;
        return this.buildRowFromSubs(userId, meta.name, meta.email, subs);
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const attemptedCount = participants.filter((p) => p.attempted).length;
    const solvedCount = participants.filter((p) => p.solved).length;
    const acceptedRows = reportRows.filter((s) => s.status === 'Accepted').length;

    return {
      problemId: problem.id,
      problemTitle: problem.title,
      slug: problem.slug,
      difficulty: problem.difficulty,
      visibility: problem.visibility,
      totalSubmissionRows,
      contestSubmissionRows: contestRows,
      practiceSubmissionRows,
      classAssignmentSubmissionRows: classAssignmentRows,
      totalParticipants: participants.length,
      attemptedCount,
      solvedCount,
      acceptedRows,
      passRateAttemptedPct:
        attemptedCount > 0 ? Math.round((solvedCount / attemptedCount) * 100) : 0,
      passRateOnTotalRowsPct:
        totalSubmissionRows > 0
          ? Math.round((acceptedRows / totalSubmissionRows) * 100)
          : 0,
      participants,
      submissionAttempts: this.mapDetailRows(reportRows),
    };
  }

  /** @deprecated Dùng getAdminProblemStats — giữ alias cho tương thích. */
  async getAdminPublicProblemStats(problemId: string) {
    return this.getAdminProblemStats(problemId);
  }
}

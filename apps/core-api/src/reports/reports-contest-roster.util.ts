import type { PrismaService } from '../prisma/prisma.service';
import type { ClassroomReportScope } from './reports-classroom-scope';
import { isStaffUser } from './reports-classroom-scope';

/** Row shape used by contest report builder (subset of contest leaderboard). */
export type ContestReportLeaderboardRow = {
  userId: string;
  userName: string;
  solvedCount: number;
  totalScore: number;
  totalPenalty: number;
  problems: Array<{
    problemId: string;
    problemTitle: string;
    isSolved: boolean;
    attempts: number;
    points: number;
  }>;
};

type ContestProblemMeta = {
  problemId: string;
  problemTitle: string;
  defaultPoints: number;
};

function emptyProblemStats(meta: ContestProblemMeta) {
  return {
    problemId: meta.problemId,
    problemTitle: meta.problemTitle,
    isSolved: false,
    attempts: 0,
    points: 0,
  };
}

function mergeProblemStats(
  existing: ContestReportLeaderboardRow['problems'],
  contestProblems: ContestProblemMeta[],
): ContestReportLeaderboardRow['problems'] {
  const byId = new Map(existing.map((p) => [p.problemId, p]));
  return contestProblems.map((meta) => {
    const row = byId.get(meta.problemId);
    if (!row) {
      return emptyProblemStats(meta);
    }
    return {
      problemId: meta.problemId,
      problemTitle: meta.problemTitle,
      isSolved: row.isSolved,
      attempts: row.attempts,
      points: row.points,
    };
  });
}

function toExportRow(
  userId: string,
  userName: string,
  problems: ContestReportLeaderboardRow['problems'],
): ContestReportLeaderboardRow {
  const solvedCount = problems.filter((p) => p.isSolved).length;
  const totalScore = problems.reduce((s, p) => s + p.points, 0);
  return {
    userId,
    userName,
    solvedCount,
    totalScore,
    totalPenalty: 0,
    problems,
  };
}

function sortContestLeaderboard(rows: ContestReportLeaderboardRow[]): ContestReportLeaderboardRow[] {
  return [...rows].sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    if (a.totalPenalty !== b.totalPenalty) {
      return a.totalPenalty - b.totalPenalty;
    }
    return a.userName.localeCompare(b.userName, 'vi');
  });
}

/**
 * Contest gắn lớp: báo cáo gồm mọi học viên MEMBER ACTIVE (trừ staff), kể cả chưa nộp.
 * Contest public: giữ nguyên BXH (người đã tham gia / nộp).
 */
export async function resolveContestReportLeaderboard(
  prisma: PrismaService,
  params: {
    contestId: string;
    classRoomId?: string | null;
    scope?: ClassroomReportScope;
    rawLeaderboard: Array<{
      userId: string;
      userName: string;
      solvedCount: number;
      totalScore: number;
      totalPenalty: number;
      problems: Array<{
        problemId: string;
        problemTitle: string;
        isSolved: boolean;
        attempts: number;
        points: number;
      }>;
    }>;
  },
): Promise<ContestReportLeaderboardRow[]> {
  const contestProblems = await loadContestProblemMeta(prisma, params.contestId);

  let rows: ContestReportLeaderboardRow[] = params.rawLeaderboard
    .filter((row) => !params.scope || !isStaffUser(row.userId, params.scope))
    .map((row) => ({
      userId: row.userId,
      userName: row.userName,
      solvedCount: row.solvedCount,
      totalScore: row.totalScore,
      totalPenalty: row.totalPenalty,
      problems: mergeProblemStats(row.problems, contestProblems),
    }));

  if (!params.classRoomId || !params.scope) {
    return sortContestLeaderboard(rows);
  }

  const enrollments = await prisma.classEnrollment.findMany({
    where: { classRoomId: params.classRoomId, status: 'ACTIVE', role: 'MEMBER' },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { user: { name: 'asc' } },
  });

  const byUserId = new Map(rows.map((r) => [r.userId, r]));
  const rosterRows: ContestReportLeaderboardRow[] = [];

  for (const enrollment of enrollments) {
    if (isStaffUser(enrollment.userId, params.scope)) {
      continue;
    }
    const existing = byUserId.get(enrollment.userId);
    if (existing) {
      rosterRows.push(existing);
      continue;
    }
    rosterRows.push(
      toExportRow(
        enrollment.userId,
        enrollment.user.name || 'Unknown',
        contestProblems.map(emptyProblemStats),
      ),
    );
  }

  return sortContestLeaderboard(rosterRows);
}

async function loadContestProblemMeta(
  prisma: PrismaService,
  contestId: string,
): Promise<ContestProblemMeta[]> {
  const rows = await prisma.contestProblem.findMany({
    where: { contestId },
    orderBy: { orderIndex: 'asc' },
    include: { problem: { select: { title: true } } },
  });
  return rows.map((cp) => ({
    problemId: cp.problemId,
    problemTitle: cp.problem.title,
    defaultPoints: cp.points,
  }));
}

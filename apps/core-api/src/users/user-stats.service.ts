import { Injectable } from '@nestjs/common';
import { Difficulty, SubmissionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { UserStatsDto } from './dto/user-stats.dto';

const GRADED_WHERE = {
  isDryRun: false,
} as const;

type ProblemAgg = {
  difficulty: Difficulty;
  attempted: boolean;
  solved: boolean;
};

@Injectable()
export class UserStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyStats(userId: string): Promise<UserStatsDto> {
    const [gradedSubmissions, languageGroups, recentSubmissions, runtimeAgg] =
      await Promise.all([
        this.prisma.submission.findMany({
          where: { userId, ...GRADED_WHERE },
          select: {
            problemId: true,
            status: true,
            problem: { select: { difficulty: true } },
          },
        }),
        this.prisma.submission.groupBy({
          by: ['language'],
          where: {
            userId,
            language: { not: null },
            ...GRADED_WHERE,
          },
          _count: { language: true },
          orderBy: { _count: { language: 'desc' } },
        }),
        this.prisma.submission.findMany({
          where: { userId, ...GRADED_WHERE },
          select: {
            status: true,
            createdAt: true,
            problem: { select: { title: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 15,
        }),
        this.prisma.submission.aggregate({
          where: {
            userId,
            status: SubmissionStatus.Accepted,
            runtimeMs: { not: null },
            ...GRADED_WHERE,
          },
          _avg: { runtimeMs: true },
        }),
      ]);

    const byProblem = new Map<string, ProblemAgg>();

    for (const sub of gradedSubmissions) {
      const existing = byProblem.get(sub.problemId);
      const isAccepted = sub.status === SubmissionStatus.Accepted;

      if (existing) {
        existing.attempted = true;
        if (isAccepted) existing.solved = true;
      } else {
        byProblem.set(sub.problemId, {
          difficulty: sub.problem.difficulty,
          attempted: true,
          solved: isAccepted,
        });
      }
    }

    const difficultyStats = {
      EASY: { solved: 0, attempted: 0 },
      MEDIUM: { solved: 0, attempted: 0 },
      HARD: { solved: 0, attempted: 0 },
    };

    for (const agg of byProblem.values()) {
      difficultyStats[agg.difficulty].attempted += 1;
      if (agg.solved) difficultyStats[agg.difficulty].solved += 1;
    }

    const problemsAttempted = byProblem.size;
    const problemsSolved = [...byProblem.values()].filter((p) => p.solved).length;
    const successRate =
      problemsAttempted > 0 ? Math.round((problemsSolved / problemsAttempted) * 100) : 0;

    return {
      problemsSolved,
      problemsAttempted,
      successRate,
      byDifficulty: {
        easy: {
          solved: difficultyStats.EASY.solved,
          attempted: difficultyStats.EASY.attempted,
        },
        medium: {
          solved: difficultyStats.MEDIUM.solved,
          attempted: difficultyStats.MEDIUM.attempted,
        },
        hard: {
          solved: difficultyStats.HARD.solved,
          attempted: difficultyStats.HARD.attempted,
        },
      },
      languages: languageGroups
        .filter((g) => g.language)
        .map((g) => ({
          language: g.language as string,
          count: g._count.language,
        })),
      avgRuntimeMs: runtimeAgg._avg.runtimeMs
        ? Math.round(runtimeAgg._avg.runtimeMs)
        : null,
      recentActivity: recentSubmissions.map((s) => ({
        type: 'submission' as const,
        title: s.problem.title,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
      })),
    };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { ContestStatus, Role } from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { ProblemAccessService, type ProblemViewer } from '../problems/problem-access.service';

export type ContestForAccess = {
  id: string;
  status: ContestStatus;
  createdById: string;
  assignments: { classRoomId: string }[];
};

@Injectable()
export class ContestAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly problemAccess: ProblemAccessService,
  ) {}

  resolveViewer(req?: Pick<Request, 'cookies' | 'headers'>): ProblemViewer | null {
    return this.problemAccess.resolveViewer(req);
  }

  async assertCanListClassContests(classRoomId: string, viewer: ProblemViewer | null): Promise<void> {
    await this.problemAccess.assertCanListClassProblems(classRoomId, viewer);
  }

  async assertCanViewContest(
    contest: ContestForAccess,
    viewer: ProblemViewer | null,
  ): Promise<void> {
    if (viewer?.role === Role.ADMIN) {
      return;
    }
    if (viewer && contest.createdById === viewer.userId) {
      return;
    }

    const classRoomIds = contest.assignments.map((a) => a.classRoomId);

    if (classRoomIds.length === 0) {
      if (contest.status === ContestStatus.DRAFT) {
        throw new NotFoundException('Contest not found');
      }
      return;
    }

    if (!viewer) {
      throw new NotFoundException('Contest not found');
    }

    for (const classRoomId of classRoomIds) {
      if (await this.problemAccess.userIsClassManager(classRoomId, viewer.userId)) {
        return;
      }
    }

    for (const classRoomId of classRoomIds) {
      if (await this.problemAccess.userHasActiveClassAccess(classRoomId, viewer.userId)) {
        return;
      }
    }

    throw new NotFoundException('Contest not found');
  }

  async assertCanViewContestById(contestId: string, viewer: ProblemViewer | null): Promise<void> {
    const contest = await this.prisma.contest.findUnique({
      where: { id: contestId },
      select: {
        id: true,
        status: true,
        createdById: true,
        assignments: { select: { classRoomId: true } },
      },
    });
    if (!contest) {
      throw new NotFoundException('Contest not found');
    }
    await this.assertCanViewContest(contest, viewer);
  }
}

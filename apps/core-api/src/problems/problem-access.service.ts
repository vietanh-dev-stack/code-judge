import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProblemVisibility, Prisma, Role } from '@prisma/client';
import type { Request } from 'express';
import { EnvKeys, verifyAccessTokenCookie } from '../common';
import { PrismaService } from '../prisma/prisma.service';

export type ProblemViewer = {
  userId: string;
  role: Role;
};

export type ProblemForManageAccess = {
  creatorId: string | null;
  assignments: { classRoomId: string }[];
};

/** Problem fields required for view / list access checks. */
export type ProblemForAccess = ProblemForManageAccess & {
  id: string;
  visibility: ProblemVisibility;
  isPublished: boolean;
};

@Injectable()
export class ProblemAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  resolveViewer(req?: Pick<Request, 'cookies' | 'headers'>): ProblemViewer | null {
    const secret = this.configService.get<string>(EnvKeys.JWT_SECRET);
    if (!req || !secret) {
      return null;
    }
    const payload = verifyAccessTokenCookie(req, secret);
    if (!payload) {
      return null;
    }
    return { userId: payload.sub, role: payload.role };
  }

  async assertCanListClassProblems(classRoomId: string, viewer: ProblemViewer | null): Promise<void> {
    if (!viewer) {
      throw new UnauthorizedException('Authentication required to list class problems');
    }
    const allowed = await this.userHasActiveClassAccess(classRoomId.trim(), viewer.userId);
    if (!allowed) {
      throw new NotFoundException('Class not found');
    }
  }

  /**
   * Extra visibility filter for GET /problems?classRoomId=...
   * Class managers see CONTEST_ONLY; members do not.
   */
  async buildClassListVisibilityFilter(
    classRoomId: string,
    viewer: ProblemViewer,
  ): Promise<Prisma.ProblemWhereInput> {
    if (await this.userIsClassManager(classRoomId, viewer.userId)) {
      return {};
    }
    return { visibility: { not: ProblemVisibility.CONTEST_ONLY } };
  }

  /** Load problem + enforce view rules (404 if denied). */
  async assertCanViewProblemById(
    problemId: string,
    viewer: ProblemViewer | null,
    opts?: { contestId?: string },
  ): Promise<void> {
    const problem = await this.prisma.problem.findUnique({
      where: { id: problemId },
      select: {
        id: true,
        visibility: true,
        isPublished: true,
        creatorId: true,
        assignments: { select: { classRoomId: true } },
      },
    });
    if (!problem) {
      throw new NotFoundException('Problem not found');
    }
    await this.assertCanViewProblem(problem, viewer, opts);
  }

  async assertCanViewProblem(
    problem: ProblemForAccess,
    viewer: ProblemViewer | null,
    opts?: { contestId?: string },
  ): Promise<void> {
    if (await this.canManageProblem(problem, viewer?.userId, viewer?.role)) {
      return;
    }

    if (!problem.isPublished) {
      throw new NotFoundException('Problem not found');
    }

    const classRoomIds = problem.assignments.map((a) => a.classRoomId);

    if (classRoomIds.length === 0) {
      if (problem.visibility === ProblemVisibility.PUBLIC) {
        return;
      }
      throw new NotFoundException('Problem not found');
    }

    if (!viewer) {
      throw new NotFoundException('Problem not found');
    }

    const hasClassAccess = await this.userHasAccessToAnyClass(classRoomIds, viewer.userId);
    if (!hasClassAccess) {
      throw new NotFoundException('Problem not found');
    }

    if (problem.visibility === ProblemVisibility.CONTEST_ONLY) {
      const isManager = await this.userIsClassManagerForAny(classRoomIds, viewer.userId);
      if (isManager) {
        return;
      }

      const contestId = opts?.contestId?.trim();
      if (!contestId) {
        throw new NotFoundException('Problem not found');
      }

      const allowed = await this.userCanViewContestProblem(
        problem.id,
        contestId,
        viewer.userId,
        classRoomIds,
      );
      if (!allowed) {
        throw new NotFoundException('Problem not found');
      }
      return;
    }

    // PRIVATE (class-scoped): active enrollment / class owner is enough.
  }

  /** Admin, creator, or class owner / enrollment OWNER for an assigned class. */
  async canManageProblem(
    existing: ProblemForManageAccess,
    userId: string | undefined,
    role?: Role,
  ): Promise<boolean> {
    if (!userId) {
      return false;
    }
    if (role === Role.ADMIN) {
      return true;
    }
    if (existing.creatorId === userId) {
      return true;
    }
    for (const a of existing.assignments) {
      if (await this.userIsClassManager(a.classRoomId, userId)) {
        return true;
      }
    }
    return false;
  }

  private async userCanViewContestProblem(
    problemId: string,
    contestId: string,
    userId: string,
    problemClassRoomIds: string[],
  ): Promise<boolean> {
    const inContest = await this.prisma.contestProblem.findFirst({
      where: { contestId, problemId },
      select: { contestId: true },
    });
    if (!inContest) {
      return false;
    }

    const contest = await this.prisma.contest.findUnique({
      where: { id: contestId },
      select: {
        assignments: { select: { classRoomId: true } },
      },
    });
    if (!contest) {
      return false;
    }

    const contestClassIds = contest.assignments.map((a) => a.classRoomId);
    if (contestClassIds.length > 0) {
      const overlap = contestClassIds.some((id) => problemClassRoomIds.includes(id));
      if (!overlap) {
        return false;
      }
      for (const classRoomId of contestClassIds) {
        if (problemClassRoomIds.includes(classRoomId)) {
          if (await this.userHasActiveClassAccess(classRoomId, userId)) {
            return true;
          }
        }
      }
      return false;
    }

    const participant = await this.prisma.contestParticipant.findUnique({
      where: { contestId_userId: { contestId, userId } },
    });
    return Boolean(participant);
  }

  private async userHasAccessToAnyClass(classRoomIds: string[], userId: string): Promise<boolean> {
    for (const classRoomId of classRoomIds) {
      if (await this.userHasActiveClassAccess(classRoomId, userId)) {
        return true;
      }
    }
    return false;
  }

  private async userIsClassManagerForAny(classRoomIds: string[], userId: string): Promise<boolean> {
    for (const classRoomId of classRoomIds) {
      if (await this.userIsClassManager(classRoomId, userId)) {
        return true;
      }
    }
    return false;
  }

  /** Class ownerId or ACTIVE enrollment with role OWNER. */
  async userIsClassManager(classRoomId: string, userId: string): Promise<boolean> {
    const classRoom = await this.prisma.classRoom.findUnique({
      where: { id: classRoomId },
      select: { ownerId: true, isActive: true },
    });
    if (!classRoom?.isActive) {
      return false;
    }
    if (classRoom.ownerId === userId) {
      return true;
    }
    const enrollment = await this.prisma.classEnrollment.findFirst({
      where: {
        classRoomId,
        userId,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });
    return Boolean(enrollment);
  }

  /** Class ownerId or any ACTIVE enrollment (MEMBER or OWNER). */
  async userHasActiveClassAccess(classRoomId: string, userId: string): Promise<boolean> {
    const classRoom = await this.prisma.classRoom.findUnique({
      where: { id: classRoomId },
      select: { ownerId: true, isActive: true },
    });
    if (!classRoom?.isActive) {
      return false;
    }
    if (classRoom.ownerId === userId) {
      return true;
    }
    const enrollment = await this.prisma.classEnrollment.findFirst({
      where: {
        classRoomId,
        userId,
        status: 'ACTIVE',
      },
    });
    return Boolean(enrollment);
  }
}

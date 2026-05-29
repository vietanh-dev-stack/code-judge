import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProblemVisibility, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProblemAccessService } from '../problems/problem-access.service';
import type { RequestUser } from '../common/interfaces/request-user.interface';

@Injectable()
export class ReportsAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly problemAccess: ProblemAccessService,
  ) {}

  async assertCanExportClassroom(classRoomId: string, user: RequestUser): Promise<void> {
    const classRoom = await this.prisma.classRoom.findUnique({
      where: { id: classRoomId },
      select: { id: true, isActive: true },
    });
    if (!classRoom) {
      throw new NotFoundException('Classroom not found');
    }
    if (user.role === Role.ADMIN) {
      return;
    }
    if (!(await this.problemAccess.userIsClassManager(classRoomId, user.userId))) {
      throw new ForbiddenException('Chỉ chủ lớp hoặc ADMIN mới được xuất báo cáo');
    }
  }

  async assertCanExportProblem(
    classRoomId: string,
    problemId: string,
    user: RequestUser,
  ): Promise<void> {
    await this.assertCanExportClassroom(classRoomId, user);
    const assignment = await this.prisma.classAssignment.findFirst({
      where: { classRoomId, problemId },
      select: { id: true },
    });
    if (!assignment) {
      throw new NotFoundException('Bài tập không thuộc lớp này');
    }
  }

  async assertCanExportContest(contestId: string, user: RequestUser): Promise<void> {
    const contest = await this.prisma.contest.findUnique({
      where: { id: contestId },
      select: {
        id: true,
        createdById: true,
        assignments: { select: { classRoomId: true } },
      },
    });
    if (!contest) {
      throw new NotFoundException('Contest not found');
    }
    if (user.role === Role.ADMIN) {
      return;
    }
    if (contest.createdById === user.userId) {
      return;
    }
    for (const a of contest.assignments) {
      if (await this.problemAccess.userIsClassManager(a.classRoomId, user.userId)) {
        return;
      }
    }
    throw new ForbiddenException('Chỉ chủ lớp, người tạo contest hoặc ADMIN mới được xuất báo cáo');
  }

  private assertAdmin(user: RequestUser): void {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Chỉ ADMIN mới dùng báo cáo khu vực quản trị');
    }
  }

  /**
   * Problem admin được xem trên kho đề (GET /problems/admin/all): visibility PUBLIC.
   * Problem gắn lớp PRIVATE: xuất theo từng lớp (cùng quyền xem problem).
   */
  async assertCanExportAdminProblem(problemId: string, user: RequestUser): Promise<{
    visibility: ProblemVisibility;
    assignmentClassRoomIds: string[];
  }> {
    this.assertAdmin(user);

    const problem = await this.prisma.problem.findUnique({
      where: { id: problemId },
      select: {
        id: true,
        visibility: true,
        assignments: { select: { classRoomId: true } },
      },
    });
    if (!problem) {
      throw new NotFoundException('Problem not found');
    }

    await this.problemAccess.assertCanViewProblemById(problemId, {
      userId: user.userId,
      role: user.role,
    });

    const classIds = problem.assignments.map((a) => a.classRoomId);

    if (problem.visibility !== ProblemVisibility.PUBLIC && classIds.length > 0) {
      throw new BadRequestException(
        'Bài tập riêng lớp (PRIVATE/CONTEST_ONLY): xuất báo cáo từ trang lớp học tương ứng',
      );
    }

    return {
      visibility: problem.visibility,
      assignmentClassRoomIds: classIds,
    };
  }

  /** Contest trên admin list: không gắn ClassAssignment (kho contest hệ thống). */
  async assertCanExportAdminContest(contestId: string, user: RequestUser): Promise<void> {
    this.assertAdmin(user);

    const contest = await this.prisma.contest.findUnique({
      where: { id: contestId },
      select: {
        id: true,
        assignments: { select: { classRoomId: true } },
      },
    });
    if (!contest) {
      throw new NotFoundException('Contest not found');
    }

    if (contest.assignments.length > 0) {
      throw new BadRequestException(
        'Contest gắn lớp học: xuất báo cáo từ trang lớp hoặc dashboard giáo viên',
      );
    }
  }
}

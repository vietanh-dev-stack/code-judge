import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { RequestUser } from '../common/interfaces/request-user.interface';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Shared ownership / shared-read rules for problem-scoped storage (AI jobs, golden, class teachers).
 */
@Injectable()
export class ProblemStorageAccessService {
  constructor(private readonly prisma: PrismaService) {}

  isAdminBypass(user: RequestUser): boolean {
    if (user.role !== Role.ADMIN) {
      return false;
    }
    const raw = process.env.STORAGE_ADMIN_BYPASS?.trim().toLowerCase();
    return raw === '1' || raw === 'true' || raw === 'yes';
  }

  async assertSubmissionOwner(submissionId: string, userId: string): Promise<void> {
    const row = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      select: { userId: true },
    });
    if (!row) {
      throw new NotFoundException('Submission không tồn tại');
    }
    if (row.userId !== userId) {
      throw new ForbiddenException('Không thể truy cập submission của user khác');
    }
  }

  async assertGoldenUploader(
    goldenSolutionId: string,
    problemId: string,
    userId: string,
  ): Promise<void> {
    const golden = await this.prisma.goldenSolution.findFirst({
      where: { id: goldenSolutionId, problemId },
      select: { createdById: true },
    });
    if (!golden) {
      throw new NotFoundException('Golden solution không tồn tại');
    }
    if (golden.createdById !== userId) {
      throw new ForbiddenException('Không thể truy cập golden solution của user khác');
    }
  }

  /** Upload / bind: only the user who created the AI job. */
  async assertAiJobOwner(jobId: string, userId: string): Promise<void> {
    const job = await this.prisma.aiGenerationJob.findUnique({
      where: { id: jobId },
      select: { createdById: true },
    });
    if (!job) {
      throw new NotFoundException('AI job không tồn tại');
    }
    if (job.createdById !== userId) {
      throw new ForbiddenException('Không thể truy cập AI job của user khác');
    }
  }

  /**
   * Presign download (R1): job owner, problem creator, class owner/teacher, or admin bypass.
   */
  async assertAiJobSharedRead(jobId: string, user: RequestUser): Promise<void> {
    if (this.isAdminBypass(user)) {
      return;
    }

    const job = await this.prisma.aiGenerationJob.findUnique({
      where: { id: jobId },
      select: { createdById: true, problemId: true },
    });
    if (!job) {
      throw new NotFoundException('AI job không tồn tại');
    }
    if (job.createdById === user.userId) {
      return;
    }

    const problem = await this.prisma.problem.findUnique({
      where: { id: job.problemId },
      select: { creatorId: true },
    });
    if (problem?.creatorId === user.userId) {
      return;
    }

    if (await this.userCanManageProblemViaClass(job.problemId, user.userId)) {
      return;
    }

    throw new ForbiddenException('Không thể truy cập object AI job này');
  }

  /**
   * Presign download (R2b): golden uploader, problem creator, or admin bypass.
   */
  async assertGoldenSharedRead(
    goldenSolutionId: string,
    problemId: string,
    user: RequestUser,
  ): Promise<void> {
    if (this.isAdminBypass(user)) {
      return;
    }

    const golden = await this.prisma.goldenSolution.findFirst({
      where: { id: goldenSolutionId, problemId },
      select: { createdById: true },
    });
    if (!golden) {
      throw new NotFoundException('Golden solution không tồn tại');
    }
    if (golden.createdById === user.userId) {
      return;
    }

    const problem = await this.prisma.problem.findUnique({
      where: { id: problemId },
      select: { creatorId: true },
    });
    if (problem?.creatorId === user.userId) {
      return;
    }

    throw new ForbiddenException('Không thể truy cập golden solution này');
  }

  async assertReportExportOwner(
    exportId: string,
    contestId: string,
    userId: string,
  ): Promise<void> {
    const row = await this.prisma.reportExport.findFirst({
      where: { id: exportId, contestId },
      select: { requestedById: true },
    });
    if (!row) {
      throw new NotFoundException('Report export không tồn tại');
    }
    if (row.requestedById !== userId) {
      throw new ForbiddenException('Không thể truy cập export của user khác');
    }
  }

  /** Class room ownerId or ACTIVE enrollment OWNER for a class that assigns this problem. */
  async userCanManageProblemViaClass(problemId: string, userId: string): Promise<boolean> {
    const assignments = await this.prisma.classAssignment.findMany({
      where: { problemId },
      select: { classRoomId: true },
    });
    for (const a of assignments) {
      if (await this.userIsClassOwnerForRoom(a.classRoomId, userId)) {
        return true;
      }
    }
    return false;
  }

  private async userIsClassOwnerForRoom(classRoomId: string, userId: string): Promise<boolean> {
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
}

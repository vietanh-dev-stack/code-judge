import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestUser } from '../common/interfaces/request-user.interface';

type ResourceKind =
  | 'avatar'
  | 'submission-source'
  | 'submission-artifact'
  | 'golden-solution'
  | 'ai-input'
  | 'ai-testcase'
  | 'export';

export interface PresignUploadBody {
  resourceKind: ResourceKind;
  userId?: string;
  submissionId?: string;
  problemId?: string;
  goldenSolutionId?: string;
  jobId?: string;
  contestId?: string;
  exportId?: string;
}

export interface BindObjectKeyBody {
  resourceKind: 'ai-input' | 'export' | 'golden-solution';
  recordId: string;
  objectKey: string;
}

@Injectable()
export class StorageAccessService {
  constructor(private readonly prisma: PrismaService) {}

  private isAdmin(user: RequestUser): boolean {
    return user.role === Role.ADMIN;
  }

  /**
   * Đảm bảo user được phép presign PUT cho resource tương ứng (tránh URL upload cho object người khác).
   */
  async assertPresignUploadAllowed(body: PresignUploadBody, user: RequestUser): Promise<void> {
    if (this.isAdmin(user)) return;

    switch (body.resourceKind) {
      case 'avatar': {
        const uid = body.userId ?? user.userId;
        if (uid !== user.userId) {
          throw new ForbiddenException('Không thể tạo presign avatar cho user khác');
        }
        return;
      }
      case 'submission-source':
      case 'submission-artifact': {
        if (!body.submissionId) {
          throw new BadRequestException('submissionId is required');
        }
        await this.assertSubmissionOwner(body.submissionId, user.userId);
        return;
      }
      case 'golden-solution': {
        if (!body.goldenSolutionId || !body.problemId) {
          throw new BadRequestException('goldenSolutionId and problemId are required');
        }
        await this.assertGoldenOwner(body.goldenSolutionId, body.problemId, user.userId);
        return;
      }
      case 'ai-input':
      case 'ai-testcase': {
        if (!body.jobId) {
          throw new BadRequestException('jobId is required');
        }
        await this.assertAiJobOwner(body.jobId, user.userId);
        return;
      }
      case 'export': {
        if (!body.exportId || !body.contestId) {
          throw new BadRequestException('exportId and contestId are required');
        }
        await this.assertReportExportOwner(body.exportId, body.contestId, user.userId);
        return;
      }
      default:
        throw new BadRequestException('Unsupported resourceKind');
    }
  }

  /**
   * Đảm bảo user được phép presign GET cho objectKey (chỉ namespace đã biết).
   */
  async assertPresignDownloadAllowed(objectKey: string, user: RequestUser): Promise<void> {
    if (this.isAdmin(user)) return;

    const key = objectKey.trim();
    if (!key) {
      throw new BadRequestException('objectKey is required');
    }

    const avatarMatch = /^avatars\/([^/]+)\//.exec(key);
    if (avatarMatch) {
      if (avatarMatch[1] !== user.userId) {
        throw new ForbiddenException('Không thể tải avatar của user khác');
      }
      return;
    }

    const submissionMatch = /^submissions\/([^/]+)\//.exec(key);
    if (submissionMatch) {
      await this.assertSubmissionOwner(submissionMatch[1], user.userId);
      return;
    }

    const goldenMatch = /^golden-solutions\/([^/]+)\/([^/]+)\//.exec(key);
    if (goldenMatch) {
      await this.assertGoldenOwner(goldenMatch[2], goldenMatch[1], user.userId);
      return;
    }

    const aiMatch = /^ai-jobs\/([^/]+)\//.exec(key);
    if (aiMatch) {
      await this.assertAiJobAccess(aiMatch[1], user.userId);
      return;
    }

    const exportMatch = /^exports\/([^/]+)\/([^/.]+)\./.exec(key);
    if (exportMatch) {
      await this.assertReportExportOwner(exportMatch[2], exportMatch[1], user.userId);
      return;
    }

    throw new ForbiddenException('Không được phép presign download cho objectKey này');
  }

  async assertBindObjectKeyAllowed(body: BindObjectKeyBody, user: RequestUser): Promise<void> {
    if (this.isAdmin(user)) return;

    switch (body.resourceKind) {
      case 'ai-input': {
        await this.assertAiJobOwner(body.recordId, user.userId);
        return;
      }
      case 'export': {
        const row = await this.prisma.reportExport.findUnique({
          where: { id: body.recordId },
          select: { requestedById: true, contestId: true },
        });
        if (!row) throw new NotFoundException('Report export không tồn tại');
        if (row.requestedById !== user.userId) {
          throw new ForbiddenException('Không thể gắn file export cho người khác');
        }
        return;
      }
      case 'golden-solution': {
        const golden = await this.prisma.goldenSolution.findUnique({
          where: { id: body.recordId },
          select: { createdById: true },
        });
        if (!golden) throw new NotFoundException('Golden solution không tồn tại');
        if (golden.createdById !== user.userId) {
          throw new ForbiddenException('Không thể gắn golden solution cho người khác');
        }
        return;
      }
      default:
        throw new BadRequestException('Unsupported resourceKind');
    }
  }

  private async assertSubmissionOwner(submissionId: string, userId: string): Promise<void> {
    const row = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      select: { userId: true },
    });
    if (!row) throw new NotFoundException('Submission không tồn tại');
    if (row.userId !== userId) {
      throw new ForbiddenException('Không thể truy cập submission của user khác');
    }
  }

  private async assertGoldenOwner(
    goldenSolutionId: string,
    problemId: string,
    userId: string,
  ): Promise<void> {
    const golden = await this.prisma.goldenSolution.findFirst({
      where: { id: goldenSolutionId, problemId },
      select: { createdById: true },
    });
    if (!golden) throw new NotFoundException('Golden solution không tồn tại');
    if (golden.createdById !== userId) {
      throw new ForbiddenException('Không thể truy cập golden solution của user khác');
    }
  }

  private async assertAiJobOwner(jobId: string, userId: string): Promise<void> {
    const job = await this.prisma.aiGenerationJob.findUnique({
      where: { id: jobId },
      select: { createdById: true },
    });
    if (!job) throw new NotFoundException('AI job không tồn tại');
    if (job.createdById !== userId) {
      throw new ForbiddenException('Không thể truy cập AI job của user khác');
    }
  }

  /** Cho phép chủ job hoặc chủ problem (creator) tải artifact AI. */
  private async assertAiJobAccess(jobId: string, userId: string): Promise<void> {
    const job = await this.prisma.aiGenerationJob.findUnique({
      where: { id: jobId },
      select: { createdById: true, problemId: true },
    });
    if (!job) throw new NotFoundException('AI job không tồn tại');
    if (job.createdById === userId) return;

    const problem = await this.prisma.problem.findUnique({
      where: { id: job.problemId },
      select: { creatorId: true },
    });
    if (problem?.creatorId === userId) return;

    throw new ForbiddenException('Không thể truy cập object AI job này');
  }

  private async assertReportExportOwner(
    exportId: string,
    contestId: string,
    userId: string,
  ): Promise<void> {
    const row = await this.prisma.reportExport.findFirst({
      where: { id: exportId, contestId },
      select: { requestedById: true },
    });
    if (!row) throw new NotFoundException('Report export không tồn tại');
    if (row.requestedById !== userId) {
      throw new ForbiddenException('Không thể truy cập export của user khác');
    }
  }
}

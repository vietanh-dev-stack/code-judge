import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { RequestUser } from '../common/interfaces/request-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildAiInputObjectKey,
  buildGoldenSolutionObjectKeyPrefix,
} from './storage-key.builder';
import { ProblemStorageAccessService } from './problem-storage-access.service';
import type { StorageBindResourceKind, StorageResourceKind } from './storage-resource.constants';

export interface PresignUploadBody {
  resourceKind: StorageResourceKind;
  userId?: string;
  submissionId?: string;
  problemId?: string;
  goldenSolutionId?: string;
  jobId?: string;
  contestId?: string;
  exportId?: string;
}

export interface BindObjectKeyBody {
  resourceKind: StorageBindResourceKind;
  recordId: string;
  objectKey: string;
}

@Injectable()
export class StorageAccessService {
  constructor(
    private readonly problemAccess: ProblemStorageAccessService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Presign PUT: only the resource owner / uploader (JWT required at controller).
   */
  async assertPresignUploadAllowed(body: PresignUploadBody, user: RequestUser): Promise<void> {
    if (this.problemAccess.isAdminBypass(user)) {
      return;
    }

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
        if (!body.submissionId?.trim()) {
          throw new BadRequestException('submissionId is required');
        }
        await this.problemAccess.assertSubmissionOwner(body.submissionId.trim(), user.userId);
        return;
      }
      case 'golden-solution': {
        if (!body.goldenSolutionId?.trim() || !body.problemId?.trim()) {
          throw new BadRequestException('goldenSolutionId and problemId are required');
        }
        await this.problemAccess.assertGoldenUploader(
          body.goldenSolutionId.trim(),
          body.problemId.trim(),
          user.userId,
        );
        return;
      }
      case 'ai-input':
      case 'ai-testcase': {
        if (!body.jobId?.trim()) {
          throw new BadRequestException('jobId is required');
        }
        await this.problemAccess.assertAiJobOwner(body.jobId.trim(), user.userId);
        return;
      }
      case 'export': {
        if (!body.exportId?.trim() || !body.contestId?.trim()) {
          throw new BadRequestException('exportId and contestId are required');
        }
        await this.problemAccess.assertReportExportOwner(
          body.exportId.trim(),
          body.contestId.trim(),
          user.userId,
        );
        return;
      }
      default:
        throw new BadRequestException('Unsupported resourceKind');
    }
  }

  /**
   * Presign GET: R0 avatar (any logged-in user), R1 AI jobs (shared read), R2 private resources.
   */
  async assertPresignDownloadAllowed(objectKey: string, user: RequestUser): Promise<void> {
    const key = objectKey.trim();
    if (!key) {
      throw new BadRequestException('objectKey is required');
    }

    if (/^avatars\/([^/]+)\//.exec(key)) {
      return;
    }

    const submissionMatch = /^submissions\/([^/]+)\//.exec(key);
    if (submissionMatch) {
      if (this.problemAccess.isAdminBypass(user)) {
        return;
      }
      await this.problemAccess.assertSubmissionOwner(submissionMatch[1], user.userId);
      return;
    }

    const goldenMatch = /^golden-solutions\/([^/]+)\/([^/]+)\//.exec(key);
    if (goldenMatch) {
      await this.problemAccess.assertGoldenSharedRead(goldenMatch[2], goldenMatch[1], user);
      return;
    }

    const aiMatch = /^ai-jobs\/([^/]+)\//.exec(key);
    if (aiMatch) {
      await this.problemAccess.assertAiJobSharedRead(aiMatch[1], user);
      return;
    }

    const exportMatch = /^exports\/([^/]+)\/([^/.]+)\./.exec(key);
    if (exportMatch) {
      if (this.problemAccess.isAdminBypass(user)) {
        return;
      }
      await this.problemAccess.assertReportExportOwner(exportMatch[2], exportMatch[1], user.userId);
      return;
    }

    throw new ForbiddenException('Không được phép presign download cho objectKey này');
  }

  async assertBindObjectKeyAllowed(body: BindObjectKeyBody, user: RequestUser): Promise<void> {
    if (this.problemAccess.isAdminBypass(user)) {
      return;
    }

    const key = body.objectKey.trim();
    const recordId = body.recordId.trim();

    switch (body.resourceKind) {
      case 'ai-input': {
        await this.problemAccess.assertAiJobOwner(recordId, user.userId);
        const expectedPrefix = buildAiInputObjectKey(recordId, '').replace(/input\/$/, 'input/');
        if (!key.startsWith(`ai-jobs/${recordId}/input/`)) {
          throw new ForbiddenException('objectKey không khớp AI job input');
        }
        void expectedPrefix;
        return;
      }
      case 'export': {
        const row = await this.prisma.reportExport.findUnique({
          where: { id: recordId },
          select: { requestedById: true, contestId: true },
        });
        if (!row) {
          throw new NotFoundException('Report export không tồn tại');
        }
        if (row.requestedById !== user.userId) {
          throw new ForbiddenException('Không thể gắn file export cho người khác');
        }
        return;
      }
      case 'golden-solution': {
        const golden = await this.prisma.goldenSolution.findUnique({
          where: { id: recordId },
          select: { id: true, problemId: true, createdById: true },
        });
        if (!golden) {
          throw new NotFoundException('Golden solution không tồn tại');
        }
        if (golden.createdById !== user.userId) {
          throw new ForbiddenException('Không thể gắn golden solution cho người khác');
        }
        const prefix = buildGoldenSolutionObjectKeyPrefix(golden.problemId, golden.id);
        if (!key.startsWith(prefix)) {
          throw new ForbiddenException('objectKey không khớp golden solution này');
        }
        return;
      }
      default:
        throw new BadRequestException('Unsupported resourceKind');
    }
  }
}

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { RequestUser } from '../common/interfaces/request-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildGoldenSolutionObjectKey,
  buildGoldenSolutionObjectKeyPrefix,
} from '../storage/storage-key.builder';
import { StorageService } from '../storage/storage.service';
import { ConfirmGoldenUploadDto } from './dto/confirm-golden-upload.dto';
import { PresignUploadGoldenDto } from './dto/presign-upload-golden.dto';

@Injectable()
export class GoldenSolutionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private async assertCanManageProblem(user: RequestUser, problemId: string): Promise<void> {
    if (user.role === Role.ADMIN) {
      return;
    }
    const problem = await this.prisma.problem.findUnique({
      where: { id: problemId },
      select: { creatorId: true },
    });
    if (!problem) {
      throw new NotFoundException('Problem không tồn tại');
    }
    if (problem.creatorId !== user.userId) {
      throw new ForbiddenException('Chỉ admin hoặc người tạo đề mới thêm golden solution');
    }
  }

  /** Ai được gắn file sau upload: admin, người tạo golden, hoặc creator của problem. */
  private async assertCanConfirmUpload(
    user: RequestUser,
    golden: { id: string; problemId: string; createdById: string },
  ): Promise<void> {
    if (user.role === Role.ADMIN) {
      return;
    }
    if (golden.createdById === user.userId) {
      return;
    }
    const problem = await this.prisma.problem.findUnique({
      where: { id: golden.problemId },
      select: { creatorId: true },
    });
    if (problem?.creatorId === user.userId) {
      return;
    }
    throw new ForbiddenException('Không thể xác nhận upload golden solution này');
  }

  /**
   * Tạo bản ghi GoldenSolution (source rỗng, nội dung file qua MinIO) và trả presigned PUT.
   */
  async createPresignUpload(problemId: string, user: RequestUser, dto: PresignUploadGoldenDto) {
    await this.assertCanManageProblem(user, problemId);

    const fileName = dto.fileName?.trim() || 'source.txt';
    const isPrimary = dto.isPrimary ?? false;
    const expiresIn = dto.expiresInSeconds ?? 900;

    const golden = await this.prisma.$transaction(async (tx) => {
      if (isPrimary) {
        await tx.goldenSolution.updateMany({
          where: { problemId },
          data: { isPrimary: false },
        });
      }

      return tx.goldenSolution.create({
        data: {
          problemId,
          language: dto.language.trim(),
          sourceCode: '',
          isPrimary,
          createdById: user.userId,
        },
      });
    });

    const objectKey = buildGoldenSolutionObjectKey(problemId, golden.id, fileName);
    const uploadUrl = await this.storage.createPresignedUploadUrl({
      objectKey,
      expiresInSeconds: expiresIn,
    });

    return {
      goldenSolutionId: golden.id,
      problemId,
      language: golden.language,
      isPrimary: golden.isPrimary,
      bucket: this.storage.getBucketName(),
      objectKey,
      uploadUrl,
      expiresInSeconds: expiresIn,
    };
  }

  /**
   * Sau khi client PUT file lên MinIO, gắn objectKey vào bản ghi (kiểm tra prefix đúng problem + golden).
   */
  async confirmUpload(goldenSolutionId: string, user: RequestUser, dto: ConfirmGoldenUploadDto) {
    const golden = await this.prisma.goldenSolution.findUnique({
      where: { id: goldenSolutionId },
    });
    if (!golden) {
      throw new NotFoundException('Golden solution không tồn tại');
    }

    await this.assertCanConfirmUpload(user, golden);

    const prefix = buildGoldenSolutionObjectKeyPrefix(golden.problemId, goldenSolutionId);
    const key = dto.objectKey.trim();
    if (!key.startsWith(prefix)) {
      throw new ForbiddenException('objectKey không khớp golden solution này');
    }

    return this.prisma.goldenSolution.update({
      where: { id: goldenSolutionId },
      data: { sourceCodeObjectKey: key },
      select: {
        id: true,
        problemId: true,
        language: true,
        isPrimary: true,
        sourceCodeObjectKey: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /** Danh sách golden của một bài (admin hoặc creator problem). */
  async listForProblem(problemId: string, user: RequestUser) {
    await this.assertCanManageProblem(user, problemId);
    return this.prisma.goldenSolution.findMany({
      where: { problemId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        language: true,
        isPrimary: true,
        sourceCodeObjectKey: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}

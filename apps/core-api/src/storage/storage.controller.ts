import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common';
import type { RequestUser } from '../common/interfaces/request-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { BindObjectKeyDto } from './dto/bind-object-key.dto';
import { PresignUploadDto } from './dto/presign-upload.dto';
import { StorageAccessService } from './storage-access.service';
import {
  buildAiGeneratedTestcaseObjectKeys,
  buildAiInputObjectKey,
  buildAvatarObjectKey,
  buildExportObjectKey,
  buildGoldenSolutionObjectKey,
  buildSubmissionArtifactObjectKey,
  buildSubmissionSourceObjectKey,
} from './storage-key.builder';
import { StorageService } from './storage.service';

@ApiTags('storage')
@ApiBearerAuth('JWT')
@Controller('storage')
export class StorageController {
  constructor(
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
    private readonly storageAccess: StorageAccessService,
  ) {}

  @Post('presign/upload')
  @ApiOperation({ summary: 'Tạo presigned PUT URL cho MinIO/S3 (yêu cầu JWT + đúng chủ sở hữu resource)' })
  async presignUpload(@CurrentUser() user: RequestUser, @Body() body: PresignUploadDto) {
    await this.storageAccess.assertPresignUploadAllowed(body, user);
    const objectKey = this.resolveObjectKey(body, user);
    const uploadUrl = await this.storage.createPresignedUploadUrl({
      objectKey,
      expiresInSeconds: body.expiresInSeconds ?? 900,
    });
    return {
      bucket: this.storage.getBucketName(),
      objectKey,
      uploadUrl,
    };
  }

  @Get('presign/download')
  @ApiOperation({ summary: 'Tạo presigned GET URL từ object key (yêu cầu JWT + quyền đọc)' })
  async presignDownload(
    @CurrentUser() user: RequestUser,
    @Query('objectKey') objectKey?: string,
    @Query('expiresInSeconds') expiresInSeconds?: string,
  ) {
    if (!objectKey) {
      throw new BadRequestException('objectKey is required');
    }
    await this.storageAccess.assertPresignDownloadAllowed(objectKey, user);
    const ttl = expiresInSeconds ? Number(expiresInSeconds) : 900;
    const downloadUrl = await this.storage.createPresignedDownloadUrl(objectKey, ttl);
    return { objectKey, downloadUrl };
  }

  @Post('bind-object-key')
  @ApiOperation({ summary: 'Gắn object key vào record (AI input / export / golden) — JWT + chủ record' })
  async bindObjectKey(@CurrentUser() user: RequestUser, @Body() body: BindObjectKeyDto) {
    if (!body.recordId || !body.objectKey) {
      throw new BadRequestException('recordId and objectKey are required');
    }
    await this.storageAccess.assertBindObjectKeyAllowed(body, user);

    switch (body.resourceKind) {
      case 'ai-input':
        return this.prisma.aiGenerationJob.update({
          where: { id: body.recordId },
          data: {
            inputDocObjectKey: body.objectKey,
            inputDocUrl: null,
            inputDocFileName: body.fileName,
            inputDocContentType: body.contentType,
            inputDocSizeBytes: body.sizeBytes,
          },
        });
      case 'export':
        return this.prisma.reportExport.update({
          where: { id: body.recordId },
          data: {
            fileObjectKey: body.objectKey,
            fileUrl: null,
          },
        });
      case 'golden-solution':
        return this.prisma.goldenSolution.update({
          where: { id: body.recordId },
          data: {
            sourceCodeObjectKey: body.objectKey,
          },
        });
      default:
        throw new BadRequestException('Unsupported resourceKind');
    }
  }

  private resolveObjectKey(body: PresignUploadDto, user: RequestUser): string {
    switch (body.resourceKind) {
      case 'avatar':
        return buildAvatarObjectKey(user.userId, body.extension ?? 'bin');
      case 'submission-source':
        return buildSubmissionSourceObjectKey(body.submissionId ?? 'unknown', body.fileName);
      case 'submission-artifact':
        return buildSubmissionArtifactObjectKey(
          body.submissionId ?? 'unknown',
          body.fileName ?? 'artifact.bin',
        );
      case 'golden-solution':
        return buildGoldenSolutionObjectKey(
          body.problemId ?? 'unknown',
          body.goldenSolutionId ?? 'unknown',
          body.fileName ?? 'source.txt',
        );
      case 'ai-input':
        return buildAiInputObjectKey(body.jobId ?? 'unknown', body.fileName ?? 'input.bin');
      case 'ai-testcase': {
        const keys = buildAiGeneratedTestcaseObjectKeys(body.jobId ?? 'unknown', body.testCaseIndex ?? 0);
        return body.fileName === 'expected.txt' ? keys.expected : keys.input;
      }
      case 'export':
        return buildExportObjectKey(
          body.contestId ?? 'unknown',
          body.exportId ?? 'unknown',
          body.extension ?? 'bin',
        );
      default:
        return buildSubmissionArtifactObjectKey('unknown', 'unknown.bin');
    }
  }
}

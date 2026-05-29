import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ExportFormat, ExportJobStatus, Role } from '@prisma/client';
import type { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { REPORT_EXPORT_JOB_ATTEMPTS } from '../common';
import { REPORT_EXPORT_QUEUE } from '../queues/tokens';
import { buildProfessionalExcelBuffer } from '../common/utils/excel-professional-report';
import { ContestsService } from '../contests/contests.service';
import type { RequestUser } from '../common/interfaces/request-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { buildExportObjectKey } from '../storage/storage-key.builder';
import { StorageService } from '../storage/storage.service';
import { ReportsAccessService } from './reports-access.service';
import { ReportsAggregationService } from './reports-aggregation.service';
import {
  buildAdminProblemReportDocument,
  buildClassroomReportDocument,
  buildContestReportDocument,
  buildProblemReportDocument,
} from './reports-builders';
import type { ReportAuthor } from './reports-format.util';
import { resolveClassroomReportScope } from './reports-classroom-scope';
import { resolveContestReportLeaderboard } from './reports-contest-roster.util';
import {
  REPORT_EXPORT_JOB_NAME,
  type ContestExportJobPayload,
} from './reports-export.types';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly access: ReportsAccessService,
    private readonly aggregation: ReportsAggregationService,
    private readonly contestsService: ContestsService,
    @Inject(REPORT_EXPORT_QUEUE) private readonly reportExportQueue: Queue<ContestExportJobPayload>,
  ) {}

  async enqueueContestExportJob(payload: ContestExportJobPayload): Promise<void> {
    await this.reportExportQueue.add(REPORT_EXPORT_JOB_NAME, payload, {
      jobId: payload.exportId,
      attempts: REPORT_EXPORT_JOB_ATTEMPTS,
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  private async resolveAuthor(userId: string): Promise<ReportAuthor> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    return { name: u?.name ?? 'N/A', email: u?.email ?? '' };
  }

  async exportClassroom(classRoomId: string, user: RequestUser) {
    await this.access.assertCanExportClassroom(classRoomId, user);
    const [overview, author] = await Promise.all([
      this.aggregation.getClassroomOverview(classRoomId),
      this.resolveAuthor(user.userId),
    ]);
    const generatedAt = new Date();
    const buffer = await buildProfessionalExcelBuffer(
      buildClassroomReportDocument(overview, author, generatedAt),
    );
    const exportId = randomUUID();
    const objectKey = `exports/classrooms/${classRoomId}/${exportId}.xlsx`;
    await this.storage.putObject(objectKey, buffer, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const downloadUrl = await this.storage.createPresignedDownloadUrl(objectKey, 3600);
    const safeName = overview.className.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 80);
    const dateStamp = generatedAt.toISOString().slice(0, 10);
    return {
      downloadUrl,
      fileName: `Bao-cao-lop-${safeName}-${overview.classCode}-${dateStamp}.xlsx`,
      expiresInSeconds: 3600,
    };
  }

  async exportProblem(classRoomId: string, problemId: string, user: RequestUser) {
    await this.access.assertCanExportProblem(classRoomId, problemId, user);
    const [stats, author] = await Promise.all([
      this.aggregation.getProblemClassStats(classRoomId, problemId),
      this.resolveAuthor(user.userId),
    ]);
    const generatedAt = new Date();
    const buffer = await buildProfessionalExcelBuffer(
      buildProblemReportDocument(stats, author, generatedAt),
    );
    const exportId = randomUUID();
    const objectKey = `exports/problems/${classRoomId}/${problemId}/${exportId}.xlsx`;
    await this.storage.putObject(objectKey, buffer, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const downloadUrl = await this.storage.createPresignedDownloadUrl(objectKey, 3600);
    const safeTitle = stats.problemTitle.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 60);
    const dateStamp = generatedAt.toISOString().slice(0, 10);
    return {
      downloadUrl,
      fileName: `Bao-cao-bai-${safeTitle}-${dateStamp}.xlsx`,
      expiresInSeconds: 3600,
    };
  }

  async exportAdminProblem(problemId: string, user: RequestUser) {
    const meta = await this.access.assertCanExportAdminProblem(problemId, user);
    const author = await this.resolveAuthor(user.userId);
    const generatedAt = new Date();

    const overview = await this.aggregation.getAdminProblemStats(problemId);
    const sheets: Awaited<ReturnType<typeof buildAdminProblemReportDocument>> = [
      ...buildAdminProblemReportDocument(overview, author, generatedAt),
    ];

    if (meta.assignmentClassRoomIds.length > 0) {
      const classSheets = await Promise.all(
        meta.assignmentClassRoomIds.map(async (classRoomId) => {
          const classStats = await this.aggregation.getProblemClassStats(
            classRoomId,
            problemId,
          );
          return buildProblemReportDocument(classStats, author, generatedAt);
        }),
      );
      sheets.push(...classSheets.flat());
    }

    const buffer = await buildProfessionalExcelBuffer(sheets);
    const exportId = randomUUID();
    const objectKey = `exports/admin/problems/${problemId}/${exportId}.xlsx`;
    await this.storage.putObject(objectKey, buffer, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const downloadUrl = await this.storage.createPresignedDownloadUrl(objectKey, 3600);
    const safeTitle = sheets[0]?.context.title?.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 60) ?? problemId;
    return {
      downloadUrl,
      fileName: `Bao-cao-admin-bai-${safeTitle}-${generatedAt.toISOString().slice(0, 10)}.xlsx`,
      expiresInSeconds: 3600,
    };
  }

  async createContestExport(
    contestId: string,
    user: RequestUser,
    format: ExportFormat = ExportFormat.XLSX,
  ) {
    if (format !== ExportFormat.XLSX) {
      throw new BadRequestException('Hiện chỉ hỗ trợ định dạng XLSX');
    }
    if (user.role === Role.ADMIN) {
      await this.access.assertCanExportAdminContest(contestId, user);
    } else {
      await this.access.assertCanExportContest(contestId, user);
    }

    const row = await this.prisma.reportExport.create({
      data: {
        contestId,
        requestedById: user.userId,
        format,
        status: ExportJobStatus.PENDING,
      },
    });

    await this.enqueueContestExportJob({
      exportId: row.id,
      contestId,
      requestedById: user.userId,
    });

    return {
      id: row.id,
      contestId: row.contestId,
      status: row.status,
      format: row.format,
      createdAt: row.createdAt,
    };
  }

  async getContestExport(contestId: string, exportId: string, user: RequestUser) {
    await this.access.assertCanExportContest(contestId, user);
    const row = await this.prisma.reportExport.findFirst({
      where: { id: exportId, contestId },
      include: { contest: { select: { title: true } } },
    });
    if (!row) {
      throw new NotFoundException('Report export không tồn tại');
    }
    if (row.requestedById !== user.userId && user.role !== 'ADMIN') {
      throw new NotFoundException('Report export không tồn tại');
    }

    let downloadUrl: string | null = null;
    if (row.status === ExportJobStatus.DONE && row.fileObjectKey) {
      downloadUrl = await this.storage.createPresignedDownloadUrl(row.fileObjectKey, 3600);
    }

    const safeTitle = (row.contest?.title ?? 'contest')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .slice(0, 50);

    return {
      id: row.id,
      contestId: row.contestId,
      status: row.status,
      format: row.format,
      errorMessage: row.errorMessage,
      downloadUrl,
      fileName:
        row.status === ExportJobStatus.DONE
          ? `Bao-cao-contest-${safeTitle}.xlsx`
          : null,
      createdAt: row.createdAt,
      completedAt: row.completedAt,
    };
  }

  async runContestExportJob(exportId: string, contestId: string, requestedById: string) {
    const existing = await this.prisma.reportExport.findUnique({
      where: { id: exportId },
      select: { status: true },
    });
    if (existing?.status === ExportJobStatus.DONE) {
      return;
    }

    const MAX_LEADERBOARD_ROWS = 5000;
    try {
      const requester = await this.prisma.user.findUnique({
        where: { id: requestedById },
        select: { id: true, email: true, role: true, name: true },
      });
      if (!requester) {
        throw new NotFoundException('User not found');
      }
      const viewer = {
        userId: requester.id,
        email: requester.email,
        role: requester.role,
      };
      const author: ReportAuthor = { name: requester.name, email: requester.email };
      const lb = await this.contestsService.getLeaderboard(contestId, viewer);
      const classAssignment = await this.prisma.classAssignment.findFirst({
        where: { contestId },
        select: { classRoomId: true },
      });
      const classRoomId = classAssignment?.classRoomId ?? null;
      const scope = classRoomId
        ? await resolveClassroomReportScope(this.prisma, classRoomId)
        : undefined;
      const staffIds = scope ? [...scope.staffUserIds] : [];

      const leaderboard = await resolveContestReportLeaderboard(this.prisma, {
        contestId,
        classRoomId,
        scope,
        rawLeaderboard: lb.leaderboard,
      });

      if (leaderboard.length > MAX_LEADERBOARD_ROWS) {
        throw new BadRequestException(
          `Contest có ${leaderboard.length} dòng báo cáo — vượt giới hạn ${MAX_LEADERBOARD_ROWS}. Hãy lọc hoặc chia nhỏ.`,
        );
      }

      const generatedAt = new Date();
      const rosterMode = classRoomId ? ('classroom' as const) : ('public' as const);
      const scopeNote = classRoomId
        ? 'Danh sách đủ học viên lớp (MEMBER ACTIVE); không gồm chủ lớp / giáo viên (OWNER).'
        : 'Chỉ người đã tham gia contest (có trên BXH / đã nộp).';
      const submissionAttempts = await this.aggregation.getContestSubmissionAttempts(
        contestId,
        staffIds,
      );
      const buffer = await buildProfessionalExcelBuffer(
        buildContestReportDocument(
          lb.contest,
          submissionAttempts,
          leaderboard,
          author,
          generatedAt,
          { scopeNote, rosterMode },
        ),
      );
      const objectKey = buildExportObjectKey(contestId, exportId, 'xlsx');
      await this.storage.putObject(objectKey, buffer, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      await this.prisma.reportExport.update({
        where: { id: exportId },
        data: {
          status: ExportJobStatus.DONE,
          fileObjectKey: objectKey,
          fileUrl: null,
          completedAt: new Date(),
          errorMessage: null,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Export failed';
      await this.prisma.reportExport.update({
        where: { id: exportId },
        data: {
          status: ExportJobStatus.FAILED,
          errorMessage: message,
          completedAt: new Date(),
        },
      });
    }
  }
}

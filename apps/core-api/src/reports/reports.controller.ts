import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExportFormat, Role } from '@prisma/client';
import { CurrentUser, Roles } from '../common';
import type { RequestUser } from '../common/interfaces/request-user.interface';
import { CreateContestExportDto } from './dto/create-contest-export.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth('JWT')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @ApiOperation({ summary: 'Xuất báo cáo tổng hợp lớp (bài tập + contest) — ADMIN / chủ lớp' })
  @Get('classrooms/:classRoomId/export')
  exportClassroom(
    @Param('classRoomId') classRoomId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reports.exportClassroom(classRoomId, user);
  }

  @ApiOperation({ summary: 'Xuất báo cáo một bài tập trong lớp — ADMIN / chủ lớp' })
  @Get('classrooms/:classRoomId/problems/:problemId/export')
  exportProblem(
    @Param('classRoomId') classRoomId: string,
    @Param('problemId') problemId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reports.exportProblem(classRoomId, problemId, user);
  }

  @ApiOperation({ summary: 'Tạo job xuất báo cáo contest (XLSX)' })
  @Post('contests/:contestId/exports')
  createContestExport(
    @Param('contestId') contestId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateContestExportDto,
  ) {
    return this.reports.createContestExport(
      contestId,
      user,
      dto.format ?? ExportFormat.XLSX,
    );
  }

  @ApiOperation({ summary: 'Trạng thái job export contest + URL tải' })
  @Get('contests/:contestId/exports/:exportId')
  getContestExport(
    @Param('contestId') contestId: string,
    @Param('exportId') exportId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reports.getContestExport(contestId, exportId, user);
  }

  @Roles(Role.ADMIN)
  @ApiOperation({
    summary:
      'Admin: xuất báo cáo problem PUBLIC (kho đề) hoặc theo lớp nếu bài gắn nhiều lớp',
  })
  @Get('admin/problems/:problemId/export')
  exportAdminProblem(
    @Param('problemId') problemId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reports.exportAdminProblem(problemId, user);
  }

  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Admin: tạo job export contest kho hệ thống (không gắn lớp)',
  })
  @Post('admin/contests/:contestId/exports')
  createAdminContestExport(
    @Param('contestId') contestId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateContestExportDto,
  ) {
    return this.reports.createContestExport(
      contestId,
      user,
      dto.format ?? ExportFormat.XLSX,
    );
  }
}

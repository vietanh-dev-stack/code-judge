import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common';
import type { RequestUser } from '../common/interfaces/request-user.interface';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { FinalizeSubmissionDto } from './dto/finalize-submission.dto';
import { FindSubmissionsDto } from './dto/find-submissions.dto';
import { ReserveSubmissionDto } from './dto/reserve-submission.dto';
import { SubmissionsService } from './submissions.service';

@ApiTags('submissions')
@ApiBearerAuth('JWT')
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @ApiOperation({ summary: 'Tạo submission và đẩy job vào hàng đợi chấm (JWT — user từ token)' })
  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateSubmissionDto) {
    const submission = await this.submissionsService.createAndEnqueue(dto, user);
    return {
      submissionId: submission.id,
      status: submission.status,
    };
  }

  @ApiOperation({
    summary: 'Giữ chỗ submission (Pending) trước khi upload source lên MinIO qua presign',
  })
  @Post('reserve')
  async reserve(@CurrentUser() user: RequestUser, @Body() dto: ReserveSubmissionDto) {
    return this.submissionsService.reserve(dto, user);
  }

  @ApiOperation({ summary: 'Gắn sourceCodeObjectKey sau PUT MinIO và enqueue judge' })
  @Post(':id/finalize')
  async finalize(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: FinalizeSubmissionDto,
  ) {
    return this.submissionsService.finalize(id, dto, user);
  }

  @ApiOperation({ summary: 'Danh sách submission của user hiện tại (lọc theo problemId tuỳ chọn)' })
  @Get()
  async findAll(@CurrentUser() user: RequestUser, @Query() query: FindSubmissionsDto) {
    return this.submissionsService.findMany(query, user);
  }

  @ApiOperation({ summary: 'Lấy thông tin submission theo id (chủ bài / giáo viên / admin)' })
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.submissionsService.findById(id, user);
  }

}

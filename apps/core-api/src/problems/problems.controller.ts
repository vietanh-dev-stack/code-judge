import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RequestUser } from '../common/interfaces/request-user.interface';
import { CurrentUser, Public, Roles } from '../common';
import { GenerateAiTestcaseDto } from '../ai-testcase/dto/generate-ai-testcase.dto';
import { GenerateAiProjectTestcaseDto } from '../ai-testcase/dto/generate-ai-project-testcase.dto';
import { AiTestcaseService } from '../ai-testcase/ai-testcase.service';
import { CreateAdminProblemDto } from './dto/create-admin-problem.dto';
import { CreateProblemDto } from './dto/create-problem.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';
import { AdminProblemsService } from './admin-problems.service';
import { ProblemsService } from './problems.service';

/**
 * REST `problems`.
 * Thứ tự route: path tĩnh (`admin/all`, `generate-test-cases-draft`) trước `:id` để tránh nhầm segment với id.
 */
@ApiTags('problems')
@Controller('problems')
export class ProblemsController {
  constructor(
    private readonly problemsService: ProblemsService,
    private readonly adminProblemsService: AdminProblemsService,
    private readonly aiTestcaseService: AiTestcaseService,
  ) {}

  @Public()
  @ApiOperation({ summary: 'Danh sách problem public' })
  @Get()
  async findAll(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('classRoomId') classRoomId?: string,
    @Query('difficulty') difficulty?: string,
    @Query('mode') mode?: string,
    @Query('tagId') tagId?: string,
    @Query('tagSlug') tagSlug?: string,
  ) {
    return this.problemsService.findAll({
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      classRoomId,
      difficulty,
      mode,
      tagId,
      tagSlug,
    });
  }

  @ApiBearerAuth('JWT')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin: danh sách tất cả problem (kèm private / unpublished)' })
  @Get('admin/all')
  async findAllAdmin(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('tagId') tagId?: string,
    @Query('tagSlug') tagSlug?: string,
  ) {
    return this.problemsService.findAllAdmin({
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      tagId,
      tagSlug,
    });
  }

  @ApiBearerAuth('JWT')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin: tạo problem không gán lớp (không ClassAssignment)' })
  @Post('admin')
  async createAdmin(@CurrentUser() user: RequestUser, @Body() dto: CreateAdminProblemDto) {
    return this.adminProblemsService.create(dto, user.userId);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary:
      'Sinh bản nháp test case bằng AI (chưa lưu DB). User đã đăng nhập; dùng khi soạn đề / tạo problem.',
  })
  @Post('generate-test-cases-draft')
  async generateTestCasesDraft(@Body() dto: GenerateAiTestcaseDto) {
    return this.aiTestcaseService.generateDraft(dto);
  }

  @ApiBearerAuth('JWT')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Sinh bản nháp hidden tests PROJECT (phân tích đề + file test). Chỉ ADMIN.',
  })
  @Post('generate-project-test-cases-draft')
  async generateProjectTestCasesDraft(@Body() dto: GenerateAiProjectTestcaseDto) {
    return this.aiTestcaseService.generateProjectDraft(dto);
  }

  @Public()
  @ApiOperation({ summary: 'Lấy chi tiết problem theo id' })
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.problemsService.findById(id, req);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Tạo problem mới (chủ lớp / enrollment OWNER hoặc admin)' })
  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateProblemDto) {
    return this.problemsService.create(dto, user.userId, user.role);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Cập nhật problem (creator, chủ lớp đang gán bài, hoặc admin)' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateProblemDto,
  ) {
    return this.problemsService.update(id, dto, user.userId, user.role);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Xóa problem (creator, chủ lớp đang gán bài, hoặc admin)' })
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.problemsService.delete(id, user.userId, user.role);
  }
}

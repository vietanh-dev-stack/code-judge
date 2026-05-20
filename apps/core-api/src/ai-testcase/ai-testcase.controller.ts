import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, Roles } from '../common';
import type { RequestUser } from '../common/interfaces/request-user.interface';
import { GenerateAiTestcaseDto } from './dto/generate-ai-testcase.dto';
import { GenerateAiProjectTestcaseDto } from './dto/generate-ai-project-testcase.dto';
import { AiTestcaseService } from './ai-testcase.service';
import { QuickGenerateAiTestcaseDto } from './dto/quick-generate-ai-testcase.dto';
import { GenerateAndSaveAiTestcaseDto } from './dto/generate-and-save-ai-testcase.dto';
import { VerifyTestcasesWithGoldenDto } from './dto/verify-testcases-with-golden.dto';
import { AiGoldenVerifyService } from './ai-golden-verify.service';
import { ExplainProjectTestFileDto } from './dto/explain-project-test-file.dto';
import { TestGenerateProjectSampleDto } from './dto/test-generate-project-sample.dto';
import { PROJECT_TESTCASE_SAMPLE_KEYS } from './project-testcase-samples';

@ApiTags('ai-testcase')
@ApiBearerAuth('JWT')
@Controller('ai-testcase')
export class AiTestcaseController {
  constructor(
    private readonly aiTestcaseService: AiTestcaseService,
    private readonly aiGoldenVerifyService: AiGoldenVerifyService,
  ) {}

  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Quick test AI (chỉ ADMIN): paste đề và sinh testcase ngay',
  })
  @Post('quick-generate')
  async quickGenerate(@Body() dto: QuickGenerateAiTestcaseDto) {
    return this.aiTestcaseService.quickGenerate(dto);
  }

  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Sinh bản nháp testcase từ AI (chỉ ADMIN)',
  })
  @Post('generate-draft')
  async generateDraft(@Body() dto: GenerateAiTestcaseDto) {
    return this.aiTestcaseService.generateDraft(dto);
  }

  @Roles(Role.ADMIN)
  @ApiOperation({
    summary:
      'Sinh bản nháp hidden tests PROJECT (file bundle + phân tích đề bài). Chỉ ADMIN.',
    description:
      'LLM trả về problemBrief (FR-*), testManifest, files runnable, runConfig. Có validator tĩnh trước khi coi là hợp lệ.',
  })
  @Post('generate-project-draft')
  async generateProjectDraft(@Body() dto: GenerateAiProjectTestcaseDto) {
    return this.aiTestcaseService.generateProjectDraft(dto);
  }

  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Danh sách 3 sample đề PROJECT (backend, frontend, fullstack) — không gọi LLM',
    description:
      'Dùng payload `dto` để gọi POST /ai-testcase/generate-project-draft hoặc POST test-generate-project-sample.',
  })
  @Get('project-testcase-samples')
  listProjectTestcaseSamples() {
    return this.aiTestcaseService.listProjectTestcaseSamples();
  }

  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Test sinh PROJECT testcase từ sample tích hợp sẵn',
    description: `Body.sample: ${PROJECT_TESTCASE_SAMPLE_KEYS.join(' | ')}. Bỏ sample để chạy cả 3 (3 lần LLM). Cần OPENAI_API_KEY hoặc GOOGLE_GENERATIVE_AI_API_KEY.`,
  })
  @Post('test-generate-project-sample')
  testGenerateProjectSample(@Body() dto: TestGenerateProjectSampleDto) {
    return this.aiTestcaseService.testGenerateProjectSample(dto);
  }

  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Giải thích một file test PROJECT (AI, tiếng Việt)',
    description: 'Dùng sau khi generate draft — gửi filePath + fileContent + problemSummary.',
  })
  @Post('explain-project-test-file')
  explainProjectTestFile(@Body() dto: ExplainProjectTestFileDto) {
    return this.aiTestcaseService.explainProjectTestFile(dto);
  }

  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Shortcut: test sample backend',
  })
  @Post('test-generate-project-sample/backend')
  testGenerateProjectSampleBackend(@Body() body: Omit<TestGenerateProjectSampleDto, 'sample'>) {
    return this.aiTestcaseService.testGenerateProjectSample({ ...body, sample: 'backend' });
  }

  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Shortcut: test sample frontend' })
  @Post('test-generate-project-sample/frontend')
  testGenerateProjectSampleFrontend(@Body() body: Omit<TestGenerateProjectSampleDto, 'sample'>) {
    return this.aiTestcaseService.testGenerateProjectSample({ ...body, sample: 'frontend' });
  }

  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Shortcut: test sample fullstack' })
  @Post('test-generate-project-sample/fullstack')
  testGenerateProjectSampleFullstack(@Body() body: Omit<TestGenerateProjectSampleDto, 'sample'>) {
    return this.aiTestcaseService.testGenerateProjectSample({ ...body, sample: 'fullstack' });
  }

  @ApiOperation({
    summary:
      'Sinh testcase và ghi DB — ALGO: input/output; PROJECT: testManifest + file bundle trong job. JWT creator/admin.',
  })
  @Post('generate-and-save')
  async generateAndSave(@CurrentUser() user: RequestUser, @Body() dto: GenerateAndSaveAiTestcaseDto) {
    return this.aiTestcaseService.generateAndSave(dto, user);
  }

  @ApiOperation({
    summary:
      'Chạy golden solution (đa ngôn ngữ) trên test case AI draft hoặc test đã lưu DB — so khớp stdout với expectedOutput',
    description:
      'Cần JWT. Hỗ trợ python, javascript, java, cpp, c, go, rust (khi goldenSourceCode). Golden trong DB: dùng trường language của bản ghi. Worker không Lambda: chỉ chạy local Python; các ngôn ngữ khác cần Lambda judge.',
  })
  @Post('verify-testcases-with-golden')
  async verifyTestcasesWithGolden(
    @CurrentUser() user: RequestUser,
    @Body() dto: VerifyTestcasesWithGoldenDto,
  ) {
    return this.aiGoldenVerifyService.verify(dto, user);
  }

  @ApiOperation({
    summary: 'Danh sách tài liệu upload gắn job AI của một problem (theo quyền creator / chủ job / admin)',
  })
  @Get('problems/:problemId/documents')
  async listProblemDocuments(@CurrentUser() user: RequestUser, @Param('problemId') problemId: string) {
    return this.aiTestcaseService.listProblemDocuments(problemId, user);
  }

  @ApiOperation({
    summary: 'Presigned download cho tài liệu input của job AI (quyền creator job / creator problem / admin)',
  })
  @Get('jobs/:jobId/document/download')
  async getJobDocumentDownload(
    @CurrentUser() user: RequestUser,
    @Param('jobId') jobId: string,
    @Query('expiresInSeconds') expiresInSeconds?: string,
  ) {
    return this.aiTestcaseService.getJobDocumentDownload(
      jobId,
      user,
      expiresInSeconds ? Number(expiresInSeconds) : undefined,
    );
  }
}

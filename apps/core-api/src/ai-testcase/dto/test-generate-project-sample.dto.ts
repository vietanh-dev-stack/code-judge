import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PROJECT_TESTCASE_SAMPLE_KEYS, type ProjectTestcaseSampleKey } from '../project-testcase-samples';

export class TestGenerateProjectSampleDto {
  @ApiPropertyOptional({
    enum: PROJECT_TESTCASE_SAMPLE_KEYS,
    example: 'backend',
    description:
      'Chọn một sample. Bỏ trống để chạy lần lượt cả 3 (backend, frontend, fullstack) — tốn 3 lần gọi LLM.',
  })
  @IsOptional()
  @IsIn([...PROJECT_TESTCASE_SAMPLE_KEYS])
  sample?: ProjectTestcaseSampleKey;

  @ApiPropertyOptional({
    enum: ['openai', 'google'],
    description: 'Override AI provider (mặc định từ env)',
  })
  @IsOptional()
  @IsIn(['openai', 'google'])
  provider?: 'openai' | 'google';

  @ApiPropertyOptional({ description: 'Override model name' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class GenerateAndSaveAiTestcaseDto {
  @ApiProperty({ example: 'problem-id-uuid' })
  @IsString()
  @MaxLength(100)
  problemId!: string;

  @ApiPropertyOptional({
    description:
      'Đã bỏ tin cậy field này — server luôn dùng userId từ JWT. Giữ optional để tương thích client cũ.',
    deprecated: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  createdById?: string;

  @ApiPropertyOptional({ example: 8, description: 'Override max testcase generation for this run' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxTestCases?: number;

  @ApiPropertyOptional({ example: 'Input: n\nOutput: result', description: 'Optional IO specification override' })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  ioSpec?: string;

  @ApiPropertyOptional({ example: 'Supplementary text extracted from uploaded project docs' })
  @IsOptional()
  @IsString()
  @MaxLength(15000)
  supplementaryText?: string;

  @ApiPropertyOptional({ enum: ['openai', 'google'], default: 'openai' })
  @IsOptional()
  @IsIn(['openai', 'google'])
  provider?: 'openai' | 'google';

  @ApiPropertyOptional({ example: 'gpt-4.1-mini' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;

  @ApiPropertyOptional({ enum: ['backend', 'frontend', 'fullstack'] })
  @IsOptional()
  @IsIn(['backend', 'frontend', 'fullstack'])
  stack?: 'backend' | 'frontend' | 'fullstack';

  @ApiPropertyOptional({ example: 'nest' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  framework?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  rubric?: string;

  @ApiPropertyOptional({ description: 'Mô tả golden solution để căn test' })
  @IsOptional()
  @IsString()
  @MaxLength(12000)
  goldenSummary?: string;
}

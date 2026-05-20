import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class GenerateAiProjectTestcaseDto {
  @ApiProperty({ example: 'REST API Quản lý thư viện' })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({
    example: 'Xây dựng API NestJS với CRUD Book, Author; JWT auth; validation...',
  })
  @IsString()
  @MaxLength(20000)
  statement!: string;

  @ApiPropertyOptional({
    enum: ['backend', 'frontend', 'fullstack'],
    default: 'backend',
  })
  @IsOptional()
  @IsIn(['backend', 'frontend', 'fullstack'])
  stack?: 'backend' | 'frontend' | 'fullstack';

  @ApiPropertyOptional({ example: 'nest', description: 'express | nest | react | next | ...' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  framework?: string;

  @ApiPropertyOptional({ example: 'Easy' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  difficulty?: string;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  maxTestCases?: number;

  @ApiPropertyOptional({
    description: 'Rubric / thang điểm từ giảng viên',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  rubric?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['Đăng nhập trả JWT', 'CRUD Book có pagination'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  acceptanceCriteria?: string[];

  @ApiPropertyOptional({
    description: 'Mô tả surface golden (routes, exports) để test import đúng',
  })
  @IsOptional()
  @IsString()
  @MaxLength(12000)
  goldenSummary?: string;

  @ApiPropertyOptional({
    description: 'Cấu trúc starter code học viên (thư mục, entry point)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  starterTemplateSummary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(15000)
  supplementaryText?: string;

  @ApiPropertyOptional({ example: 'npm ci' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  installCommand?: string;

  @ApiPropertyOptional({ example: 'npm test -- --json --outputFile=result.json' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  testCommand?: string;

  @ApiPropertyOptional({ enum: ['jest-json', 'playwright-json'] })
  @IsOptional()
  @IsIn(['jest-json', 'playwright-json'])
  resultParser?: 'jest-json' | 'playwright-json';

  @ApiPropertyOptional({ example: 'node:18-alpine' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  dockerImage?: string;

  @ApiPropertyOptional({ enum: ['openai', 'google'] })
  @IsOptional()
  @IsIn(['openai', 'google'])
  provider?: 'openai' | 'google';

  @ApiPropertyOptional({ example: 'gpt-4.1-mini' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  revision?: {
    promptVersionUsed?: string;
    previousOutputSummary?: string;
    userFeedback?: string;
    validatorIssues?: string[];
  };
}

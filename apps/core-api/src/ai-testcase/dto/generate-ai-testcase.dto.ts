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

export class GenerateAiTestcaseDto {
  @ApiProperty({ example: 'Two Sum' })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: 'Given an array of integers and target...' })
  @IsString()
  @MaxLength(20000)
  statement!: string;

  @ApiPropertyOptional({ example: 'Easy' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  difficulty?: string;

  @ApiPropertyOptional({ example: 1000, description: 'Time limit in milliseconds' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(300000)
  timeLimitMs?: number;

  @ApiPropertyOptional({ example: 256, description: 'Memory limit in MB' })
  @IsOptional()
  @IsInt()
  @Min(8)
  @Max(8192)
  memoryLimitMb?: number;

  @ApiPropertyOptional({ type: [String], example: ['cpp', 'python'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  supportedLanguages?: string[];

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxTestCases?: number;

  @ApiPropertyOptional({ example: 'Input: n\\nOutput: f(n)' })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  ioSpec?: string;

  @ApiPropertyOptional({ example: 'Additional constraints from uploaded doc...' })
  @IsOptional()
  @IsString()
  @MaxLength(15000)
  supplementaryText?: string;

  @ApiPropertyOptional({
    enum: ['openai', 'google'],
    default: 'openai',
  })
  @IsOptional()
  @IsIn(['openai', 'google'])
  provider?: 'openai' | 'google';

  @ApiPropertyOptional({ example: 'gpt-4.1-mini' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;

  @ApiPropertyOptional({
    description: 'Prompt revision context from previous attempt',
    type: 'object',
    additionalProperties: true,
    example: {
      promptVersionUsed: 'v1',
      previousOutputSummary: 'Missing boundary testcase for n=0',
      userFeedback: 'Please add edge cases and hidden tests.',
      validatorIssues: ['expectedOutput format inconsistent'],
    },
  })
  @IsOptional()
  @IsObject()
  revision?: {
    promptVersionUsed?: string;
    previousOutputSummary?: string;
    userFeedback?: string;
    validatorIssues?: string[];
  };
}

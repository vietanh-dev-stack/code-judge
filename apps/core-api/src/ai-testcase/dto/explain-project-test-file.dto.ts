import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ExplainProjectTestFileDto {
  @ApiProperty({ example: 'tests/api/auth.spec.ts' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  filePath!: string;

  @ApiProperty({ description: 'Nội dung file test cần giải thích' })
  @IsString()
  @MinLength(1)
  @MaxLength(80000)
  fileContent!: string;

  @ApiPropertyOptional({ description: 'Tóm tắt đề bài từ problemBrief' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  problemSummary?: string;

  @ApiPropertyOptional({
    description: 'Các test trong manifest gắn với file này (JSON string hoặc để server match theo filePath)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  relatedTestsJson?: string;

  @ApiPropertyOptional({ enum: ['openai', 'google'] })
  @IsOptional()
  @IsIn(['openai', 'google'])
  provider?: 'openai' | 'google';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;
}

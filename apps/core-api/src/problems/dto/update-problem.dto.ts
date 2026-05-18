import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTestCaseDto } from './create-test-case.dto';

export class UpdateProblemDto {
  @ApiPropertyOptional({ example: '2026-05-10T12:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @ApiPropertyOptional({ example: 'Tính tổng hai số' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Cho hai số a, b ...' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'print(i+j)' })
  @IsOptional()
  @IsString()
  statementMd?: string;

  @ApiPropertyOptional({ enum: ['EASY', 'MEDIUM', 'HARD'], default: 'EASY' })
  @IsOptional()
  @IsIn(['EASY', 'MEDIUM', 'HARD'])
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';

  @ApiPropertyOptional({ enum: ['ALGO', 'PROJECT'], default: 'ALGO' })
  @IsOptional()
  @IsIn(['ALGO', 'PROJECT'])
  mode?: 'ALGO' | 'PROJECT';

  @ApiPropertyOptional({ example: 1000, default: 1000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  timeLimitMs?: number;

  @ApiPropertyOptional({ example: 256, default: 256 })
  @IsOptional()
  @IsInt()
  @Min(1)
  memoryLimitMb?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ enum: ['PRIVATE', 'PUBLIC', 'CONTEST_ONLY'], default: 'PUBLIC' })
  @IsOptional()
  @IsIn(['PRIVATE', 'PUBLIC', 'CONTEST_ONLY'])
  visibility?: 'PRIVATE' | 'PUBLIC' | 'CONTEST_ONLY';

  @ApiPropertyOptional({ example: ['PYTHON', 'JAVASCRIPT'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedLanguages?: string[];

  @ApiPropertyOptional({ example: 100, default: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxTestCases?: number;

  @ApiPropertyOptional({ type: [CreateTestCaseDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTestCaseDto)
  testCases?: CreateTestCaseDto[];

  @ApiPropertyOptional({
    type: [String],
    description: 'UUID các Tag gán cho đề; gửi [] để gỡ hết tag. Bỏ qua field này nếu không đổi tag.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @IsUUID('4', { each: true })
  tagIds?: string[];
}

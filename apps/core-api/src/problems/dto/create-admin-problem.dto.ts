import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTestCaseDto } from './create-test-case.dto';

/** Tạo problem kho đề — không tạo ClassAssignment. Chỉ ADMIN. */
export class CreateAdminProblemDto {
  @ApiProperty({ example: 'Tính tổng hai số' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'Cho hai số a, b ...' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: '## Đề bài\n...' })
  @IsString()
  @IsNotEmpty()
  statementMd!: string;

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

  @ApiPropertyOptional({ type: [String], description: 'UUID các Tag gán cho đề' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @IsUUID('4', { each: true })
  tagIds?: string[];
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateContestProblemDto {
  @ApiPropertyOptional({ example: '1a2b3c4d' })
  @IsOptional()
  @IsString()
  problemId?: string;

  @ApiPropertyOptional({ example: 100, default: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  points?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  timeLimitMsOverride?: number;

  @ApiPropertyOptional({ example: 256 })
  @IsOptional()
  @IsInt()
  @Min(1)
  memoryLimitMbOverride?: number;
}

export class UpdateContestDto {
  @ApiPropertyOptional({ example: 'Cuộc thi lập trình tuần 1' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsString()
  classRoomId?: string;

  @ApiPropertyOptional({ example: 'Contest public cho mọi người' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '2026-05-10T08:00:00.000Z' })
  @IsOptional()
  @IsString()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional({ example: '2026-05-10T12:00:00.000Z' })
  @IsOptional()
  @IsString()
  @IsDateString()
  endAt?: string;

  @ApiPropertyOptional({ enum: ['SUMMARY_ONLY', 'VERBOSE'], default: 'SUMMARY_ONLY' })
  @IsOptional()
  @IsIn(['SUMMARY_ONLY', 'VERBOSE'])
  testFeedbackPolicy?: 'SUMMARY_ONLY' | 'VERBOSE';

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxSubmissionsPerProblem?: number;

  @ApiPropertyOptional({ example: 'secret123' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ type: [UpdateContestProblemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateContestProblemDto)
  problems?: UpdateContestProblemDto[];
}

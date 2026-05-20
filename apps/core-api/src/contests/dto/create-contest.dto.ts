import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateContestProblemDto {
  @ApiProperty({ example: '1a2b3c4d' })
  @IsString()
  @IsNotEmpty()
  problemId!: string;

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

export class CreateContestDto {
  @ApiProperty({ example: 'Cuộc thi lập trình tuần 1' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsString()
  classRoomId?: string;

  @ApiProperty({ example: 'Contest public cho mọi người' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: '2026-05-10T08:00:00.000Z' })
  @IsString()
  @IsDateString()
  startAt!: string;

  @ApiProperty({ example: '2026-05-10T12:00:00.000Z' })
  @IsString()
  @IsDateString()
  endAt!: string;

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

  @ApiPropertyOptional({ type: [CreateContestProblemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateContestProblemDto)
  problems?: CreateContestProblemDto[];
}

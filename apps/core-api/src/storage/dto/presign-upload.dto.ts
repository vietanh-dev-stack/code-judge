import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { STORAGE_RESOURCE_KINDS, type StorageResourceKind } from '../storage-resource.constants';

export class PresignUploadDto {
  @ApiProperty({ enum: STORAGE_RESOURCE_KINDS })
  @IsIn(STORAGE_RESOURCE_KINDS)
  resourceKind!: StorageResourceKind;

  @ApiPropertyOptional({ description: 'Ignored for avatar — server uses JWT user id' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  submissionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  problemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  goldenSolutionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contestId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  exportId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  extension?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  testCaseIndex?: number;

  @ApiPropertyOptional({ default: 900 })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(3600)
  expiresInSeconds?: number;
}

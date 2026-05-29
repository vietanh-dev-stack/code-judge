import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { STORAGE_BIND_RESOURCE_KINDS, type StorageBindResourceKind } from '../storage-resource.constants';

export class BindObjectKeyDto {
  @ApiProperty({ enum: STORAGE_BIND_RESOURCE_KINDS })
  @IsIn(STORAGE_BIND_RESOURCE_KINDS)
  resourceKind!: StorageBindResourceKind;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  recordId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  objectKey!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contentType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sizeBytes?: number;
}

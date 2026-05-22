import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSubmissionDto {
  @ApiPropertyOptional({
    deprecated: true,
    description: 'Ignored when JWT present — server uses authenticated user id',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ example: 'clxxxxxxxxxxxxxxxxxxxxxxxx' })
  @IsString()
  @IsNotEmpty()
  problemId!: string;

  @ApiPropertyOptional({ example: 'clxxxxxxxxxxxxxxxxxxxxxxxx' })
  @IsOptional()
  @IsString()
  contestId?: string;

  @ApiProperty({ enum: ['ALGO', 'PROJECT'], example: 'ALGO' })
  @IsString()
  @IsIn(['ALGO', 'PROJECT'])
  mode!: 'ALGO' | 'PROJECT';

  @ApiPropertyOptional({ example: 'python' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ example: 'print("hi")' })
  @IsOptional()
  @IsString()
  sourceCode?: string;

  @ApiPropertyOptional({
    example: 'submissions/clx.../source/main.py',
    description: 'Object key source code đã upload lên MinIO/S3',
  })
  @IsOptional()
  @IsString()
  sourceCodeObjectKey?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isDryRun?: boolean;
}

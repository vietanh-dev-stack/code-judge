import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReserveSubmissionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  problemId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contestId?: string;

  @ApiProperty({ enum: ['ALGO', 'PROJECT'] })
  @IsString()
  @IsIn(['ALGO', 'PROJECT'])
  mode!: 'ALGO' | 'PROJECT';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDryRun?: boolean;
}

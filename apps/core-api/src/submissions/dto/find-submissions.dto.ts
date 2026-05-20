import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class FindSubmissionsDto {
  @ApiPropertyOptional({ example: 'clxxxxxxxxxxxxxxxxxxxxxxxx' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ example: 'clxxxxxxxxxxxxxxxxxxxxxxxx' })
  @IsOptional()
  @IsString()
  problemId?: string;
}

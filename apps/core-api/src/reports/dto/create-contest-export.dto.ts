import { ApiPropertyOptional } from '@nestjs/swagger';
import { ExportFormat } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class CreateContestExportDto {
  @ApiPropertyOptional({ enum: ExportFormat, default: ExportFormat.XLSX })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat;
}

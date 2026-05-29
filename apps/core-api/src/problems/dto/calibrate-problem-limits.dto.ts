import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class CalibrateProblemLimitsDto {
  @ApiPropertyOptional({
    description: 'Timeout mỗi testcase khi đo golden (ms), không phải limit chính thức',
    default: 60000,
  })
  @IsOptional()
  @IsInt()
  @Min(5000)
  @Max(120_000)
  measureTimeLimitMs?: number;
}

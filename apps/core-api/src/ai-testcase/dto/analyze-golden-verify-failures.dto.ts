import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class AnalyzeGoldenVerifyTestcaseItemDto {
  @ApiProperty()
  @IsString()
  input!: string;

  @ApiProperty()
  @IsString()
  expectedOutput!: string;
}

export class AnalyzeGoldenVerifyResultItemDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  index!: number;

  @ApiProperty()
  @IsBoolean()
  passed!: boolean;

  @ApiProperty()
  @IsString()
  expectedOutput!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actualOutput?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stderr?: string;

  @ApiProperty()
  @IsString()
  verdict!: string;
}

export class AnalyzeGoldenVerifySummaryDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  total!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  passed!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  failed!: number;
}

export class AnalyzeGoldenVerifyResultPayloadDto {
  @ApiProperty({ type: AnalyzeGoldenVerifySummaryDto })
  @ValidateNested()
  @Type(() => AnalyzeGoldenVerifySummaryDto)
  summary!: AnalyzeGoldenVerifySummaryDto;

  @ApiProperty({ type: [AnalyzeGoldenVerifyResultItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnalyzeGoldenVerifyResultItemDto)
  results!: AnalyzeGoldenVerifyResultItemDto[];
}

export class AnalyzeGoldenVerifyFailuresDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  problemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statement?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ioSpec?: string;

  @ApiProperty({ description: 'Ngôn ngữ golden đã dùng khi verify' })
  @IsString()
  language!: string;

  @ApiProperty({ type: [AnalyzeGoldenVerifyTestcaseItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnalyzeGoldenVerifyTestcaseItemDto)
  testCases!: AnalyzeGoldenVerifyTestcaseItemDto[];

  @ApiProperty({ type: AnalyzeGoldenVerifyResultPayloadDto })
  @ValidateNested()
  @Type(() => AnalyzeGoldenVerifyResultPayloadDto)
  verifyResult!: AnalyzeGoldenVerifyResultPayloadDto;

  @ApiPropertyOptional({ enum: ['openai', 'google'] })
  @IsOptional()
  @IsEnum(['openai', 'google'])
  provider?: 'openai' | 'google';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ description: 'Tối đa ~800 ký tự golden để debug runtime (tuỳ chọn)' })
  @IsOptional()
  @IsString()
  goldenSnippet?: string;
}

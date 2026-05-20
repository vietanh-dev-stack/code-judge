import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class VerifyTestcaseItemDto {
  @ApiProperty()
  @IsString()
  input!: string;

  @ApiProperty()
  @IsString()
  expectedOutput!: string;
}

export class VerifyTestcasesWithGoldenDto {
  @ApiPropertyOptional({ description: 'Bắt buộc nếu dùng golden trong DB hoặc test case đã persist' })
  @IsOptional()
  @IsUUID()
  problemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  goldenSolutionId?: string;

  @ApiPropertyOptional({
    description:
      'Mã golden (stdin/stdout). ADMIN hoặc chủ đề khi có problemId. Khi dùng golden trong DB, worker lấy ngôn ngữ từ bản ghi GoldenSolution.',
  })
  @IsOptional()
  @IsString()
  goldenSourceCode?: string;

  @ApiPropertyOptional({ type: [VerifyTestcaseItemDto], description: 'Test case từ AI draft hoặc tự nhập' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VerifyTestcaseItemDto)
  testCases?: VerifyTestcaseItemDto[];

  @ApiPropertyOptional({ description: 'Lấy test đã lưu trong DB của problem (bỏ qua testCases)' })
  @IsOptional()
  @IsBoolean()
  usePersistedTestCases?: boolean;

  @ApiPropertyOptional({
    default: 'python',
    description:
      'Áp dụng khi gửi goldenSourceCode: python | javascript | java | cpp | c | go | rust (alias: JS, C++, …). Golden trong DB: bỏ qua, dùng language đã lưu.',
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ default: 15000, description: 'Timeout mỗi test (ms)' })
  @IsOptional()
  @IsInt()
  @Min(500)
  @Max(120_000)
  timeLimitMsPerCase?: number;
}

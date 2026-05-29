import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class GenerateAiProblemStatementDto {
  @ApiProperty({
    example: 'Bài toán đếm số cách đi từ (0,0) đến (n,m) chỉ đi phải hoặc xuống',
    description: 'Ý tưởng / chủ đề / mô tả ngắn để AI viết đề đầy đủ',
  })
  @IsString()
  @MaxLength(8000)
  topic!: string;

  @ApiPropertyOptional({ example: 'MEDIUM', description: 'EASY | MEDIUM | HARD hoặc mô tả tự do' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  difficulty?: string;

  @ApiPropertyOptional({ enum: ['vi', 'en'], default: 'vi' })
  @IsOptional()
  @IsIn(['vi', 'en'])
  locale?: 'vi' | 'en';

  @ApiPropertyOptional({ description: 'Ràng buộc thêm, tag, giới hạn đề bài' })
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  supplementaryText?: string;

  @ApiPropertyOptional({ description: 'Nếu form đã có title — AI có thể giữ hoặc cải thiện' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  existingTitle?: string;

  @ApiPropertyOptional({ description: 'Nếu form đã có statement — AI revise thay vì viết mới hoàn toàn' })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  existingStatement?: string;

  @ApiPropertyOptional({ enum: ['openai', 'google'] })
  @IsOptional()
  @IsIn(['openai', 'google'])
  provider?: 'openai' | 'google';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { userFeedback: 'Thêm ví dụ lớn hơn và làm rõ giới hạn n.' },
  })
  @IsOptional()
  @IsObject()
  revision?: {
    userFeedback?: string;
    previousOutputSummary?: string;
  };
}

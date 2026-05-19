import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class RequestHintDto {
  @ApiProperty({ description: 'Submission id từ lần Run/Submit vừa thất bại' })
  @IsUUID()
  submissionId!: string;

  @ApiPropertyOptional({ description: 'Ngôn ngữ (nếu khác submission.language)' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  language?: string;
}

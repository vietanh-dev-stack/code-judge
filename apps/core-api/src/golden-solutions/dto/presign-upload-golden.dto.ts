import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class PresignUploadGoldenDto {
  @ApiProperty({ example: 'python', description: 'Ngôn ngữ lời giải (chuẩn hoá phía client)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  language!: string;

  @ApiPropertyOptional({ description: 'Đánh dấu là golden chính cho bài (các golden khác sẽ bỏ cờ)' })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ example: 'main.py', default: 'source.txt' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName?: string;

  @ApiPropertyOptional({ description: 'TTL presigned PUT (giây)', default: 900 })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(3600)
  expiresInSeconds?: number;
}

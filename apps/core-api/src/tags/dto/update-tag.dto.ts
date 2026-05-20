import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateTagDto {
  @ApiPropertyOptional({ example: 'Dynamic Programming' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({
    example: 'dynamic-programming',
    description: 'Bỏ trống để tự sinh từ name; phải unique',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  slug?: string;
}

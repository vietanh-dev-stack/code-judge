import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AvatarUploadDto {
  @ApiPropertyOptional({ example: 'png' })
  @IsOptional()
  @IsString()
  extension?: string;
}

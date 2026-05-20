import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ToggleStatusDto {
  @ApiProperty({
    example: false,
  })
  @IsBoolean()
  isActive!: boolean;
}
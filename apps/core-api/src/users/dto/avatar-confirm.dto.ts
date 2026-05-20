import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AvatarConfirmDto {
  @ApiProperty({ example: 'avatars/user123/2026/05/uuid.png' })
  @IsString()
  @IsNotEmpty()
  objectKey!: string;
}

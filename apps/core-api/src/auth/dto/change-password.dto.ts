import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';
import { IsStrongPassword, PASSWORD_MAX_LENGTH } from '../../common';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword!: string;

  @ApiProperty({ example: 'P@ssw0rd1!' })
  @IsString()
  @IsStrongPassword()
  @MaxLength(PASSWORD_MAX_LENGTH)
  newPassword!: string;
}

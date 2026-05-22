import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { IsStrongPassword, PASSWORD_MAX_LENGTH } from '../../common';

/** Body `POST /auth/register`. */
export class RegisterDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'P@ssw0rd1!' })
  @IsString()
  @IsStrongPassword()
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;
}

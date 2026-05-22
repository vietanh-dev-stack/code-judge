import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { IsStrongPassword, PASSWORD_MAX_LENGTH } from '../../common';

export class CreateUserDto {
  @ApiPropertyOptional({ example: 'custom-user-id-001' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: 'Alice' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'alice@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ enum: Role, default: Role.CLIENT })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ example: 'P@ssw0rd1!' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @ValidateIf((o) => typeof o.password === 'string' && o.password.length > 0)
  @IsStrongPassword()
  @MaxLength(PASSWORD_MAX_LENGTH)
  password?: string;
}

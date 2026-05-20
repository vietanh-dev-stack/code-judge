import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

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

  @ApiPropertyOptional({ example: 's3cr3t123' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}

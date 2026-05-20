import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateTestCaseDto {
  @ApiProperty({ example: '1 2' })
  @IsString()
  @IsNotEmpty()
  input!: string;

  @ApiProperty({ example: '3' })
  @IsString()
  @IsNotEmpty()
  expectedOutput!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  weight?: number;
}

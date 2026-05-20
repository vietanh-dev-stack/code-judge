import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class QuickGenerateAiTestcaseDto {
  @ApiProperty({ example: 'Tính tổng 2 số nguyên a và b' })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({
    example:
      'Cho hai số nguyên a, b trên một dòng. Hãy in ra tổng của chúng.\nInput: a b\nOutput: a+b',
  })
  @IsString()
  @MaxLength(20000)
  statement!: string;

  @ApiPropertyOptional({ example: 'Input: hai số nguyên cách nhau dấu cách. Output: một số nguyên.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  ioSpec?: string;

  @ApiPropertyOptional({ enum: ['openai', 'google'], default: 'google' })
  @IsOptional()
  @IsIn(['openai', 'google'])
  provider?: 'openai' | 'google';

  @ApiPropertyOptional({ example: 'gpt-4.1-mini' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ConfirmGoldenUploadDto {
  @ApiProperty({ description: 'Object key đã PUT thành công (trùng với bước presign)' })
  @IsString()
  @IsNotEmpty()
  objectKey!: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class FinalizeSubmissionDto {
  @ApiProperty({ description: 'Object key after successful PUT to presigned URL' })
  @IsString()
  @IsNotEmpty()
  sourceCodeObjectKey!: string;
}

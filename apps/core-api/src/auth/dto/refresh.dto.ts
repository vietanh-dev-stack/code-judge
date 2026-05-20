import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

/** Body `POST /auth/refresh`. */
export class RefreshDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI...' })
  @IsString()
  refreshToken!: string;
}

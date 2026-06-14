import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Classification of the error source on the client. */
const ERROR_SOURCES = [
  'js_error',
  'unhandled_rejection',
  'react_error_boundary',
  'network_error',
  'resource_error',
] as const;

/** Severity levels for triaging. */
const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical'] as const;

export class ClientErrorEntryDto {
  @ApiProperty({ example: 'TypeError: Cannot read properties of undefined' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message!: string;

  @ApiPropertyOptional({ example: 'TypeError: Cannot read properties...\n    at Foo (app.js:12:5)' })
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  stack?: string;

  @ApiProperty({ enum: ERROR_SOURCES, example: 'js_error' })
  @IsIn(ERROR_SOURCES)
  source!: (typeof ERROR_SOURCES)[number];

  @ApiPropertyOptional({ enum: SEVERITY_LEVELS, example: 'high' })
  @IsOptional()
  @IsIn(SEVERITY_LEVELS)
  severity?: (typeof SEVERITY_LEVELS)[number];

  @ApiPropertyOptional({ description: 'React component name from Error Boundary', example: 'SubmissionEditor' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  componentStack?: string;

  @ApiProperty({ description: 'Page URL where error occurred', example: '/problem/abc-123' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  url!: string;

  @ApiPropertyOptional({ description: 'ISO timestamp from the client', example: '2026-06-14T13:00:00.000Z' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timestamp?: string;

  @ApiPropertyOptional({ description: 'Navigator.userAgent', example: 'Mozilla/5.0 ...' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  userAgent?: string;

  @ApiPropertyOptional({ description: 'Arbitrary key-value metadata', example: { contestId: 'xyz' } })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

/** Body for `POST /client-errors`. Accepts a batch of errors in a single request. */
export class ReportClientErrorDto {
  @ApiProperty({ type: [ClientErrorEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClientErrorEntryDto)
  errors!: ClientErrorEntryDto[];
}

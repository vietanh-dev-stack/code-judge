import { IsOptional, IsString } from 'class-validator';

export class UpdateClassroomDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    academicYear?: string;
}
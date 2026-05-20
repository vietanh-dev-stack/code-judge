import { IsOptional, IsString } from 'class-validator';

export class CreateClassroomDto {
    @IsString()
    name!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    academicYear?: string;
}
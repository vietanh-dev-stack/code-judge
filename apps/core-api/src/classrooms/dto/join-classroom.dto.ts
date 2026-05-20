import { IsString } from 'class-validator';

export class JoinClassroomDto {
    @IsString()
    classCode!: string;
}
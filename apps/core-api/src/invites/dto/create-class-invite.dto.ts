import { IsEmail } from 'class-validator';

export class CreateClassInviteDto {
  @IsEmail()
  email!: string;
}

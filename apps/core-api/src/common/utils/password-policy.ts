import { BadRequestException } from '@nestjs/common';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/** Message for class-validator `IsStrongPassword` and API errors. */
export const PASSWORD_POLICY_MESSAGE =
  `Mật khẩu phải từ ${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt`;

export function validatePasswordPolicy(password: string): void {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
    throw new BadRequestException(PASSWORD_POLICY_MESSAGE);
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    throw new BadRequestException(PASSWORD_POLICY_MESSAGE);
  }
  if (!/[a-z]/.test(password)) {
    throw new BadRequestException(PASSWORD_POLICY_MESSAGE);
  }
  if (!/[A-Z]/.test(password)) {
    throw new BadRequestException(PASSWORD_POLICY_MESSAGE);
  }
  if (!/[0-9]/.test(password)) {
    throw new BadRequestException(PASSWORD_POLICY_MESSAGE);
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new BadRequestException(PASSWORD_POLICY_MESSAGE);
  }
}

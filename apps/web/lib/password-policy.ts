/** Khớp `apps/core-api/src/common/utils/password-policy.ts` */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_POLICY_MESSAGE_VI =
  'Mật khẩu phải từ 8–128 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt';

export const PASSWORD_POLICY_MESSAGE_EN =
  'Password must be 8–128 characters and include uppercase, lowercase, a number, and a special character';

export function validatePasswordPolicyClient(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    return PASSWORD_POLICY_MESSAGE_EN;
  }
  if (!/[a-z]/.test(password)) return PASSWORD_POLICY_MESSAGE_EN;
  if (!/[A-Z]/.test(password)) return PASSWORD_POLICY_MESSAGE_EN;
  if (!/[0-9]/.test(password)) return PASSWORD_POLICY_MESSAGE_EN;
  if (!/[^A-Za-z0-9]/.test(password)) return PASSWORD_POLICY_MESSAGE_EN;
  return null;
}

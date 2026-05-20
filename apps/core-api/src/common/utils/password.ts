/**
 * Password utility: hash & verify dùng bcryptjs.
 *
 * Tách riêng để tái sử dụng ở nhiều nơi: AuthService, seed script, admin API, …
 */
import * as bcrypt from 'bcryptjs';

/** Số vòng salt bcrypt — cân bằng bảo mật / performance. */
const BCRYPT_ROUNDS = 10;

/** Hash mật khẩu plain-text → chuỗi bcrypt hash. */
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
}

/** So sánh mật khẩu plain-text với hash đã lưu. Trả `true` nếu khớp. */
export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

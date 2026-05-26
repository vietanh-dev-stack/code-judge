/** Xóa toàn bộ localStorage phía browser (logout / phiên hết hạn). */
export function clearLocalAppStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.clear();
  } catch {
    // Trình duyệt chặn storage (private mode, policy, v.v.)
  }
}

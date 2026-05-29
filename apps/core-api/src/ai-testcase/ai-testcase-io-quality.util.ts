import type { GeneratedTestcaseOutput } from './ai-testcase.prompt';

/** Đề/ioSpec gợi ý cần input/output đầy đủ (lưới, ma trận, …). */
export function problemNeedsFullIo(statement: string, ioSpec?: string): boolean {
  const blob = `${statement}\n${ioSpec ?? ''}`;
  return /(\d+\s*[x×]\s*\d+|\bgrid\b|lưới|ma\s*trận|\bmatrix\b|\bboard\b|bảng\s*\d|maze|đồ\s*thị\s*lưới)/i.test(
    blob,
  );
}

/** AI hay trả placeholder thay vì dữ liệu chạy được. */
export function isLikelyPlaceholderIo(value: string): boolean {
  const t = value.trim();
  if (!t) return false;
  if (/^(\.{2,}|…+|\[\s*\.{3}\s*\])$/u.test(t)) return true;
  if (/^\.{3,}(\s*\(.*\))?$/u.test(t)) return true;
  if (
    /\.\.\./u.test(t) &&
    !t.includes('\n') &&
    t.length < 120 &&
    !/^\d/m.test(t)
  ) {
    return true;
  }
  if (/\b(grid|matrix|lưới|ma trận)\b/i.test(t) && /\.\.\./u.test(t) && t.length < 200) {
    return true;
  }
  return false;
}

export function findPlaceholderCaseIndexes(
  testCases: GeneratedTestcaseOutput['testCases'],
): number[] {
  const indexes: number[] = [];
  testCases.forEach((tc, i) => {
    if (isLikelyPlaceholderIo(tc.input) || isLikelyPlaceholderIo(tc.expectedOutput)) {
      indexes.push(i);
    }
  });
  return indexes;
}

export function buildPlaceholderWarningMessage(indexes: number[]): string {
  if (indexes.length === 0) return '';
  const list = indexes.map((i) => `#${i + 1}`).join(', ');
  return `Test case ${list} có input/output giống placeholder ("...") — cần sinh lại với dữ liệu đầy đủ hoặc chỉnh tay.`;
}

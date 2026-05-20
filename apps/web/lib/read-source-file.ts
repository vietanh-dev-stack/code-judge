/** Giới hạn mặc định ~512KB — khớp tầm API goldenSourceCode. */
const DEFAULT_MAX_BYTES = 512 * 1024;

/**
 * Đọc file mã nguồn dạng text UTF-8 (dùng cho golden inline / paste từ file).
 */
export async function readSourceFileAsUtf8Text(
  file: File,
  maxBytes: number = DEFAULT_MAX_BYTES,
): Promise<string> {
  if (file.size > maxBytes) {
    throw new Error(
      `File quá lớn (${file.size} bytes). Tối đa ${Math.round(maxBytes / 1024)} KB.`,
    );
  }
  return file.text();
}

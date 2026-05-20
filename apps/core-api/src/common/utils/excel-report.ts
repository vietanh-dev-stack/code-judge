import ExcelJS from 'exceljs';

export type ExcelReportSheetInput = {
  /** Tên sheet (tối đa 31 ký tự theo Excel). */
  name: string;
  /** Hàng đầu = header cột. */
  columns: string[];
  /** Mỗi phần tử là một hàng dữ liệu; key khớp `columns` (thiếu key → ô trống). */
  rows: Array<Record<string, string | number | boolean | null | undefined>>;
};

/**
 * Tạo file `.xlsx` trong bộ nhớ (buffer) từ nhiều sheet.
 * Dùng cho báo cáo export (contest, lớp, submission list, v.v.).
 */
export async function buildExcelReportBuffer(sheets: ExcelReportSheetInput[]): Promise<Buffer> {
  if (!sheets.length) {
    throw new Error('buildExcelReportBuffer: ít nhất một sheet');
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'code-judge';
  workbook.created = new Date();

  for (const sheet of sheets) {
    const safeName = sheet.name.slice(0, 31).replace(/[[\]:*?/\\]/g, '-');
    const ws = workbook.addWorksheet(safeName || 'Sheet');
    ws.addRow(sheet.columns);
    for (const row of sheet.rows) {
      ws.addRow(sheet.columns.map((col) => row[col] ?? ''));
    }
    ws.getRow(1).font = { bold: true };
  }

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
}

/**
 * Helper: một sheet đơn giản từ mảng 2D (hàng đầu là header).
 */
export async function buildExcelFromMatrix(
  sheetName: string,
  matrix: Array<Array<string | number | boolean | null | undefined>>,
): Promise<Buffer> {
  if (!matrix.length) {
    throw new Error('buildExcelFromMatrix: matrix rỗng');
  }
  const columns = matrix[0].map((cell, i) => String(cell ?? `col_${i}`));
  const rows = matrix.slice(1).map((cells) => {
    const rec: Record<string, string | number | boolean | null | undefined> = {};
    columns.forEach((col, i) => {
      rec[col] = cells[i] ?? '';
    });
    return rec;
  });
  return buildExcelReportBuffer([{ name: sheetName, columns, rows }]);
}

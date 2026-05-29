import ExcelJS from 'exceljs';

/** Màu và font thống nhất cho báo cáo Code Judge. */
const BRAND = {
  primary: 'FF1E40AF',
  primaryLight: 'FFEFF6FF',
  accent: 'FF0F766E',
  titleBg: 'FF1E3A5F',
  headerBg: 'FF2563EB',
  headerText: 'FFFFFFFF',
  border: 'FFCBD5E1',
  zebra: 'FFF8FAFC',
  text: 'FF0F172A',
  muted: 'FF64748B',
  success: 'FFDCFCE7',
  successText: 'FF166534',
  warning: 'FFFEF3C7',
  warningText: 'FF92400E',
  danger: 'FFFEE2E2',
  dangerText: 'FFB91C1C',
  kpiBg: 'FFF0FDFA',
} as const;

export type ReportColumnDef = {
  key: string;
  header: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: 'text' | 'number' | 'percent' | 'datetime';
};

export type ReportInfoField = {
  label: string;
  value: string | number;
};

/** Form thông tin problem / contest / lớp — layout 2 cột chuẩn trên Excel. */
export type ReportEntityInfoForm = {
  sectionTitle: string;
  fields: ReportInfoField[];
  note?: string;
};

export type ReportContextBlock = {
  productName?: string;
  reportType: string;
  title: string;
  subtitle?: string;
  generatedAt: Date;
  generatedBy?: string;
  /** Form thông tin đối tượng (bài tập, contest, lớp). */
  entityInfo?: ReportEntityInfoForm;
  /** @deprecated Dùng entityInfo */
  infoRows?: Array<{ label: string; value: string }>;
  kpis?: Array<{ label: string; value: string | number }>;
};

export type ReportTableSection = {
  sectionTitle: string;
  columns: ReportColumnDef[];
  rows: Array<Record<string, string | number | boolean | null | undefined>>;
  /** Cột dùng tô màu theo trạng thái (Accepted, Wrong, …). */
  statusColumnKey?: string;
};

export type ProfessionalReportSheet = {
  tabName: string;
  context: ReportContextBlock;
  tables: ReportTableSection[];
};

const STATUS_STYLES: Record<string, { fill: string; font: string }> = {
  Accepted: { fill: BRAND.success, font: BRAND.successText },
  'Đạt (Accepted)': { fill: BRAND.success, font: BRAND.successText },
  Wrong: { fill: BRAND.danger, font: BRAND.dangerText },
  RuntimeError: { fill: BRAND.danger, font: BRAND.dangerText },
  Error: { fill: BRAND.danger, font: BRAND.dangerText },
  CompilationError: { fill: BRAND.warning, font: BRAND.warningText },
  TimeLimitExceeded: { fill: BRAND.warning, font: BRAND.warningText },
  MemoryLimitExceeded: { fill: BRAND.warning, font: BRAND.warningText },
  'Chưa nộp': { fill: 'FFF1F5F9', font: BRAND.muted },
  Pending: { fill: BRAND.warning, font: BRAND.warningText },
  Running: { fill: BRAND.warning, font: BRAND.warningText },
  'Đang chấm (Pending)': { fill: BRAND.warning, font: BRAND.warningText },
  'Đang chấm (Running)': { fill: BRAND.warning, font: BRAND.warningText },
};

function formatCellValue(
  value: string | number | boolean | null | undefined,
  format?: ReportColumnDef['format'],
): string | number | boolean {
  if (value === null || value === undefined) return '';
  if (format === 'datetime' && typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleString('vi-VN');
  }
  if (format === 'percent' && typeof value === 'number') {
    return `${value}%`;
  }
  return value;
}

function thinBorder(): Partial<ExcelJS.Borders> {
  return {
    top: { style: 'thin', color: { argb: BRAND.border } },
    left: { style: 'thin', color: { argb: BRAND.border } },
    bottom: { style: 'thin', color: { argb: BRAND.border } },
    right: { style: 'thin', color: { argb: BRAND.border } },
  };
}

function applyMergedRowStyle(
  ws: ExcelJS.Worksheet,
  row: number,
  colStart: number,
  colEnd: number,
  height: number,
) {
  ws.getRow(row).height = height;
  for (let c = colStart; c <= colEnd; c++) {
    ws.getCell(row, c).alignment = { vertical: 'middle', wrapText: true };
  }
}

const FORM_LABEL_COLS = 2;
const FORM_VALUE_COLS = 2;

function styleFormLabelCell(cell: ExcelJS.Cell) {
  cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: BRAND.text } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  cell.border = thinBorder();
}

function styleFormValueCell(cell: ExcelJS.Cell) {
  cell.font = { name: 'Calibri', size: 10, color: { argb: BRAND.text } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
  cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  cell.border = thinBorder();
}

function writeFormFieldHalf(
  ws: ExcelJS.Worksheet,
  row: number,
  colStart: number,
  halfWidth: number,
  field: ReportInfoField,
) {
  const labelEnd = colStart + FORM_LABEL_COLS - 1;
  const valueStart = labelEnd + 1;
  const valueEnd = colStart + halfWidth - 1;

  ws.mergeCells(row, colStart, row, labelEnd);
  const labelCell = ws.getCell(row, colStart);
  labelCell.value = field.label;
  styleFormLabelCell(labelCell);

  ws.mergeCells(row, valueStart, row, valueEnd);
  const valueCell = ws.getCell(row, valueStart);
  valueCell.value = field.value;
  styleFormValueCell(valueCell);
}

/**
 * Form thông tin 2 cột: mỗi hàng tối đa 2 cặp (Nhãn | Giá trị).
 */
function writeEntityInfoForm(
  ws: ExcelJS.Worksheet,
  form: ReportEntityInfoForm,
  startRow: number,
  mergeEnd: number,
): number {
  let row = startRow + 1;
  const halfWidth = Math.max(4, Math.floor(mergeEnd / 2));

  ws.mergeCells(row, 1, row, mergeEnd);
  const headerCell = ws.getCell(row, 1);
  headerCell.value = form.sectionTitle;
  headerCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: BRAND.headerText } };
  headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.headerBg } };
  headerCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  headerCell.border = thinBorder();
  ws.getRow(row).height = 24;
  row++;

  for (let i = 0; i < form.fields.length; i += 2) {
    const left = form.fields[i]!;
    const right = form.fields[i + 1];
    if (right) {
      writeFormFieldHalf(ws, row, 1, halfWidth, left);
      writeFormFieldHalf(ws, row, halfWidth + 1, halfWidth, right);
    } else {
      ws.mergeCells(row, 1, row, FORM_LABEL_COLS);
      const labelCell = ws.getCell(row, 1);
      labelCell.value = left.label;
      styleFormLabelCell(labelCell);
      ws.mergeCells(row, FORM_LABEL_COLS + 1, row, mergeEnd);
      const valueCell = ws.getCell(row, FORM_LABEL_COLS + 1);
      valueCell.value = left.value;
      styleFormValueCell(valueCell);
    }
    const valueLen = String(left.value).length + (right ? String(right.value).length : 0);
    ws.getRow(row).height = Math.min(22 + Math.ceil(valueLen / 100) * 12, 56);
    row++;
  }

  if (form.note?.trim()) {
    ws.mergeCells(row, 1, row, mergeEnd);
    const noteCell = ws.getCell(row, 1);
    noteCell.value = `Ghi chú: ${form.note.trim()}`;
    noteCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: BRAND.muted } };
    noteCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.primaryLight } };
    noteCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
    noteCell.border = thinBorder();
    ws.getRow(row).height = Math.min(20 + Math.ceil(form.note.length / 90) * 12, 48);
    row++;
  }

  row++;
  return row;
}

function writeReportHeader(ws: ExcelJS.Worksheet, ctx: ReportContextBlock, colCount: number): number {
  let row = 1;
  const product = ctx.productName ?? 'Code Judge';
  const mergeEnd = Math.max(colCount, 8);

  // —— Thương hiệu ——
  ws.mergeCells(row, 1, row, mergeEnd);
  const brandCell = ws.getCell(row, 1);
  brandCell.value = product;
  brandCell.font = { name: 'Calibri', size: 20, bold: true, color: { argb: BRAND.headerText } };
  brandCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.titleBg } };
  brandCell.alignment = { vertical: 'middle', horizontal: 'center' };
  applyMergedRowStyle(ws, row, 1, mergeEnd, 36);
  row++;

  // —— Loại báo cáo ——
  ws.mergeCells(row, 1, row, mergeEnd);
  const typeCell = ws.getCell(row, 1);
  typeCell.value = ctx.reportType;
  typeCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: BRAND.primary } };
  typeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.primaryLight } };
  typeCell.alignment = { vertical: 'middle', horizontal: 'center' };
  typeCell.border = {
    bottom: { style: 'thin', color: { argb: BRAND.border } },
  };
  applyMergedRowStyle(ws, row, 1, mergeEnd, 26);
  row++;

  row++; // khoảng trống

  // —— Tiêu đề nội dung ——
  ws.mergeCells(row, 1, row, mergeEnd);
  const titleCell = ws.getCell(row, 1);
  titleCell.value = ctx.title;
  titleCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: BRAND.text } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  applyMergedRowStyle(ws, row, 1, mergeEnd, 34);
  row++;

  if (ctx.subtitle) {
    ws.mergeCells(row, 1, row, mergeEnd);
    const sub = ws.getCell(row, 1);
    sub.value = ctx.subtitle;
    sub.font = { name: 'Calibri', size: 12, color: { argb: BRAND.muted } };
    sub.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    applyMergedRowStyle(ws, row, 1, mergeEnd, 24);
    row++;
  }

  row++; // khoảng trống

  // —— Meta 2 cột ——
  ws.getCell(row, 1).value = 'Ngày xuất';
  ws.getCell(row, 1).font = { name: 'Calibri', size: 10, bold: true, color: { argb: BRAND.muted } };
  ws.mergeCells(row, 2, row, Math.min(4, mergeEnd));
  ws.getCell(row, 2).value = ctx.generatedAt.toLocaleString('vi-VN');
  ws.getCell(row, 2).font = { name: 'Calibri', size: 10, color: { argb: BRAND.text } };
  if (ctx.generatedBy) {
    const colMid = Math.min(5, mergeEnd - 2);
    ws.getCell(row, colMid).value = 'Người xuất';
    ws.getCell(row, colMid).font = { name: 'Calibri', size: 10, bold: true, color: { argb: BRAND.muted } };
    ws.mergeCells(row, colMid + 1, row, mergeEnd);
    ws.getCell(row, colMid + 1).value = ctx.generatedBy;
    ws.getCell(row, colMid + 1).font = { name: 'Calibri', size: 10, color: { argb: BRAND.text } };
    ws.getCell(row, colMid + 1).alignment = { wrapText: true };
  }
  ws.getRow(row).height = 20;
  row++;

  const entityForm =
    ctx.entityInfo ??
    (ctx.infoRows?.length
      ? {
          sectionTitle: 'THÔNG TIN',
          fields: ctx.infoRows.map((r) => ({ label: r.label, value: r.value })),
        }
      : undefined);

  if (entityForm) {
    row = writeEntityInfoForm(ws, entityForm, row, mergeEnd);
  }

  if (ctx.kpis?.length) {
    row++;
    const kpiCols = 3;
    const boxWidth = Math.max(2, Math.floor(mergeEnd / kpiCols));
    let kpiRow = row;

    for (let i = 0; i < ctx.kpis.length; i++) {
      const kpi = ctx.kpis[i]!;
      const colIndex = i % kpiCols;
      const r = kpiRow + Math.floor(i / kpiCols) * 3;
      const colStart = colIndex * boxWidth + 1;
      const colEnd = Math.min(colStart + boxWidth - 1, mergeEnd);

      ws.mergeCells(r, colStart, r, colEnd);
      const labelCell = ws.getCell(r, colStart);
      labelCell.value = kpi.label;
      labelCell.font = { name: 'Calibri', size: 9, color: { argb: BRAND.muted } };
      labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.kpiBg } };
      labelCell.alignment = { horizontal: 'center', vertical: 'bottom' };
      labelCell.border = {
        top: { style: 'thin', color: { argb: BRAND.border } },
        left: { style: 'thin', color: { argb: BRAND.border } },
        right: { style: 'thin', color: { argb: BRAND.border } },
      };

      ws.mergeCells(r + 1, colStart, r + 1, colEnd);
      const valueCell = ws.getCell(r + 1, colStart);
      valueCell.value = kpi.value;
      valueCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: BRAND.primary } };
      valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.kpiBg } };
      valueCell.alignment = { horizontal: 'center', vertical: 'middle' };
      valueCell.border = {
        bottom: { style: 'thin', color: { argb: BRAND.border } },
        left: { style: 'thin', color: { argb: BRAND.border } },
        right: { style: 'thin', color: { argb: BRAND.border } },
      };
      ws.getRow(r + 1).height = 28;
    }
    row = kpiRow + Math.ceil(ctx.kpis.length / kpiCols) * 3 + 1;
  }

  row++;
  return row;
}

function writeTableSection(
  ws: ExcelJS.Worksheet,
  table: ReportTableSection,
  startRow: number,
): number {
  let row = startRow;

  ws.mergeCells(row, 1, row, Math.max(table.columns.length, 2));
  const sectionCell = ws.getCell(row, 1);
  sectionCell.value = table.sectionTitle;
  sectionCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: BRAND.primary } };
  sectionCell.border = { bottom: { style: 'medium', color: { argb: BRAND.primary } } };
  ws.getRow(row).height = 22;
  row++;

  const headerRow = ws.getRow(row);
  table.columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: BRAND.headerText } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.headerBg } };
    cell.alignment = {
      vertical: 'middle',
      horizontal: col.align ?? 'center',
      wrapText: true,
    };
    cell.border = thinBorder();
    ws.getColumn(idx + 1).width = col.width ?? Math.max(col.header.length + 4, 14);
  });
  headerRow.height = 24;
  row++;

  for (let i = 0; i < table.rows.length; i++) {
    const dataRow = ws.getRow(row);
    const stripe = i % 2 === 1;
    table.columns.forEach((col, idx) => {
      const cell = dataRow.getCell(idx + 1);
      const raw = table.rows[i]![col.key];
      cell.value = formatCellValue(raw, col.format);
      cell.font = { name: 'Calibri', size: 10, color: { argb: BRAND.text } };
      cell.alignment = { vertical: 'middle', horizontal: col.align ?? 'left', wrapText: true };
      cell.border = thinBorder();

      if (stripe) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.zebra } };
      }

      if (table.statusColumnKey === col.key && raw != null) {
        const style = STATUS_STYLES[String(raw)];
        if (style) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.fill } };
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: style.font } };
        }
      }
    });
    dataRow.height = 20;
    row++;
  }

  row++;
  return row;
}

/**
 * Tạo workbook báo cáo định dạng chuyên nghiệp (header thương hiệu, KPI, bảng có style).
 */
export async function buildProfessionalExcelBuffer(
  sheets: ProfessionalReportSheet[],
): Promise<Buffer> {
  if (!sheets.length) {
    throw new Error('buildProfessionalExcelBuffer: ít nhất một sheet');
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Code Judge';
  workbook.lastModifiedBy = 'Code Judge Reports';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties.date1904 = false;

  for (const sheetDef of sheets) {
    const safeName = sheetDef.tabName.slice(0, 31).replace(/[[\]:*?/\\]/g, '-');
    const ws = workbook.addWorksheet(safeName || 'Báo cáo', {
      properties: { defaultRowHeight: 18 },
      pageSetup: {
        paperSize: 9,
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
      },
    });

    const colCount = Math.max(
      ...sheetDef.tables.map((t) => t.columns.length),
      4,
    );
    let nextRow = writeReportHeader(ws, sheetDef.context, colCount);

    for (const table of sheetDef.tables) {
      nextRow = writeTableSection(ws, table, nextRow);
    }

    // Không freeze panes — người dùng cuộn tự do toàn sheet (header, form, bảng).
    ws.views = [{ state: 'normal', showGridLines: true }];
  }

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
}

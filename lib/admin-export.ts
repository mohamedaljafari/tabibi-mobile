/**
 * أدوات تصدير بيانات لوحة التحكم إلى ملفات Excel (.xlsx) داخل المتصفح.
 *
 * تستخدم مكتبة exceljs لتوليد ملف Excel حقيقي (وليس CSV) يمكن فتحه في
 * Microsoft Excel أو Google Sheets. يُحمَّل الملف مباشرة في متصفح المستخدم
 * عبر إنشاء رابط Blob — دون الحاجة إلى خادم.
 */
import ExcelJS from "exceljs";

const OLIVE = "6B7B3F";

/** تحميل ملف Excel مولَّد داخل المتصفح */
async function downloadWorkbook(workbook: ExcelJS.Workbook, fileName: string): Promise<boolean> {
  try {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.warn("فشل تحميل ملف Excel", error);
    return false;
  }
}

/** تنسيق رأس الجدول */
function styleHeaderRow(sheet: ExcelJS.Worksheet, columnCount: number): void {
  for (let index = 1; index <= columnCount; index += 1) {
    const cell = sheet.getCell(1, index);
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Tahoma", size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${OLIVE}` } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  }
  sheet.getRow(1).height = 22;
}

/** توسيع عرض الأعمدة تلقائيًا */
function autoFitColumns(sheet: ExcelJS.Worksheet, headers: string[], min: number, max: number): void {
  sheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: Math.min(max, Math.max(min, header.length + 8)),
  }));
}

// ══════════════════════ تصدير التقرير الشهري ══════════════════════

export type MonthlyReportExportData = {
  monthLabel: string;
  completedServices: number;
  completedConsultations: number;
  grossRevenue: number;
  platformCommission: number;
  providersShare: number;
  commissionPercent: number;
  topProviders: { providerName: string; count: number; amount: number }[];
  completedEntries: { ownerName: string; amount: number }[];
};

export async function exportMonthlyReportToExcel(data: MonthlyReportExportData): Promise<boolean> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "طبيبي - لوحة التحكم";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("التقرير الشهري");
  sheet.views = [{ rightToLeft: true }];

  const headers = ["البند", "القيمة"];
  autoFitColumns(sheet, headers, 26, 36);

  const rows: (string | number)[][] = [
    ["شهر التقرير", data.monthLabel],
    ["الخدمات المنزلية المكتملة", data.completedServices],
    ["الاستشارات المكتملة", data.completedConsultations],
    ["إجمالي المدفوعات (د.ل)", data.grossRevenue],
    ["نسبة عمولة المنصة (%)", data.commissionPercent],
    ["عمولة المنصة (د.ل)", data.platformCommission],
    ["مستحقات مقدمي الخدمة (د.ل)", data.providersShare],
  ];

  rows.forEach((row) => sheet.addRow(row));
  styleHeaderRow(sheet, 2);

  const summaryHeaderRow = sheet.addRow(["", ""]);
  const summaryTitle = sheet.addRow(["أكثر مقدمي الخدمة نشاطًا", ""]);
  summaryTitle.font = { bold: true, size: 12, color: { argb: `FF${OLIVE}` } };
  const providerHeaders = sheet.addRow(["اسم مقدم الخدمة", "عدد العمليات", "المبلغ (د.ل)"]);
  styleHeaderRow(sheet, 3);

  if (data.topProviders.length === 0) {
    sheet.addRow(["لا توجد عمليات لهذا الشهر", "", ""]);
  } else {
    data.topProviders.forEach((provider) => sheet.addRow([provider.providerName, provider.count, provider.amount]));
  }

  void summaryHeaderRow;
  return downloadWorkbook(workbook, `تقرير_طبيبي_${data.monthLabel.replace(/\s/g, "_")}.xlsx`);
}

// ══════════════════════ تصدير سجل نشاط الإدارة ══════════════════════

export type AuditLogExportEntry = {
  id: string;
  action: string;
  details?: string;
  createdAt: number;
};

export async function exportAuditLogToExcel(entries: AuditLogExportEntry[]): Promise<boolean> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "طبيبي - لوحة التحكم";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("سجل نشاط الإدارة");
  sheet.views = [{ rightToLeft: true }];

  const headers = ["التاريخ والوقت", "الإجراء", "التفاصيل", "معرف الإجراء"];
  autoFitColumns(sheet, headers, 16, 60);

  entries.slice().reverse().forEach((entry) => {
    sheet.addRow([new Date(entry.createdAt).toLocaleString("ar-LY"), entry.action, entry.details ?? "", entry.id]);
  });
  styleHeaderRow(sheet, 4);

  return downloadWorkbook(workbook, `سجل_نشاط_الإدارة_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ══════════════════════ تصدير المحفظات ══════════════════════

export type WalletLedgerExportEntry = {
  dateLabel: string;
  ownerName: string;
  kind: string;
  type: string;
  amount: number;
  note?: string;
};

export async function exportWalletLedgerToExcel(entries: WalletLedgerExportEntry[], title: string): Promise<boolean> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "طبيبي - لوحة التحكم";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("المحفظة");
  sheet.views = [{ rightToLeft: true }];

  const headers = ["التاريخ", "الاسم", "نوع العملية", "الاتجاه", "المبلغ (د.ل)", "الملاحظة"];
  autoFitColumns(sheet, headers, 14, 32);

  const totalCell = sheet.addRow([title, "", "", "", "", ""]);
  totalCell.font = { bold: true, size: 12, color: { argb: `FF${OLIVE}` } };

  entries.forEach((entry) => sheet.addRow([entry.dateLabel, entry.ownerName, entry.kind, entry.type, entry.amount, entry.note ?? ""]));
  styleHeaderRow(sheet, 6);

  return downloadWorkbook(workbook, `المحفظة_${title}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

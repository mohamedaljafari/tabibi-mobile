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

// ══════════════════════ نسخة احتياطية شاملة (JSON) ══════════════════════

/**
 * مفاتيح التخزين التي تُجمَّع في النسخة الاحتياطية الشاملة.
 * كل المفاتيح الموصوفة هنا هي المصدر الوحيد لبيانات المنصة حاليًا (AsyncStorage/LocalStorage).
 */
const FULL_BACKUP_KEYS = [
  // اللوحة: الإعلانات، كاتالوج الخدمات، مقدمو الخدمة، سجل النشاط، الإعدادات، صلاحيات الإدارة، الإشعارات
  "admin_ads_v1",
  "services_catalog_v1",
  "provider_accounts_v1",
  "admin_audit_log_v1",
  "platform_settings_v1",
  "admin_sub_pins_v1",
  "app_notifications_v1",
  // المريض: البروفايل، العناوين، أفراد العائلة، الطلبات، الاستشارات، الدردشة، التقييمات، المحفظة، الوصول الطبي، المدن، اقتراحات المدن
  "patient_profile_v1",
  "patient_addresses_v1",
  "family_members_v1",
  "medical_access_grants_v1",
  "service_requests_v1",
  "consultation_requests_v1",
  "chat_threads_v1",
  "chat_messages_v1",
  "request_ratings_v1",
  "wallet_ledger_v1",
  "patient_registry_v1",
  "libya_cities_v1",
  "city_suggestions_v1",
  "external_doctors_v1",
  "international_doctors_v1",
  // الشريك: الجلسة
  "provider_session_v1",
] as const;

/**
 * تجميع كل بيانات المنصة من التخزين المحلي وتنزيلها كملف JSON واحد.
 * الملف يحتوي بيانات كل مقدمي الخدمة والمرضى والطلبات والمحفظات والإعدادات —
 * وهو الأداة الأساسية للنسخ الاحتياطي قبل الانتقال إلى الاستضافة المشتركة.
 */
export async function exportFullBackup(): Promise<boolean> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const collected: Record<string, unknown> = {};
    for (const key of FULL_BACKUP_KEYS) {
      const raw = await AsyncStorage.getItem(key).catch(() => null);
      if (raw !== null) {
        try {
          collected[key] = JSON.parse(raw);
        } catch {
          collected[key] = raw;
        }
      }
    }
    const backup = {
      app: "tabibi-platform",
      exportedAt: new Date().toISOString(),
      exportedAtLocal: new Date().toLocaleString("ar-LY"),
      data: collected,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `نسخة_طبيبي_احتياطية_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.warn("فشل تجهيز النسخة الاحتياطية الشاملة", error);
    return false;
  }
}

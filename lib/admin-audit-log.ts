/**
 * سجل نشاط الإدارة (Audit Log).
 *
 * يسجل كل عملية يدوية يقوم بها المدير في لوحة التحكم
 * (تفعيل/إيقاف حساب، تبديل خدمة، تغيير إعدادات...) مع التاريخ والوقت،
 * للمساءلة ومعرفة من عدّل ماذا.
 *
 * مفتاح التخزين المحلي: admin_audit_log_v1
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export type AuditLogEntry = {
  id: string;
  createdAt: number;
  /** وصف مختصر للعملية، مثل: «تفعيل حساب الشريك د. أحمد» */
  action: string;
  /** تفاصيل إضافية، مثل الاسم السابق/الجديد أو القيمة القديمة/الجديدة */
  details?: string;
};

export const ADMIN_AUDIT_LOG_KEY = "admin_audit_log_v1";

function genId(): string {
  return `audit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** قراءة السجل كاملًا (الأحدث أولًا) */
export async function readAuditLog(): Promise<AuditLogEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(ADMIN_AUDIT_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const entries = parsed.filter(
      (item): item is AuditLogEntry =>
        !!item && typeof item === "object" && typeof item.id === "string" && typeof item.action === "string",
    );
    return entries.sort((first, second) => second.createdAt - first.createdAt);
  } catch {
    return [];
  }
}

/** تسجيل عملية إدارية جديدة */
export async function logAdminAction(input: { action: string; details?: string }): Promise<AuditLogEntry> {
  const entry: AuditLogEntry = {
    ...input,
    id: genId(),
    createdAt: Date.now(),
  };
  const all = await readAuditLog();
  await AsyncStorage.setItem(ADMIN_AUDIT_LOG_KEY, JSON.stringify([entry, ...all]));
  return entry;
}

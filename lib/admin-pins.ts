/**
 * صلاحيات الإدارة الفرعية للوحة التحكم.
 *
 * يسمح هذا النظام بإنشاء حسابات فرعية للإدارة، كل حساب له رمز PIN خاص به
 * ومجموعة صلاحيات محددة تحدد التبويبات التي يستطيع الوصول إليها داخل
 * لوحة التحكم. الرمز الرئيسي ADMIN_PIN يظل يتمتع بكامل الصلاحيات دائمًا.
 *
 * التخزين محلي (AsyncStorage) بنفس آلية باقي مكونات النظام.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logAdminAction } from "./admin-audit-log";

/** قائمة معرفات التبويبات التي يمكن التحكم في صلاحيات الوصول إليها */
export type AdminTabId =
  | "summary"
  | "providers"
  | "ads"
  | "health"
  | "services"
  | "requests"
  | "patients"
  | "wallets"
  | "cities"
  | "international"
  | "monthly"
  | "notifications"
  | "audit"
  | "settings"
  | "permissions";

export const ADMIN_PINS_KEY = "admin_pins_v1";

/** قائمة التبويبات المتاحة في لوحة التحكم للتحكم في صلاحياتها */
export const ALL_ADMIN_TABS: { id: AdminTabId; title: string }[] = [
  { id: "summary", title: "نظرة عامة" },
  { id: "providers", title: "مقدمو الخدمة" },
  { id: "ads", title: "الإعلانات" },
  { id: "health", title: "النصائح التوعوية" },
  { id: "services", title: "الخدمات" },
  { id: "requests", title: "الطلبات" },
  { id: "patients", title: "المرضى" },
  { id: "wallets", title: "المحفظات" },
  { id: "cities", title: "المدن والمناطق" },
  { id: "international", title: "أطباء الخارج" },
  { id: "monthly", title: "التقرير الشهري" },
  { id: "notifications", title: "مركز الإشعارات" },
  { id: "audit", title: "سجل نشاط الإدارة" },
  { id: "settings", title: "الإعدادات العامة" },
  { id: "permissions", title: "صلاحيات الإدارة" },
];

export type AdminPinEntry = {
  id: string;
  name: string;
  pin: string;
  allowedTabs: AdminTabId[];
  enabled: boolean;
  createdAt: number;
};

export type AdminPermissions = {
  pins: AdminPinEntry[];
  updatedAt?: number;
};

async function readPermissions(): Promise<AdminPermissions> {
  try {
    const raw = await AsyncStorage.getItem(ADMIN_PINS_KEY);
    if (!raw) return { pins: [] };
    const parsed = JSON.parse(raw) as AdminPermissions;
    return { pins: Array.isArray(parsed.pins) ? parsed.pins : [], updatedAt: parsed.updatedAt };
  } catch {
    return { pins: [] };
  }
}

async function writePermissions(permissions: AdminPermissions): Promise<AdminPermissions> {
  const updated = { ...permissions, updatedAt: Date.now() };
  await AsyncStorage.setItem(ADMIN_PINS_KEY, JSON.stringify(updated));
  return updated;
}

export function listAdminPins(): Promise<AdminPermissions> {
  return readPermissions();
}

export function addAdminPin(input: { name: string; pin: string; allowedTabs: AdminTabId[] }): Promise<AdminPinEntry> {
  return (async () => {
    const current = await readPermissions();
    if (current.pins.length >= 10) throw new Error("يمكن إنشاء 10 حسابات فرعية كحد أقصى");
    if (!input.pin || input.pin.trim().length < 6) throw new Error("الرمز يجب أن يتكون من 6 أحرف على الأقل");
    if (current.pins.some((entry) => entry.pin === input.pin.trim())) throw new Error("هذا الرمز مستخدم بالفعل لحساب آخر");
    const entry: AdminPinEntry = {
      id: `admin_pin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: input.name.trim(),
      pin: input.pin.trim(),
      allowedTabs: input.allowedTabs,
      enabled: true,
      createdAt: Date.now(),
    };
    const updated = await writePermissions({ pins: [...current.pins, entry] });
    await logAdminAction({ action: `إضافة حساب إداري فرعي: ${entry.name}`, details: `الرمز من ${entry.pin.length} أحرف — ${entry.allowedTabs.length} تبويب مفعل` });
    return updated.pins[updated.pins.length - 1];
  })();
}

export function updateAdminPin(input: { id: string; name?: string; pin?: string; allowedTabs?: AdminTabId[]; enabled?: boolean }): Promise<AdminPinEntry | null> {
  return (async () => {
    const current = await readPermissions();
    const index = current.pins.findIndex((entry) => entry.id === input.id);
    if (index === -1) return null;
    const existing = current.pins[index];
    const updatedEntry: AdminPinEntry = {
      ...existing,
      name: input.name !== undefined ? input.name.trim() : existing.name,
      pin: input.pin !== undefined ? input.pin.trim() : existing.pin,
      allowedTabs: input.allowedTabs ?? existing.allowedTabs,
      enabled: input.enabled !== undefined ? input.enabled : existing.enabled,
    };
    if (!updatedEntry.pin || updatedEntry.pin.length < 6) throw new Error("الرمز يجب أن يتكون من 6 أحرف على الأقل");
    if (current.pins.some((entry) => entry.id !== input.id && entry.pin === updatedEntry.pin)) throw new Error("هذا الرمز مستخدم بالفعل لحساب آخر");
    const next = current.pins.slice();
    next[index] = updatedEntry;
    await writePermissions({ pins: next });
    await logAdminAction({ action: `تعديل حساب إداري فرعي: ${updatedEntry.name}`, details: `الحالة: ${updatedEntry.enabled ? "مفعل" : "معطل"}` });
    return updatedEntry;
  })();
}

export function removeAdminPin(id: string): Promise<boolean> {
  return (async () => {
    const current = await readPermissions();
    const removed = current.pins.find((entry) => entry.id === id);
    if (!removed) return false;
    const next = current.pins.filter((entry) => entry.id !== id);
    await writePermissions({ pins: next });
    await logAdminAction({ action: `حذف حساب إداري فرعي: ${removed.name}` });
    return true;
  })();
}

export type AdminTabAccess = {
  tabs: AdminTabId[];
  /** اسم الحساب الفرعي أو فارغ إذا كان الدخول بالرمز الرئيسي للمالك */
  subAccountName: string;
};

/** التحقق من صلاحية الرمز وإرجاع التبويبات المسموح بها (الرمز الرئيسي يتمتع بكل الصلاحيات) */
export async function resolveAdminTabAccess(pin: string | undefined | null, allTabIds: AdminTabId[]): Promise<AdminTabAccess> {
  if (!pin || !pin.trim()) return { tabs: [], subAccountName: "" };
  const { isValidAdminPin } = await import("./admin-auth");
  if (isValidAdminPin(pin)) return { tabs: allTabIds, subAccountName: "" };
  const permissions = await readPermissions();
  const match = permissions.pins.find((entry) => entry.enabled && entry.pin === pin.trim());
  if (!match) return { tabs: [], subAccountName: "" };
  return { tabs: match.allowedTabs.filter((tabId) => allTabIds.includes(tabId)), subAccountName: match.name };
}

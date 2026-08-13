/**
 * تسجيل مقدمي الخدمة (طبيب شريك) لتطبيق المريض.
 *
 * يقرأ حسابات مقدمي الخدمة من التخزين المحلي الذي يكتبه تطبيق طبيب شريك:
 * - provider_accounts_v1: جميع الحسابات المسجلة
 * - provider_session_v1: الحساب الذي أنهى إكمال بياناته وفعّل حسابه
 *
 * الحساب يظهر للمريض فقط عندما تكون حالته active (بعد إكمال البيانات
 * وموافقة الإدارة المستقبلية على المستندات).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ProviderAvailability = {
  availableNow: boolean;
  slots: { day: string; startHour: string; endHour: string }[];
};

export type ProviderService = {
  id: string;
  name: string;
  price: number;
  isCustom?: boolean;
  durationMinutes?: number;
};

export type ProviderAccount = {
  id: string;
  fullName: string;
  role: string;
  phone: string;
  passwordHash: number;
  createdAt: number;
  status: "pending" | "active" | "frozen" | "cancelled";
  specializations: string[];
  yearsOfExperience: number;
  bio: string;
  photoUri?: string;
  documents: { id: string; type: string; name: string; uri: string }[];
  services: ProviderService[];
  availability: ProviderAvailability;
};

export const PROVIDER_ACCOUNTS_KEY = "provider_accounts_v1";
export const PROVIDER_SESSION_KEY = "provider_session_v1";

/** تحويل رقم خبرة إلى صيغة عرض مثل "5 سنوات خبرة" */
export function formatYearsOfExperience(years: number): string {
  if (!years || years <= 0) return "";
  return `${years} ${years === 1 ? "سنة" : "سنوات"} خبرة`;
}

/** قراءة كل حسابات مقدمي الخدمة من التخزين المحلي */
export async function readProviderAccounts(): Promise<ProviderAccount[]> {
  try {
    const raw = await AsyncStorage.getItem(PROVIDER_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ProviderAccount => {
      return (
        !!item &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.fullName === "string" &&
        Array.isArray(item.specializations) &&
        Array.isArray(item.services)
      );
    });
  } catch {
    return [];
  }
}

/** قراءة جلسة مقدم الخدمة النهائية (آخر حساب فعّل حسابه) */
export async function readProviderSession(): Promise<ProviderAccount | null> {
  try {
    const raw = await AsyncStorage.getItem(PROVIDER_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || typeof parsed.id !== "string") return null;
    return parsed as ProviderAccount;
  } catch {
    return null;
  }
}

/** الحسابات المفعّلة فقط التي تظهر للمريض (status = active) */
export function filterActiveProviders(accounts: ProviderAccount[]): ProviderAccount[] {
  return accounts.filter((account) => account.status === "active");
}

/** الحسابات المفعّلة التي تعمل في تخصص معين (مطابقة مرنة بعد إزالة المقدمات الوظيفية) */
export function providersForSpecialty(
  accounts: ProviderAccount[],
  specialtyLabel: string,
): ProviderAccount[] {
  return filterActiveProviders(accounts).filter((account) =>
    account.specializations.some((specialization) => matchSpecialty(specialization, specialtyLabel)),
  );
}

/**
 * مطابقة تخصصين بعد إزالة المقدمات الوظيفية مثل «طبيب» و«أخصائي» و«ممرض».
 * «طب عام» يطابق «طبيب عام» و«طب أطفال» يطابق «طبيب أطفال»...
 */
export function matchSpecialty(a: string, b: string): boolean {
  const normalized = (text: string) =>
    text
      .replace(/\s*(طبيب|طبيبة|أخصائي|أخصائية|ممرض|ممرضة)\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const x = normalized(a);
  const y = normalized(b);
  return x === y || x.includes(y) || y.includes(x);
}

/** فلترة مقدمي الخدمة حسب مجموعة صفات */
export function providersByRoles(
  accounts: ProviderAccount[],
  roles: string[],
): ProviderAccount[] {
  return filterActiveProviders(accounts).filter((account) => roles.includes(account.role));
}

/**
 * دمج حسابات مقدمي الخدمة المفعّلة مع قائمة أطباء تجريبية.
 * يطابق دور "طبيب" وتخصصه المعروض في بحث الأطباء.
 */
export function mergeDoctorsForSpecialty(
  accounts: ProviderAccount[],
  specialtyTitle: string,
): ProviderAccount[] {
  return providersByRoles(accounts, ["طبيب"]).filter((account) =>
    account.specializations.some((specialization) =>
      matchSpecialty(specialization, specialtyTitle),
    ),
  );
}

/** تخصصات التمريض المعتمدة في بحث التمريض */
const NURSING_SPECIALTIES = ["تمريض عام", "إسعافات أولية", "تمريض رعاية منزلية"];

/** تخصصات الصحة النفسية المعتمدة */
const MENTAL_SPECIALTIES = ["رعاية نفسية", "تحليل نفسي", "علاج نفسي", "استشارات نفسية", "رعاية نفسية مساندة"];

/** تخصصات التغذية والصحة والجمال */
const NUTRITION_SPECIALTIES = ["استشارات تغذية", "تغذية علاجية", "تخسيس وسمنة"];

/** تخصصات العلاج الطبيعي */
const PHYSIO_SPECIALTIES = ["علاج طبيعي", "تأهيل بدني"];

/** مقدمو خدمة بحث التمريض */
export function mergeNursingProviders(accounts: ProviderAccount[]): ProviderAccount[] {
  return providersByRoles(accounts, ["ممرض", "ممرضة"]).filter((account) =>
    account.specializations.some((specialization) =>
      NURSING_SPECIALTIES.some((keyword) => matchSpecialty(specialization, keyword)),
    ),
  );
}

/** مقدمو خدمة الصحة النفسية */
export function mergeMentalHealthProviders(accounts: ProviderAccount[]): ProviderAccount[] {
  return providersByRoles(accounts, ["أخصائي صحة نفسية", "طبيب"]).filter((account) =>
    account.specializations.some((specialization) =>
      MENTAL_SPECIALTIES.some((keyword) => matchSpecialty(specialization, keyword)),
    ),
  );
}

/** مقدمو خدمة التغذية والصحة والجمال */
export function mergeNutritionProviders(accounts: ProviderAccount[]): ProviderAccount[] {
  return providersByRoles(accounts, ["أخصائي تغذية"]).filter((account) =>
    account.specializations.some((specialization) =>
      NUTRITION_SPECIALTIES.some((keyword) => matchSpecialty(specialization, keyword)),
    ),
  );
}

/** مقدمو خدمة العلاج الطبيعي */
export function mergePhysioProviders(accounts: ProviderAccount[]): ProviderAccount[] {
  return providersByRoles(accounts, ["أخصائي علاج طبيعي"]).filter((account) =>
    account.specializations.some((specialization) =>
      PHYSIO_SPECIALTIES.some((keyword) => matchSpecialty(specialization, keyword)),
    ),
  );
}

/** مقدمو خدمة رعاية كبار السن */
export function mergeSeniorCareProviders(accounts: ProviderAccount[]): ProviderAccount[] {
  return providersByRoles(accounts, ["أخصائي رعاية كبار السن"]).filter((account) =>
    account.specializations.some((specialization) =>
      ["رعاية كبار السن", "تمريض رعاية منزلية"].some((keyword) =>
        matchSpecialty(specialization, keyword),
      ),
    ),
  );
}

/** مقدمو خدمة الطب البيطري */
export function mergeVeterinaryProviders(accounts: ProviderAccount[]): ProviderAccount[] {
  return providersByRoles(accounts, ["طبيب بيطري"]).filter((account) =>
    account.specializations.some((specialization) =>
      ["طب بيطري منزلي", "علاج بيطري"].some((keyword) => matchSpecialty(specialization, keyword)),
    ),
  );
}

/**
 * مقدمو الخدمات المساعدة حسب الخدمة المختارة:
 * elderly-care → أخصائي رعاية كبار السن (والممرضون بتخصص رعاية منزلية)
 * physical-therapy → أخصائي علاج طبيعي
 * بلا معرّف → كل أدوار الخدمات المساعدة
 */
export function mergeAssistedServiceProviders(accounts: ProviderAccount[], serviceId?: string): ProviderAccount[] {
  const all = providersByRoles(
    accounts,
    ["ممرض", "ممرضة", "أخصائي علاج طبيعي", "أخصائي رعاية كبار السن"],
  );
  if (serviceId === "elderly-care") {
    return all.filter((account) =>
      account.specializations.some((specialization) =>
        ["رعاية كبار السن", "رعاية المسنين", "تمريض رعاية منزلية", "تمريض"].some((keyword) =>
          matchSpecialty(specialization, keyword),
        ),
      ),
    );
  }
  if (serviceId === "physical-therapy") {
    return all.filter((account) =>
      account.specializations.some((specialization) =>
        ["علاج طبيعي", "إعادة تأهيل", "تأهيل بدني"].some((keyword) =>
          matchSpecialty(specialization, keyword),
        ),
      ),
    );
  }
  return all;
}

/** صيغة توافر مقروءة: "متاح الآن" أو أول توقيت في الجدول */
export function formatProviderAvailability(availability: ProviderAvailability): string {
  if (availability.availableNow) return "متاح الآن";
  if (!availability.slots || availability.slots.length === 0) return "";
  const slot = availability.slots[0];
  const dayLabels: Record<string, string> = {
    saturday: "السبت",
    sunday: "الأحد",
    monday: "الاثنين",
    tuesday: "الثلاثاء",
    wednesday: "الأربعاء",
    thursday: "الخميس",
    friday: "الجمعة",
  };
  const dayLabel = dayLabels[slot.day] || slot.day;
  return `${dayLabel} ${slot.startHour}–${slot.endHour}`;
}

/** تحويل أحرف الاسم الأولى لصورة بديلة عند عدم وجود صورة */
export function initialsFromName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return `${parts[0][0]}${parts[parts.length - 1][0]}`;
}

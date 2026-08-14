/**
 * مكتبة أطباء الاستشارات الطبية.
 *
 * تجمع أطباء الاستشارات من مصدرين:
 * 1. **داخل ليبيا**: مقدمو خدمة حقيقيون مفعّلون في تطبيق طبيب شريك.
 * 2. **خارج ليبيا**: أطباء استشارات خارجيون يُدارون يدويًا من لوحة التحكم
 *    (تُخزن بياناتهم محليًا في AsyncStorage).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  readProviderAccounts,
  filterActiveProviders,
  type ProviderAccount,
} from "./provider-registry";

export const CONSULTATION_STORAGE_KEY = "tabibi.consultations.v1";

export type ConsultationType = "local" | "international";

/** طبيب استشارة خارجي (يُدار من لوحة التحكم) */
export type ExternalConsultationDoctor = {
  id: string;
  name: string;
  /** الدولة/المقر الخارجي (مثل "مصر"، "تركيا") */
  country: string;
  /** نص التخصص (مثل "جلدية") */
  specialty: string;
  /** سنوات الخبرة */
  experience: number;
  /** سعر الاستشارة بالدينار الليبي */
  price: number;
  /** سنوات الخبرة كنص يعرض للمريض */
  initials: string;
  enabled: boolean;
  createdAt: number;
};

export type ConsultationDoctor =
  | (ProviderAccount & { consultationType: Extract<ConsultationType, "local"> })
  | (ExternalConsultationDoctor & { consultationType: Extract<ConsultationType, "international"> });

/** قائمة افتراضية لأطباء استشارات خارج ليبيا تُفعّل فقط كمثال تجريبي أولي */
export const DEFAULT_EXTERNAL_DOCTORS: Omit<ExternalConsultationDoctor, "id" | "createdAt">[] = [
  { name: "د. خالد المصري", country: "مصر", specialty: "جلدية", experience: 15, price: 150, initials: "خم", enabled: true },
  { name: "د. ليلى التركي", country: "تركيا", specialty: "قلب", experience: 12, price: 220, initials: "لت", enabled: true },
  { name: "د. محمد الأردني", country: "الأردن", specialty: "أطفال", experience: 10, price: 130, initials: "مأ", enabled: true },
  { name: "د. هالة التونسي", country: "تونس", specialty: "نساء وولادة", experience: 14, price: 170, initials: "هت", enabled: true },
];

// ───────────────────── دوال التخزين ─────────────────────

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function readExternalDoctors(): Promise<ExternalConsultationDoctor[]> {
  return readJson<ExternalConsultationDoctor[]>(CONSULTATION_STORAGE_KEY, []);
}

export async function writeExternalDoctors(
  doctors: ExternalConsultationDoctor[],
): Promise<ExternalConsultationDoctor[]> {
  await writeJson(CONSULTATION_STORAGE_KEY, doctors);
  return doctors;
}

export async function addExternalDoctor(
  input: Omit<ExternalConsultationDoctor, "id" | "createdAt">,
): Promise<ExternalConsultationDoctor[]> {
  const doctors = await readExternalDoctors();
  const doctor: ExternalConsultationDoctor = { ...input, id: `ext-${Date.now()}`, createdAt: Date.now() };
  return writeExternalDoctors([...doctors, doctor]);
}

export async function removeExternalDoctor(id: string): Promise<ExternalConsultationDoctor[]> {
  const doctors = await readExternalDoctors();
  return writeExternalDoctors(doctors.filter((doctor) => doctor.id !== id));
}

/** تحديث بيانات طبيب خارجي (الاسم والدولة والتخصص والخبرة والسعر) */
export async function updateExternalDoctor(
  id: string,
  input: Partial<Omit<ExternalConsultationDoctor, "id" | "createdAt">>,
): Promise<ExternalConsultationDoctor[]> {
  const doctors = await readExternalDoctors();
  return writeExternalDoctors(
    doctors.map((doctor) => (doctor.id === id ? ({ ...doctor, ...input } as ExternalConsultationDoctor) : doctor)),
  );
}

export async function toggleExternalDoctor(
  id: string,
  enabled: boolean,
): Promise<ExternalConsultationDoctor[]> {
  const doctors = await readExternalDoctors();
  return writeExternalDoctors(
    doctors.map((doctor) => (doctor.id === id ? { ...doctor, enabled } : doctor)),
  );
}

export function makeInitials(name: string): string {
  const parts = name.replace(/\s+و\s+/g, " ").trim().split(" ").filter(Boolean);
  return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2);
}

// ───────────────────── الجلب والبحث ─────────────────────

/** جميع أطباء الاستشارات (محليون خارجيون) النشطين حسب النوع */
export async function readConsultationDoctors(
  type: ConsultationType,
): Promise<ConsultationDoctor[]> {
  if (type === "international") {
    const external = await readExternalDoctors();
    return external
      .filter((doctor) => doctor.enabled)
      .map((doctor) => ({ ...doctor, consultationType: "international" as const }));
  }
  const providers = filterActiveProviders(await readProviderAccounts());
  return providers.map(
    (provider) => ({ ...provider, consultationType: "local" as const }),
  );
}

/** أطباء الاستشارة لتخصص معين (نص التخصص يطابق تخصص الشريك) */
export async function readConsultationDoctorsBySpecialty(
  type: ConsultationType,
  specialty: string,
): Promise<ConsultationDoctor[]> {
  const normalized = (text: string) => text.replace(/\s+/g, " ").trim();
  const doctors = await readConsultationDoctors(type);
  return doctors.filter((doctor) => {
    const fields =
      doctor.consultationType === "local"
        ? (doctor as ProviderAccount).specializations
        : [(doctor as ExternalConsultationDoctor).specialty];
    return fields.some((field) => normalized(field) === normalized(specialty));
  });
}

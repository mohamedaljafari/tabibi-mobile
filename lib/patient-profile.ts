import AsyncStorage from "@react-native-async-storage/async-storage";

export const PATIENT_PROFILE_KEY = "tabibi.patient-profile.v1";
export const MEDICAL_ACCESS_KEY = "medical_access_v1";

export type AddressSource = "map" | "current-location";

export type PatientAddress = {
  id: string;
  label: string;
  addressLabel: string;
  latitude: number;
  longitude: number;
  source: AddressSource;
  /** مدينة ليبية مرتبطة بالعنوان (تُحدد تلقائيًا عند استخدام الموقع الحالي). */
  cityId?: string;
  /** أسماء المناطق الليبية ضمن العنوان (تُحدد تلقائيًا للمدينة الحالية). */
  areaNames?: string[];
  createdAt: string;
};

export type ClinicalEntryType = "diagnosis" | "prescription" | "service";

/**
 * إدخال سريري ضمن الملف الطبي:
 * - diagnosis: تشخيص طبي
 * - prescription: وصفة / دواء
 * - service: خدمة أُنجزت عبر التطبيق
 */
export type ClinicalEntry = {
  id: string;
  type: ClinicalEntryType;
  title: string;
  details: string;
  providerName?: string;
  createdAt: string;
};

export type MedicalRecord = {
  id: string;
  ownerName: string;
  ownerType: "patient" | "family";
  createdAt: string;
  /** إدخالات سريرية (تشخيصات / وصفات / خدمات) يضيفها مقدمو الخدمة المصرح لهم */
  entries: ClinicalEntry[];
};

/**
 * صلاحية الاطلاع على الملف الطبي (مفتاح مشترك medical_access_v1).
 * يمنح المريض مقدم خدمة محددًا حق الاطلاع على ملفاته الطبية،
 * ولا يفتح الشريك الملف إلا بصلاحية موجودة.
 */
export type MedicalAccessGrant = {
  id: string;
  providerId: string;
  providerName: string;
  recordOwnerNames: string[];
  createdAt: string;
};

export type PatientProfile = {
  fullName: string;
  phone: string;
  createdAt: string;
  addresses: PatientAddress[];
  medicalRecords: MedicalRecord[];
  isSetupComplete: boolean;
  /** تجزئة كلمة المرور (تُحفظ عند إنشاء الحساب) */
  /** تجزئة كلمة المرور: number للشكل القديم (djb2) أو string للشكل القوي (SHA-256) */
  passwordHash?: number | string;
};

export type RegistrationInput = {
  fullName: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

export type RegistrationValidation = {
  fullName?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
};

export function normalizePhone(phone: string) {
  return phone.replace(/[^+\d]/g, "");
}

export function validateRegistration(input: RegistrationInput): RegistrationValidation {
  const errors: RegistrationValidation = {};
  const phoneDigits = input.phone.replace(/\D/g, "");

  if (input.fullName.trim().length < 3) {
    errors.fullName = "أدخل الاسم الكامل كما يظهر في هويتك.";
  }
  // رقم هاتف ليبي: 09XXXXXXXX (10 خانات تبدأ بـ 09) أو +2189XXXXXXXX (12 رقمًا)
  if (!/^\+2189\d{8}$/.test(input.phone.trim()) && !/^09\d{8}$/.test(phoneDigits)) {
    errors.phone = "أدخل رقم هاتف ليبي صحيحًا بصيغة +2189XXXXXXXX أو 09XXXXXXXX (10 خانات تبدأ بـ 09).";
  }
  if (input.password.length < 8) {
    errors.password = "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.";
  }
  if (input.confirmPassword !== input.password) {
    errors.confirmPassword = "كلمتا المرور غير متطابقتين.";
  }

  return errors;
}

export function hasRegistrationErrors(errors: RegistrationValidation) {
  return Object.keys(errors).length > 0;
}

export function hashPassword(password: string): number {
  // مطابقة لدالة تجزئة حسابات مقدمي الخدمة (lib/_e2e/provider-auth.ts)
  let hash = 5381;
  for (let index = 0; index < password.length; index++) {
    hash = ((hash * 33) + password.charCodeAt(index)) >>> 0;
  }
  return hash;
}

/**
 * تجزئة تشفيرية قوية (SHA-256) مع مفتاح عشوائي (salt) لكل حساب.
 * تحل محل الدالة الضعيفة القديمة (djb2) التي تعيد number وتعرض للتصادم.
 * الشكل: "sha256:{salt-hex}:{hex-digest}"
 */
export async function hashPasswordStrong(password: string, salt?: string): Promise<string> {
  const { getRandomBytesAsync, digestStringAsync, CryptoDigestAlgorithm, CryptoEncoding } = await import("expo-crypto");
  const saltHex = salt ?? Array.from(await getRandomBytesAsync(16)).map((byte: number) => byte.toString(16).padStart(2, "0")).join("");
  const digestHex = await digestStringAsync(CryptoDigestAlgorithm.SHA256, `${saltHex}:${password}`, { encoding: CryptoEncoding.HEX });
  return `sha256:${saltHex}:${digestHex}`;
}

export function isStrongHash(value: unknown): value is string {
  return typeof value === "string" && /^sha256:[0-9a-f]{32}:/.test(value);
}

/** التحقق من كلمة المرور: يقبل الشكل القوي الجديد والشكل القديم للترحيل التدريجي */
export async function verifyPassword(stored: unknown, password: string): Promise<boolean> {
  if (isStrongHash(stored)) {
    const [, saltHex] = stored.split(":");
    return (await hashPasswordStrong(password, saltHex)) === stored;
  }
  return typeof stored === "number" && stored === hashPassword(password);
}

export async function savePatientProfile(input: RegistrationInput): Promise<PatientProfile> {
  const profile: PatientProfile = {
    fullName: input.fullName.trim(),
    phone: normalizePhone(input.phone),
    createdAt: new Date().toISOString(),
    addresses: [],
    medicalRecords: [],
    isSetupComplete: false,
    passwordHash: await hashPasswordStrong(input.password),
  };
  await AsyncStorage.setItem(PATIENT_PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

export async function getPatientProfile(): Promise<PatientProfile | null> {
  const rawProfile = await AsyncStorage.getItem(PATIENT_PROFILE_KEY);
  if (!rawProfile) return null;

  try {
    const profile = JSON.parse(rawProfile) as PatientProfile;
    if (!profile.fullName || !profile.phone) return null;
    return {
      ...profile,
      addresses: Array.isArray(profile.addresses) ? profile.addresses : [],
      medicalRecords: (Array.isArray(profile.medicalRecords) ? profile.medicalRecords : []).map((record) => ({
        ...record,
        entries: Array.isArray(record.entries) ? record.entries : [],
      })),
      isSetupComplete: Boolean(profile.isSetupComplete),
      passwordHash: typeof profile.passwordHash === "number" ? profile.passwordHash : undefined,
    };
  } catch {
    return null;
  }
}

export async function updatePatientProfile(input: Pick<PatientProfile, "fullName" | "phone">) {
  const current = await getPatientProfile();
  const profile: PatientProfile = {
    ...current,
    fullName: input.fullName.trim(),
    phone: normalizePhone(input.phone),
    createdAt: current?.createdAt ?? new Date().toISOString(),
    addresses: current?.addresses ?? [],
    medicalRecords: current?.medicalRecords ?? [],
    isSetupComplete: current?.isSetupComplete ?? false,
  };
  return persistProfile(profile);
}

/**
 * تحديث كلمة المرور فقط (حفظ تجزئة كلمة المرور) دون المساس بأي حقل آخر.
 * يُستخدم عند أول دخول لحساب قديم لم تُحفظ فيه كلمة المرور.
 */
export async function updatePatientPassword(password: string): Promise<PatientProfile> {
  const current = await getPatientProfile();
  if (!current) throw new Error("لا يوجد حساب مسجل في هذا التطبيق");
  const profile: PatientProfile = { ...current, passwordHash: hashPassword(password) };
  return persistProfile(profile);
}

/**
 * تحديث كلمة المرور بالتجزئة القوية (SHA-256 + salt).
 * تُستخدم للحسابات الجديدة وترقية الحسابات القديمة عند الدخول الناجح.
 */
export async function updatePatientPasswordStrong(password: string): Promise<PatientProfile> {
  const current = await getPatientProfile();
  if (!current) throw new Error("لا يوجد حساب مسجل في هذا التطبيق");
  const profile: PatientProfile = { ...current, passwordHash: await hashPasswordStrong(password) };
  return persistProfile(profile);
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function persistProfile(profile: PatientProfile) {
  await AsyncStorage.setItem(PATIENT_PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

export async function addPatientAddress(
  input: Omit<PatientAddress, "id" | "createdAt">,
): Promise<PatientProfile> {
  const current = await getPatientProfile();
  if (!current) throw new Error("Patient profile was not found.");

  const address: PatientAddress = { ...input, id: createId("address"), createdAt: new Date().toISOString() };
  return persistProfile({ ...current, addresses: [...current.addresses, address] });
}

export async function completeAccountSetup(familyMemberNames: string[]): Promise<PatientProfile> {
  const current = await getPatientProfile();
  if (!current) throw new Error("Patient profile was not found.");

  const currentRecords = current.medicalRecords ?? [];
  const recordNames = new Set(currentRecords.map((record) => `${record.ownerType}:${record.ownerName.toLocaleLowerCase("ar")}`));
  const requestedOwners: Array<Pick<MedicalRecord, "ownerName" | "ownerType">> = [
    { ownerName: current.fullName, ownerType: "patient" },
    ...familyMemberNames.map((ownerName) => ({ ownerName: ownerName.trim(), ownerType: "family" as const })),
  ];

  const newRecords = requestedOwners
    .filter((owner) => owner.ownerName.length >= 3)
    .filter((owner) => {
      const key = `${owner.ownerType}:${owner.ownerName.toLocaleLowerCase("ar")}`;
      if (recordNames.has(key)) return false;
      recordNames.add(key);
      return true;
    })
    .map((owner) => ({ ...owner, id: createId("medical-record"), entries: [], createdAt: new Date().toISOString() }));

  return persistProfile({
    ...current,
    medicalRecords: [...currentRecords, ...newRecords],
    isSetupComplete: true,
  });
}

// ---------------------------------------------------------------------------
// صلاحية الاطلاع على الملف الطبي وإدخال السجلات السريرية
// ---------------------------------------------------------------------------

export async function readMedicalAccessGrants(): Promise<MedicalAccessGrant[]> {
  const raw = await AsyncStorage.getItem(MEDICAL_ACCESS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MedicalAccessGrant[]) : [];
  } catch {
    return [];
  }
}

async function persistAccessGrants(grants: MedicalAccessGrant[]) {
  await AsyncStorage.setItem(MEDICAL_ACCESS_KEY, JSON.stringify(grants));
}

/**
 * منح مقدم الخدمة صلاحية الاطلاع على ملفات المريض وأفراد عائلته.
 * تُلغى الصلاحيات السابقة لنفس مقدم الخدمة وتُستبدل بالجديدة.
 */
export async function grantMedicalAccess(
  providerId: string,
  providerName: string,
  recordOwnerNames: string[],
): Promise<MedicalAccessGrant[]> {
  const grants = await readMedicalAccessGrants();
  const others = grants.filter((grant) => grant.providerId !== providerId);
  if (recordOwnerNames.length === 0) {
    await persistAccessGrants(others);
    return others;
  }
  const trimmedNames = recordOwnerNames.map((name) => name.trim()).filter((name) => name.length > 0);
  const grant: MedicalAccessGrant = {
    id: createId("medical-access"),
    providerId,
    providerName: providerName.trim(),
    recordOwnerNames: trimmedNames,
    createdAt: new Date().toISOString(),
  };
  const next = [...others, grant];
  await persistAccessGrants(next);
  return next;
}

/** إلغاء صلاحية مقدم خدمة محدد عبر معرف الصلاحية */
export async function revokeMedicalAccess(grantId: string): Promise<MedicalAccessGrant[]> {
  const grants = await readMedicalAccessGrants();
  const next = grants.filter((grant) => grant.id !== grantId);
  await persistAccessGrants(next);
  return next;
}

/** التحقق من أن مقدم خدمة مصرح له بملف معين */
export function isProviderAccessGranted(
  grants: MedicalAccessGrant[],
  providerId: string,
  recordOwnerName: string,
): boolean {
  const grant = grants.find((candidate) => candidate.providerId === providerId);
  if (!grant) return false;
  return grant.recordOwnerNames.some(
    (ownerName) => ownerName.toLocaleLowerCase("ar") === recordOwnerName.toLocaleLowerCase("ar"),
  );
}

/** التحقق من صلاحية مقدم خدمة لكل الملفات (مفيد للشريك) */
export function getProviderAccess(grants: MedicalAccessGrant[], providerId: string): MedicalAccessGrant | null {
  return grants.find((grant) => grant.providerId === providerId) ?? null;
}

/** إضافة إدخال سريري (تشخيص / وصفة / خدمة) إلى ملف طبي للمالك المعين */
export async function addClinicalEntry(
  patientId: string,
  recordOwnerName: string,
  entry: Omit<ClinicalEntry, "id" | "createdAt">,
): Promise<PatientProfile | null> {
  const current = await getPatientProfile();
  if (!current) return null;
  if (current.fullName.trim().toLocaleLowerCase("ar") !== patientId.trim().toLocaleLowerCase("ar")) return null;
  const records = current.medicalRecords.map((record) =>
    record.ownerName.toLocaleLowerCase("ar") === recordOwnerName.toLocaleLowerCase("ar")
      ? {
          ...record,
          entries: [
            ...record.entries,
            { ...entry, id: createId("entry"), createdAt: new Date().toISOString() },
          ],
        }
      : record,
  );
  return persistProfile({ ...current, medicalRecords: records });
}

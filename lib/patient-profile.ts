import AsyncStorage from "@react-native-async-storage/async-storage";

export const PATIENT_PROFILE_KEY = "tabibi.patient-profile.v1";

export type PatientProfile = {
  fullName: string;
  phone: string;
  createdAt: string;
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
  if (phoneDigits.length < 8 || phoneDigits.length > 15) {
    errors.phone = "أدخل رقم هاتف صحيحًا من 8 إلى 15 رقمًا.";
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

export async function savePatientProfile(input: RegistrationInput): Promise<PatientProfile> {
  const profile: PatientProfile = {
    fullName: input.fullName.trim(),
    phone: normalizePhone(input.phone),
    createdAt: new Date().toISOString(),
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
    return profile;
  } catch {
    return null;
  }
}

export async function updatePatientProfile(input: Pick<PatientProfile, "fullName" | "phone">) {
  const profile: PatientProfile = {
    fullName: input.fullName.trim(),
    phone: normalizePhone(input.phone),
    createdAt: (await getPatientProfile())?.createdAt ?? new Date().toISOString(),
  };
  await AsyncStorage.setItem(PATIENT_PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

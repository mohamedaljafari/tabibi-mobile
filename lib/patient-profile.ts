import AsyncStorage from "@react-native-async-storage/async-storage";

export const PATIENT_PROFILE_KEY = "tabibi.patient-profile.v1";

export type AddressSource = "map" | "current-location";

export type PatientAddress = {
  id: string;
  label: string;
  addressLabel: string;
  latitude: number;
  longitude: number;
  source: AddressSource;
  createdAt: string;
};

export type MedicalRecord = {
  id: string;
  ownerName: string;
  ownerType: "patient" | "family";
  createdAt: string;
};

export type PatientProfile = {
  fullName: string;
  phone: string;
  createdAt: string;
  addresses: PatientAddress[];
  medicalRecords: MedicalRecord[];
  isSetupComplete: boolean;
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
    addresses: [],
    medicalRecords: [],
    isSetupComplete: false,
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
      medicalRecords: Array.isArray(profile.medicalRecords) ? profile.medicalRecords : [],
      isSetupComplete: Boolean(profile.isSetupComplete),
    };
  } catch {
    return null;
  }
}

export async function updatePatientProfile(input: Pick<PatientProfile, "fullName" | "phone">) {
  const current = await getPatientProfile();
  const profile: PatientProfile = {
    fullName: input.fullName.trim(),
    phone: normalizePhone(input.phone),
    createdAt: current?.createdAt ?? new Date().toISOString(),
    addresses: current?.addresses ?? [],
    medicalRecords: current?.medicalRecords ?? [],
    isSetupComplete: current?.isSetupComplete ?? false,
  };
  await AsyncStorage.setItem(PATIENT_PROFILE_KEY, JSON.stringify(profile));
  return profile;
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
    .map((owner) => ({ ...owner, id: createId("medical-record"), createdAt: new Date().toISOString() }));

  return persistProfile({
    ...current,
    medicalRecords: [...currentRecords, ...newRecords],
    isSetupComplete: true,
  });
}

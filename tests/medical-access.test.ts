import { beforeEach, describe, expect, it, vi } from "vitest";

const stored: Record<string, string | null> = {};

vi.mock("@react-native-async-storage/async-storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@react-native-async-storage/async-storage")>();
  return {
    ...actual,
    default: {
      ...actual.default,
      getItem: vi.fn(async (key: string) => stored[key] ?? null),
      setItem: vi.fn(async (key: string, value: string) => {
        stored[key] = value;
      }),
      removeItem: vi.fn(async (key: string) => {
        delete stored[key];
      }),
    },
  };
});

import {
  addClinicalEntry,
  getProviderAccess,
  grantMedicalAccess,
  isProviderAccessGranted,
  readMedicalAccessGrants,
  revokeMedicalAccess,
} from "../lib/patient-profile";

beforeEach(() => {
  for (const key of Object.keys(stored)) delete stored[key];
  vi.clearAllMocks();
});

const PROVIDER_ID = "provider-1";
const PATIENT_NAME = "أحمد محمد";
const FAMILY_NAME = "فاطمة محمد";

function persistProfile(records: Array<{ ownerName: string }>) {
  stored["tabibi.patient-profile.v1"] = JSON.stringify({
    fullName: PATIENT_NAME,
    phone: "+966500000000",
    createdAt: "2026-08-13T00:00:00.000Z",
    addresses: [],
    medicalRecords: records.map((record) => ({ ...record, id: "record", entries: [] })),
    isSetupComplete: true,
  });
}

describe("منح وإلغاء صلاحية الاطلاع على الملف الطبي", () => {
  it("يمنح صلاحية لمقدم خدمة ويحفظها بالمفتاح المشترك medical_access_v1", async () => {
    const grants = await grantMedicalAccess(PROVIDER_ID, "د. سارة العلي", [PATIENT_NAME, FAMILY_NAME]);
    expect(grants).toHaveLength(1);
    expect(grants[0].providerId).toBe(PROVIDER_ID);
    expect(grants[0].recordOwnerNames).toEqual([PATIENT_NAME, FAMILY_NAME]);
    expect(JSON.parse(stored["medical_access_v1"] ?? "[]")).toHaveLength(1);
  });

  it("يستبدل الصلاحيات القديمة لنفس مقدم الخدمة ولا يكررها", async () => {
    await grantMedicalAccess(PROVIDER_ID, "د. سارة العلي", [PATIENT_NAME]);
    const second = await grantMedicalAccess(PROVIDER_ID, "د. سارة العلي", [FAMILY_NAME]);
    expect(second).toHaveLength(1);
    expect(second[0].recordOwnerNames).toEqual([FAMILY_NAME]);
  });

  it("يُبقي صلاحيات مقدمي خدمة آخرين عند استبدال صلاحية مقدم آخر", async () => {
    await grantMedicalAccess(PROVIDER_ID, "د. سارة", [PATIENT_NAME]);
    await grantMedicalAccess("provider-2", "د. منى", [FAMILY_NAME]);
    const updated = await grantMedicalAccess(PROVIDER_ID, "د. سارة", [FAMILY_NAME]);
    expect(updated).toHaveLength(2);
  });

  it("يلغي الصلاحية عند تمرير أسماء فارغة", async () => {
    await grantMedicalAccess(PROVIDER_ID, "د. سارة", [PATIENT_NAME]);
    const grants = await grantMedicalAccess(PROVIDER_ID, "د. سارة", []);
    expect(grants).toHaveLength(0);
  });

  it("يلغي صلاحية مقدم خدمة محدد عبر revokeMedicalAccess بمعرف الصلاحية", async () => {
    await grantMedicalAccess(PROVIDER_ID, "د. سارة", [PATIENT_NAME]);
    await grantMedicalAccess("provider-2", "د. منى", [FAMILY_NAME]);
    const allGrants = await readMedicalAccessGrants();
    const grants = await revokeMedicalAccess(allGrants.find((grant) => grant.providerId === PROVIDER_ID)!.id);
    expect(grants).toHaveLength(1);
    expect(grants[0].providerId).toBe("provider-2");
  });

  it("يسمح للمريض بإلغاء الصلاحية لاحقًا", async () => {
    await grantMedicalAccess(PROVIDER_ID, "د. سارة", [PATIENT_NAME]);
    const allGrants = await readMedicalAccessGrants();
    const grants = await revokeMedicalAccess(allGrants[0].id);
    expect(isProviderAccessGranted(grants, PROVIDER_ID, PATIENT_NAME)).toBe(false);
  });
});

describe("التحقق من صلاحية الاطلاع", () => {
  let grants = [] as Awaited<ReturnType<typeof readMedicalAccessGrants>>;

  beforeEach(async () => {
    grants = await grantMedicalAccess(PROVIDER_ID, "د. سارة العلي", [PATIENT_NAME, FAMILY_NAME]);
  });

  it("يؤكد صلاحية مقدم خدمة لملف مصرح له", () => {
    expect(isProviderAccessGranted(grants, PROVIDER_ID, PATIENT_NAME)).toBe(true);
    expect(isProviderAccessGranted(grants, PROVIDER_ID, FAMILY_NAME)).toBe(true);
  });

  it("يرفض صلاحية ملف غير مصرح به", () => {
    expect(isProviderAccessGranted(grants, PROVIDER_ID, "خالد محمد")).toBe(false);
  });

  it("يرفض مقدم خدمة غير مصرح له أصلًا", () => {
    expect(isProviderAccessGranted(grants, "provider-9", PATIENT_NAME)).toBe(false);
  });

  it("يتجاهل اختلاف حالة الحروف عند المقارنة", () => {
    expect(isProviderAccessGranted(grants, PROVIDER_ID, "أحمد محمد")).toBe(true);
  });

  it("يعيد صلاحيات مقدم خدمة محدد عبر getProviderAccess", () => {
    const access = getProviderAccess(grants, PROVIDER_ID);
    expect(access?.recordOwnerNames).toEqual([PATIENT_NAME, FAMILY_NAME]);
    expect(getProviderAccess(grants, "provider-9")).toBeNull();
  });
});

describe("الإدخالات السريرية في الملف الطبي", () => {
  it("يضيف إدخال تشخيص وملف صاحب الملف", async () => {
    persistProfile([{ ownerName: PATIENT_NAME }]);
    const profile = await addClinicalEntry(PATIENT_NAME, PATIENT_NAME, {
      type: "diagnosis",
      title: "التهاب شعبي",
      details: "تم تشخيص التهاب شعبي وإعطاء تعليمات الراحة",
      providerName: "د. سارة العلي",
    });
    expect(profile?.medicalRecords[0].entries).toHaveLength(1);
    expect(profile?.medicalRecords[0].entries[0].type).toBe("diagnosis");
    expect(profile?.medicalRecords[0].entries[0].id).toContain("entry");
  });

  it("يضيف وصفة لملف فرد عائلة ضمن نفس حساب المريض", async () => {
    persistProfile([{ ownerName: PATIENT_NAME }, { ownerName: FAMILY_NAME }]);
    const profile = await addClinicalEntry(PATIENT_NAME, FAMILY_NAME, {
      type: "prescription",
      title: "بانادول",
      details: "حبة كل 8 ساعات لمدة ثلاثة أيام",
      providerName: "د. سارة العلي",
    });
    const familyRecord = profile?.medicalRecords.find((record) => record.ownerName === FAMILY_NAME);
    expect(familyRecord?.entries).toHaveLength(1);
    expect(profile?.medicalRecords.find((record) => record.ownerName === PATIENT_NAME)?.entries).toHaveLength(0);
  });

  it("يضيف إدخالات متراكمة بترتيب الإضافة", async () => {
    persistProfile([{ ownerName: PATIENT_NAME }]);
    await addClinicalEntry(PATIENT_NAME, PATIENT_NAME, {
      type: "service",
      title: "زيارة تمريض",
      details: "قياس ضغط وسكر",
    });
    const profile = await addClinicalEntry(PATIENT_NAME, PATIENT_NAME, {
      type: "diagnosis",
      title: "ضغط مرتفع",
      details: "متابعة شهرية مطلوبة",
    });
    expect(profile?.medicalRecords[0].entries).toHaveLength(2);
  });

  it("يرفض إضافة إدخال لحساب آخر", async () => {
    persistProfile([{ ownerName: PATIENT_NAME }]);
    const profile = await addClinicalEntry("مريض آخر", PATIENT_NAME, {
      type: "diagnosis",
      title: "تشخيص",
      details: "تفاصيل",
    });
    expect(profile).toBeNull();
  });

  it("يرفض إضافة إدخال لملف غير موجود في الحساب", async () => {
    persistProfile([{ ownerName: PATIENT_NAME }]);
    const profile = await addClinicalEntry(PATIENT_NAME, "شخص غريب", {
      type: "diagnosis",
      title: "تشخيص",
      details: "تفاصيل",
    });
    expect(profile?.medicalRecords.find((record) => record.ownerName === PATIENT_NAME)?.entries).toHaveLength(0);
  });
});

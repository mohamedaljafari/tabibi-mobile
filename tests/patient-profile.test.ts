import AsyncStorage from "@react-native-async-storage/async-storage";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: vi.fn(), setItem: vi.fn() },
}));

import { completeAccountSetup, getPatientProfile, hasRegistrationErrors, savePatientProfile, validateRegistration } from "../lib/patient-profile";

describe("منطق إنشاء ملف المريض", () => {
  beforeEach(() => vi.clearAllMocks());

  it("يرفض النموذج عند وجود كلمة مرور غير مطابقة", () => {
    const errors = validateRegistration({ fullName: "محمد أحمد", phone: "0500000000", password: "secret123", confirmPassword: "secret321" });
    expect(hasRegistrationErrors(errors)).toBe(true);
    expect(errors.confirmPassword).toBeDefined();
  });

  it("يحفظ البيانات العامة فقط ولا يحفظ كلمة المرور", async () => {
    await savePatientProfile({ fullName: "محمد أحمد", phone: "050 000 0000", password: "secret123", confirmPassword: "secret123" });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("tabibi.patient-profile.v1", expect.not.stringContaining("secret123"));
  });

  it("يعيد قيمة فارغة إذا كان التخزين المحلي غير صالح", async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce("not-json");
    await expect(getPatientProfile()).resolves.toBeNull();
  });

  it("ينشئ ملفًا طبيًا للمريض ولكل فرد عائلة عند التأكيد النهائي", async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify({
      fullName: "محمد أحمد",
      phone: "0500000000",
      createdAt: "2026-01-01T00:00:00.000Z",
      addresses: [{ id: "address-1", label: "العنوان الرئيسي", addressLabel: "عنوان", latitude: 1, longitude: 1, source: "map", createdAt: "2026-01-01T00:00:00.000Z" }],
      medicalRecords: [],
      isSetupComplete: false,
    }));

    const profile = await completeAccountSetup(["سارة أحمد", "خالد أحمد"]);
    expect(profile.isSetupComplete).toBe(true);
    expect(profile.medicalRecords).toHaveLength(3);
    expect(profile.medicalRecords.map((record) => record.ownerName)).toEqual(["محمد أحمد", "سارة أحمد", "خالد أحمد"]);
  });
});

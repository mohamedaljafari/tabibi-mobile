import AsyncStorage from "@react-native-async-storage/async-storage";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: vi.fn(), setItem: vi.fn() },
}));

import { getPatientProfile, hasRegistrationErrors, savePatientProfile, validateRegistration } from "../lib/patient-profile";

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
});

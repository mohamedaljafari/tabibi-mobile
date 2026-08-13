import { describe, expect, it } from "vitest";

import { getPharmacyScopeSummary, validatePharmacyQuote } from "../lib/pharmacy-quote";

const baseInput = {
  medicines: "باراسيتامول",
  hasPrescription: false,
  hasMedicinePhoto: false,
  addressId: "address-1",
  scope: "city" as const,
  city: "طرابلس",
  selectedAreas: [],
  distanceKm: "5",
};

describe("طلب عرض سعر الصيدليات", () => {
  it("يقبل الطلب عندما يتوافر اسم دواء وعنوان ونطاق مدينة", () => {
    expect(validatePharmacyQuote(baseInput)).toEqual({});
  });

  it("يتطلب تفاصيل دواء أو مرفقًا وعنوانًا", () => {
    expect(validatePharmacyQuote({ ...baseInput, medicines: "", addressId: undefined })).toEqual({
      request: "أدخل اسم دواء واحد على الأقل أو أرفق وصفة أو صورة دواء.",
      address: "اختر موقعك الجغرافي لإرسال طلب عرض السعر.",
    });
  });

  it("يتحقق من المناطق والمسافة عند اختيارهما", () => {
    expect(validatePharmacyQuote({ ...baseInput, scope: "areas", selectedAreas: [] }).scope).toBe("اختر منطقة واحدة على الأقل ضمن نطاق البحث.");
    expect(validatePharmacyQuote({ ...baseInput, scope: "distance", distanceKm: "0" }).scope).toBe("أدخل مسافة صحيحة بالكيلومترات.");
  });

  it("يلخص نطاق البحث المختار", () => {
    expect(getPharmacyScopeSummary({ scope: "areas", city: "طرابلس", selectedAreas: ["الوفاق", "مشاور"], distanceKm: "5" })).toBe("المناطق: الوفاق، مشاور");
  });
});

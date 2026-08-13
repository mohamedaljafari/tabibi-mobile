import { describe, expect, it } from "vitest";

import { getLabScopeSummary, validateLabQuote } from "../lib/lab-quote";

const baseInput = {
  testsRequired: "صورة دم كاملة",
  hasPrescription: false,
  hasTestPhoto: false,
  addressId: "address-1",
  scope: "city" as const,
  city: "طرابلس",
  selectedAreas: [],
  distanceKm: "5",
};

describe("طلب عرض سعر المختبر", () => {
  it("يقبل الطلب عندما يتوافر اسم تحليل وعنوان ونطاق مدينة", () => {
    expect(validateLabQuote(baseInput)).toEqual({});
  });

  it("يتطلب تفاصيل تحليل أو مرفقًا وعنوانًا", () => {
    expect(validateLabQuote({ ...baseInput, testsRequired: "", addressId: undefined })).toEqual({
      request: "أدخل اسم تحليل واحد على الأقل أو أرفق وصفة أو صورة تحليل.",
      address: "اختر موقعك الجغرافي لإرسال طلب عرض السعر.",
    });
  });

  it("يتحقق من المناطق والمسافة عند اختيارهما", () => {
    expect(validateLabQuote({ ...baseInput, scope: "areas", selectedAreas: [] }).scope).toBe("اختر منطقة واحدة على الأقل ضمن نطاق البحث.");
    expect(validateLabQuote({ ...baseInput, scope: "distance", distanceKm: "0" }).scope).toBe("أدخل مسافة صحيحة بالكيلومترات.");
  });

  it("يلخص نطاق بحث المختبر المختار", () => {
    expect(getLabScopeSummary({ scope: "areas", city: "طرابلس", selectedAreas: ["الوفاق", "مشاور"], distanceKm: "5" })).toBe("المناطق: الوفاق، مشاور");
  });
});

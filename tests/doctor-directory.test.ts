import { describe, expect, it } from "vitest";

import { DOCTOR_SPECIALTIES, getDoctorsForSpecialty, getDoctorSpecialty } from "../lib/doctor-directory";

describe("دليل الأطباء", () => {
  it("يتضمن تخصص طبيب الأطفال والتخصصات البشرية الإضافية", () => {
    expect(getDoctorSpecialty("pediatrics").title).toBe("طبيب أطفال");
    expect(DOCTOR_SPECIALTIES.map((specialty) => specialty.id)).toContain("surgery");
    expect(DOCTOR_SPECIALTIES).toHaveLength(12);
  });

  it("يرتب النتائج افتراضيًا حسب القرب", () => {
    const doctors = getDoctorsForSpecialty("pediatrics", "nearest");
    expect(doctors.map((doctor) => doctor.distanceKm)).toEqual([1.2, 2.8, 4.1, 5.6]);
  });

  it("يدعم الفرز حسب التقييم والسعر", () => {
    expect(getDoctorsForSpecialty("pediatrics", "rating")[0].rating).toBe(4.9);
    expect(getDoctorsForSpecialty("pediatrics", "price-high")[0].price).toBe(320);
    expect(getDoctorsForSpecialty("pediatrics", "price-low")[0].price).toBe(180);
  });
});

import { describe, expect, it } from "vitest";

import { getMentalHealthProvidersForSpecialty, getMentalHealthSpecialty, MENTAL_HEALTH_SPECIALTIES } from "../lib/mental-health-directory";

describe("دليل الصحة النفسية", () => {
  it("يتضمن التخصصات النفسية المعتمدة في الواجهة", () => {
    expect(MENTAL_HEALTH_SPECIALTIES).toHaveLength(11);
    expect(getMentalHealthSpecialty("children-adolescents").title).toBe("الأطفال والمراهقون");
    expect(getMentalHealthSpecialty("family-couples").title).toBe("الإرشاد الأسري والزوجي");
  });

  it("يرتب نتائج المختصين افتراضيًا حسب القرب", () => {
    expect(getMentalHealthProvidersForSpecialty("general-therapy", "nearest").map((provider) => provider.distanceKm)).toEqual([1.7, 2.6, 4, 5.4]);
  });

  it("يدعم الفرز حسب التقييم والسعر", () => {
    expect(getMentalHealthProvidersForSpecialty("general-therapy", "rating")[0].rating).toBe(4.9);
    expect(getMentalHealthProvidersForSpecialty("general-therapy", "price-high")[0].price).toBe(270);
    expect(getMentalHealthProvidersForSpecialty("general-therapy", "price-low")[0].price).toBe(180);
  });
});

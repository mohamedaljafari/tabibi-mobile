import { describe, expect, it } from "vitest";

import { getHomeService, getHomeServiceProviders, HOME_SERVICES } from "../lib/home-service-directory";

describe("دليل خدمات الصفحة الرئيسية", () => {
  it("يتضمن التمريض والصحة النفسية والعلاج الطبيعي وكبار السن مع التغذية والبيطري", () => {
    expect(getHomeService("nutrition-health-beauty").title).toBe("التغذية والصحة والجمال");
    expect(HOME_SERVICES.map((service) => service.id)).toEqual([
      "nursing",
      "mental-health",
      "physical-therapy",
      "elderly-care",
      "nutrition-health-beauty",
      "veterinary",
    ]);
    expect(getHomeService("nursing").title).toBe("التمريض المنزلي");
  });

  it("يرتب مقدمي التغذية والطب البيطري بحسب المرشحات", () => {
    expect(getHomeServiceProviders("nutrition-health-beauty", "nearest")[0].distanceKm).toBe(1.5);
    expect(getHomeServiceProviders("veterinary", "rating")[0].rating).toBe(4.9);
    expect(getHomeServiceProviders("nutrition-health-beauty", "price-high")[0].price).toBe(230);
    expect(getHomeServiceProviders("veterinary", "price-low")[0].price).toBe(190);
  });
});

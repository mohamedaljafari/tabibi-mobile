import { describe, expect, it } from "vitest";

import { getHomeService, getHomeServiceProviders, HOME_SERVICES } from "../lib/home-service-directory";

describe("مسارات التغذية والطب البيطري", () => {
  it("يستخدم اسم التغذية والصحة والجمال الموحد", () => {
    expect(getHomeService("nutrition-health-beauty").title).toBe("التغذية والصحة والجمال");
    expect(HOME_SERVICES.map((service) => service.id)).toEqual(["nutrition-health-beauty", "veterinary"]);
  });

  it("يرتب مقدمي التغذية والطب البيطري بحسب المرشحات", () => {
    expect(getHomeServiceProviders("nutrition-health-beauty", "nearest")[0].distanceKm).toBe(1.5);
    expect(getHomeServiceProviders("veterinary", "rating")[0].rating).toBe(4.9);
    expect(getHomeServiceProviders("nutrition-health-beauty", "price-high")[0].price).toBe(230);
    expect(getHomeServiceProviders("veterinary", "price-low")[0].price).toBe(190);
  });
});

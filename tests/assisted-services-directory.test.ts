import { describe, expect, it } from "vitest";

import { ASSISTED_SERVICES, getAssistedService, getAssistedServiceProviders } from "../lib/assisted-services-directory";

describe("خدمات طبية مساعدة", () => {
  it("تتضمن رعاية كبار السن والعلاج الطبيعي كخدمتين مستقلتين", () => {
    expect(ASSISTED_SERVICES.map((service) => service.id)).toEqual(["elderly-care", "physical-therapy"]);
    expect(getAssistedService("elderly-care").title).toBe("رعاية كبار السن");
  });

  it("يرتب مقدمي الخدمة حسب القرب والتقييم والسعر", () => {
    expect(getAssistedServiceProviders("physical-therapy", "nearest")[0].distanceKm).toBe(1.8);
    expect(getAssistedServiceProviders("elderly-care", "rating")[0].rating).toBe(4.9);
    expect(getAssistedServiceProviders("physical-therapy", "price-high")[0].price).toBe(280);
    expect(getAssistedServiceProviders("elderly-care", "price-low")[0].price).toBe(180);
  });
});

import { describe, expect, it } from "vitest";

import { getNurses } from "../lib/nursing-directory";

describe("دليل التمريض", () => {
  it("يرتب مقدمي التمريض افتراضيًا بحسب القرب", () => {
    expect(getNurses("nearest").map((nurse) => nurse.distanceKm)).toEqual([1.5, 2.3, 3.9, 5.1]);
  });

  it("يدعم الفرز بالتقييم والسعر", () => {
    expect(getNurses("rating")[0].rating).toBe(4.9);
    expect(getNurses("price-high")[0].price).toBe(220);
    expect(getNurses("price-low")[0].price).toBe(145);
  });
});

import { describe, expect, it } from "vitest";

import {
  getOfferSourceLabel,
  getPaymentMethodLabel,
  getQuoteOfferRating,
  getQuoteOffers,
} from "../lib/quote-offers";

const query = (overrides: Partial<Parameters<typeof getQuoteOffers>[0]> = {}) => ({
  filter: "all" as const,
  sort: "price-asc" as const,
  maxPrice: null as number | null,
  maxDistanceKm: null as number | null,
  ...overrides,
});

describe("عروض الأسعار الموحدة", () => {
  it("يعرض عروض الصيدليات والمختبرات ضمن صفحة واحدة", () => {
    expect(getQuoteOffers(query())).toHaveLength(6);
    expect(getQuoteOffers(query({ filter: "pharmacy" })).every((offer) => offer.source === "pharmacy")).toBe(true);
    expect(getQuoteOffers(query({ filter: "lab" })).every((offer) => offer.source === "lab")).toBe(true);
  });

  it("يرتب العروض حسب السعر تصاعديًا افتراضيًا", () => {
    const prices = getQuoteOffers(query()).map((offer) => offer.total);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it("يرتب العروض حسب السعر تنازليًا عند طلب الأعلى سعرًا", () => {
    const prices = getQuoteOffers(query({ sort: "price-desc" })).map((offer) => offer.total);
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
  });

  it("يرتب العروض حسب المسافة عند اختيار الأقرب", () => {
    const distances = getQuoteOffers(query({ sort: "distance" })).map((offer) => offer.distanceKm);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
  });

  it("يرتب العروض حسب التقييم عند اختيار الأعلى تقييمًا", () => {
    const ratings = getQuoteOffers(query({ sort: "rating" })).map((offer) => getQuoteOfferRating(offer));
    expect(ratings).toEqual([...ratings].sort((a, b) => b - a));
    expect(ratings.every((rating) => rating >= 4 && rating <= 5)).toBe(true);
  });

  it("يرشح العروض حسب الحد الأقصى للسعر", () => {
    const filtered = getQuoteOffers(query({ maxPrice: 100 }));
    expect(filtered.every((offer) => offer.total <= 100)).toBe(true);
    expect(filtered).toHaveLength(2);
  });

  it("يرشح العروض حسب الحد الأقصى للسعر بدقة عند قيم حرجة", () => {
    const filtered = getQuoteOffers(query({ maxPrice: 95 }));
    expect(filtered.every((offer) => offer.total <= 95)).toBe(true);
    expect(filtered).toHaveLength(2);
  });

  it("يرشح العروض حسب الحد الأقصى للمسافة", () => {
    const filtered = getQuoteOffers(query({ maxDistanceKm: 3 }));
    expect(filtered.every((offer) => offer.distanceKm <= 3)).toBe(true);
    expect(filtered).toHaveLength(2);
  });

  it("يجمع الفلترة حسب المصدر مع الفرز والترشيح معًا", () => {
    const results = getQuoteOffers(query({ filter: "lab", sort: "rating", maxPrice: 100, maxDistanceKm: 4 }));
    expect(results.every((offer) => offer.source === "lab" && offer.total <= 100 && offer.distanceKm <= 4)).toBe(true);
  });

  it("يعرض التسميات العربية لمصدر العرض وطريقة الدفع", () => {
    expect(getOfferSourceLabel("pharmacy")).toBe("الصيدليات");
    expect(getOfferSourceLabel("lab")).toBe("المختبرات");
    expect(getPaymentMethodLabel("electronic")).toBe("الدفع الإلكتروني");
    expect(getPaymentMethodLabel("cash")).toBe("الدفع نقدًا");
  });
});

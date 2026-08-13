import { describe, expect, it } from "vitest";

import { getOfferSourceLabel, getPaymentMethodLabel, getQuoteOffers } from "../lib/quote-offers";

describe("عروض الأسعار الموحدة", () => {
  it("يعرض عروض الصيدليات والمختبرات ضمن صفحة واحدة", () => {
    expect(getQuoteOffers("all")).toHaveLength(6);
    expect(getQuoteOffers("pharmacy").every((offer) => offer.source === "pharmacy")).toBe(true);
    expect(getQuoteOffers("lab").every((offer) => offer.source === "lab")).toBe(true);
  });

  it("يرتب العروض حسب السعر تصاعديًا", () => {
    const prices = getQuoteOffers("all").map((offer) => offer.total);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it("يعرض التسميات العربية لمصدر العرض وطريقة الدفع", () => {
    expect(getOfferSourceLabel("pharmacy")).toBe("الصيدليات");
    expect(getOfferSourceLabel("lab")).toBe("المختبرات");
    expect(getPaymentMethodLabel("electronic")).toBe("الدفع الإلكتروني");
    expect(getPaymentMethodLabel("cash")).toBe("الدفع نقدًا");
  });
});

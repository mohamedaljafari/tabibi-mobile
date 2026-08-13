export type QuoteOfferSource = "pharmacy" | "lab";
export type QuoteOfferFilter = QuoteOfferSource | "all";
export type LocalPaymentMethod = "electronic" | "cash";

export type QuoteOfferSort = "price-asc" | "price-desc" | "distance" | "rating";

export type QuoteOfferQuery = {
  filter: QuoteOfferFilter;
  sort: QuoteOfferSort;
  maxPrice: number | null;
  maxDistanceKm: number | null;
};

export type QuoteOffer = {
  id: string;
  source: QuoteOfferSource;
  providerName: string;
  providerSubtitle: string;
  total: number;
  distanceKm: number;
  fulfilment: string;
  itemsSummary: string;
  validUntil: string;
  note: string;
};

const QUOTE_OFFERS: QuoteOffer[] = [
  {
    id: "pharmacy-central",
    source: "pharmacy",
    providerName: "الصيدلية المركزية",
    providerSubtitle: "صيدلية · ضمن نطاق طلبك",
    total: 184,
    distanceKm: 1.8,
    fulfilment: "توصيل خلال 45 دقيقة",
    itemsSummary: "جميع الأدوية المذكورة متوفرة",
    validUntil: "صالح لمدة 30 دقيقة",
    note: "السعر يشمل التوصيل داخل النطاق المحدد.",
  },
  {
    id: "pharmacy-shifa",
    source: "pharmacy",
    providerName: "صيدلية الشفاء",
    providerSubtitle: "صيدلية · ضمن نطاق طلبك",
    total: 176,
    distanceKm: 3.1,
    fulfilment: "توصيل خلال ساعة",
    itemsSummary: "بديل مكافئ متاح لدواء واحد عند الحاجة",
    validUntil: "صالح لمدة 25 دقيقة",
    note: "سيجري تأكيد أي بديل معك قبل التجهيز.",
  },
  {
    id: "pharmacy-alam",
    source: "pharmacy",
    providerName: "صيدلية العلم",
    providerSubtitle: "صيدلية · ضمن نطاق طلبك",
    total: 191,
    distanceKm: 4.6,
    fulfilment: "استلام أو توصيل خلال 90 دقيقة",
    itemsSummary: "جميع الأدوية المذكورة متوفرة",
    validUntil: "صالح لمدة 20 دقيقة",
    note: "يمكنك اختيار الاستلام عند تنسيق الطلب لاحقًا.",
  },
  {
    id: "lab-hayat",
    source: "lab",
    providerName: "مختبر الحياة",
    providerSubtitle: "مختبر تحاليل · ضمن نطاق طلبك",
    total: 95,
    distanceKm: 2.2,
    fulfilment: "زيارة منزلية خلال ساعتين",
    itemsSummary: "يشمل جمع العينة المنزلية والتحاليل المطلوبة",
    validUntil: "صالح لمدة 45 دقيقة",
    note: "تصدر النتيجة حسب نوع التحليل بعد استلام العينة.",
  },
  {
    id: "lab-razi",
    source: "lab",
    providerName: "مختبر الرازي",
    providerSubtitle: "مختبر تحاليل · ضمن نطاق طلبك",
    total: 88,
    distanceKm: 3.7,
    fulfilment: "زيارة منزلية اليوم",
    itemsSummary: "يشمل التحاليل المطلوبة دون رسوم زيارة إضافية",
    validUntil: "صالح لمدة 35 دقيقة",
    note: "سيحدد المختبر موعد الزيارة بعد تأكيد الاختيار.",
  },
  {
    id: "lab-mashfa",
    source: "lab",
    providerName: "مختبر المشفى",
    providerSubtitle: "مختبر تحاليل · ضمن نطاق طلبك",
    total: 102,
    distanceKm: 5.4,
    fulfilment: "زيارة منزلية خلال 3 ساعات",
    itemsSummary: "يشمل جمع العينة المنزلية والتحاليل المطلوبة",
    validUntil: "صالح لمدة 30 دقيقة",
    note: "الموعد النهائي يعتمد على توفر فريق سحب العينات.",
  },
];

function getRatingForOffer(offer: QuoteOffer): number {
  // Deterministic rating seeded from the offer id so the same offer always
  // has the same rating (4.0 - 5.0 range) across sessions.
  let hash = 0;
  for (let i = 0; i < offer.id.length; i += 1) {
    hash = (hash * 31 + offer.id.charCodeAt(i)) >>> 0;
  }
  return 4 + (hash % 11) / 10;
}

export function getQuoteOfferRating(offer: QuoteOffer): number {
  return getRatingForOffer(offer);
}

export function getQuoteOffers(query: QuoteOfferQuery): QuoteOffer[] {
  let results = query.filter === "all" ? QUOTE_OFFERS : QUOTE_OFFERS.filter((offer) => offer.source === query.filter);
  const maxPrice = query.maxPrice;
  if (maxPrice !== null) {
    results = results.filter((offer) => offer.total <= maxPrice);
  }
  const maxDistanceKm = query.maxDistanceKm;
  if (maxDistanceKm !== null) {
    results = results.filter((offer) => offer.distanceKm <= maxDistanceKm);
  }
  const sorted = [...results].sort((a, b) => {
    switch (query.sort) {
      case "price-asc":
        return a.total - b.total;
      case "price-desc":
        return b.total - a.total;
      case "distance":
        return a.distanceKm - b.distanceKm;
      case "rating":
        return getRatingForOffer(b) - getRatingForOffer(a);
      default:
        return a.total - b.total;
    }
  });
  return sorted;
}

export const QUOTE_OFFER_SORT_LABELS: Record<QuoteOfferSort, string> = {
  "price-asc": "الأقل سعرًا",
  "price-desc": "الأعلى سعرًا",
  distance: "الأقرب",
  rating: "الأعلى تقييمًا",
};

export function getOfferSourceLabel(source: QuoteOfferSource) {
  return source === "pharmacy" ? "الصيدليات" : "المختبرات";
}

export function getPaymentMethodLabel(method: LocalPaymentMethod) {
  return method === "electronic" ? "الدفع الإلكتروني" : "الدفع نقدًا";
}

export type QuoteOfferSource = "pharmacy" | "lab";
export type QuoteOfferFilter = QuoteOfferSource | "all";
export type LocalPaymentMethod = "electronic" | "cash";

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

export function getQuoteOffers(filter: QuoteOfferFilter = "all") {
  const results = filter === "all" ? QUOTE_OFFERS : QUOTE_OFFERS.filter((offer) => offer.source === filter);
  return [...results].sort((a, b) => a.total - b.total);
}

export function getOfferSourceLabel(source: QuoteOfferSource) {
  return source === "pharmacy" ? "الصيدليات" : "المختبرات";
}

export function getPaymentMethodLabel(method: LocalPaymentMethod) {
  return method === "electronic" ? "الدفع الإلكتروني" : "الدفع نقدًا";
}

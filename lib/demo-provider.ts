/**
 * حسابات مقدمي الخدمة الافتراضية (النموذجية).
 *
 * تُستخدم لعرض بطاقات مقدمي خدمة تجريبية في صفحات البحث عندما لا يكون
 * هناك مقدمو خدمة حقيقيون مسجلون في التطبيق، بحيث تُصبح البطاقات قابلة
 * للحجز فعليًا بدلًا من رسالة «سيُضاف لاحقًا» الثابتة.
 *
 * يُعرّف الحساب الافتراضي بـ prefix `demo-` لتمييزه عن الحسابات الحقيقية
 * في السجلات والاختبارات.
 */
import type { ProviderAccount, ProviderAvailability } from "@/lib/provider-registry";

export type DemoProviderSample = {
  id: string;
  name: string;
  rating?: number;
  reviewCount?: number;
  price?: number;
  distanceKm?: number;
  initials?: string;
};

export const DEMO_PROVIDER_PREFIX = "demo-";

export const DEMO_SERVICE_LABELS: Record<string, string> = {
  general: "كشف منزلي عام",
  pediatrics: "كشف منزلي للأطفال",
  obgyn: "كشف منزلي للنساء",
  internal: "كشف منزلي للبطن",
  surgery: "استشارة جراحية منزلية",
  cardiology: "كشف منزلي للقلب",
  dermatology: "كشف جلدية منزلي",
  orthopedics: "كشف عظام منزلي",
  ent: "كشف أنف وأذن منزلي",
  ophthalmology: "كشف عيون منزلي",
  urology: "كشف مسالك منزلي",
  neurology: "كشف أعصاب منزلي",
  nursing: "تمريض منزلي",
  senior_care: "رعاية منزلية لكبار السن",
  physio: "جلسة علاج طبيعي",
  general_therapy: "جلسة علاج نفسي عام",
  "anxiety-depression": "جلسة للقلق والاكتئاب",
  "children-adolescents": "جلسة للأطفال والمراهقين",
  cbt: "جلسة علاج سلوكي معرفي",
  "family-couples": "إرشاد أسري وزوجي",
  addiction: "جلسة إدمان وتعافي",
  trauma: "جلسة للصدمات النفسية",
  "nutrition-health-beauty": "استشارة تغذية وصحة وجمال",
  veterinary: "كشف منزلي بيطري",
};

export function buildDemoProviderAccount(sample: DemoProviderSample, label: string): ProviderAccount {
  const serviceLabel = DEMO_SERVICE_LABELS[label] ?? "خدمة منزلية";
  return {
    id: `${DEMO_PROVIDER_PREFIX}${sample.id}-${label}`,
    fullName: sample.name,
    role: "partner",
    phone: "",
    passwordHash: 0,
    createdAt: Date.now(),
    status: "active",
    specializations: [label],
    yearsOfExperience: 5,
    bio: "",
    documents: [],
    services: [
      {
        id: "demo-service",
        name: serviceLabel,
        price: sample.price ?? 150,
        isCustom: false,
        durationMinutes: 60,
      },
    ],
    availability: { availableNow: true, slots: [] } as ProviderAvailability,
  };
}

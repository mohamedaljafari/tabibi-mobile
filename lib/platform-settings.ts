/**
 * إعدادات عامة للمنصة تديرها لوحة التحكم دون تعديل الكود.
 *
 * المفتاح: `tabibi.platform_settings.v1`
 * تخزَّن كـ JSON في AsyncStorage المشتركة، وتُقرأ من تطبيق المريض والشريك
 * عند احتساب أرباح مقدم الخدمة وخصومات العروض.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export type PlatformSettings = {
  /**
   * نسبة عمولة المنصة على كل دفعة لمقدم الخدمة (0-100).
   * مثال: 10 تعني أن المنصة تحتفظ بـ 10% ويحصل مقدم الخدمة على 90%.
   */
  platformCommissionPercent: number;
  /**
   * نسبة الخصم الافتراضية المطبقة على العروض الترويجية (0-100).
   * عند تركها صفرًا يُستخدم سعر العرض كما هو.
   */
  defaultOfferDiscountPercent: number;
  /** أحدث تحديث للإعدادات (طابع زمني). */
  updatedAt?: number;
};

export const PLATFORM_SETTINGS_KEY = "tabibi.platform_settings.v1";

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  platformCommissionPercent: 0,
  defaultOfferDiscountPercent: 0,
};

export async function readPlatformSettings(): Promise<PlatformSettings> {
  try {
    const raw = await AsyncStorage.getItem(PLATFORM_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_PLATFORM_SETTINGS };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_PLATFORM_SETTINGS };
    return {
      platformCommissionPercent: clampPercent(Number(parsed.platformCommissionPercent) ?? 0),
      defaultOfferDiscountPercent: clampPercent(Number(parsed.defaultOfferDiscountPercent) ?? 0),
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : undefined,
    };
  } catch {
    return { ...DEFAULT_PLATFORM_SETTINGS };
  }
}

export async function writePlatformSettings(settings: PlatformSettings): Promise<PlatformSettings> {
  const sanitized: PlatformSettings = {
    platformCommissionPercent: clampPercent(settings.platformCommissionPercent),
    defaultOfferDiscountPercent: clampPercent(settings.defaultOfferDiscountPercent),
    updatedAt: Date.now(),
  };
  await AsyncStorage.setItem(PLATFORM_SETTINGS_KEY, JSON.stringify(sanitized));
  return sanitized;
}

function clampPercent(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 10) / 10;
}

/**
 * حساب مبلغ مقدم الخدمة بعد خصم عمولة المنصة.
 * مثال: مبلغ 100 د.ل بعمولة 10% → يحصل مقدم الخدمة على 90 د.ل.
 */
export function providerShareAfterCommission(grossAmount: number, commissionPercent: number): number {
  const clamped = clampPercent(commissionPercent);
  const rounded = Math.round(grossAmount * 100) / 100;
  return Math.round(rounded * (1 - clamped / 100) * 100) / 100;
}

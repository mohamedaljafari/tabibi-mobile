/**
 * التحقق من الرمز السري للوحة التحكم الإدارية.
 *
 * الرمز السري ADMIN_PIN يُحقن في وقت البناء باسم EXPO_PUBLIC_ADMIN_PIN
 * (عبر سكربت dev:metro الذي ينقل ADMIN_PIN). للاختبارات الوحدوية
 * يُقرأ مباشرة من process.env.ADMIN_PIN.
 *
 * ملاحظة هندسية: على الويب (Vite) يُقرأ extra عبر الاستيراد الثابت
 * لـ expo-constants؛ وعلى الأجهزة تظل القراءة ديناميكية داخل الدالة.
 */
import Constants from "expo-constants";

function readFromConstants(): string | undefined {
  try {
    const extra = Constants.expoConfig?.extra as
      | { ADMIN_PIN?: string; EXPO_PUBLIC_ADMIN_PIN?: string }
      | undefined;
    const value = extra?.ADMIN_PIN || extra?.EXPO_PUBLIC_ADMIN_PIN;
    if (value && value.trim().length > 0) return value.trim();
  } catch {
    // خارج بيئة Expo (مثل vitest بدون إعداد) — نُهمل ونسقط للمصدر التالي.
  }
  return undefined;
}

function readFromViteEnv(): string | undefined {
  try {
    const env = (globalThis as { __VITE_ENV__?: Record<string, string> }).__VITE_ENV__;
    if (env) {
      const value = env.ADMIN_PIN || env.EXPO_PUBLIC_ADMIN_PIN;
      if (value && value.trim().length > 0) return value.trim();
    }
  } catch {
    // غير مدعوم — نُهمل
  }
  return undefined;
}

function resolveAdminPin(): string | undefined {
  // expo-constants على الويب (Vite) يقرأ extra من app.config مباشرة عبر الاستيراد الثابت.
  const fromConstants = readFromConstants();
  if (fromConstants && fromConstants.trim().length > 0) return fromConstants.trim();

  const fromEnv = typeof process !== "undefined" ? process.env?.ADMIN_PIN : undefined;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv.trim();

  const fromPublic = typeof process !== "undefined" ? process.env?.EXPO_PUBLIC_ADMIN_PIN : undefined;
  if (fromPublic && fromPublic.trim().length > 0) return fromPublic.trim();

  return readFromViteEnv();
}

export function isValidAdminPin(pin: string | undefined | null): boolean {
  const correct = resolveAdminPin();
  return Boolean(correct) && Boolean(pin) && pin!.trim() === correct && pin!.trim().length >= 6;
}

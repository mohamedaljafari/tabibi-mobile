/**
 * التحقق من الرمز السري للوحة التحكم الإدارية.
 *
 * الرمز السري ADMIN_PIN يُحقن في وقت البناء باسم EXPO_PUBLIC_ADMIN_PIN
 * (عبر سكربت dev:metro الذي ينقل ADMIN_PIN). للاختبارات الوحدوية
 * يُقرأ مباشرة من process.env.ADMIN_PIN.
 *
 * ملاحظة هندسية: استيراد expo-constants في قمة الملف يكسر محوّل Vite
 * في بيئة vitest، لذا يُقرأ بشكل ديناميكي داخل الدالة.
 */

function readFromConstants(): string | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require("expo-constants") as {
      expoConfig?: { extra?: Record<string, string> };
    };
    const extra = Constants.expoConfig?.extra;
    const value = extra?.ADMIN_PIN || extra?.EXPO_PUBLIC_ADMIN_PIN;
    if (value && value.trim().length > 0) return value.trim();
  } catch {
    // خارج بيئة Expo (مثل vitest بدون إعداد) — نُهمل ونسقط للمصدر التالي.
  }
  return undefined;
}

function resolveAdminPin(): string | undefined {
  const fromEnv = typeof process !== "undefined" ? process.env?.ADMIN_PIN : undefined;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv.trim();

  const fromPublic = typeof process !== "undefined" ? process.env?.EXPO_PUBLIC_ADMIN_PIN : undefined;
  if (fromPublic && fromPublic.trim().length > 0) return fromPublic.trim();

  return readFromConstants();
}

export function isValidAdminPin(pin: string | undefined | null): boolean {
  const correct = resolveAdminPin();
  return Boolean(correct) && Boolean(pin) && pin!.trim() === correct && pin!.trim().length >= 6;
}

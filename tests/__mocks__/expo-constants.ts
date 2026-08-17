/**
 * محاكاة expo-constants لبيئة الاختبار (vitest / node).
 * تُعيّن expoConfig.extra من متغيرات البيئة ADMIN_PIN و EXPO_PUBLIC_ADMIN_PIN
 * حتى تظل اختبارات admin-auth تعمل بعد التحول إلى الاستيراد الثابت.
 */
const Constants = {
  expoConfig: {
    extra: {
      ADMIN_PIN: process.env.ADMIN_PIN,
      EXPO_PUBLIC_ADMIN_PIN: process.env.EXPO_PUBLIC_ADMIN_PIN,
    },
  },
};

export default Constants;

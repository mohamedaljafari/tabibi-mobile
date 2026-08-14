import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { router } from "expo-router";

import { getPatientProfile } from "@/lib/patient-profile";

/**
 * البوابة الرئيسية للتطبيق داخل شريط التابات.
 *
 * توجّه المستخدم بنفس منطق نقطة الدخول (`app/index.tsx`)، لأن الصفحة الافتراضية
 * داخل شريط التابات كانت تعرض قالبًا بلا بانر إعلاني ولا شبكة خدمات.
 *
 * - مسجّل ومؤسِّس للبيانات: الصفحة الرئيسية `/home` (البانر الإعلاني وشبكة الخدمات).
 * - مسجّل وغير مؤسِّس للبيانات: إكمال بيانات الحساب `/profile`.
 * - غير مسجّل: تسجيل الدخول `/login`.
 */
export default function TabHomeGate() {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const profile = await getPatientProfile();
      if (!cancelled) {
        router.replace(
          (profile
            ? profile.isSetupComplete
              ? "/home"
              : "/profile"
            : "/login") as never,
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator color="#6B7B3F" size="small" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", flex: 1, justifyContent: "center" },
});

import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { FormField } from "@/components/form-field";
import { ScreenContainer } from "@/components/screen-container";
import { TabibiBrand } from "@/components/tabibi-logo";
import { registerWithPhone } from "@/lib/_core/tabibi-api";
import { hasRegistrationErrors, validateRegistration, type RegistrationInput, type RegistrationValidation } from "@/lib/patient-profile";

const INITIAL_FORM: RegistrationInput = { fullName: "", phone: "", password: "", confirmPassword: "" };

export default function RegisterScreen() {
  const [form, setForm] = useState<RegistrationInput>(INITIAL_FORM);
  const [errors, setErrors] = useState<RegistrationValidation>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: keyof RegistrationInput, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleRegister = async () => {
    const validation = validateRegistration(form);
    setErrors(validation);
    if (hasRegistrationErrors(validation)) return;

    setIsSubmitting(true);
    try {
      const result = await registerWithPhone({
        fullName: form.fullName,
        phone: form.phone,
        password: form.password,
        role: "patient",
      });
      if ("error" in result) {
        Alert.alert("تعذر إنشاء الحساب", result.error);
        return;
      }
      router.replace("/profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
      <View style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TabibiBrand width={86} />
            <Text style={styles.title}>أهلًا بك في رعايتك المنزلية</Text>
            <Text style={styles.subtitle}>أنشئ حسابك لتبدأ طلب الخدمات الصحية وأنت في منزلك.</Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formHeading}>بيانات الحساب</Text>
            <FormField label="الاسم الكامل" value={form.fullName} onChangeText={(value) => updateField("fullName", value)} placeholder="اكتب اسمك الكامل" autoCapitalize="words" autoComplete="name" returnKeyType="next" error={errors.fullName} />
            <FormField label="رقم الهاتف" value={form.phone} onChangeText={(value) => updateField("phone", value)} placeholder="مثال: 050 000 0000" keyboardType="phone-pad" autoComplete="tel" returnKeyType="next" error={errors.phone} />
            <FormField label="كلمة المرور" value={form.password} onChangeText={(value) => updateField("password", value)} placeholder="8 أحرف على الأقل" autoComplete="new-password" secure returnKeyType="next" error={errors.password} />
            <FormField label="تأكيد كلمة المرور" value={form.confirmPassword} onChangeText={(value) => updateField("confirmPassword", value)} placeholder="أعد إدخال كلمة المرور" autoComplete="new-password" secure returnKeyType="done" onSubmitEditing={handleRegister} error={errors.confirmPassword} />
          </View>

          <Pressable accessibilityRole="button" accessibilityLabel="إنشاء الحساب" disabled={isSubmitting} onPress={handleRegister} style={({ pressed }) => [styles.primaryButton, (pressed || isSubmitting) && styles.primaryButtonPressed]}>
            <Text style={styles.primaryButtonText}>{isSubmitting ? "جارٍ إنشاء الحساب..." : "إنشاء الحساب"}</Text>
          </Pressable>
          <Text style={styles.privacy}>بالمتابعة، أنت توافق على استخدام بياناتك لتقديم خدمات الرعاية الصحية المنزلية.</Text>
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "flex-start", paddingBottom: 16, paddingHorizontal: 18, paddingTop: 4 },
  header: { alignItems: "center", marginBottom: 6, marginTop: 8 },
  title: { color: "#465132", fontSize: 20, fontWeight: "800", lineHeight: 28, marginTop: 2, textAlign: "center" },
  subtitle: { color: "#8A8173", fontSize: 14, lineHeight: 21, marginTop: 5, maxWidth: 310, textAlign: "center" },
  formCard: { backgroundColor: "#FFFDF8", borderColor: "#E4DCCB", borderRadius: 24, borderWidth: 1, gap: 8, padding: 12, shadowColor: "#6B7B3F", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 18 },
  formHeading: { color: "#465132", fontSize: 16, fontWeight: "800", marginBottom: 0, textAlign: "right" },
  primaryButton: { alignItems: "center", backgroundColor: "#6B7B3F", borderRadius: 16, justifyContent: "center", marginTop: 10, minHeight: 46, shadowColor: "#6B7B3F", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.2, shadowRadius: 10 },
  primaryButtonPressed: { opacity: 0.86, transform: [{ scale: 0.98 }] },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  privacy: { color: "#8A8173", fontSize: 12, lineHeight: 18, marginHorizontal: 14, marginTop: 12, textAlign: "center" },
});

import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { TabibiBrand } from "@/components/tabibi-logo";
import { signInWithPhone } from "@/lib/auth-supabase";
import { readPatientSetup } from "@/lib/records-supabase";
import { normalizePhone } from "@/lib/patient-profile";

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSignIn = async () => {
    if (busy) return;
    const normalizedPhone = normalizePhone(phone.trim());
    if (normalizedPhone.length < 9) {
      Alert.alert("بيانات غير مكتملة", "أدخل رقم الهاتف كما سُجل به الحساب.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("بيانات غير مكتملة", "أدخل كلمة المرور (8 أحرف على الأقل).");
      return;
    }
    setBusy(true);
    try {
      const result = await signInWithPhone(normalizedPhone, password);
      if ("error" in result) {
        Alert.alert("تعذر تسجيل الدخول", result.error);
        if (Platform.OS !== "web") {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        return;
      }
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      // حالة إكمال إعداد الحساب محفوظة في Supabase وتُقرأ هنا لتحديد الوجهة.
      let isSetupComplete = false;
      try {
        const setup = await readPatientSetup(result.user);
        isSetupComplete = Boolean(setup.isSetupComplete);
      } catch {
        // لا نمنع الدخول عند تعذر قراءة الإعداد.
      }
      router.replace(isSetupComplete ? ("/home" as never) : ("/profile" as never));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer className="px-6">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 justify-center gap-6">
            <View className="items-center gap-3">
              <TabibiBrand width={86} />
              <Text className="text-3xl font-bold text-foreground">الدخول إلى حسابك</Text>
              <Text className="text-sm text-muted text-center leading-6">
                أدخل الاسم وكلمة المرور للمتابعة إلى رعايتك المنزلية.
              </Text>
            </View>

            <View className="gap-4">
              <View className="gap-2">
                <Text className="text-sm font-bold text-foreground">رقم الهاتف</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="مثال: 09XXXXXXXX أو +2189XXXXXXXX"
                  keyboardType="phone-pad"
                  placeholderTextColor="#8A8173"
                  autoCapitalize="none"
                  autoComplete="tel"
                  returnKeyType="done"
                  onSubmitEditing={handleSignIn}
                  className="rounded-2xl border border-border bg-surface px-4 py-4 text-foreground"
                  style={styles.inputText}
                />
              </View>

              <View className="gap-2">
                <Text className="text-sm font-bold text-foreground">كلمة المرور</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="أدخل كلمة المرور"
                  placeholderTextColor="#8A8173"
                  secureTextEntry={!passwordVisible}
                  returnKeyType="done"
                  onSubmitEditing={handleSignIn}
                  className="rounded-2xl border border-border bg-surface px-4 py-4 text-foreground"
                  style={styles.inputText}
                />
              </View>
            </View>

            <Pressable
              onPress={handleSignIn}
              disabled={busy}
              style={({ pressed }) => [
                styles.button,
                pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
                busy && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.buttonText}>{busy ? "جارٍ الدخول..." : "تسجيل الدخول"}</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                if (Platform.OS !== "web") {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                router.replace("/register");
              }}
              style={({ pressed }) => [styles.link, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.linkText}>ليس لديك حساب؟ إنشاء حساب جديد</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  inputText: { fontSize: 15, lineHeight: 22, textAlign: "right" },
  button: {
    alignItems: "center",
    backgroundColor: "#6B7B3F",
    borderRadius: 999,
    paddingVertical: 15,
  },
  buttonText: { color: "#FFFDF8", fontSize: 16, fontWeight: "800" },
  link: { alignItems: "center", paddingVertical: 4 },
  linkText: { color: "#8A8173", fontSize: 13, fontWeight: "700" },
});

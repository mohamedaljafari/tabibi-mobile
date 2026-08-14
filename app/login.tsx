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
import { getPatientProfile,
  updatePatientPassword, verifyPassword, updatePatientPasswordStrong } from "@/lib/patient-profile";

export default function LoginScreen() {
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSignIn = async () => {
    if (busy) return;
    const trimmedName = fullName.trim();
    if (trimmedName.length < 3) {
      Alert.alert("بيانات غير مكتملة", "أدخل الاسم الكامل كما سُجل به الحساب.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("بيانات غير مكتملة", "أدخل كلمة المرور (8 أحرف على الأقل).");
      return;
    }
    setBusy(true);
    try {
      const profile = await getPatientProfile();
      if (!profile) {
        Alert.alert("الحساب غير موجود", "لم نعثر على حساب مسجل، جرّب إنشاء حساب جديد من الأسفل.");
        if (Platform.OS !== "web") {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        setBusy(false);
        return;
      }
      const normalizedInput = trimmedName.toLocaleLowerCase("ar");
      const normalizedSaved = profile.fullName.toLocaleLowerCase("ar");
      const nameMatches = normalizedInput === normalizedSaved;
      const passwordMatches = profile.passwordHash !== undefined && await verifyPassword(profile.passwordHash, password);

      // الحسابات القديمة التي لم تُحفظ فيها كلمة المرور تقبل بكلمة المرور المدخلة أول مرة.
      if (nameMatches && (passwordMatches || profile.passwordHash === undefined)) {
        // حساب قديم لم تُحفظ فيه كلمة المرور: نحفظ تجزئة كلمة المرور المدخلة.
        if (profile.passwordHash === undefined) {
          try {
            await updatePatientPasswordStrong(password);
          } catch {
            // المتابعة دون حفظ الهاش لا تمنع الدخول.
          }
        }
        // ترقية التجزئة الضعيفة القديمة (djb2) إلى SHA-256 مع salt عند الدخول الناجح.
        if (profile.passwordHash !== undefined && typeof profile.passwordHash !== "string") {
          try {
            await updatePatientPasswordStrong(password);
          } catch {
            // المتابعة دون ترقية لا تمنع الدخول.
          }
        }
        if (Platform.OS !== "web") {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        router.replace(profile.isSetupComplete ? ("/home" as never) : ("/profile" as never));
        return;
      }
      if (!nameMatches) {
        Alert.alert("بيانات غير صحيحة", "الاسم لا يطابق الحساب المسجل في هذا التطبيق.");
      } else {
        Alert.alert("كلمة المرور غير صحيحة", "تحقق من كلمة المرور وحاول مرة أخرى.");
      }
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
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
                <Text className="text-sm font-bold text-foreground">الاسم الكامل</Text>
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="اكتب اسمك كما سُجل به الحساب"
                  placeholderTextColor="#8A8173"
                  autoCapitalize="none"
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

import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";
import { TabibiLogo } from "@/components/tabibi-logo";

export default function RegistrationSuccessScreen() {
  const { name } = useLocalSearchParams<{ name?: string }>();
  const firstName = name?.trim().split(" ")[0] ?? "بك";

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.container}>
        <View style={styles.top}>
          <TabibiLogo size={70} />
          <View style={styles.successBadge}><MaterialIcons name="check" size={24} color="#FFFDF8" /></View>
          <Text style={styles.title}>تم إنشاء حسابك بنجاح</Text>
          <Text style={styles.subtitle}>أهلًا {firstName}، يمكنك الآن استكشاف خدمات الرعاية الصحية المنزلية وبدء طلبك الأول بسهولة.</Text>
        </View>
        <View style={styles.notice}>
          <MaterialIcons name="verified-user" size={23} color="#6B7B3F" />
          <Text style={styles.noticeText}>ستُستكمل بياناتك الصحية عند طلب الخدمة، وبالقدر اللازم فقط لتقديم الرعاية.</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.replace("/home" as never)} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <Text style={styles.buttonText}>الانتقال إلى الرئيسية</Text>
          <MaterialIcons name="arrow-back" size={21} color="#FFFDF8" />
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 22 },
  top: { alignItems: "center" },
  successBadge: { alignItems: "center", backgroundColor: "#C9A961", borderColor: "#F5F0E6", borderRadius: 22, borderWidth: 4, height: 44, justifyContent: "center", marginTop: -15, width: 44 },
  title: { color: "#465132", fontSize: 25, fontWeight: "800", lineHeight: 34, marginTop: 24, textAlign: "center" },
  subtitle: { color: "#8A8173", fontSize: 16, lineHeight: 25, marginTop: 10, textAlign: "center" },
  notice: { alignItems: "flex-start", backgroundColor: "#F0EBDD", borderRadius: 18, flexDirection: "row-reverse", gap: 11, marginTop: 30, padding: 16 },
  noticeText: { color: "#5F614F", flex: 1, fontSize: 13, lineHeight: 20, textAlign: "right" },
  button: { alignItems: "center", backgroundColor: "#6B7B3F", borderRadius: 16, flexDirection: "row-reverse", gap: 8, justifyContent: "center", marginTop: 30, minHeight: 56 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  pressed: { opacity: 0.86, transform: [{ scale: 0.98 }] },
});

import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";

export default function AddressPickerContent() {
  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.container}>
        <MaterialIcons name="map" size={44} color="#6B7B3F" />
        <Text style={styles.title}>اختيار العنوان متاح في تطبيق الجوال</Text>
        <Text style={styles.copy}>افتح تطبيق طبيبي على Android أو iOS لتحديد عنوانك من الخريطة أو باستخدام موقعك الحالي.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <Text style={styles.buttonText}>العودة إلى حسابي</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", flex: 1, justifyContent: "center", padding: 28 },
  title: { color: "#465132", fontSize: 22, fontWeight: "800", marginTop: 15, textAlign: "center" },
  copy: { color: "#8A8173", fontSize: 15, lineHeight: 23, marginTop: 9, textAlign: "center" },
  button: { alignItems: "center", backgroundColor: "#6B7B3F", borderRadius: 16, justifyContent: "center", marginTop: 24, minHeight: 54, paddingHorizontal: 24 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  pressed: { opacity: 0.84, transform: [{ scale: 0.98 }] },
});

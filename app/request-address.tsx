/**
 * شاشة إدخال عنوان الزيارة النصي قبل إرسال الطلب.
 *
 * تُفتح من صفحة تفاصيل مقدم الخدمة عند اختيار «إدخال عنوان نصي»،
 * وتتواصل مع الطبيب بعد إرسال العنوان مباشرة.
 */
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";

export default function RequestAddressScreen() {
  const { providerId, addressDetails } = useLocalSearchParams<{
    providerId?: string;
    addressDetails?: string;
  }>();
  const [address, setAddress] = useState(addressDetails ?? "");

  const handleContinue = () => {
    const details = address.trim();
    if (details.length < 5) {
      Alert.alert("عنوان غير مكتمل", "أدخل تفاصيل كافية لعنوان الزيارة (الحي والشارع ومعلم قريب).");
      return;
    }
    router.push({
      pathname: "/doctor-detail",
      params: { providerId, addressDetails: details },
    } as never);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="رجوع" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <MaterialIcons name="arrow-forward" size={23} color="#6B7B3F" />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>عنوان الزيارة</Text>
            <Text style={styles.subtitle}>اكتب العنوان الذي ستستقبل فيه مقدم الخدمة.</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>عنوان الزيارة</Text>
          <TextInput
            value={address}
            onChangeText={setAddress}
            multiline
            placeholder="الحي، الشارع، ومعلم قريب (مسجد، مجمع، مدرسه)"
            placeholderTextColor="#A19787"
            textAlign="right"
            style={styles.multilineInput}
          />
          <Text style={styles.hint}>يمكنك لاحقًا حفظ العناوين من صفحة حسابي واختيارها مباشرة.</Text>
        </View>

        <Pressable accessibilityRole="button" onPress={handleContinue} style={({ pressed }) => [styles.continueButton, pressed && styles.pressed]}>
          <Text style={styles.continueText}>متابعة وإرسال الطلب</Text>
          <MaterialIcons name="arrow-back" size={21} color="#FFFFFF" />
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 30 },
  header: { alignItems: "flex-start", flexDirection: "row", gap: 13 },
  headerCopy: { flex: 1 },
  back: { alignItems: "center", backgroundColor: "#F0EBDD", borderRadius: 18, height: 42, justifyContent: "center", width: 42 },
  title: { color: "#465132", fontSize: 21, fontWeight: "800", lineHeight: 27, textAlign: "right" },
  subtitle: { color: "#8A8173", fontSize: 12, marginTop: 2, textAlign: "right" },
  card: { backgroundColor: "#FFFDF8", borderColor: "#E4DCCB", borderRadius: 22, borderWidth: 1, gap: 12, marginTop: 24, padding: 18 },
  label: { color: "#465132", fontSize: 14, fontWeight: "800", textAlign: "right" },
  multilineInput: { backgroundColor: "#FFFDF8", borderColor: "#E4DCCB", borderRadius: 14, borderWidth: 1, color: "#465132", fontSize: 15, lineHeight: 22, minHeight: 110, padding: 13, textAlignVertical: "top" },
  hint: { color: "#9A907E", fontSize: 10, lineHeight: 15, textAlign: "right" },
  continueButton: { alignItems: "center", backgroundColor: "#6B7B3F", borderRadius: 16, flexDirection: "row-reverse", gap: 8, justifyContent: "center", marginTop: 20, minHeight: 56 },
  continueText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
});

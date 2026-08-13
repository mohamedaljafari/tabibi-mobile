import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";

const SERVICES = ["زيارة تمريض", "استشارة منزلية", "تحاليل منزلية", "علاج طبيعي"];

export default function CareRequestScreen() {
  const [service, setService] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const handleContinue = () => {
    if (!service || address.trim().length < 5) {
      Alert.alert("أكمل البيانات", "اختر نوع الخدمة وأدخل موقع الزيارة للمتابعة.");
      return;
    }
    Alert.alert("تم حفظ مسودة الطلب", "هذه نسخة أولية من المسار. سيُربط إرسال الطلب ومتابعته بفريق الرعاية بعد اعتماد المنظومة التشغيلية.", [{ text: "حسنًا", onPress: () => router.replace("/home" as never) }]);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}><Pressable accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><MaterialIcons name="arrow-forward" size={23} color="#0B6E99" /></Pressable><View><Text style={styles.title}>طلب رعاية منزلية</Text><Text style={styles.subtitle}>أدخل التفاصيل الأولية للزيارة.</Text></View></View>
        <View style={styles.card}>
          <Text style={styles.label}>نوع الخدمة</Text>
          <View style={styles.serviceGrid}>{SERVICES.map((item) => <Pressable key={item} accessibilityRole="button" onPress={() => setService(item)} style={({ pressed }) => [styles.serviceChoice, service === item && styles.serviceActive, pressed && styles.pressed]}><Text style={[styles.serviceText, service === item && styles.serviceTextActive]}>{item}</Text></Pressable>)}</View>
          <Text style={styles.label}>موقع الزيارة</Text>
          <TextInput value={address} onChangeText={setAddress} multiline placeholder="الحي، الشارع، ومعلم قريب" placeholderTextColor="#82939C" textAlign="right" style={styles.multilineInput} />
          <Text style={styles.label}>ملاحظات للحالة (اختياري)</Text>
          <TextInput value={notes} onChangeText={setNotes} multiline placeholder="أضف أي ملاحظات تساعدنا في تجهيز الزيارة" placeholderTextColor="#82939C" textAlign="right" style={styles.multilineInput} />
        </View>
        <Pressable accessibilityRole="button" onPress={handleContinue} style={({ pressed }) => [styles.continueButton, pressed && styles.pressed]}><Text style={styles.continueText}>متابعة الطلب</Text><MaterialIcons name="arrow-back" size={21} color="#FFFFFF" /></Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 30 },
  header: { alignItems: "flex-start", flexDirection: "row", gap: 13 },
  back: { alignItems: "center", backgroundColor: "#EAF6FA", borderRadius: 18, height: 42, justifyContent: "center", width: 42 },
  title: { color: "#12303F", fontSize: 22, fontWeight: "800", lineHeight: 28, textAlign: "right" },
  subtitle: { color: "#58707D", fontSize: 13, marginTop: 2, textAlign: "right" },
  card: { backgroundColor: "#FFFFFF", borderColor: "#D8E8EE", borderRadius: 22, borderWidth: 1, gap: 12, marginTop: 26, padding: 18 },
  label: { color: "#173A49", fontSize: 14, fontWeight: "800", marginTop: 4, textAlign: "right" },
  serviceGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 9, marginBottom: 7 },
  serviceChoice: { backgroundColor: "#F3F8FA", borderColor: "#D8E8EE", borderRadius: 12, borderWidth: 1, minWidth: "46%", paddingHorizontal: 10, paddingVertical: 13 },
  serviceActive: { backgroundColor: "#EAF6FA", borderColor: "#0B6E99" },
  serviceText: { color: "#58707D", fontSize: 13, fontWeight: "700", textAlign: "center" },
  serviceTextActive: { color: "#0B6E99" },
  multilineInput: { backgroundColor: "#FFFFFF", borderColor: "#D8E8EE", borderRadius: 14, borderWidth: 1, color: "#12303F", fontSize: 15, lineHeight: 22, minHeight: 94, padding: 13, textAlignVertical: "top" },
  continueButton: { alignItems: "center", backgroundColor: "#0B6E99", borderRadius: 16, flexDirection: "row-reverse", gap: 8, justifyContent: "center", marginTop: 20, minHeight: 56 },
  continueText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
});

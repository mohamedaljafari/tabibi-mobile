import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { FormField } from "@/components/form-field";
import { ScreenContainer } from "@/components/screen-container";
import { getPatientProfile, updatePatientProfile } from "@/lib/patient-profile";

export default function ProfileScreen() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => { getPatientProfile().then((profile) => { if (profile) { setFullName(profile.fullName); setPhone(profile.phone); } }); }, []);
  const save = async () => {
    if (fullName.trim().length < 3 || phone.replace(/\D/g, "").length < 8) { Alert.alert("تحقق من البيانات", "أدخل اسمًا كاملًا ورقم هاتف صحيحًا."); return; }
    await updatePatientProfile({ fullName, phone });
    Alert.alert("تم الحفظ", "تم تحديث بياناتك الأساسية على هذا الجهاز.");
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}><Pressable accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><MaterialIcons name="arrow-forward" size={23} color="#0B6E99" /></Pressable><Text style={styles.title}>ملفي الشخصي</Text></View>
        <View style={styles.avatar}><MaterialIcons name="person" size={40} color="#0B6E99" /></View>
        <Text style={styles.helper}>يمكنك تعديل بيانات الاتصال الأساسية. لن نطلب بياناتك الصحية إلا عند الحاجة إلى الرعاية.</Text>
        <View style={styles.form}><FormField label="الاسم الكامل" value={fullName} onChangeText={setFullName} placeholder="اكتب اسمك الكامل" /><FormField label="رقم الهاتف" value={phone} onChangeText={setPhone} placeholder="اكتب رقم هاتفك" keyboardType="phone-pad" /></View>
        <Pressable accessibilityRole="button" onPress={save} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}><Text style={styles.saveText}>حفظ التعديلات</Text></Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 30 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  back: { alignItems: "center", backgroundColor: "#EAF6FA", borderRadius: 18, height: 42, justifyContent: "center", width: 42 },
  title: { color: "#12303F", fontSize: 22, fontWeight: "800" },
  avatar: { alignItems: "center", alignSelf: "center", backgroundColor: "#EAF6FA", borderRadius: 44, height: 88, justifyContent: "center", marginTop: 30, width: 88 },
  helper: { color: "#58707D", fontSize: 14, lineHeight: 22, marginHorizontal: 16, marginTop: 18, textAlign: "center" },
  form: { backgroundColor: "#FFFFFF", borderColor: "#D8E8EE", borderRadius: 22, borderWidth: 1, gap: 17, marginTop: 24, padding: 18 },
  saveButton: { alignItems: "center", backgroundColor: "#0B6E99", borderRadius: 16, justifyContent: "center", marginTop: 20, minHeight: 56 },
  saveText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  pressed: { opacity: 0.84, transform: [{ scale: 0.98 }] },
});

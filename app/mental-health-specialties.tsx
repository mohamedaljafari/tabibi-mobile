import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";
import { MENTAL_HEALTH_SPECIALTIES } from "@/lib/mental-health-directory";

export default function MentalHealthSpecialtiesScreen() {
  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="رجوع" onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <MaterialIcons name="arrow-forward" size={22} color="#6B7B3F" />
          </Pressable>
          <View><Text style={styles.title}>اختر التخصص</Text><Text style={styles.subtitle}>اختر مجال الدعم النفسي المناسب لك</Text></View>
        </View>

        <View style={styles.intro}>
          <View style={styles.introIcon}><MaterialIcons name="psychology" size={27} color="#8F7D98" /></View>
          <View style={styles.introCopy}><Text style={styles.introTitle}>الصحة النفسية حسب التخصص</Text><Text style={styles.introText}>بعد الاختيار، ستظهر لك صفحة البحث الخاصة بهذا التخصص.</Text></View>
        </View>

        <View style={styles.grid}>
          {MENTAL_HEALTH_SPECIALTIES.map((specialty) => (
            <Pressable key={specialty.id} accessibilityRole="button" accessibilityLabel={`اختيار ${specialty.title}`} onPress={() => router.push({ pathname: "/mental-health-search", params: { specialtyId: specialty.id } } as never)} style={({ pressed }) => [styles.specialtyCard, pressed && styles.pressed]}>
              <View style={[styles.specialtyIcon, { backgroundColor: specialty.surface }]}><MaterialIcons name={specialty.icon} size={27} color={specialty.tint} /></View>
              <Text numberOfLines={2} style={styles.specialtyTitle}>{specialty.title}</Text>
              <MaterialIcons name="chevron-left" size={16} color="#9A907E" style={styles.chevron} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 28 },
  header: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  backButton: { alignItems: "center", backgroundColor: "#F0EBDD", borderColor: "#E4DCCB", borderRadius: 16, borderWidth: 1, height: 40, justifyContent: "center", width: 40 },
  title: { color: "#465132", fontSize: 22, fontWeight: "800", lineHeight: 29, textAlign: "right" },
  subtitle: { color: "#8A8173", fontSize: 12, marginTop: 2, textAlign: "right" },
  intro: { alignItems: "center", backgroundColor: "#F2EDF4", borderRadius: 18, flexDirection: "row-reverse", gap: 11, marginTop: 23, padding: 14 },
  introIcon: { alignItems: "center", backgroundColor: "#FFFDF8", borderRadius: 15, height: 50, justifyContent: "center", width: 50 },
  introCopy: { flex: 1 },
  introTitle: { color: "#465132", fontSize: 14, fontWeight: "800", textAlign: "right" },
  introText: { color: "#786F61", fontSize: 11, lineHeight: 16, marginTop: 2, textAlign: "right" },
  grid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 10, marginTop: 16 },
  specialtyCard: { alignItems: "center", backgroundColor: "#FFFDF8", borderColor: "#E8E0D1", borderRadius: 17, borderWidth: 1, minHeight: 124, padding: 11, position: "relative", width: "47.9%" },
  specialtyIcon: { alignItems: "center", borderRadius: 17, height: 56, justifyContent: "center", width: 56 },
  specialtyTitle: { color: "#5A624B", fontSize: 12, fontWeight: "800", lineHeight: 17, marginTop: 10, textAlign: "center" },
  chevron: { bottom: 9, left: 9, position: "absolute" },
  pressed: { opacity: 0.76, transform: [{ scale: 0.98 }] },
});

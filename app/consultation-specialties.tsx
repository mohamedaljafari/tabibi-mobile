/**
 * تخصصات الاستشارات الطبية (داخل ليبيا / خارج ليبيا).
 * تعرض التخصصات الطبية نفسها المستخدمة في بحث الأطباء،
 * وتمرر نوع الاستشارة إلى صفحة النتائج.
 */
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ScreenContainer } from "@/components/screen-container";
import { DOCTOR_SPECIALTIES } from "@/lib/doctor-directory";
import type { ConsultationType } from "@/lib/consultation-doctors";

export default function ConsultationSpecialtiesScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const consultationType: ConsultationType = type === "international" ? "international" : "local";
  const isInternational = consultationType === "international";

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="رجوع"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <MaterialIcons name="arrow-forward" size={22} color="#6B7B3F" />
          </Pressable>
          <View>
            <Text style={styles.title}>
              {isInternational ? "استشارات خارج ليبيا" : "استشارات داخل ليبيا"}
            </Text>
            <Text style={styles.subtitle}>اختر التخصص لاستعراض الأطباء المتاحين</Text>
          </View>
        </View>
        <View style={styles.grid}>
          {DOCTOR_SPECIALTIES.map((specialty) => (
            <Pressable
              key={specialty.id}
              accessibilityRole="button"
              accessibilityLabel={`اختيار ${specialty.title}`}
              onPress={() =>
                router.push({
                  pathname: "/consultation-results",
                  params: { type: consultationType, specialtyId: specialty.id },
                } as never)
              }
              style={({ pressed }) => [styles.specialtyCard, pressed && styles.pressed]}>
              <View style={[styles.specialtyIcon, { backgroundColor: specialty.surface }]}>
                <MaterialIcons name={specialty.icon} size={27} color={specialty.tint} />
              </View>
              <Text numberOfLines={2} style={styles.specialtyTitle}>
                {specialty.title}
              </Text>
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
  backButton: {
    alignItems: "center",
    backgroundColor: "#F0EBDD",
    borderColor: "#E4DCCB",
    borderRadius: 16,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  title: { color: "#465132", fontSize: 22, fontWeight: "800", lineHeight: 29, textAlign: "right" },
  subtitle: { color: "#8A8173", fontSize: 12, marginTop: 2, textAlign: "right" },
  grid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 10, marginTop: 14 },
  specialtyCard: {
    alignItems: "center",
    backgroundColor: "#FFFDF8",
    borderColor: "#E8E0D1",
    borderRadius: 17,
    borderWidth: 1,
    minHeight: 124,
    padding: 11,
    position: "relative",
    width: "47.9%",
  },
  specialtyIcon: { alignItems: "center", borderRadius: 17, height: 56, justifyContent: "center", width: 56 },
  specialtyTitle: { color: "#5A624B", fontSize: 12, fontWeight: "800", lineHeight: 17, marginTop: 10, textAlign: "center" },
  chevron: { bottom: 9, left: 9, position: "absolute" },
  pressed: { opacity: 0.76, transform: [{ scale: 0.98 }] },
});

import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";

const SERVICES = [
  { id: "nursing", title: "التمريض", subtitle: "رعاية تمريضية منزلية", icon: "healing" as const, tint: "#B58943", surface: "#FBF2E2" },
  { id: "elderly-care", title: "رعاية كبار السن", subtitle: "دعم ورعاية صحية منزلية", icon: "elderly" as const, tint: "#7B8A62", surface: "#F0F3EA" },
  { id: "physical-therapy", title: "العلاج الطبيعي", subtitle: "جلسات علاج طبيعي منزلية", icon: "accessibility-new" as const, tint: "#628C8B", surface: "#E8F3F2" },
];

export default function AssistedServicesScreen() {
  const openService = (id: string) => {
    if (id === "nursing") { router.push("/nursing-search" as never); return; }
    router.push({ pathname: "/assisted-service-search", params: { serviceId: id } } as never);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="رجوع" onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}><MaterialIcons name="arrow-forward" size={22} color="#6B7B3F" /></Pressable>
          <View><Text style={styles.title}>خدمات طبية مساعدة</Text><Text style={styles.subtitle}>اختر الخدمة المنزلية المناسبة لك</Text></View>
        </View>

        <View style={styles.intro}>
          <View style={styles.introIcon}><MaterialIcons name="medical-services" size={27} color="#6B7B3F" /></View>
          <View style={styles.introCopy}><Text style={styles.introTitle}>رعاية منزلية متخصصة</Text><Text style={styles.introText}>اختر التمريض أو رعاية كبار السن أو العلاج الطبيعي.</Text></View>
        </View>

        <View style={styles.list}>
          {SERVICES.map((service) => (
            <Pressable key={service.id} accessibilityRole="button" accessibilityLabel={`خدمة ${service.title}`} onPress={() => openService(service.id)} style={({ pressed }) => [styles.serviceCard, pressed && styles.pressed]}>
              <View style={[styles.serviceIcon, { backgroundColor: service.surface }]}><MaterialIcons name={service.icon} size={28} color={service.tint} /></View>
              <View style={styles.serviceCopy}><Text style={styles.serviceTitle}>{service.title}</Text><Text style={styles.serviceText}>{service.subtitle}</Text></View>
              <MaterialIcons name="chevron-left" size={22} color="#9A907E" />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 28 }, header: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  backButton: { alignItems: "center", backgroundColor: "#F0EBDD", borderColor: "#E4DCCB", borderRadius: 16, borderWidth: 1, height: 40, justifyContent: "center", width: 40 },
  title: { color: "#465132", fontSize: 22, fontWeight: "800", lineHeight: 29, textAlign: "right" }, subtitle: { color: "#8A8173", fontSize: 12, marginTop: 2, textAlign: "right" },
  intro: { alignItems: "center", backgroundColor: "#EFF2E6", borderRadius: 18, flexDirection: "row-reverse", gap: 11, marginTop: 23, padding: 14 }, introIcon: { alignItems: "center", backgroundColor: "#FFFDF8", borderRadius: 15, height: 50, justifyContent: "center", width: 50 }, introCopy: { flex: 1 }, introTitle: { color: "#465132", fontSize: 14, fontWeight: "800", textAlign: "right" }, introText: { color: "#786F61", fontSize: 11, lineHeight: 16, marginTop: 2, textAlign: "right" },
  list: { gap: 10, marginTop: 18 }, serviceCard: { alignItems: "center", backgroundColor: "#FFFDF8", borderColor: "#E8E0D1", borderRadius: 17, borderWidth: 1, flexDirection: "row-reverse", gap: 12, minHeight: 82, padding: 12 }, serviceIcon: { alignItems: "center", borderRadius: 17, height: 54, justifyContent: "center", width: 54 }, serviceCopy: { flex: 1 }, serviceTitle: { color: "#465132", fontSize: 14, fontWeight: "800", textAlign: "right" }, serviceText: { color: "#8A8173", fontSize: 11, marginTop: 3, textAlign: "right" }, pressed: { opacity: 0.76, transform: [{ scale: 0.98 }] },
});

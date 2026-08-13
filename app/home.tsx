import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";
import { TabibiLogo } from "@/components/tabibi-logo";
import { getPatientProfile, type PatientProfile } from "@/lib/patient-profile";

const SERVICE_POINTS = [
  { icon: "medical-services" as const, title: "رعاية منزلية", caption: "نرتب الخدمة المناسبة لحالتك." },
  { icon: "event-available" as const, title: "موعد يناسبك", caption: "اختر الوقت والموقع المفضلين." },
  { icon: "support-agent" as const, title: "متابعة واضحة", caption: "نعرض لك الخطوة التالية دائمًا." },
];

export default function HomeScreen() {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = useCallback(async () => setProfile(await getPatientProfile()), []);
  useEffect(() => { loadProfile(); }, [loadProfile]);

  const refresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const firstName = profile?.fullName.split(" ")[0] ?? "بك";

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#0B6E99" />} showsVerticalScrollIndicator={false}>
        <View style={styles.topbar}>
          <Pressable accessibilityRole="button" accessibilityLabel="الملف الشخصي" onPress={() => router.push("/profile" as never)} style={({ pressed }) => [styles.profileButton, pressed && styles.iconPressed]}><MaterialIcons name="person-outline" size={25} color="#0B6E99" /></Pressable>
          <View style={styles.brandRow}><Text style={styles.brand}>طبيبي</Text><TabibiLogo size={42} /></View>
        </View>

        <Text style={styles.greeting}>أهلًا {firstName}</Text>
        <Text style={styles.tagline}>كيف يمكننا مساعدتك في رعايتك اليوم؟</Text>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}><MaterialIcons name="medical-services" size={31} color="#FFFFFF" /></View>
          <Text style={styles.heroTitle}>رعاية صحية تصل إليك</Text>
          <Text style={styles.heroCopy}>ابدأ بطلب الخدمة وأدخل تفاصيل الزيارة. سنجهز مسار الرعاية المناسب في الخطوات التالية.</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push("/care-request" as never)} style={({ pressed }) => [styles.heroButton, pressed && styles.whitePressed]}>
            <Text style={styles.heroButtonText}>طلب رعاية منزلية</Text>
            <MaterialIcons name="arrow-back" size={20} color="#0B6E99" />
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>رحلة رعاية أبسط</Text>
        <View style={styles.benefits}>
          {SERVICE_POINTS.map((point) => (
            <View key={point.title} style={styles.benefitRow}>
              <View style={styles.benefitIcon}><MaterialIcons name={point.icon} size={21} color="#0B6E99" /></View>
              <View style={styles.benefitText}><Text style={styles.benefitTitle}>{point.title}</Text><Text style={styles.benefitCaption}>{point.caption}</Text></View>
            </View>
          ))}
        </View>
        <View style={styles.statusCard}><MaterialIcons name="info-outline" size={21} color="#58707D" /><Text style={styles.statusText}>لا توجد طلبات رعاية نشطة لديك حاليًا.</Text></View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 30 },
  topbar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  brandRow: { alignItems: "center", flexDirection: "row-reverse", gap: 8 },
  brand: { color: "#0B6E99", fontSize: 17, fontWeight: "800" },
  profileButton: { alignItems: "center", backgroundColor: "#EAF6FA", borderRadius: 18, height: 42, justifyContent: "center", width: 42 },
  iconPressed: { opacity: 0.65 },
  greeting: { color: "#12303F", fontSize: 27, fontWeight: "800", lineHeight: 37, marginTop: 31, textAlign: "right" },
  tagline: { color: "#58707D", fontSize: 15, lineHeight: 23, marginTop: 4, textAlign: "right" },
  heroCard: { alignItems: "flex-end", backgroundColor: "#0B6E99", borderRadius: 26, marginTop: 22, overflow: "hidden", padding: 22 },
  heroIcon: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 16, height: 54, justifyContent: "center", width: 54 },
  heroTitle: { color: "#FFFFFF", fontSize: 21, fontWeight: "800", lineHeight: 30, marginTop: 22, textAlign: "right" },
  heroCopy: { color: "#E8F5F7", fontSize: 14, lineHeight: 22, marginTop: 5, textAlign: "right" },
  heroButton: { alignItems: "center", alignSelf: "stretch", backgroundColor: "#FFFFFF", borderRadius: 14, flexDirection: "row-reverse", gap: 7, justifyContent: "center", marginTop: 22, minHeight: 50 },
  whitePressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  heroButtonText: { color: "#0B6E99", fontSize: 15, fontWeight: "800" },
  sectionTitle: { color: "#12303F", fontSize: 18, fontWeight: "800", marginTop: 28, textAlign: "right" },
  benefits: { backgroundColor: "#FFFFFF", borderColor: "#D8E8EE", borderRadius: 21, borderWidth: 1, marginTop: 12, paddingHorizontal: 16 },
  benefitRow: { alignItems: "center", borderBottomColor: "#EAF1F3", borderBottomWidth: 1, flexDirection: "row-reverse", gap: 12, minHeight: 79 },
  benefitIcon: { alignItems: "center", backgroundColor: "#EAF6FA", borderRadius: 14, height: 42, justifyContent: "center", width: 42 },
  benefitText: { flex: 1 },
  benefitTitle: { color: "#173A49", fontSize: 15, fontWeight: "800", textAlign: "right" },
  benefitCaption: { color: "#758B95", fontSize: 12, lineHeight: 18, marginTop: 2, textAlign: "right" },
  statusCard: { alignItems: "center", backgroundColor: "#F0F6F8", borderRadius: 16, flexDirection: "row-reverse", gap: 8, marginTop: 18, padding: 15 },
  statusText: { color: "#58707D", flex: 1, fontSize: 13, lineHeight: 20, textAlign: "right" },
});

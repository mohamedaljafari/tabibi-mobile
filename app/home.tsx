import { useCallback, useEffect, useState, type ComponentProps } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";
import { TabibiLogo } from "@/components/tabibi-logo";
import { getPatientProfile, type PatientProfile } from "@/lib/patient-profile";

type Service = {
  title: string;
  icon: ComponentProps<typeof MaterialIcons>["name"];
  tint: string;
  surface: string;
};

const SERVICES: Service[] = [
  { title: "طبيب", icon: "medical-services", tint: "#6B7B3F", surface: "#EFF2E6" },
  { title: "تمريض", icon: "healing", tint: "#B58943", surface: "#FBF2E2" },
  { title: "صحة نفسية", icon: "psychology", tint: "#8F7D98", surface: "#F2EDF4" },
  { title: "تغذية", icon: "restaurant", tint: "#B97E52", surface: "#FBEEE7" },
  { title: "علاج طبيعي", icon: "accessibility-new", tint: "#628C8B", surface: "#E8F3F2" },
  { title: "رعاية كبار السن", icon: "elderly", tint: "#7B8A62", surface: "#F0F3EA" },
  { title: "طب بيطري", icon: "pets", tint: "#A07255", surface: "#F7EDE7" },
  { title: "المختبر", icon: "science", tint: "#627F9D", surface: "#EBF1F6" },
  { title: "الصيدليات", icon: "local-pharmacy", tint: "#A65E67", surface: "#F8ECEE" },
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
  const showServiceNotice = (serviceName: string) => {
    Alert.alert(serviceName, "سيُتاح اختيار تفاصيل هذه الخدمة ضمن مسار الطلب عند استكمال المراحل التالية من التطبيق.");
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#6B7B3F" />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topbar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="الذهاب إلى حسابي"
            onPress={() => router.push("/profile" as never)}
            style={({ pressed }) => [styles.profileButton, pressed && styles.iconPressed]}
          >
            <MaterialIcons name="person-outline" size={24} color="#6B7B3F" />
          </Pressable>
          <View style={styles.brandRow}><Text style={styles.brand}>طبيبي</Text><TabibiLogo size={40} /></View>
        </View>

        <View style={styles.greetingBlock}>
          <Text style={styles.greeting}>أهلًا {firstName}</Text>
          <Text style={styles.tagline}>خدمات صحية مختارة لعنايتك ومن تحب.</Text>
        </View>

        <View style={styles.heroBanner}>
          <View style={styles.heroOrnamentOne} />
          <View style={styles.heroOrnamentTwo} />
          <View style={styles.heroContent}>
            <View style={styles.heroBadge}><MaterialIcons name="volunteer-activism" size={18} color="#6B7B3F" /><Text style={styles.heroBadgeText}>رعاية أقرب إليك</Text></View>
            <Text style={styles.heroTitle}>صحتك في مكانها الصحيح</Text>
            <Text style={styles.heroCopy}>اختر الخدمة التي تحتاجها وابدأ رحلتك الصحية من مكانك.</Text>
          </View>
          <View style={styles.heroIllustration}><MaterialIcons name="favorite-border" size={48} color="#FFFFFF" /><MaterialIcons name="home" size={24} color="#F3E8C7" style={styles.homeIcon} /></View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>خدمات طبيبي</Text>
          <Text style={styles.sectionHint}>اختر الخدمة المناسبة</Text>
        </View>

        <View style={styles.serviceGrid}>
          {SERVICES.map((service) => (
            <Pressable
              key={service.title}
              accessibilityRole="button"
              accessibilityLabel={`خدمة ${service.title}`}
              onPress={() => showServiceNotice(service.title)}
              style={({ pressed }) => [styles.serviceCard, pressed && styles.servicePressed]}
            >
              <View style={[styles.serviceIcon, { backgroundColor: service.surface }]}>
                <MaterialIcons name={service.icon} size={28} color={service.tint} />
              </View>
              <Text numberOfLines={2} style={styles.serviceTitle}>{service.title}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.bottomBanner}>
          <View style={styles.bottomGraphic}><MaterialIcons name="support-agent" size={34} color="#6B7B3F" /></View>
          <View style={styles.bottomCopy}><Text style={styles.bottomTitle}>ابدأ طلب خدمتك الصحية</Text><Text style={styles.bottomText}>أدخل البيانات الأولية وسننتقل بك إلى الخطوة المناسبة.</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="بدء طلب خدمة" onPress={() => router.push("/care-request" as never)} style={({ pressed }) => [styles.requestButton, pressed && styles.requestPressed]}>
            <MaterialIcons name="arrow-back" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 28 },
  topbar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  brandRow: { alignItems: "center", flexDirection: "row-reverse", gap: 7 },
  brand: { color: "#6B7B3F", fontSize: 17, fontWeight: "800" },
  profileButton: { alignItems: "center", backgroundColor: "#F0EBDD", borderColor: "#E4DCCB", borderRadius: 17, borderWidth: 1, height: 42, justifyContent: "center", width: 42 },
  iconPressed: { opacity: 0.66 },
  greetingBlock: { marginTop: 25 },
  greeting: { color: "#465132", fontSize: 28, fontWeight: "800", lineHeight: 37, textAlign: "right" },
  tagline: { color: "#8A8173", fontSize: 14, lineHeight: 22, marginTop: 2, textAlign: "right" },
  heroBanner: { backgroundColor: "#6B7B3F", borderRadius: 26, flexDirection: "row-reverse", marginTop: 19, minHeight: 183, overflow: "hidden", padding: 20 },
  heroContent: { alignItems: "flex-end", flex: 1, justifyContent: "center", zIndex: 1 },
  heroBadge: { alignItems: "center", backgroundColor: "#F8F2E4", borderRadius: 13, flexDirection: "row-reverse", gap: 5, paddingHorizontal: 10, paddingVertical: 6 },
  heroBadgeText: { color: "#59683A", fontSize: 11, fontWeight: "800" },
  heroTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "800", lineHeight: 30, marginTop: 13, textAlign: "right" },
  heroCopy: { color: "#EFF2E6", fontSize: 13, lineHeight: 20, marginTop: 4, maxWidth: 200, textAlign: "right" },
  heroIllustration: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.13)", borderColor: "rgba(255,255,255,0.2)", borderRadius: 44, borderWidth: 1, height: 88, justifyContent: "center", marginLeft: 14, marginTop: 22, overflow: "hidden", width: 88, zIndex: 1 },
  homeIcon: { marginTop: -21 },
  heroOrnamentOne: { backgroundColor: "rgba(201,169,97,0.24)", borderRadius: 96, height: 192, position: "absolute", right: -104, top: -96, width: 192 },
  heroOrnamentTwo: { borderColor: "rgba(255,255,255,0.11)", borderRadius: 72, borderWidth: 1, bottom: -77, height: 144, left: -54, position: "absolute", width: 144 },
  sectionHeader: { alignItems: "flex-end", flexDirection: "row-reverse", justifyContent: "space-between", marginTop: 27 },
  sectionTitle: { color: "#465132", fontSize: 19, fontWeight: "800" },
  sectionHint: { color: "#9A907E", fontSize: 12 },
  serviceGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 10, marginTop: 13 },
  serviceCard: { alignItems: "center", backgroundColor: "#FFFDF8", borderColor: "#E8E0D1", borderRadius: 18, borderWidth: 1, minHeight: 118, paddingHorizontal: 8, paddingTop: 15, width: "30.8%" },
  serviceIcon: { alignItems: "center", borderRadius: 16, height: 52, justifyContent: "center", width: 52 },
  serviceTitle: { color: "#5A624B", fontSize: 12, fontWeight: "800", lineHeight: 17, marginTop: 9, textAlign: "center" },
  servicePressed: { opacity: 0.76, transform: [{ scale: 0.97 }] },
  bottomBanner: { alignItems: "center", backgroundColor: "#F0EBDD", borderColor: "#E4DCCB", borderRadius: 22, borderWidth: 1, flexDirection: "row-reverse", gap: 11, marginTop: 22, padding: 16 },
  bottomGraphic: { alignItems: "center", backgroundColor: "#FFFDF8", borderRadius: 17, height: 56, justifyContent: "center", width: 56 },
  bottomCopy: { flex: 1 },
  bottomTitle: { color: "#465132", fontSize: 14, fontWeight: "800", textAlign: "right" },
  bottomText: { color: "#8A8173", fontSize: 11, lineHeight: 17, marginTop: 2, textAlign: "right" },
  requestButton: { alignItems: "center", backgroundColor: "#6B7B3F", borderRadius: 16, height: 42, justifyContent: "center", width: 42 },
  requestPressed: { opacity: 0.84, transform: [{ scale: 0.96 }] },
});

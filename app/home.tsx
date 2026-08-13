import { useCallback, useEffect, useRef, useState, type ComponentProps } from "react";
import { Alert, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
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

type AdSlide = {
  eyebrow: string;
  title: string;
  copy: string;
  icon: ComponentProps<typeof MaterialIcons>["name"];
  accent: string;
  accentSoft: string;
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

const AD_SLIDES: AdSlide[] = [
  { eyebrow: "رعاية من مكانك", title: "خطوة أبسط لصحتك", copy: "اختر الخدمة المناسبة وابدأ طلبك في وقتك.", icon: "favorite-border", accent: "#6B7B3F", accentSoft: "#EFF2E6" },
  { eyebrow: "خدمة المختبر", title: "تحاليلك أقرب إليك", copy: "ابدأ طلب خدمة المختبر من خلال التطبيق.", icon: "science", accent: "#5D7D9B", accentSoft: "#EAF1F7" },
  { eyebrow: "الصيدليات", title: "كل ما تحتاجه في مكان واحد", copy: "انتقل إلى خدمات الصيدليات من شبكة طبيبي.", icon: "local-pharmacy", accent: "#A65E67", accentSoft: "#F8ECEE" },
];

export default function HomeScreen() {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const activeSlideRef = useRef(0);
  const carouselRef = useRef<FlatList<AdSlide>>(null);
  const { width } = useWindowDimensions();
  const bannerWidth = Math.max(width - 32, 280);

  const loadProfile = useCallback(async () => setProfile(await getPatientProfile()), []);
  useEffect(() => { loadProfile(); }, [loadProfile]);

  useEffect(() => {
    const timer = setInterval(() => {
      const nextSlide = (activeSlideRef.current + 1) % AD_SLIDES.length;
      carouselRef.current?.scrollToOffset({ offset: nextSlide * bannerWidth, animated: true });
      activeSlideRef.current = nextSlide;
      setActiveSlide(nextSlide);
    }, 4500);
    return () => clearInterval(timer);
  }, [bannerWidth]);

  const refresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const firstName = profile?.fullName.split(" ")[0] ?? "بك";
  const showServiceNotice = (serviceName: string) => {
    Alert.alert(serviceName, "سيُتاح اختيار تفاصيل هذه الخدمة ضمن مسار الطلب عند استكمال المراحل التالية من التطبيق.");
  };
  const openService = (serviceName: string) => {
    if (serviceName === "طبيب") {
      router.push("/doctor-specialties" as never);
      return;
    }
    if (serviceName === "تمريض") {
      router.push("/nursing-search" as never);
      return;
    }
    showServiceNotice(serviceName);
  };
  const handleSlideEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / bannerWidth);
    const safeIndex = Math.min(Math.max(index, 0), AD_SLIDES.length - 1);
    activeSlideRef.current = safeIndex;
    setActiveSlide(safeIndex);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#6B7B3F" />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topbar}>
          <Pressable accessibilityRole="button" accessibilityLabel="الذهاب إلى حسابي" onPress={() => router.push("/profile" as never)} style={({ pressed }) => [styles.profileButton, pressed && styles.iconPressed]}>
            <MaterialIcons name="person-outline" size={22} color="#6B7B3F" />
          </Pressable>
          <View style={styles.brandRow}><Text style={styles.brand}>طبيبي</Text><TabibiLogo size={34} /></View>
        </View>

        <View style={styles.greetingRow}>
          <Text style={styles.greeting}>أهلًا {firstName}</Text>
          <Text style={styles.tagline}>اختر خدمتك الصحية</Text>
        </View>

        <View style={styles.carouselWrap}>
          <FlatList
            ref={carouselRef}
            data={AD_SLIDES}
            horizontal
            pagingEnabled
            bounces={false}
            decelerationRate="fast"
            keyExtractor={(item) => item.title}
            onMomentumScrollEnd={handleSlideEnd}
            renderItem={({ item }) => (
              <View style={[styles.adSlide, { width: bannerWidth, backgroundColor: item.accentSoft }]}>
                <View style={styles.adCopy}>
                  <Text style={[styles.adEyebrow, { color: item.accent }]}>{item.eyebrow}</Text>
                  <Text style={styles.adTitle}>{item.title}</Text>
                  <Text style={styles.adText}>{item.copy}</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel={`بدء طلب ${item.eyebrow}`} onPress={() => router.push("/care-request" as never)} style={({ pressed }) => [styles.adAction, { backgroundColor: item.accent }, pressed && styles.adActionPressed]}>
                    <Text style={styles.adActionText}>ابدأ الطلب</Text><MaterialIcons name="arrow-back" size={15} color="#FFFFFF" />
                  </Pressable>
                </View>
                <View style={[styles.adIcon, { backgroundColor: item.accent }]}><MaterialIcons name={item.icon} size={34} color="#FFFFFF" /></View>
              </View>
            )}
            showsHorizontalScrollIndicator={false}
          />
          <View style={styles.dots}>
            {AD_SLIDES.map((slide, index) => <View key={slide.title} style={[styles.dot, index === activeSlide && styles.activeDot]} />)}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>خدمات طبيبي</Text>
          <Text style={styles.sectionHint}>اضغط لاختيار الخدمة</Text>
        </View>

        <View style={styles.serviceGrid}>
          {SERVICES.map((service) => (
            <Pressable key={service.title} accessibilityRole="button" accessibilityLabel={`خدمة ${service.title}`} onPress={() => openService(service.title)} style={({ pressed }) => [styles.serviceCard, pressed && styles.servicePressed]}>
              <View style={[styles.serviceIcon, { backgroundColor: service.surface }]}><MaterialIcons name={service.icon} size={23} color={service.tint} /></View>
              <Text numberOfLines={2} style={styles.serviceTitle}>{service.title}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.bottomBanner}>
          <View style={styles.bottomGraphic}><MaterialIcons name="support-agent" size={25} color="#6B7B3F" /></View>
          <View style={styles.bottomCopy}><Text style={styles.bottomTitle}>تحتاج مساعدة في الاختيار؟</Text><Text style={styles.bottomText}>ابدأ طلبًا وسنرتب الخطوة المناسبة لك.</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="بدء طلب خدمة" onPress={() => router.push("/care-request" as never)} style={({ pressed }) => [styles.requestButton, pressed && styles.requestPressed]}><MaterialIcons name="arrow-back" size={19} color="#FFFFFF" /></Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 16 },
  topbar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  brandRow: { alignItems: "center", flexDirection: "row-reverse", gap: 6 },
  brand: { color: "#6B7B3F", fontSize: 15, fontWeight: "800" },
  profileButton: { alignItems: "center", backgroundColor: "#F0EBDD", borderColor: "#E4DCCB", borderRadius: 15, borderWidth: 1, height: 36, justifyContent: "center", width: 36 },
  iconPressed: { opacity: 0.66 },
  greetingRow: { alignItems: "baseline", flexDirection: "row-reverse", justifyContent: "space-between", marginTop: 13 },
  greeting: { color: "#465132", fontSize: 22, fontWeight: "800", lineHeight: 28 },
  tagline: { color: "#8A8173", fontSize: 12 },
  carouselWrap: { borderRadius: 20, marginTop: 10, overflow: "hidden" },
  adSlide: { alignItems: "center", flexDirection: "row-reverse", height: 126, paddingHorizontal: 16 },
  adCopy: { alignItems: "flex-end", flex: 1 },
  adEyebrow: { fontSize: 10, fontWeight: "800" },
  adTitle: { color: "#465132", fontSize: 18, fontWeight: "800", lineHeight: 24, marginTop: 2, textAlign: "right" },
  adText: { color: "#786F61", fontSize: 11, lineHeight: 16, marginTop: 2, textAlign: "right" },
  adAction: { alignItems: "center", borderRadius: 10, flexDirection: "row-reverse", gap: 4, marginTop: 8, paddingHorizontal: 10, paddingVertical: 6 },
  adActionText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  adActionPressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  adIcon: { alignItems: "center", borderRadius: 34, height: 68, justifyContent: "center", marginLeft: 13, width: 68 },
  dots: { alignItems: "center", backgroundColor: "rgba(255,253,248,0.74)", borderRadius: 8, bottom: 7, flexDirection: "row", gap: 4, paddingHorizontal: 6, paddingVertical: 4, position: "absolute", right: 12 },
  dot: { backgroundColor: "#BEB6A8", borderRadius: 4, height: 5, width: 5 },
  activeDot: { backgroundColor: "#6B7B3F", width: 14 },
  sectionHeader: { alignItems: "flex-end", flexDirection: "row-reverse", justifyContent: "space-between", marginTop: 14 },
  sectionTitle: { color: "#465132", fontSize: 16, fontWeight: "800" },
  sectionHint: { color: "#9A907E", fontSize: 10 },
  serviceGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, marginTop: 9 },
  serviceCard: { alignItems: "center", backgroundColor: "#FFFDF8", borderColor: "#E8E0D1", borderRadius: 15, borderWidth: 1, minHeight: 78, paddingHorizontal: 5, paddingTop: 9, width: "31.7%" },
  serviceIcon: { alignItems: "center", borderRadius: 12, height: 38, justifyContent: "center", width: 38 },
  serviceTitle: { color: "#5A624B", fontSize: 10, fontWeight: "800", lineHeight: 14, marginTop: 5, textAlign: "center" },
  servicePressed: { opacity: 0.76, transform: [{ scale: 0.97 }] },
  bottomBanner: { alignItems: "center", backgroundColor: "#F0EBDD", borderColor: "#E4DCCB", borderRadius: 17, borderWidth: 1, flexDirection: "row-reverse", gap: 9, marginTop: 14, padding: 11 },
  bottomGraphic: { alignItems: "center", backgroundColor: "#FFFDF8", borderRadius: 13, height: 42, justifyContent: "center", width: 42 },
  bottomCopy: { flex: 1 },
  bottomTitle: { color: "#465132", fontSize: 12, fontWeight: "800", textAlign: "right" },
  bottomText: { color: "#8A8173", fontSize: 10, lineHeight: 14, marginTop: 1, textAlign: "right" },
  requestButton: { alignItems: "center", backgroundColor: "#6B7B3F", borderRadius: 13, height: 36, justifyContent: "center", width: 36 },
  requestPressed: { opacity: 0.84, transform: [{ scale: 0.96 }] },
});

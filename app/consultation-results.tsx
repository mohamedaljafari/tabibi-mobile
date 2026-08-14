/**
 * نتائج أطباء الاستشارات الطبية (داخل ليبيا / خارج ليبيا) لتخصص معين.
 * يعرض الأطباء المفعّلين مع التخصص والخبرة وسعر الاستشارة بالدينار الليبي،
 * مع إمكانية إرسال طلب استشارة (تستخدم نظام الطلبات المشترك).
 */
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { DOCTOR_SPECIALTIES, getDoctorSpecialty } from "@/lib/doctor-directory";
import { formatYearsOfExperience } from "@/lib/provider-registry";
import {
  readConsultationDoctorsBySpecialty,
  type ConsultationDoctor,
  type ConsultationType,
} from "@/lib/consultation-doctors";
import { getPatientProfile } from "@/lib/patient-profile";
import { submitConsultationRequest, type ConsultationRequest } from "@/lib/consultation-requests";

type SortKey = "nearest" | "rating" | "price-low" | "price-high";

export default function ConsultationResultsScreen() {
  const { type, specialtyId } = useLocalSearchParams<{ type?: string; specialtyId?: string }>();
  const consultationType: ConsultationType = type === "international" ? "international" : "local";
  const isInternational = consultationType === "international";
  const specialty = getDoctorSpecialty(specialtyId);

  const [doctors, setDoctors] = useState<ConsultationDoctor[]>([]);
  const [sort, setSort] = useState<SortKey>("rating");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let mounted = true;
    readConsultationDoctorsBySpecialty(consultationType, specialty.title)
      .then((list) => mounted && setDoctors(list))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [consultationType, specialty.title]);

  const sorted = [...doctors].sort((a, b) => {
    const aPrice = isInternational
      ? (a as Extract<ConsultationDoctor, { consultationType: "international" }>).price
      : 0;
    const bPrice = isInternational
      ? (b as Extract<ConsultationDoctor, { consultationType: "international" }>).price
      : 0;
    if (sort === "rating") {
      const aRating = isInternational ? 0 : (a as Extract<ConsultationDoctor, { consultationType: "local" }>).services.length ? 4.5 : 0;
      const bRating = isInternational ? 0 : (b as Extract<ConsultationDoctor, { consultationType: "local" }>).services.length ? 4.5 : 0;
      return bRating - aRating;
    }
    if (sort === "price-low") return aPrice - bPrice;
    if (sort === "price-high") return bPrice - aPrice;
    return 0;
  });

  async function handleRequest(doctor: ConsultationDoctor) {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const profile = await getPatientProfile();
    if (!profile?.fullName || !profile?.phone) {
      Alert.alert("مطلوب تسجيل الدخول", "يرجى تسجيل الدخول أو استكمال بيانات حسابك أولًا.");
      router.push("/login" as never);
      return;
    }
    const price = isInternational
      ? (doctor as Extract<ConsultationDoctor, { consultationType: "international" }>).price
      : 250;
    const doctorName = isInternational
      ? (doctor as Extract<ConsultationDoctor, { consultationType: "international" }>).name
      : (doctor as Extract<ConsultationDoctor, { consultationType: "local" }>).fullName;
    const specializationLabel = isInternational
      ? (doctor as Extract<ConsultationDoctor, { consultationType: "international" }>).specialty
      : specialty.title;

    setSending(true);
    try {
      const request: ConsultationRequest = {
        id: `con_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        type: consultationType,
        patientId: profile.phone,
        patientName: profile.fullName,
        patientPhone: profile.phone,
        specialtyLabel: specializationLabel,
        doctorId: doctor.id,
        doctorName,
        price,
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await submitConsultationRequest(request);
      Alert.alert(
        "تم إرسال طلب الاستشارة",
        `طلبك لاستشارة ${doctorName} (${specializationLabel}) أرسل بنجاح. سيتواصل معك الطبيب عند قبوله للطلب.`,
        [
          {
            text: "تم",
            onPress: () => router.push({ pathname: "/requests" } as never),
          },
        ],
      );
    } finally {
      setSending(false);
    }
  }

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
          <View style={styles.headerText}>
            <Text style={styles.title}>
              {isInternational ? "استشارات خارج ليبيا" : "استشارات داخل ليبيا"}
            </Text>
            <Text style={styles.subtitle}>{specialty.title} — {loading ? "جاري التحميل..." : `${sorted.length} طبيب متاح`}</Text>
          </View>
        </View>
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>ترتيب حسب</Text>
          {SORT_OPTIONS.map((option) => (
            <Pressable
              key={option.key}
              accessibilityRole="button"
              onPress={() => setSort(option.key)}
              style={({ pressed }) => [
                styles.sortChip,
                sort === option.key && styles.sortChipActive,
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.sortChipText, sort === option.key && styles.sortChipTextActive]}>
                {option.title}
              </Text>
            </Pressable>
          ))}
        </View>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#6B7B3F" />
          </View>
        ) : sorted.length === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons name="search-off" size={40} color="#B7AE9E" />
            <Text style={styles.emptyTitle}>لا يوجد أطباء متاحون حاليًا</Text>
            <Text style={styles.emptyText}>
              {isInternational
                ? "لم تتوفر استشارات خارج ليبيا لهذا التخصص بعد، جرّب تخصصًا آخر."
                : "لم يسجل أي طبيب داخل ليبيا هذا التخصص حاليًا. جرّب تخصصًا آخر أو تابع قريبًا."}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {sorted.map((doctor) => {
              const isExt = doctor.consultationType === "international";
              const name = isExt
                ? (doctor as Extract<ConsultationDoctor, { consultationType: "international" }>).name
                : (doctor as Extract<ConsultationDoctor, { consultationType: "local" }>).fullName;
              const experience = isExt
                ? (doctor as Extract<ConsultationDoctor, { consultationType: "international" }>).experience
                : (doctor as Extract<ConsultationDoctor, { consultationType: "local" }>).yearsOfExperience;
              const price = isExt
                ? (doctor as Extract<ConsultationDoctor, { consultationType: "international" }>).price
                : 250;
              const initials = isExt
                ? (doctor as Extract<ConsultationDoctor, { consultationType: "international" }>).initials
                : name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("");
              const country = isExt
                ? (doctor as Extract<ConsultationDoctor, { consultationType: "international" }>).country
                : "ليبيا";

              return (
                <View key={doctor.id} style={styles.card}>
                  <View style={styles.row}>
                    <View style={[styles.avatar, isExt ? styles.avatarBlue : styles.avatarGreen]}>
                      <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.doctorName}>{name}</Text>
                      <Text style={styles.metaLine}>{specialty.title} — {formatYearsOfExperience(experience)}</Text>
                      <View style={styles.badgeRow}>
                        <View style={[styles.badge, isExt ? styles.badgeBlue : styles.badgeGreen]}>
                          <MaterialIcons
                            name={isExt ? "public" : "local-hospital"}
                            size={12}
                            color={isExt ? "#5B8CA3" : "#6B7B3F"}
                          />
                          <Text style={styles.badgeText}>{country}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.priceBox}>
                      <Text style={styles.priceValue}>{price}</Text>
                      <Text style={styles.priceLabel}>د.ل / استشارة</Text>
                    </View>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    disabled={sending}
                    onPress={() => handleRequest(doctor)}
                    style={({ pressed }) => [styles.requestButton, pressed && styles.pressed, sending && styles.disabled]}>
                    <Text style={styles.requestButtonText}>
                      {sending ? "جاري الإرسال..." : "اطلب استشارة"}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const SORT_OPTIONS: { key: SortKey; title: string }[] = [
  { key: "rating", title: "الأعلى تقييمًا" },
  { key: "price-low", title: "الأقل سعرًا" },
  { key: "price-high", title: "الأعلى سعرًا" },
];

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
  headerText: { flex: 1 },
  title: { color: "#465132", fontSize: 22, fontWeight: "800", lineHeight: 29, textAlign: "right" },
  subtitle: { color: "#8A8173", fontSize: 12, marginTop: 2, textAlign: "right" },
  sortRow: {
    alignItems: "center",
    flexDirection: "row-reverse",
    gap: 8,
    justifyContent: "flex-start",
    marginTop: 18,
  },
  sortLabel: { color: "#786F61", fontSize: 12, fontWeight: "700", marginLeft: 6 },
  sortChip: {
    backgroundColor: "#FFFDF8",
    borderColor: "#E8E0D1",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sortChipActive: { backgroundColor: "#6B7B3F", borderColor: "#6B7B3F" },
  sortChipText: { color: "#786F61", fontSize: 11, fontWeight: "700" },
  sortChipTextActive: { color: "#FFFDF8" },
  loading: { alignItems: "center", marginTop: 48 },
  empty: { alignItems: "center", marginTop: 40, paddingHorizontal: 24 },
  emptyTitle: { color: "#5A5244", fontSize: 16, fontWeight: "800", marginTop: 12, textAlign: "center" },
  emptyText: { color: "#8A8173", fontSize: 12, lineHeight: 18, marginTop: 6, textAlign: "center" },
  list: { gap: 12, marginTop: 16 },
  card: {
    backgroundColor: "#FFFDF8",
    borderColor: "#E8E0D1",
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  row: { alignItems: "center", flexDirection: "row-reverse", gap: 12 },
  avatar: {
    alignItems: "center",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  avatarGreen: { backgroundColor: "#EFF2E6" },
  avatarBlue: { backgroundColor: "#EAF3F7" },
  avatarText: { color: "#5A624B", fontSize: 15, fontWeight: "800" },
  cardInfo: { flex: 1 },
  doctorName: { color: "#465132", fontSize: 15, fontWeight: "800", lineHeight: 20, textAlign: "right" },
  metaLine: { color: "#8A8173", fontSize: 11, marginTop: 2, textAlign: "right" },
  badgeRow: { flexDirection: "row-reverse", marginTop: 6 },
  badge: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row-reverse",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeGreen: { backgroundColor: "#EFF2E6" },
  badgeBlue: { backgroundColor: "#EAF3F7" },
  badgeText: { color: "#5A624B", fontSize: 10, fontWeight: "700" },
  priceBox: { alignItems: "center" },
  priceValue: { color: "#6B7B3F", fontSize: 16, fontWeight: "800", lineHeight: 21 },
  priceLabel: { color: "#9A907E", fontSize: 9, lineHeight: 13, marginTop: 1 },
  requestButton: {
    alignItems: "center",
    backgroundColor: "#6B7B3F",
    borderRadius: 14,
    marginTop: 14,
    paddingVertical: 11,
  },
  requestButtonText: { color: "#FFFDF8", fontSize: 13, fontWeight: "800" },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.98 }] },
});

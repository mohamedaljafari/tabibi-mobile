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
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";

function PLATFORM_DATE_OPTIONS(): { date: string; label: string }[] {
  const options: { date: string; label: string }[] = [];
  const now = new Date();
  const dayLabels = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  for (let offset = 1; offset <= 14; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    options.push({
      date: date.toISOString().slice(0, 10),
      label: `${dayLabels[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}`,
    });
  }
  return options;
}
import { ScreenContainer } from "@/components/screen-container";
import { getDoctorSpecialty } from "@/lib/doctor-directory";
import { formatYearsOfExperience } from "@/lib/provider-registry";
import {
  readConsultationDoctorsBySpecialty,
  type ConsultationDoctor,
  type ConsultationType,
} from "@/lib/consultation-doctors";
import { getPatientProfile } from "@/lib/patient-profile";
import { createConsultationRequest, type ConsultationMode } from "@/lib/consultation-requests";
import { createNotification } from "@/lib/notifications";


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

  const [chosenDoctor, setChosenDoctor] = useState<ConsultationDoctor | null>(null);
  const [selectedMode, setSelectedMode] = useState<ConsultationMode>("instant");

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
    setChosenDoctor(doctor);
  }

  const submitConsultation = async () => {
    if (!chosenDoctor) return;
    const profile = await getPatientProfile();
    if (!profile?.fullName || !profile?.phone) {
      Alert.alert("مطلوب تسجيل الدخول", "يرجى تسجيل الدخول أو استكمال بيانات حسابك أولًا.");
      return;
    }
    const price = isInternational
      ? (chosenDoctor as Extract<ConsultationDoctor, { consultationType: "international" }>).price
      : 250;
    const doctorName = isInternational
      ? (chosenDoctor as Extract<ConsultationDoctor, { consultationType: "international" }>).name
      : (chosenDoctor as Extract<ConsultationDoctor, { consultationType: "local" }>).fullName;
    const specializationLabel = isInternational
      ? (chosenDoctor as Extract<ConsultationDoctor, { consultationType: "international" }>).specialty
      : specialty.title;

    setSending(true);
    try {
      let scheduledAt: number | undefined;
      if (selectedMode === "scheduled" && scheduledDate && scheduledTime) {
        const [hours, minutes] = scheduledTime.split(":").map((part) => parseInt(part, 10));
        const date = new Date(scheduledDate);
        if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
          date.setHours(hours, minutes, 0, 0);
          scheduledAt = date.getTime();
        }
      }
      if (selectedMode === "scheduled" && !scheduledAt) {
        Alert.alert("اختر موعد الاستشارة", "يرجى اختيار تاريخ ووقت للاستشارة أولًا.");
        setSending(false);
        return;
      }
      const request = await createConsultationRequest({
        type: consultationType,
        mode: selectedMode,
        scheduledAt,
        patientId: `${profile.fullName}-${profile.phone}`,
        patientName: profile.fullName,
        patientPhone: profile.phone,
        specialtyLabel: specializationLabel,
        doctorId: chosenDoctor.id,
        doctorName,
        externalDoctorName: isInternational ? doctorName : undefined,
        externalDoctorCountry: isInternational
          ? (chosenDoctor as Extract<ConsultationDoctor, { consultationType: "international" }>).country
          : undefined,
        price,
      });
      setSending(false);
      await createNotification({
        recipientId: "admin",
        role: "admin",
        type: "request_received",
        channel: "admin",
        title: "طلب استشارة جديد",
        body: `المريض ${profile.fullName} أرسل طلب استشارة ${specializationLabel} للطبيب ${doctorName}.`,
        requestId: request.id,
        otherPartyName: profile.fullName,
      });
      router.push({
        pathname: "/consultation-payment" as never,
        params: { requestId: request.id, doctorName } as never,
      });
    } finally {
      setSending(false);
    }
  };

  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");



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
                : name.split(" ").filter(Boolean).slice(0, 2).map((part: string) => part[0]).join("");
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

      {chosenDoctor ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>كيف تريد الاستشارة؟</Text>
            <View style={styles.modeRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setSelectedMode("instant")}
                style={({ pressed }) => [
                  styles.modeOption,
                  selectedMode === "instant" && styles.modeOptionActive,
                  pressed && styles.pressed,
                ]}>
                <MaterialIcons name="bolt" size={16} color={selectedMode === "instant" ? "#FFFDF8" : "#6B7B3F"} />
                <Text style={[styles.modeText, selectedMode === "instant" && styles.modeTextActive]}>
                  استشارة فورية الآن
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setSelectedMode("scheduled")}
                style={({ pressed }) => [
                  styles.modeOption,
                  selectedMode === "scheduled" && styles.modeOptionActive,
                  pressed && styles.pressed,
                ]}>
                <MaterialIcons name="event" size={16} color={selectedMode === "scheduled" ? "#FFFDF8" : "#6B7B3F"} />
                <Text style={[styles.modeText, selectedMode === "scheduled" && styles.modeTextActive]}>
                  حجز موعد لاحق
                </Text>
              </Pressable>
            </View>

            {selectedMode === "scheduled" ? (
              <View style={styles.scheduleSection}>
                <Text style={styles.scheduleLabel}>اختر التاريخ</Text>
                <View style={styles.dateChips}>
                  {PLATFORM_DATE_OPTIONS().map((option) => (
                    <Pressable
                      key={option.date}
                      accessibilityRole="button"
                      onPress={() => setScheduledDate(option.date)}
                      style={({ pressed }) => [
                        styles.dateChip,
                        scheduledDate === option.date && styles.dateChipActive,
                        pressed && styles.pressed,
                      ]}>
                      <Text style={[styles.dateChipText, scheduledDate === option.date && styles.dateChipTextActive]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.scheduleLabel}>اختر الوقت</Text>
                <View style={styles.timeInputs}>
                  <TextInput
                    style={styles.timeInput}
                    value={scheduledTime}
                    onChangeText={setScheduledTime}
                    placeholder="14:30"
                    placeholderTextColor="#B9AFA0"
                    keyboardType="numeric"
                    returnKeyType="done"
                  />
                  <Text style={styles.timeHint}>بصيغة الساعة:الدقائق مثل 14:30</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.modalNote}>
              <MaterialIcons name="payment" size={14} color="#6B7B3F" />
              <Text style={styles.modalNoteText}>
                الدفع للاستشارات إلكتروني فقط قبل بدء الاستشارة، ولا يتاح الدفع النقدي.
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setChosenDoctor(null)}
                style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}>
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={sending}
                onPress={() => submitConsultation()}
                style={({ pressed }) => [
                  styles.confirmButton,
                  pressed && styles.pressed,
                  sending && styles.disabled,
                ]}>
                <Text style={styles.confirmButtonText}>
                  {sending ? "جاري الإرسال..." : "إرسال الطلب والدفع"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
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
  modalOverlay: {
    backgroundColor: "rgba(30, 34, 24, 0.6)",
    justifyContent: "center",
    padding: 24,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  },
  modal: {
    backgroundColor: "#FFFDF8",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E8E0D1",
    padding: 18,
  },
  modalTitle: { color: "#465132", fontSize: 16, fontWeight: "800", marginBottom: 12, textAlign: "right" },
  modeRow: { flexDirection: "row-reverse", gap: 10, marginBottom: 12 },
  modeOption: {
    alignItems: "center",
    backgroundColor: "#EFF2E6",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E4DCCB",
    flexDirection: "row-reverse",
    flex: 1,
    gap: 6,
    justifyContent: "center",
    paddingVertical: 10,
  },
  modeOptionActive: { backgroundColor: "#6B7B3F", borderColor: "#6B7B3F" },
  modeText: { color: "#5A624B", fontSize: 12, fontWeight: "800" },
  modeTextActive: { color: "#FFFDF8" },
  scheduleSection: { marginBottom: 12 },
  scheduleLabel: { color: "#786F61", fontSize: 12, fontWeight: "800", marginBottom: 8, textAlign: "right" },
  dateChips: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  dateChip: {
    backgroundColor: "#FFFDF8",
    borderColor: "#E8E0D1",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dateChipActive: { backgroundColor: "#6B7B3F", borderColor: "#6B7B3F" },
  dateChipText: { color: "#786F61", fontSize: 10, fontWeight: "700" },
  dateChipTextActive: { color: "#FFFDF8" },
  timeInputs: { alignItems: "flex-end", gap: 4 },
  timeInput: {
    backgroundColor: "#FFFDF8",
    borderColor: "#E8E0D1",
    borderRadius: 12,
    borderWidth: 1,
    color: "#465132",
    fontSize: 14,
    fontWeight: "700",
    padding: 10,
    textAlign: "center",
    width: 100,
  },
  timeHint: { color: "#9A907E", fontSize: 9, lineHeight: 13 },
  modalNote: {
    alignItems: "center",
    backgroundColor: "#EFF2E6",
    borderRadius: 12,
    flexDirection: "row-reverse",
    gap: 8,
    marginBottom: 14,
    padding: 10,
  },
  modalNoteText: { color: "#5A624B", flex: 1, fontSize: 11, fontWeight: "700", lineHeight: 16, textAlign: "right" },
  modalButtons: { flexDirection: "row-reverse", gap: 10 },
  cancelButton: {
    alignItems: "center",
    backgroundColor: "#F0EBDD",
    borderColor: "#E4DCCB",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    paddingVertical: 11,
  },
  cancelButtonText: { color: "#786F61", fontSize: 12, fontWeight: "800" },
  confirmButton: {
    alignItems: "center",
    backgroundColor: "#6B7B3F",
    borderRadius: 14,
    flex: 1,
    justifyContent: "center",
    paddingVertical: 11,
  },
  confirmButtonText: { color: "#FFFDF8", fontSize: 12, fontWeight: "800" },
});

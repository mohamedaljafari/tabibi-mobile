/**
 * شاشة تقييم مقدم الخدمة بعد إتمام الخدمة.
 *
 * يفتحها المريض من بطاقة طلب مكتمل في تبويب «طلباتي».
 * يختار المريض عدد النجوم (1-5) ويدخل تعليقًا نصيًا اختياريًا،
 * ثم يحفظ التقييم ويُنشأ إشعار لمقدم الخدمة باستقبال تقييم جديد.
 */
import { useCallback, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { createNotification } from "@/lib/notifications";
import { createRating, validateNewRating } from "@/lib/ratings";
import { readServiceRequests, type ServiceRequest } from "@/lib/service-requests";

const STAR_SIZE = 34;

export default function RateRequestScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const router = useRouter();
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requestState, setRequestState] = useState<ServiceRequest | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        if (!requestId) return;
        const all = await readServiceRequests();
        const found = all.find((item) => item.id === requestId) ?? null;
        if (!cancelled) setRequestState(found);
      })();
      return () => {
        cancelled = true;
      };
    }, [requestId]),
  );

  const submit = useCallback(async () => {
    const input = {
      requestId: requestState!.id,
      patientId: requestState!.patientId ?? "",
      patientName: requestState!.patientName,
      providerId: requestState!.providerId,
      providerName: requestState!.providerName,
      stars,
      comment: comment.trim() || undefined,
    };
    const validation = validateNewRating(input);
    if (!validation.valid) {
      Alert.alert("تعذّر حفظ التقييم", validation.error ?? "خطأ غير متوقع");
      return;
    }
    setSubmitting(true);
    const { rating, error } = await createRating(input);
    if (rating && requestState) {
      await createNotification({
        recipientId: requestState.providerId,
        role: "provider",
        type: "received_rating",
        channel: "provider_alert",
        title: "تقييم جديد",
        body: `قيّمك ${requestState.patientName} بـ ${stars} نجوم${rating.comment ? `: «${rating.comment}»` : ""}`,
        requestId: requestState.id,
        otherPartyName: requestState.patientName,
      });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.back();
    } else {
      setSubmitting(false);
      Alert.alert("تعذّر حفظ التقييم", error ?? "حاول مرة أخرى");
    }
  }, [comment, requestId, requestState, router, stars]);

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.headerRow}>
            <Text style={styles.title}>تقييم الخدمة</Text>
            <Pressable onPress={goBack} style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.6 }]}>
              <MaterialIcons name="close" size={22} color="#465132" />
            </Pressable>
          </View>

          <View style={styles.card}>
            {requestState ? (
              <>
                <Text style={styles.providerName}>{requestState.providerName}</Text>
                <Text style={styles.specialtyText}>{requestState.specialtyLabel}</Text>
              </>
            ) : (
              <Text style={styles.providerName}>مقدم الخدمة</Text>
            )}
            <Text style={styles.hint}>
              رأيك يساعد بقية المرضى على اختيار مقدم خدمة مناسب، ويعكس جودة الخدمة التي قدمها.
            </Text>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setStars(value)}
                  style={({ pressed }) => [styles.starButton, pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] }]}
                >
                  <MaterialIcons
                    name={value <= stars ? "star" : "star-border"}
                    size={STAR_SIZE}
                    color={value <= stars ? "#C9A961" : "#D8CFBD"}
                  />
                </Pressable>
              ))}
            </View>
            <Text style={styles.starsLabel}>{["", "مقبولة", "جيدة", "جيدة جدًا", "ممتازة", "ممتازة"][stars]} — {stars} نجوم</Text>

            <Text style={styles.commentLabel}>تعليق (اختياري)</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="اكتب ملاحظاتك عن الخدمة..."
              placeholderTextColor="#B9AFA0"
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={500}
              textAlign="right"
            />
            <Text style={styles.counterText}>{comment.length}/500</Text>
          </View>

          <Pressable
            disabled={submitting}
            onPress={submit}
            style={({ pressed }) => [
              styles.submitButton,
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              submitting && { opacity: 0.5 },
            ]}
          >
            <Text style={styles.submitText}>{submitting ? "جارٍ الحفظ..." : "إرسال التقييم"}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 14 },
  headerRow: { alignItems: "center", flexDirection: "row-reverse", justifyContent: "space-between", paddingTop: 6 },
  title: { color: "#465132", fontSize: 20, fontWeight: "800", textAlign: "right" },
  closeButton: { padding: 4 },
  card: {
    backgroundColor: "#FFFDF8",
    borderColor: "#E8E0D1",
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  providerName: { color: "#465132", fontSize: 16, fontWeight: "800", textAlign: "right" },
  specialtyText: { color: "#6B7B3F", fontSize: 12, marginTop: -6, textAlign: "right" },
  hint: { color: "#8A8173", fontSize: 12, lineHeight: 18, textAlign: "right" },
  starsRow: { alignItems: "center", flexDirection: "row-reverse", justifyContent: "center", gap: 6 },
  starButton: { padding: 4 },
  starsLabel: { color: "#6B5F4A", fontSize: 13, fontWeight: "700", textAlign: "center" },
  commentLabel: { color: "#465132", fontSize: 13, fontWeight: "700", textAlign: "right", marginTop: 4 },
  commentInput: {
    backgroundColor: "#F8F5ED",
    borderColor: "#E8E0D1",
    borderRadius: 14,
    borderWidth: 1,
    color: "#5A624B",
    fontSize: 13,
    minHeight: 90,
    padding: 12,
    textAlignVertical: "top",
  },
  counterText: { color: "#9A907E", fontSize: 10, textAlign: "left" },
  submitButton: {
    alignItems: "center",
    backgroundColor: "#6B7B3F",
    borderRadius: 16,
    justifyContent: "center",
    paddingVertical: 13,
  },
  submitText: { color: "#FFFDF8", fontSize: 14, fontWeight: "800" },
});

/**
 * شاشة دفع الاستشارة الطبية (فورية أو موعودة).
 *
 * السيناريو (حسب قاعدة الدفع المعتمدة):
 * - الاستشارة خدمة عن بُعد (online)، لذا الدفع إلكتروني فقط ويُدفع قبل
 *   تقديم الخدمة. لا يوجد دفع نقدي للاستشارات.
 * - بعد إرسال الطلب يصل المريض هنا والطلب «بانتظار قبول الطبيب».
 * - بعد قبول الطبيب: يظهر زر «تم الدفع الإلكتروني»، وعند تأكيده تُسجّل
 *   قيد محفظة (دفع) للمريض + قيد مستحق له للطبيب + إشعار للطبيب.
 * - للطبيب الخارجي (مسجل يدويًا من لوحة التحكم): يُقبَل الطلب يدويًا من
 *   الإدارة فتنتقل الحالة إلى accepted هنا أيضًا.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import {
  readConsultationRequests,
  updateConsultationRequest,
  type ConsultationRequest,
} from "@/lib/consultation-requests";
import { addWalletEntry, type LedgerEntryType } from "@/lib/wallets";

const DAY_LABELS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function formatScheduledLabel(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${DAY_LABELS[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1} — ${hours}:${minutes}`;
}

async function pushNotification(input: {
  recipientId: string;
  recipientRole: "patient" | "provider" | "admin";
  type: string;
  title: string;
  body: string;
  channel: "done" | "admin" | "patient_request" | "provider_alert" | "marketing";
  requestId?: string;
  otherPartyName?: string;
}): Promise<void> {
  const raw = (await AsyncStorage.getItem("notifications_v1")) ?? "[]";
  const notifications = JSON.parse(raw) as Array<Record<string, unknown>>;
  notifications.push({
    id: `notif_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    read: false,
    recipientId: input.recipientId,
    role: input.recipientRole,
    type: input.type,
    channel: input.channel,
    title: input.title,
    body: input.body,
    requestId: input.requestId,
    otherPartyName: input.otherPartyName,
  });
  await AsyncStorage.setItem("notifications_v1", JSON.stringify(notifications));
}

export default function ConsultationPaymentScreen() {
  const params = useLocalSearchParams<{ requestId?: string; doctorName?: string }>();
  const requestId = params.requestId ?? null;
  const doctorName = params.doctorName ?? null;

  const [request, setRequest] = useState<ConsultationRequest | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRequest = useCallback(async () => {
    if (!requestId) return;
    const all = await readConsultationRequests();
    const found = all.find((entry) => entry.id === requestId) ?? null;
    setRequest(found);
  }, [requestId]);

  useEffect(() => {
    setLoading(true);
    loadRequest().finally(() => setLoading(false));
  }, [loadRequest]);

  useEffect(() => {
    if (!requestId || loading) return;
    const interval = setInterval(() => {
      void loadRequest();
    }, 2000);
    return () => clearInterval(interval);
  }, [requestId, loading, loadRequest]);

  const finalizePayment = async () => {
    if (!request || request.status !== "accepted" || request.paymentStatus === "confirmed") return;
    try {
      await updateConsultationRequest(requestId!, {
        paymentStatus: "confirmed",
        paymentConfirmedAt: Date.now(),
      });

      const paymentType: LedgerEntryType = "payment";
      await addWalletEntry({
        role: "patient",
        kind: "debit",
        type: paymentType,
        ownerId: request.patientId,
        ownerName: request.patientName,
        reference: requestId ? String(requestId) : undefined,
        amount: request.price,
        description: "دفع مقابل استشارة طبية (إلكتروني مسبق)",
      });
      await addWalletEntry({
        role: "provider",
        kind: "credit",
        type: "earned",
        ownerId: request.doctorId,
        ownerName: request.doctorName,
        reference: requestId ? String(requestId) : undefined,
        amount: request.price,
        description: "مستحق له: استشارة طبية (دفع إلكتروني)",
      });
      await pushNotification({
        recipientId: request.doctorId,
        recipientRole: "provider",
        type: "payment_confirmed",
        channel: "done",
        title: "تأكيد دفع الاستشارة",
        body: `دفع ${request.patientName} قيمة الاستشارة (${request.price.toLocaleString("ar-EG")} د.ل). يمكنك البدء بالاستشارة.`,
      });
      await pushNotification({
        recipientId: "admin",
        recipientRole: "admin",
        type: "payment_confirmed",
        channel: "admin",
        title: "تأكيد دفع استشارة",
        body: `دفع المريض ${request.patientName} قيمة الاستشارة للطبيب ${request.doctorName} (${request.price.toLocaleString("ar-EG")} د.ل).`,
        requestId: requestId ? String(requestId) : undefined,
        otherPartyName: request.patientName,
      });

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert(
        "تم الدفع",
        "تم تأكيد الدفع الإلكتروني وسيُبلَّغ الطبيب فورًا. يمكنك متابعة الاستشارة من صفحة الطلبات والدردشة.",
        [{ text: "حسنًا", onPress: () => router.replace({ pathname: "/(tabs)/requests" } as never) }],
      );
    } catch {
      Alert.alert("تعذر إتمام الدفع", "حدثت مشكلة أثناء حفظ الدفع، حاول مرة أخرى.");
    }
  };

  if (loading) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#6B7B3F" />
        </View>
      </ScreenContainer>
    );
  }

  const accepted = request?.status === "accepted";
  const confirmed = request?.paymentStatus === "confirmed";
  const waitingProvider = !accepted;
  const scheduleLabel =
    request && request.mode === "scheduled" && request.scheduledAt ? formatScheduledLabel(request.scheduledAt) : null;

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
          <Text style={styles.title}>دفع الاستشارة</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>الدفع الإلكتروني (مسبق)</Text>
          <Text style={styles.amountValue}>{(request?.price ?? 0).toLocaleString("ar-EG")} د.ل</Text>
          <Text style={styles.amountHint}>
            الاستشارة خدمة عن بُعد، لذا يكون الدفع إلكترونيًا فقط وقبل تقديم الاستشارة، ولا يتاح الدفع النقدي.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <MaterialIcons name="medical-services" size={24} color="#6B7B3F" />
          <View style={styles.infoText}>
            <Text style={styles.infoName}>{doctorName ?? request?.doctorName ?? "الطبيب"}</Text>
            <Text style={styles.infoSpecialty}>{request?.specialtyLabel}</Text>
            {scheduleLabel ? (
              <View style={styles.scheduleBadge}>
                <MaterialIcons name="event" size={12} color="#5B8CA3" />
                <Text style={styles.scheduleText}>موعد الاستشارة: {scheduleLabel}</Text>
              </View>
            ) : (
              <Text style={styles.modeText}>نوع الطلب: استشارة فورية</Text>
            )}
          </View>
        </View>

        {waitingProvider && (
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <ActivityIndicator size="small" color="#C9A961" />
              <Text style={styles.statusText}>بانتظار قبول الطبيب للطلب</Text>
            </View>
            <Text style={styles.statusSub}>
              {request?.type === "international"
                ? "تم إرسال طلبك للإدارة، وسيتم تنسيق الاستشارة مع الطبيب خارج ليبيا وإبلاغك عند تأكيدها."
                : "بعد قبول الطبيب للطلب ستتمكن من إتمام الدفع الإلكتروني."}
            </Text>
          </View>
        )}

        {accepted && !confirmed && (
          <View style={styles.statusCard}>
            <MaterialIcons name="credit-card" size={26} color="#C9A961" />
            <Text style={styles.statusText}>الطبيب قبل الطلب — أتمّ الدفع الإلكتروني الآن</Text>
            <Text style={styles.statusSub}>
              {request?.type === "international"
                ? "سيُبلَّغ الطبيب والمنسق بعد إتمام الدفع لتأكيد موعد الاستشارة."
                : "بعد تأكيد الدفع يستطيع الطبيب البدء بالاستشارة مباشرة أو في الموعد المحدد."}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                Alert.alert(
                  "إتمام الدفع الإلكتروني",
                  "بعد تأكيدك سيتم إبلاغ الطبيب فورًا. في الإصدار الحالي هذا تأكيد واجهة، وستُربط بوابة الدفع الفعلية لاحقًا. هل تؤكّد إتمام الدفع؟",
                  [
                    { text: "إلغاء", style: "cancel" },
                    { text: "نعم، تم الدفع", onPress: () => void finalizePayment() },
                  ],
                )
              }
              style={({ pressed }) => [styles.confirmButton, pressed && styles.pressedButton]}>
              <Text style={styles.confirmButtonText}>تم الدفع الإلكتروني</Text>
            </Pressable>
          </View>
        )}

        {accepted && confirmed && (
          <>
            <View style={styles.doneCard}>
              <MaterialIcons name="check-circle" size={22} color="#2E7D32" />
              <Text style={styles.doneText}>تم إتمام الدفع وسيُبلَّغ الطبيب. تتاح لك الدردشة مع الطبيب من صفحة الطلبات.</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: "/chat" as never,
                  params: { requestId } as never,
                })
              }
              style={({ pressed }) => [styles.chatButton, pressed && styles.pressedButton]}>
              <MaterialIcons name="chat" size={18} color="#6B7B3F" />
              <Text style={styles.chatButtonText}>فتح الدردشة مع الطبيب</Text>
            </Pressable>
          </>
        )}

        {request && request.status === "cancelled" && (
          <View style={styles.cancelCard}>
            <MaterialIcons name="cancel" size={24} color="#B55448" />
            <Text style={styles.cancelText}>تم إلغاء طلب الاستشارة.</Text>
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace({ pathname: "/(tabs)/requests" } as never)}
          style={({ pressed }) => [styles.requestsButton, pressed && styles.pressedButton]}>
          <MaterialIcons name="list-alt" size={18} color="#6B7B3F" />
          <Text style={styles.requestsButtonText}>متابعة من صفحة الطلبات</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 32 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerSpacer: { width: 36 },
  backButton: { padding: 6 },
  pressed: { opacity: 0.6 },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2E3B24",
    textAlign: "center",
    lineHeight: 28,
  },
  centered: { flex: 1, justifyContent: "center", paddingVertical: 40 },
  amountCard: {
    backgroundColor: "#EFE9DA",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C9A961",
    marginBottom: 14,
  },
  amountLabel: { fontSize: 15, color: "#6B7B3F", fontWeight: "700", lineHeight: 21 },
  amountValue: { fontSize: 30, fontWeight: "800", color: "#2E3B24", marginVertical: 4, lineHeight: 38 },
  amountHint: { fontSize: 13, color: "#68705C", textAlign: "center", lineHeight: 19 },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  infoText: { flex: 1 },
  infoName: { fontSize: 15, fontWeight: "800", color: "#2E3B24", lineHeight: 21, textAlign: "right" },
  infoSpecialty: { fontSize: 12, color: "#68705C", marginTop: 2, textAlign: "right" },
  modeText: { fontSize: 11, color: "#9A907E", marginTop: 6, textAlign: "right" },
  scheduleBadge: {
    alignItems: "center",
    backgroundColor: "#EAF3F7",
    borderRadius: 999,
    flexDirection: "row-reverse",
    gap: 5,
    justifyContent: "center",
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  scheduleText: { color: "#3E6B7C", fontSize: 11, fontWeight: "700" },
  statusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 10,
    alignItems: "center",
    marginBottom: 14,
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  statusText: { fontSize: 15, fontWeight: "600", color: "#2E3B24", textAlign: "center", lineHeight: 22 },
  statusSub: { fontSize: 13, color: "#68705C", textAlign: "center", lineHeight: 19 },
  confirmButton: {
    backgroundColor: "#C9A961",
    borderRadius: 999,
    paddingVertical: 13,
    paddingHorizontal: 26,
    alignItems: "center",
    minWidth: 200,
  },
  confirmButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", lineHeight: 22 },
  pressedButton: { opacity: 0.85 },
  doneCard: {
    backgroundColor: "#EFF3E3",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  doneText: { fontSize: 14, color: "#2E3B24", flex: 1, lineHeight: 20 },
  chatButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingVertical: 13,
    paddingHorizontal: 20,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#6B7B3F",
    marginBottom: 14,
  },
  chatButtonText: { fontSize: 15, fontWeight: "700", color: "#6B7B3F", lineHeight: 21 },
  cancelCard: {
    backgroundColor: "#FBEDEB",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  cancelText: { fontSize: 14, color: "#B55448", flex: 1, lineHeight: 20 },
  requestsButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingVertical: 13,
    paddingHorizontal: 20,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#6B7B3F",
  },
  requestsButtonText: { fontSize: 15, fontWeight: "700", color: "#6B7B3F", lineHeight: 21 },
});

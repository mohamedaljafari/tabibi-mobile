/**
 * شاشة الدفع بعد إرسال طلب خدمة لمقدم الخدمة.
 *
 * السيناريو (حسب تعليمات المستخدم):
 * - بعد «طلب الآن» يصل المريض هنا والطلب «بانتظار قبول مقدم الخدمة».
 * - بعد قبول مقدم الخدمة:
 *   - نقدي: زر «تأكيد الدفع النقدي» → تأكيد → قيد دفع للمريض + قيد مستحق له للشريك + إشعار للشريك.
 *   - إلكتروني: زر «تم الدفع الإلكتروني» (واجهة بوابة مستقبلية) → نفس الآثار.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { readPatientRequests } from "@/lib/service-requests";
import { getPatientProfile } from "@/lib/patient-profile";
import { addWalletEntry, type LedgerEntryType } from "@/lib/wallets";

type PaymentMethodParam = "cash" | "electronic";

function paymentLabel(method: string): string {
  return method === "electronic" ? "الدفع الإلكتروني" : "الدفع النقدي";
}

function paymentHint(method: string): string {
  return method === "electronic"
    ? "يتم الدفع إلكترونيًا بعد قبول مقدم الخدمة للطلب."
    : "يتم الدفع نقدًا لمقدم الخدمة بعد انتهاء الخدمة.";
}

export default function PaymentScreen() {
  const params = useLocalSearchParams<{
    requestId?: string;
    providerId?: string;
    paymentMethod?: string;
    total?: string;
  }>();
  const requestId = params.requestId ?? null;
  const providerId = params.providerId ?? null;
  const paymentMethod: PaymentMethodParam = params.paymentMethod === "electronic" ? "electronic" : "cash";
  const total = Number(params.total ?? "0");

  const [status, setStatus] = useState<string | null>(null);
  const [providerStatus, setProviderStatus] = useState<string | null>(null);
  const [patientName, setPatientName] = useState<string>("");
  const [confirmed, setConfirmed] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadRequest = useCallback(async () => {
    if (!requestId) return;
    const requests = await readPatientRequestsByRequestId();
    const request = requests.find((entry) => entry.id === requestId);
    setProviderStatus(request ? request.status : null);
    setStatus(request ? (request.paymentStatus ?? "awaiting_provider_acceptance") : null);
    setConfirmed(request ? request.paymentStatus === "confirmed" : false);
  }, [requestId]);

  const readPatientRequestsByRequestId = useCallback(async () => {
    if (!requestId) return [];
    const requests = await readPatientRequests("unknown");
    return requests;
  }, [requestId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadRequest(),
      getPatientProfile().then((profile) => setPatientName(profile?.fullName ?? "")),
    ]).finally(() => setLoading(false));
  }, [loadRequest]);

  useEffect(() => {
    if (!requestId || loading) return;
    const interval = setInterval(() => {
      void loadRequest();
    }, 2000);
    return () => clearInterval(interval);
  }, [requestId, loading, loadRequest]);

  const readCurrentRequest = async () => {
    const all = JSON.parse((await AsyncStorage.getItem("service_requests_v1")) ?? "[]") as Array<{
      id: string;
      status: string;
      paymentStatus?: string;
      paymentMethod?: string;
      total: number;
      providerId: string;
      updatedAt?: number;
      [key: string]: unknown;
    }>;
    return all.find((entry) => entry.id === requestId) ?? null;
  };

  const finalizePayment = async () => {
    const request = await readCurrentRequest();
    if (!request || request.status !== "accepted" || processing) return;
    setProcessing(true);
    try {
      request.paymentStatus = "confirmed";
      request.paymentConfirmedAt = Date.now();
      request.updatedAt = Date.now();
      await AsyncStorage.setItem("service_requests_v1", JSON.stringify(await allAfterUpdate(request)));

        const profile = await getPatientProfile();
        if (profile) {
          const patientId = `${profile.fullName}-${profile.phone}`;
        const paymentType: LedgerEntryType = "payment";
        await addWalletEntry({
          role: "patient",
          kind: "debit",
          type: paymentType,
          ownerId: patientId,
          ownerName: profile.fullName,
          reference: requestId ?? undefined,
          amount: total || request.total,
          description: `دفع مقابل خدمة: ${paymentLabel(paymentMethod)}`,
        });
        const earnedType: LedgerEntryType = "earned";
        await addWalletEntry({
          role: "provider",
          kind: "credit",
          type: earnedType,
          ownerId: request.providerId,
          ownerName: (request.providerName as string | undefined) ?? "مقدم الخدمة",
          reference: requestId ?? undefined,
          amount: total || request.total,
          description: `مستحق له: ${paymentLabel(paymentMethod)}`,
        });
        const notificationsRaw = (await AsyncStorage.getItem("notifications_v1")) ?? "[]";
        const notifications = JSON.parse(notificationsRaw) as Array<Record<string, unknown>>;
        notifications.push({
          id: `notif_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
          createdAt: Date.now(),
          read: false,
          recipientId: request.providerId,
          role: "provider",
          type: "payment_confirmed",
          title: "تأكيد الدفع",
          body: `تم تأكيد الدفع من ${profile.fullName}، يمكنك البدء بالتوجه إلى العميل.`,
          requestId,
          otherPartyName: profile.fullName,
        });
        await AsyncStorage.setItem("notifications_v1", JSON.stringify(notifications));
      }

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert(
        "تم التأكيد",
        "تم تأكيد الدفع وسيُبلَّغ مقدم الخدمة فورًا. يمكنك متابعة تفاصيل الطلب من صفحة الطلبات.",
        [{ text: "حسنًا", onPress: () => router.replace({ pathname: "/(tabs)/requests" } as never) }],
      );
    } catch {
      Alert.alert("تعذر إتمام التأكيد", "حدثت مشكلة أثناء حفظ التأكيد، حاول مرة أخرى.");
    } finally {
      setProcessing(false);
    }
  };

  const allAfterUpdate = async (updated: { id: string }) => {
    const all = (await readCurrentRequest()) ? [updated, ...[]] : [];
    const allEntries = JSON.parse((await AsyncStorage.getItem("service_requests_v1")) ?? "[]") as Array<{
      id: string;
      [key: string]: unknown;
    }>;
    const without = allEntries.filter((entry) => entry.id !== updated.id);
    return [...without, updated];
  };

  const accepted = providerStatus === "accepted";
  const waitingProvider = !accepted;
  const canConfirm = accepted && !confirmed && !processing;

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.page}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="رجوع إلى الطلبات"
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            >
              <MaterialIcons name="arrow-forward" size={22} color="#6B7B3F" />
            </Pressable>
            <Text style={styles.title}>الدفع</Text>
            <View style={styles.headerSpacer} />
          </View>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#6B7B3F" />
            </View>
          ) : (
            <View style={styles.cards}>
              <View style={styles.amountCard}>
                <Text style={styles.amountLabel}>{paymentLabel(paymentMethod)}</Text>
                <Text style={styles.amountValue}>{total.toLocaleString("ar-EG") || "0"} دينار</Text>
                <Text style={styles.amountHint}>{paymentHint(paymentMethod)}</Text>
              </View>

              {waitingProvider && (
                <View style={styles.statusCard}>
                  <View style={styles.statusRow}>
                    <ActivityIndicator size="small" color="#C9A961" />
                    <Text style={styles.statusText}>بانتظار قبول مقدم الخدمة للطلب</Text>
                  </View>
                  <Text style={styles.statusSub}>
                    بعد قبول مقدم الخدمة ستظهر خيارات تأكيد الدفع المناسبة لطريقة الدفع التي اخترتها.
                  </Text>
                </View>
              )}

              {accepted && paymentMethod === "cash" && (
                <View style={styles.statusCard}>
                  <MaterialIcons name="payments" size={26} color="#6B7B3F" />
                  <Text style={styles.statusText}>
                    {confirmed ? "تم تأكيد الدفع النقدي" : "مقدم الخدمة قبل الطلب — الدفع النقدي عند انتهاء الخدمة"}
                  </Text>
                  {!confirmed && (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        Alert.alert("تأكيد الدفع النقدي", "بعد تأكيدك سيتم إبلاغ مقدم الخدمة ليبدأ التوجه إليك. هل تؤكّد الدفع النقدي؟", [
                          { text: "إلغاء", style: "cancel" },
                          { text: "نعم، تأكيد", onPress: () => void finalizePayment() },
                        ])
                      }
                      style={({ pressed }) => [styles.confirmButton, pressed && styles.pressedButton]}
                    >
                      <Text style={styles.confirmButtonText}>{processing ? "جارٍ التأكيد..." : "تأكيد الدفع النقدي"}</Text>
                    </Pressable>
                  )}
                  {confirmed && (
                    <View style={styles.confirmedBadge}>
                      <MaterialIcons name="check-circle" size={18} color="#2E7D32" />
                      <Text style={styles.confirmedText}>تم التأكيد وسيُبلَّغ مقدم الخدمة</Text>
                    </View>
                  )}
                </View>
              )}

              {accepted && paymentMethod === "electronic" && (
                <View style={styles.statusCard}>
                  <MaterialIcons name="credit-card" size={26} color="#C9A961" />
                  <Text style={styles.statusText}>
                    {confirmed ? "تم إتمام الدفع الإلكتروني" : "مقدم الخدمة قبل الطلب — أتمّ الدفع الإلكتروني الآن"}
                  </Text>
                  {!confirmed && (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        Alert.alert(
                          "إتمام الدفع الإلكتروني",
                          "بعد تأكيدك سيتم إبلاغ مقدم الخدمة ليبدأ التوجه إليك. في الإصدار الحالي هذا تأكيد واجهة، وستُربط بوابة الدفع الفعلية لاحقًا. هل تؤكّد إتمام الدفع؟",
                          [
                            { text: "إلغاء", style: "cancel" },
                            { text: "نعم، تم الدفع", onPress: () => void finalizePayment() },
                          ],
                        )
                      }
                      style={({ pressed }) => [styles.confirmButton, styles.electronicButton, pressed && styles.pressedButton]}
                    >
                      <Text style={styles.confirmButtonText}>{processing ? "جارٍ التأكيد..." : "تم الدفع الإلكتروني"}</Text>
                    </Pressable>
                  )}
                  {confirmed && (
                    <View style={styles.confirmedBadge}>
                      <MaterialIcons name="check-circle" size={18} color="#2E7D32" />
                      <Text style={styles.confirmedText}>تم إتمام الدفع وسيُبلَّغ مقدم الخدمة</Text>
                    </View>
                  )}
                </View>
              )}

              {accepted && confirmed && (
                <View style={styles.doneCard}>
                  <MaterialIcons name="directions-walk" size={22} color="#6B7B3F" />
                  <Text style={styles.doneText}>مقدم الخدمة على علم الآن وسيبدأ التوجه إليك حسب الطلب.</Text>
                </View>
              )}

              <Pressable
                accessibilityRole="button"
                onPress={() => router.replace({ pathname: "/(tabs)/requests" } as never)}
                style={({ pressed }) => [styles.requestsButton, pressed && styles.pressedButton]}
              >
                <MaterialIcons name="list-alt" size={18} color="#6B7B3F" />
                <Text style={styles.requestsButtonText}>متابعة من صفحة الطلبات</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
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
  cards: { gap: 14 },
  amountCard: {
    backgroundColor: "#EFE9DA",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C9A961",
  },
  amountLabel: { fontSize: 15, color: "#6B7B3F", fontWeight: "600", lineHeight: 22 },
  amountValue: { fontSize: 30, fontWeight: "800", color: "#2E3B24", marginVertical: 4, lineHeight: 38 },
  amountHint: { fontSize: 13, color: "#68705C", textAlign: "center", lineHeight: 19 },
  statusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 10,
    alignItems: "center",
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  statusText: { fontSize: 15, fontWeight: "600", color: "#2E3B24", textAlign: "center", lineHeight: 22 },
  statusSub: { fontSize: 13, color: "#68705C", textAlign: "center", lineHeight: 19 },
  confirmButton: {
    backgroundColor: "#6B7B3F",
    borderRadius: 999,
    paddingVertical: 13,
    paddingHorizontal: 26,
    alignItems: "center",
    minWidth: 200,
  },
  electronicButton: { backgroundColor: "#C9A961" },
  confirmButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", lineHeight: 22 },
  pressedButton: { opacity: 0.85 },
  confirmedBadge: { flexDirection: "row", alignItems: "center", gap: 8 },
  confirmedText: { fontSize: 14, fontWeight: "600", color: "#2E7D32", lineHeight: 20 },
  doneCard: {
    backgroundColor: "#EFF3E3",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  doneText: { fontSize: 14, color: "#2E3B24", flex: 1, lineHeight: 20 },
  requestsButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingVertical: 13,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#6B7B3F",
  },
  requestsButtonText: { fontSize: 15, fontWeight: "700", color: "#6B7B3F", lineHeight: 21 },
});

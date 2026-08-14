/**
 * تبويب «طلباتي» في تطبيق المريض.
 *
 * يعرض سجل طلبات الخدمة التي أرسلها المريض إلى مقدمي الخدمة:
 * حالة كل طلب (قيد الانتظار، مقبول، مرفوض، مكتمل)، الخدمات المطلوبة
 * مع أسعارها، مقدم الخدمة، العنوان، ورده عند قبول أو رفض الطلب.
 *
 * الحالة تتحدث من تطبيق طبيب شريك عند قبول مقدم الخدمة أو رفضه،
 * وتُقرأ هنا من مفتاح التخزين المشترك service_requests_v1.
 */
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { getPatientProfile, grantMedicalAccess } from "@/lib/patient-profile";
import { isRequestRated } from "@/lib/ratings";
import { readPatientRequests, updateRequestStatus, type ServiceRequest } from "@/lib/service-requests";
import { readPatientConsultationRequests, type ConsultationRequest } from "@/lib/consultation-requests";

type RequestEntry = ServiceRequest | ConsultationRequest;
const isConsultationEntry = (entry: RequestEntry): entry is ConsultationRequest =>
  "doctorId" in entry && !("providerId" in entry);
const isServiceEntry = (entry: RequestEntry): entry is ServiceRequest => "providerId" in entry;
const DAY_LABELS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
function formatScheduledLabel(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${DAY_LABELS[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1} — ${hours}:${minutes}`;
}
import { createNotification } from "@/lib/notifications";
import { addWalletEntry } from "@/lib/wallets";

const CONSULTATION_STATUS_STYLES: Record<ConsultationRequest["status"], { label: string; background: string; text: string }> = {
  pending: { label: "بانتظار القبول", background: "#F0EBDD", text: "#8A8173" },
  accepted: { label: "مقبول", background: "#EAF3E4", text: "#5A6A2E" },
  rejected: { label: "مرفوض", background: "#F6E8E6", text: "#B55448" },
  completed: { label: "مكتمل", background: "#E4ECF3", text: "#3F5F7E" },
  cancelled: { label: "ملغي", background: "#F0EBDD", text: "#8A8173" },
};

const STATUS_STYLES: Record<ServiceRequest["status"], { label: string; background: string; text: string }> = {
  pending: { label: "قيد الانتظار", background: "#F0EBDD", text: "#8A8173" },
  accepted: { label: "مقبول", background: "#EAF3E4", text: "#5A6A2E" },
  rejected: { label: "مرفوض", background: "#F6E8E6", text: "#B55448" },
  completed: { label: "مكتمل", background: "#E4ECF3", text: "#3F5F7E" },
  cancelled: { label: "ملغي", background: "#F0EBDD", text: "#8A8173" },
};

function formatRequestDate(timestamp: number) {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${hours}:${minutes} — ${day}/${month}`;
}

export default function RequestsScreen() {
  const [requests, setRequests] = useState<RequestEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadRequests = useCallback(async () => {
    const profile = await getPatientProfile();
    if (!profile || !profile.fullName) {
      setLoaded(true);
      setLoading(false);
      return;
    }
    const patientId = `${profile.fullName}-${profile.phone}`;
    const [stored, consultations] = await Promise.all([
      readPatientRequests(patientId),
      readPatientConsultationRequests(patientId),
    ]);
    setRequests(
      [...stored, ...consultations].sort((first, second) => second.createdAt - first.createdAt),
    );
    setLoaded(true);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [loadRequests]),
  );

  const cancelConsultation = (item: ConsultationRequest) => {
    if (item.status !== "pending" && item.paymentStatus !== "payment_pending") return;
    Alert.alert("إلغاء طلب الاستشارة", "هل تريد إلغاء هذا الطلب؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "نعم، إلغاء الطلب",
        style: "destructive",
        onPress: async () => {
          const { cancelConsultationRequest } = await import("@/lib/consultation-requests");
          const { removeThread } = await import("@/lib/chat");
          await cancelConsultationRequest(item.id);
          await removeThread(item.id);
          setRequests((current) => current.filter((request) => request.id !== item.id));
        },
      },
    ]);
  };

  const completeRequest = (item: ServiceRequest) => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      "إتمام الخدمة",
      `هل انتهت الخدمة «${item.services.map((service) => service.serviceName).join("، ")}» بالفعل؟ سيتم تسجيل الدفع في محفظتك وإشعار مقدم الخدمة بمبلغ مستحقاته.`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "نعم، أتممت الخدمة",
          onPress: async () => {
            const updated = await updateRequestStatus(item.id, "completed", "أتمها المريض من تطبيقه");
            if (!updated) {
              Alert.alert("تعذّر الإتمام", "لم نتمكن من حفظ حالة الطلب، حاول مرة أخرى.");
              return;
            }
            void (async () => {
              const profile = await getPatientProfile();
              if (!profile) return;
              await createNotification({
                recipientId: item.providerId,
                role: "provider",
                type: "request_received",
                channel: "done",
                title: "اكتملت الخدمة",
                body: `أتم المريض ${profile.fullName} الخدمة «${item.services.map((service) => service.serviceName).join("، ")}» بمبلغ ${item.total} د.ل، وسيُقيّمها قريبًا.`,
                requestId: item.id,
                otherPartyName: profile.fullName,
              });
              try {
                await addWalletEntry({
                  ownerId: profile.phone,
                  ownerName: profile.fullName,
                  role: "patient",
                  kind: "debit",
                  type: "payment",
                  amount: item.total,
                  description: `دفع مقابل خدمة «${item.services.map((service) => service.serviceName).join("، ")}» لمقدم الخدمة ${item.providerName}`,
                  reference: item.id,
                });
                await addWalletEntry({
                  ownerId: item.providerId,
                  ownerName: item.providerName,
                  role: "provider",
                  kind: "credit",
                  type: "earned",
                  amount: item.total,
                  description: `مستحق من خدمة «${item.services.map((service) => service.serviceName).join("، ")}» للمريض ${profile.fullName}`,
                  reference: item.id,
                });
              } catch {
                // يُضاف القيد يدويًا من لوحة التحكم في حال تعذّر الحفظ التلقائي.
              }
            })();
            setRequests((current) => current.map((request) => (request.id === item.id ? updated : request)));
            router.push({ pathname: "/rate-request", params: { requestId: item.id } } as never);
          },
        },
      ],
    );
  };

  const pendingCount = useMemo(() => requests.filter((request) => request.status === "pending").length, [requests]);
  const [ratedIds, setRatedIds] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const ids: string[] = [];
        for (const request of requests) {
          if (request.status === "completed" && (await isRequestRated(request.id))) {
            ids.push(request.id);
          }
        }
        setRatedIds(ids);
      })();
    }, [requests]),
  );

  const openRating = (item: ServiceRequest) => {
    if (item.status !== "completed") return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({ pathname: "/rate-request", params: { requestId: item.id } });
  };

  const grantAccess = (item: ServiceRequest) => {
    const profilePromise = getPatientProfile();
    void (async () => {
      try {
        const profile = await profilePromise;
        const ownerNames = (profile?.medicalRecords ?? []).map((record) => record.ownerName);
        if (ownerNames.length === 0) {
          Alert.alert("لا يوجد ملف طبي", "أنشئ ملفك الطبي من صفحة حسابي أولًا لمنح صلاحية الاطلاع.");
          return;
        }
        await grantMedicalAccess(item.providerId, item.providerName, ownerNames);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert("تم منح الصلاحية", `أصبح بإمكان ${item.providerName} الاطلاع على ملفاتك الطبية (لك ولعائلتك). يمكن إلغاء الإذن من شاشة الملف الطبي.`);
      } catch {
        Alert.alert("تعذر منح الصلاحية", "حدثت مشكلة أثناء الحفظ، حاول مرة أخرى.");
      }
    })();
  };

  const openChat = (item: RequestEntry) => {
    if (isConsultationEntry(item)) {
      if (item.status !== "accepted" || item.paymentStatus !== "confirmed") return;
    } else if (item.status !== "accepted" && item.status !== "completed") {
      return;
    }
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({
      pathname: "/chat",
      params: {
        requestId: item.id,
        providerName: isConsultationEntry(item) ? item.doctorName : item.providerName,
      },
    });
  };

  const renderRequest = ({ item }: { item: RequestEntry }) => {
    if (isConsultationEntry(item)) {
      return renderConsultationCard(item);
    }
    return renderServiceCard(item);
  };

  const renderConsultationCard = (item: ConsultationRequest) => {
    const statusStyle = CONSULTATION_STATUS_STYLES[item.status] ?? CONSULTATION_STATUS_STYLES.pending;
    const scheduleLabel =
      item.mode === "scheduled" && item.scheduledAt ? formatScheduledLabel(item.scheduledAt) : null;
    const canChat = item.status === "accepted" && item.paymentStatus === "confirmed";
    const canCancel = item.status === "pending" && item.paymentStatus === "payment_pending";
    const canPay = item.status === "accepted" && item.paymentStatus === "payment_pending";
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.providerCopy}>
            <Text style={styles.providerName}>{item.doctorName}</Text>
            <Text style={styles.specialtyText}>
              {item.specialtyLabel}
              {item.type === "international" ? " — طبيب خارج ليبيا" : " — طبيب داخل ليبيا"}
            </Text>
            <Text style={styles.modeText}>
              {item.mode === "scheduled" ? "استشارة بموعد محدد" : "استشارة فورية"}
              {scheduleLabel ? ` — ${scheduleLabel}` : ""}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.background }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
          </View>
        </View>

        <Text style={styles.timeText}>{formatRequestDate(item.createdAt)}</Text>

        {item.paymentStatus === "payment_pending" && item.status !== "rejected" && item.status !== "cancelled" ? (
          <View style={styles.paymentNote}>
            <MaterialIcons name="payment" size={14} color="#C9A961" />
            <Text style={styles.paymentNoteText}>
              {item.status === "pending"
                ? "عند قبول الطبيب للطلب سيتم إتمام الدفع الإلكتروني قبل الاستشارة."
                : "الاستشارة خدمة عن بُعد، الدفع الإلكتروني قبل تقديم الخدمة فقط."}
            </Text>
          </View>
        ) : null}

        {canChat ? (
          <View style={styles.actionsRow}>
            <Pressable
              style={({ pressed }) => [styles.chatButton, pressed && { opacity: 0.75 }]}
              onPress={() => openChat(item)}
            >
              <MaterialIcons name="chat" size={16} color="#FFFDF8" />
              <Text style={styles.chatButtonText}>الدردشة مع الطبيب</Text>
            </Pressable>
          </View>
        ) : null}

        {canPay ? (
          <View style={styles.actionsRow}>
            <Pressable
              style={({ pressed }) => [styles.payButton, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
              onPress={() =>
                router.push({
                  pathname: "/consultation-payment",
                  params: { requestId: item.id, doctorName: item.doctorName },
                })
              }
            >
              <MaterialIcons name="credit-card" size={16} color="#FFFDF8" />
              <Text style={styles.payButtonText}>إتمام الدفع الإلكتروني</Text>
            </Pressable>
          </View>
        ) : null}

        {item.paymentStatus === "confirmed" && item.status === "accepted" ? (
          <View style={styles.doneRow}>
            <MaterialIcons name="check-circle" size={14} color="#2E7D32" />
            <Text style={styles.doneText}>تم الدفع، وتتاح لك الدردشة مع الطبيب</Text>
          </View>
        ) : null}

        {item.status === "completed" ? (
          <View style={styles.doneRow}>
            <MaterialIcons name="done-all" size={14} color="#3F5F7E" />
            <Text style={styles.doneText}>اكتملت الاستشارة</Text>
          </View>
        ) : null}

        {canCancel ? (
          <View style={styles.actionsRow}>
            <Pressable
              style={({ pressed }) => [styles.cancelRequestButton, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
              onPress={() => cancelConsultation(item)}
            >
              <MaterialIcons name="cancel" size={15} color="#B55448" />
              <Text style={styles.cancelRequestButtonText}>إلغاء الطلب</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>سعر الاستشارة</Text>
          <Text style={styles.totalValue}>{item.price.toLocaleString("ar-EG")} د.ل</Text>
        </View>
      </View>
    );
  };

  const renderServiceCard = (item: ServiceRequest) => {
    const statusStyle = STATUS_STYLES[item.status] ?? STATUS_STYLES.pending;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.providerCopy}>
            <Text style={styles.providerName}>{item.providerName}</Text>
            <Text style={styles.specialtyText}>{item.specialtyLabel}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.background }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
          </View>
        </View>

        <Text style={styles.timeText}>{formatRequestDate(item.createdAt)}</Text>

        <View style={styles.servicesList}>
          {item.services.map((service) => (
            <View key={service.serviceId} style={styles.serviceRow}>
              <Text style={styles.serviceName}>{service.serviceName}</Text>
              <Text style={styles.servicePrice}>{service.price} د.ل</Text>
            </View>
          ))}
        </View>

        <View style={styles.locationRow}>
          <MaterialIcons name="place" size={14} color="#6B7B3F" />
          <Text style={styles.locationText}>
            {item.addressLabel}{item.addressDetails ? ` — ${item.addressDetails}` : ""}
          </Text>
        </View>

        {item.providerReply ? (
          <View style={styles.replyBlock}>
            <MaterialIcons name="chat" size={13} color="#6B7B3F" />
            <Text style={styles.replyText}>{item.providerReply}</Text>
          </View>
        ) : null}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>الإجمالي</Text>
          <Text style={styles.totalValue}>{item.total} د.ل</Text>
        </View>

        {item.status === "pending" ? (
          <Text style={styles.pendingHint}>ينتظر رد مقدم الخدمة، ستظهر حالته هنا فور رده.</Text>
        ) : (item.status === "accepted" || item.status === "completed") ? (
          <View style={styles.actionsRow}>
            {item.status === "completed" && ratedIds.includes(item.id) ? (
              <View style={styles.ratedBadge}>
                <MaterialIcons name="star" size={13} color="#C9A961" />
                <Text style={styles.ratedText}>تم التقييم</Text>
              </View>
            ) : null}
            {item.status === "completed" && !ratedIds.includes(item.id) ? (
              <Pressable
                style={({ pressed }) => [styles.rateButton, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
                onPress={() => openRating(item)}
              >
                <MaterialIcons name="star-rate" size={15} color="#FFFDF8" />
                <Text style={styles.rateButtonText}>قيّم الخدمة</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={({ pressed }) => [styles.accessButton, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
              onPress={() => grantAccess(item)}
            >
              <MaterialIcons name="folder-shared" size={15} color="#FFFDF8" />
              <Text style={styles.accessButtonText}>منح صلاحية الاطلاع على الملف الطبي</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.chatButton, pressed && { opacity: 0.75 }]}
              onPress={() => openChat(item)}
            >
              <MaterialIcons name="chat" size={16} color="#FFFDF8" />
              <Text style={styles.chatButtonText}>الدردشة مع مقدم الخدمة</Text>
            </Pressable>
            {item.status === "accepted" ? (
              <Pressable
                style={({ pressed }) => [styles.completeButton, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
                onPress={() => completeRequest(item)}
              >
                <MaterialIcons name="check-circle" size={15} color="#FFFDF8" />
                <Text style={styles.completeButtonText}>أتممت الخدمة</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <Text style={styles.pendingHint}>
            {item.status === "rejected" ? "يمكنك اختيار مقدم خدمة آخر من نتائج البحث." : ""}
          </Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.loading}><ActivityIndicator color="#6B7B3F" size="large" /></View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.title}>طلباتي</Text>
        <Text style={styles.subtitle}>
          {pendingCount > 0
            ? `${pendingCount} طلب في انتظار رد مقدم الخدمة`
            : loaded && requests.length === 0
              ? "لم ترسل أي طلب بعد"
              : "سجل طلباتك وحالاتها"}
        </Text>
      </View>

      {!loaded ? (
        <View style={styles.emptySection}>
          <MaterialIcons name="inbox" size={32} color="#B9AFA0" />
          <Text style={styles.emptyText}>حمّل الملف الطبي من صفحة حسابي لتتبع طلباتك هنا.</Text>
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.emptySection}>
          <MaterialIcons name="inbox" size={32} color="#B9AFA0" />
          <Text style={styles.emptyText}>
            اطلب خدمة من أحد مقدمي الخدمة وسيظهر طلبك هنا مع حالته: قيد الانتظار حتى رد مقدم الخدمة، ثم مقبول أو مرفوض.
          </Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderRequest}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 },
  title: { color: "#465132", fontSize: 21, fontWeight: "800", textAlign: "right" },
  subtitle: { color: "#8A8173", fontSize: 11, marginTop: 3, textAlign: "right" },
  listContent: { padding: 20, paddingTop: 8, gap: 12 },
  card: { backgroundColor: "#FFFDF8", borderColor: "#E8E0D1", borderRadius: 18, borderWidth: 1, gap: 8, padding: 15 },
  cardHeader: { alignItems: "center", flexDirection: "row-reverse", gap: 8 },
  providerCopy: { flex: 1 },
  providerName: { color: "#465132", fontSize: 15, fontWeight: "800", textAlign: "right" },
  specialtyText: { color: "#6B7B3F", fontSize: 11, marginTop: 2, textAlign: "right" },
  statusBadge: { borderRadius: 9, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 10, fontWeight: "800" },
  timeText: { color: "#9A907E", fontSize: 10, textAlign: "right" },
  servicesList: { gap: 6, marginTop: 2 },
  serviceRow: { alignItems: "center", backgroundColor: "#F8F5ED", borderRadius: 11, flexDirection: "row-reverse", gap: 8, justifyContent: "space-between", paddingHorizontal: 10, paddingVertical: 7 },
  serviceName: { color: "#5A624B", fontSize: 12, fontWeight: "700", textAlign: "right" },
  servicePrice: { color: "#5A624B", fontSize: 12, fontWeight: "800" },
  locationRow: { alignItems: "center", flexDirection: "row-reverse", gap: 6 },
  locationText: { color: "#786F61", fontSize: 11, flex: 1, textAlign: "right" },
  replyBlock: { alignItems: "flex-start", backgroundColor: "#F0EBDD", borderRadius: 11, flexDirection: "row-reverse", gap: 7, padding: 10 },
  replyText: { color: "#6B5F4A", fontSize: 12, flex: 1, lineHeight: 17, textAlign: "right" },
  totalRow: { alignItems: "center", borderTopColor: "#EFE9DC", borderTopWidth: 1, flexDirection: "row-reverse", gap: 10, paddingTop: 8 },
  totalLabel: { color: "#8A8173", fontSize: 11, flex: 1, textAlign: "right" },
  totalValue: { color: "#465132", fontSize: 14, fontWeight: "800" },
  pendingHint: { color: "#8A8173", fontSize: 10, lineHeight: 15, textAlign: "right" },
  chatButton: {
    alignItems: "center",
    backgroundColor: "#6B7B3F",
    borderRadius: 16,
    flexDirection: "row-reverse",
    gap: 7,
    justifyContent: "center",
    paddingVertical: 10,
  },
  chatButtonText: { color: "#FFFDF8", fontSize: 12, fontWeight: "800" },
  completeButton: {
    alignItems: "center",
    backgroundColor: "#8A8173",
    borderRadius: 16,
    flexDirection: "row-reverse",
    gap: 7,
    justifyContent: "center",
    paddingVertical: 10,
  },
  completeButtonText: { color: "#FFFDF8", fontSize: 12, fontWeight: "800" },
  actionsRow: { alignItems: "center", flexDirection: "row-reverse", gap: 8 },
  rateButton: {
    alignItems: "center",
    backgroundColor: "#C9A961",
    borderRadius: 16,
    flexDirection: "row-reverse",
    gap: 5,
    justifyContent: "center",
    paddingVertical: 10,
    paddingLeft: 16,
    paddingRight: 16,
  },
  rateButtonText: { color: "#FFFDF8", fontSize: 12, fontWeight: "800" },
  ratedBadge: {
    alignItems: "center",
    backgroundColor: "#F0EBDD",
    borderRadius: 16,
    flexDirection: "row-reverse",
    gap: 5,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 14,
  },
  ratedText: { color: "#6B5F4A", fontSize: 11, fontWeight: "800" },
  accessButton: {
    alignItems: "center",
    backgroundColor: "#465132",
    borderRadius: 16,
    flexDirection: "row-reverse",
    flex: 1,
    gap: 5,
    justifyContent: "center",
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 12,
  },
  accessButtonText: { color: "#FFFDF8", fontSize: 11, fontWeight: "800" },
  emptySection: { alignItems: "center", backgroundColor: "#F0EBDD", borderRadius: 16, gap: 10, margin: 20, padding: 28 },
  emptyText: { color: "#786F61", fontSize: 12, lineHeight: 18, textAlign: "center", paddingHorizontal: 12 },
  modeText: { color: "#8A8173", fontSize: 10, marginTop: 2, textAlign: "right" },
  paymentNote: {
    alignItems: "flex-start",
    backgroundColor: "#FBF3E3",
    borderRadius: 11,
    flexDirection: "row-reverse",
    gap: 7,
    padding: 10,
  },
  paymentNoteText: { color: "#8A6F3E", fontSize: 11, flex: 1, lineHeight: 16, textAlign: "right" },
  payButton: {
    alignItems: "center",
    backgroundColor: "#C9A961",
    borderRadius: 16,
    flexDirection: "row-reverse",
    flex: 1,
    gap: 6,
    justifyContent: "center",
    paddingVertical: 10,
  },
  payButtonText: { color: "#FFFDF8", fontSize: 12, fontWeight: "800" },
  doneRow: { alignItems: "center", backgroundColor: "#EAF3E4", borderRadius: 11, flexDirection: "row-reverse", gap: 7, padding: 10 },
  doneText: { color: "#2E7D32", fontSize: 11, flex: 1, fontWeight: "700", lineHeight: 16, textAlign: "right" },
  cancelRequestButton: {
    alignItems: "center",
    backgroundColor: "#F0EBDD",
    borderColor: "#E0C9C5",
    borderWidth: 1,
    borderRadius: 16,
    flexDirection: "row-reverse",
    gap: 5,
    justifyContent: "center",
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 14,
  },
  cancelRequestButtonText: { color: "#B55448", fontSize: 12, fontWeight: "800" },
});

/**
 * شاشة الدردشة النصية في تطبيق المريض — واجهة مطوّرة.
 *
 * لا تُفتح هذه الشاشة إلا بعد قبول مقدم الخدمة للطلب (حالة accepted أو completed)،
 * وهي محادثة نصية بين المريض ومقدم الخدمة المرتبطة بطلب الخدمة (threadId = requestId).
 * الدردشة لا تظهر ولا يمكن الوصول إليها قبل قبول مقدم الخدمة للطلب.
 *
 * تُستقبل المعاملات من صفحة «طلباتي»: requestId وproviderName.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import {
  AttachmentPickerButton,
  AttachmentPreview,
  MessageAttachmentCard,
} from "@/components/chat-attachment-bar";
import { findThread, isOtherTyping, markTyping, readMessageById, readMessages, sendAttachmentMessage, sendMessage, type ChatAttachment, type ChatMessage } from "@/lib/chat";
import { readConsultationRequests, type ConsultationRequest } from "@/lib/consultation-requests";
import { getPatientProfile } from "@/lib/patient-profile";
import { readPatientRequests, type ServiceRequest } from "@/lib/service-requests";

type RequestForChat = ServiceRequest | ConsultationRequest;
const isConsultation = (request: RequestForChat): request is ConsultationRequest =>
  (request as ConsultationRequest).doctorId !== undefined && (request as ServiceRequest).providerId === undefined;

const MESSAGE_WINDOW = { top: 0, bottom: 6, left: 6, right: 6 };

/** رسالة محلية مؤجلة الإرسال تظهر فوراً في الواجهة قبل الحفظ الفعلي */
type OptimisticMessage = ChatMessage & { _optimistic: true };

export default function ChatScreen() {
  const { requestId, providerName } = useLocalSearchParams<{
    requestId: string;
    providerName?: string;
  }>();
  const navigation = useNavigation();
  const router = useRouter();

  const [threadId, setThreadId] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [displayName, setDisplayName] = useState(providerName ?? "مقدم الخدمة");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [optimistic, setOptimistic] = useState<OptimisticMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<ChatAttachment | null>(null);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  const listRef = useRef<FlatList<ChatMessage> | null>(null);
  const threadRef = useRef<string | null>(null);
  threadRef.current = threadId;

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    if (!requestId) return;
    let cancelled = false;
    const init = async () => {
      const request = await findRequestForThread(requestId);
      if (cancelled) return;
      const requestStatus = request?.status ?? null;
      const isPaidConsultation =
        request && isConsultation(request) && requestStatus === "accepted" && request.paymentStatus === "confirmed";
      const accepted = requestStatus === "accepted" || requestStatus === "completed" || isPaidConsultation;
      if (!accepted) {
        setBlocked(true);
        setLoading(false);
        return;
      }
      const thread = await findThread(requestId);
      if (cancelled) return;
      if (!thread) {
        setBlocked(true);
        setLoading(false);
        return;
      }
      setThreadId(thread.threadId);
      setDisplayName(thread.providerName || (request && isConsultation(request) ? request.doctorName : displayName));
      const loaded = await readMessages(thread.threadId);
      if (cancelled) return;
      setMessages(loaded);
      setLoading(false);
    };
    void init();
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const refreshMessages = useCallback(() => {
    const id = threadRef.current;
    if (!id) return;
    readMessages(id).then((loaded) => {
      setMessages(loaded);
      // إزالة الرسائل المؤجلة التي حُفظت فعلاً
      setOptimistic((current) =>
        current.filter((message) => !loaded.some((saved) => saved.id === message.id)),
      );
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshMessages();
    }, 3000);
    return () => clearInterval(interval);
  }, [refreshMessages]);

  // مؤشر الكتابة: تحديث دوري لقراءة حالة الطرف الآخر، وكتابة لحظة آخر حرف عند التغيير
  useEffect(() => {
    const id = threadId;
    if (!id) return;
    const check = () => {
      void isOtherTyping(id, "patient").then(setOtherTyping);
    };
    check();
    const interval = setInterval(check, 2000);
    return () => clearInterval(interval);
  }, [threadId]);

  useEffect(() => {
    if (!text.trim() || !threadId) return;
    void markTyping(threadId, "patient");
  }, [text, threadId]);

  const scrollToBottom = useCallback((animated = true) => {
    try {
      listRef.current?.scrollToEnd({ animated });
    } catch {
      // لا شيء — القائمة غير جاهزة بعد
    }
  }, []);

  useEffect(() => {
    if (!loading && !blocked) {
      scrollToBottom(false);
    }
  }, [loading, blocked, scrollToBottom]);

  const submitMessage = async () => {
    const id = threadId;
    if (!id) return;
    if (sending) return;
    const pendingText = text.trim();
    if (!pendingText && !pendingAttachment) return;
    setSending(true);
    setOptimistic((current) => [
      ...current,
      {
        id: `opt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        threadId: id,
        senderRole: "patient",
        text: pendingText,
        attachment: pendingAttachment ?? undefined,
        createdAt: Date.now(),
        deliveryStatus: "sending",
        replyToId: replyingTo?.id,
        _optimistic: true,
      },
    ]);
    const attachmentToSend = pendingAttachment;
    const replyTarget = replyingTo;
    setPendingAttachment(null);
    setReplyingTo(null);
    setText("");
    scrollToBottom();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      const baseText = replyTarget
        ? `ردًا على: ${replyTarget.text || (replyTarget.attachment ? "مرفق" : "")}\n\n${pendingText}`
        : pendingText;
      if (attachmentToSend) {
        await sendAttachmentMessage(id, "patient", attachmentToSend, baseText);
      } else {
        await sendMessage(id, "patient", baseText);
      }
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setOptimistic((current) =>
        current.map((message) =>
          message.deliveryStatus === "sending" ? { ...message, deliveryStatus: "sent" } : message,
        ),
      );
    } catch {
      setOptimistic((current) =>
        current.map((message) =>
          message.deliveryStatus === "sending" ? { ...message, deliveryStatus: "sent" } : message,
        ),
      );
    }
    refreshMessages();
    setSending(false);
  };

  const handleAttachmentPicked = (attachment: ChatAttachment) => {
    setPendingAttachment(attachment);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const displayed: (ChatMessage | OptimisticMessage)[] = [...messages, ...optimistic].sort(
    (a, b) => a.createdAt - b.createdAt,
  );

  const renderMessage = ({ item, index }: { item: ChatMessage | OptimisticMessage; index: number }) => {
    const isMine = item.senderRole === "patient";
    const hasContent = item.attachment || item.text.length > 0;
    if (!hasContent) return null;
    const previous = index > 0 ? displayed[index - 1] : null;
    const isGrouped = previous !== null && previous.senderRole === item.senderRole;
    const optimisticTag = (item as OptimisticMessage)._optimistic;
    const quoted = item.replyToId ? messages.find((message) => message.id === item.replyToId) : undefined;
    return (
        <Pressable
          onLongPress={() => {
            if (isMine) return;
            if (Platform.OS !== "web") {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            setReplyingTo(item as ChatMessage);
          }}
          delayLongPress={450}
          style={({ pressed }) => [pressed && { opacity: 0.7 }]}
        >
        <View
          style={[
            styles.bubbleRow,
            isMine ? styles.myBubbleRow : styles.theirBubbleRow,
            isGrouped ? styles.groupedRow : undefined,
          ]}
        >
        <View
          style={[
            styles.bubble,
            isMine ? styles.myBubble : styles.theirBubble,
            isGrouped
              ? isMine
                ? styles.myGroupedBubble
                : styles.theirGroupedBubble
              : undefined,
          ]}
        >
          {quoted ? (
            <View style={styles.quoteCard}>
              <View style={styles.quoteBar} />
              <Text style={styles.quoteText} numberOfLines={2}>
                {quoted.text || (quoted.attachment ? `مرفق: ${quoted.attachment.fileName}` : "")}
              </Text>
            </View>
          ) : null}
          {item.attachment ? (
            <Pressable
              onPress={item.attachment.kind === "image" ? () => setViewerUri(item.attachment!.uri) : undefined}
              style={({ pressed }) => pressed && { opacity: 0.85 }}
            >
              <MessageAttachmentCard attachment={item.attachment} />
            </Pressable>
          ) : null}
          {item.text ? (
            <Text style={[styles.bubbleText, isMine ? styles.myBubbleText : styles.theirBubbleText]}>
              {item.text}
            </Text>
          ) : null}
          <View style={styles.metaRow}>
            {isMine ? (
              <View style={styles.statusMark}>
                {optimisticTag || item.deliveryStatus === "sending" ? (
                  <MaterialIcons name="schedule" size={10} color="rgba(255,253,248,0.75)" />
                ) : (
                  <MaterialIcons name="done-all" size={10} color="rgba(255,253,248,0.75)" />
                )}
              </View>
            ) : null}
            <Text style={[styles.timeText, isMine ? styles.myTimeText : styles.theirTimeText]}>
              {formatMessageTime(item.createdAt)}
            </Text>
          </View>
        </View>
        </View>
        </Pressable>
      );
  };

  const renderEmpty = () => (
    <View style={styles.chatEmpty}>
      <View style={styles.emptyIconWrap}>
        <MaterialIcons name="forum" size={36} color="#6B7B3F" />
      </View>
      <Text style={styles.chatEmptyTitle}>ابدأ المحادثة</Text>
      <Text style={styles.chatEmptyText}>
        راسل {displayName} بشأن طلب الخدمة. رسائلك تصل إليه، وردوده تصل إليك فورًا.
      </Text>
      <View style={styles.emptyHint}>
        <MaterialIcons name="attach-file" size={14} color="#8A8173" />
        <Text style={styles.emptyHintText}>يمكنك إرفاق الصور والتقارير الطبية عبر زر الإرفاق</Text>
      </View>
    </View>
  );

  if (blocked) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.centerBlock}>
          <MaterialIcons name="lock" size={40} color="#B55448" />
          <Text style={styles.blockTitle}>الدردشة غير متاحة حاليًا</Text>
          <Text style={styles.blockText}>
            لا يمكن التواصل مع مقدم الخدمة إلا بعد قبوله لطلب الخدمة. راجع حالة الطلب في صفحة طلباتي.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>العودة إلى طلباتي</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  if (loading) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.loading}><ActivityIndicator color="#6B7B3F" size="large" /></View>
      </ScreenContainer>
    );
  }

  const canSend = text.trim().length > 0 || pendingAttachment !== null;

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.headerIcon, pressed && { opacity: 0.6 }]}
            onPress={() => router.back()}
            hitSlop={MESSAGE_WINDOW}
          >
            <MaterialIcons name="arrow-forward" size={24} color="#465132" />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>{displayName}</Text>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.headerSubtitle}>محادثة حول طلب الخدمة</Text>
            </View>
          </View>
          <View style={styles.headerIcon} />
        </View>

        <FlatList
          ref={listRef}
          data={displayed}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollToBottom(false)}
        />

        {viewerUri ? (
          <Modal
            visible
            transparent
            animationType="fade"
            onRequestClose={() => setViewerUri(null)}
          >
            <Pressable
              style={styles.viewerBackdrop}
              onPress={() => setViewerUri(null)}
            >
              <ScrollView contentContainerStyle={styles.viewerContent}>
                <Pressable
                  style={({ pressed }) => [styles.viewerClose, pressed && { opacity: 0.7 }]}
                  onPress={() => setViewerUri(null)}
                  hitSlop={MESSAGE_WINDOW}
                >
                  <MaterialIcons name="close" size={22} color="#FFFDF8" />
                </Pressable>
                <Image source={{ uri: viewerUri }} style={styles.viewerImage} resizeMode="contain" />
              </ScrollView>
            </Pressable>
          </Modal>
        ) : null}

        {pendingAttachment ? (
          <AttachmentPreview attachment={pendingAttachment} onRemove={() => setPendingAttachment(null)} />
        ) : null}

        {replyingTo ? (
          <View style={styles.replyPreview}>
            <View style={styles.replyPreviewBar} />
            <View style={styles.replyPreviewCopy}>
              <Text style={styles.replyPreviewLabel}>
                ردًا على {replyingTo.senderRole === "patient" ? "رسالتك" : displayName}
              </Text>
              <Text style={styles.replyPreviewText} numberOfLines={2}>
                {replyingTo.text || (replyingTo.attachment ? `مرفق: ${replyingTo.attachment.fileName}` : "")}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.replyCancel, pressed && { opacity: 0.6 }]}
              onPress={() => setReplyingTo(null)}
            >
              <MaterialIcons name="close" size={16} color="#8A8173" />
            </Pressable>
          </View>
        ) : null}

        {otherTyping ? (
          <View style={styles.typingBar}>
            <View style={styles.typingDots}>
              <View style={styles.typingDot} />
              <View style={[styles.typingDot, styles.typingDotMid]} />
              <View style={styles.typingDot} />
            </View>
            <Text style={styles.typingText}>{displayName} يكتب الآن...</Text>
          </View>
        ) : null}

        <View style={styles.inputBar}>
          <AttachmentPickerButton onPicked={handleAttachmentPicked} />
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={pendingAttachment ? "أضف وصفًا اختياريًا..." : "اكتب رسالتك..."}
            placeholderTextColor="#B9AFA0"
            returnKeyType="send"
            onSubmitEditing={submitMessage}
            multiline
            editable={!sending}
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              !canSend && styles.sendDisabled,
              pressed && canSend && { opacity: 0.75 },
              pressed && !canSend && { opacity: 0.7 },
            ]}
            onPress={submitMessage}
            hitSlop={MESSAGE_WINDOW}
          >
            {sending ? (
              <ActivityIndicator color="#FFFDF8" size="small" />
            ) : (
              <MaterialIcons
                name="send"
                size={20}
                color={canSend ? "#FFFDF8" : "#B9AFA0"}
              />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

async function findRequestForThread(requestId: string): Promise<ServiceRequest | null> {
  const profile = await getPatientProfile();
  if (!profile || !profile.fullName || !profile.phone) return null;
  const requests = await readPatientRequests(`${profile.fullName}-${profile.phone}`);
  return requests.find((request) => request.id === requestId) ?? null;
}

function formatMessageTime(timestamp: number) {
  const date = new Date(timestamp);
  const now = new Date();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const yesterday =
    !sameDay &&
    now.getTime() - date.getTime() < 24 * 60 * 60 * 1000 &&
    now.getDate() - date.getDate() <= 1;
  if (sameDay) return `${hours}:${minutes}`;
  if (yesterday) return `أمس ${hours}:${minutes}`;
  return `${date.getDate()}/${date.getMonth() + 1} ${hours}:${minutes}`;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    alignItems: "center",
    backgroundColor: "#F8F5ED",
    borderBottomColor: "#E8E0D1",
    borderBottomWidth: 1,
    flexDirection: "row-reverse",
    gap: 10,
    paddingBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerIcon: { width: 36, alignItems: "flex-end" },
  headerCopy: { flex: 1 },
  headerTitle: { color: "#465132", fontSize: 16, fontWeight: "800", textAlign: "right" },
  onlineRow: { alignItems: "center", flexDirection: "row-reverse", gap: 5, marginTop: 2 },
  onlineDot: {
    backgroundColor: "#6B7B3F",
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  headerSubtitle: { color: "#8A8173", fontSize: 11, textAlign: "right" },
  listContent: { padding: 16, gap: 8, flexGrow: 1 },
  bubbleRow: { flexDirection: "row", width: "100%" },
  myBubbleRow: { justifyContent: "flex-end" },
  theirBubbleRow: { justifyContent: "flex-start" },
  groupedRow: { marginTop: -4 },
  bubble: { borderRadius: 16, maxWidth: "80%", paddingHorizontal: 14, paddingVertical: 9 },
  myBubble: { backgroundColor: "#6B7B3F", borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: "#F0EBDD", borderBottomLeftRadius: 4 },
  myGroupedBubble: { borderTopRightRadius: 5 },
  theirGroupedBubble: { borderTopLeftRadius: 5 },
  bubbleText: { fontSize: 14, lineHeight: 21 },
  myBubbleText: { color: "#FFFDF8" },
  theirBubbleText: { color: "#465132" },
  metaRow: {
    alignItems: "center",
    flexDirection: "row-reverse",
    gap: 4,
    marginTop: 4,
  },
  statusMark: { height: 12, justifyContent: "center" },
  timeText: { fontSize: 9, marginTop: 0 },
  myTimeText: { color: "rgba(255,253,248,0.75)" },
  theirTimeText: { color: "#9A907E" },
  chatEmpty: {
    alignItems: "center",
    gap: 10,
    justifyContent: "center",
    marginTop: 60,
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    alignItems: "center",
    backgroundColor: "#F0EBDD",
    borderRadius: 28,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  chatEmptyTitle: { color: "#465132", fontSize: 16, fontWeight: "800" },
  chatEmptyText: { color: "#786F61", fontSize: 12, lineHeight: 19, textAlign: "center" },
  emptyHint: {
    alignItems: "center",
    backgroundColor: "#FFFDF8",
    borderColor: "#E8E0D1",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row-reverse",
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  emptyHintText: { color: "#8A8173", fontSize: 11 },
  inputBar: {
    alignItems: "center",
    backgroundColor: "#FFFDF8",
    borderTopColor: "#E8E0D1",
    borderTopWidth: 1,
    flexDirection: "row-reverse",
    gap: 10,
    padding: 12,
  },
  input: {
    backgroundColor: "#F8F5ED",
    borderColor: "#E8E0D1",
    borderRadius: 20,
    borderWidth: 1,
    color: "#465132",
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    maxHeight: 110,
    minHeight: 42,
    paddingHorizontal: 16,
    paddingVertical: 10,
    textAlign: "right",
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: "#6B7B3F",
    borderRadius: 21,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  sendDisabled: { backgroundColor: "#E8E0D1" },
  centerBlock: { alignItems: "center", flex: 1, gap: 14, justifyContent: "center", padding: 32 },
  blockTitle: { color: "#465132", fontSize: 18, fontWeight: "800", textAlign: "center" },
  blockText: { color: "#786F61", fontSize: 13, lineHeight: 20, textAlign: "center" },
  backButton: {
    backgroundColor: "#6B7B3F",
    borderRadius: 18,
    paddingHorizontal: 26,
    paddingVertical: 12,
    marginTop: 8,
  },
  backButtonText: { color: "#FFFDF8", fontSize: 14, fontWeight: "800" },
  viewerBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(20,20,20,0.92)",
    flex: 1,
    justifyContent: "center",
  },
  viewerContent: { alignItems: "center", padding: 20 },
  viewerClose: {
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  viewerImage: {
    borderRadius: 14,
    height: 520,
    width: 330,
  },
  typingBar: {
    alignItems: "center",
    backgroundColor: "#F8F5ED",
    borderBottomColor: "#E8E0D1",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row-reverse",
    gap: 8,
    paddingBottom: 6,
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  typingDots: {
    alignItems: "center",
    flexDirection: "row-reverse",
    gap: 4,
    justifyContent: "center",
  },
  typingDot: {
    backgroundColor: "#9A907E",
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  typingDotMid: { opacity: 0.6 },
  typingText: { color: "#8A8173", fontSize: 11 },
  quoteCard: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.12)",
    borderRadius: 10,
    flexDirection: "row-reverse",
    gap: 8,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  quoteBar: {
    backgroundColor: "rgba(255,253,248,0.6)",
    borderRadius: 2,
    height: 26,
    width: 3,
  },
  quoteText: {
    color: "rgba(255,253,248,0.85)",
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    textAlign: "right",
  },
  replyPreview: {
    alignItems: "center",
    backgroundColor: "#F0EBDD",
    borderTopColor: "#E8E0D1",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row-reverse",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  replyPreviewBar: {
    backgroundColor: "#6B7B3F",
    borderRadius: 2,
    height: 34,
    width: 3,
  },
  replyPreviewCopy: { flex: 1 },
  replyPreviewLabel: { color: "#6B7B3F", fontSize: 10, fontWeight: "800", textAlign: "right" },
  replyPreviewText: { color: "#786F61", fontSize: 11, lineHeight: 15, textAlign: "right" },
  replyCancel: { padding: 4 },
});

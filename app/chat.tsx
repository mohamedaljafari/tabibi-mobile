/**
 * شاشة الدردشة النصية في تطبيق المريض.
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
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { findThread, readMessages, sendAttachmentMessage, sendMessage, type ChatAttachment, type ChatMessage } from "@/lib/chat";
import { getPatientProfile } from "@/lib/patient-profile";
import { readPatientRequests, type ServiceRequest } from "@/lib/service-requests";

const MESSAGE_WINDOW = { top: 0, bottom: 6, left: 6, right: 6 };

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
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<ChatAttachment | null>(null);

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
      const allowed = request?.status === "accepted" || request?.status === "completed";
      if (!allowed) {
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
      setDisplayName(thread.providerName || displayName);
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
    if (!threadId) return;
    readMessages(threadId).then(setMessages);
  }, [threadId]);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshMessages();
    }, 3000);
    return () => clearInterval(interval);
  }, [refreshMessages]);

  const submitMessage = async () => {
    if (!threadId) return;
    if (pendingAttachment) {
      const sent = await sendAttachmentMessage(threadId, "patient", pendingAttachment, text);
      setPendingAttachment(null);
      setText("");
      if (sent && Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      refreshMessages();
      return;
    }
    if (!text.trim()) return;
    const sent = await sendMessage(threadId, "patient", text);
    setText("");
    if (sent && Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    refreshMessages();
  };

  const handleAttachmentPicked = (attachment: ChatAttachment) => {
    setPendingAttachment(attachment);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMine = item.senderRole === "patient";
    const hasContent = item.attachment || item.text.length > 0;
    if (!hasContent) return null;
    return (
      <View style={[styles.bubbleRow, isMine ? styles.myBubbleRow : styles.theirBubbleRow]}>
        <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}>
          {item.attachment ? <MessageAttachmentCard attachment={item.attachment} /> : null}
          {item.text ? (
            <Text style={[styles.bubbleText, isMine ? styles.myBubbleText : styles.theirBubbleText]}>
              {item.text}
            </Text>
          ) : null}
          <Text style={[styles.timeText, isMine ? styles.myTimeText : styles.theirTimeText]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.chatEmpty}>
      <MaterialIcons name="chat-bubble-outline" size={34} color="#B9AFA0" />
      <Text style={styles.chatEmptyText}>
        ابدأ المحادثة مع {displayName} حول طلب الخدمة. الردود التي ترسلها تصل إليه، وردوده تصل إليك.
      </Text>
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
            <Text style={styles.headerSubtitle}>محادثة حول طلب الخدمة</Text>
          </View>
          <View style={styles.headerIcon} />
        </View>

        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          inverted={false}
        />

        {pendingAttachment ? (
          <AttachmentPreview attachment={pendingAttachment} onRemove={() => setPendingAttachment(null)} />
        ) : null}

        <View style={styles.inputBar}>
          <AttachmentPickerButton onPicked={handleAttachmentPicked} />
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={pendingAttachment ? "أضف وصفًا اختياريًا (اختياري)..." : "اكتب رسالتك..."}
            placeholderTextColor="#B9AFA0"
            returnKeyType="send"
            onSubmitEditing={submitMessage}
            multiline
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              (!text.trim() && !pendingAttachment) && styles.sendDisabled,
              pressed && { opacity: 0.75 },
            ]}
            onPress={submitMessage}
            hitSlop={MESSAGE_WINDOW}
          >
            <MaterialIcons name="send" size={20} color={text.trim() || pendingAttachment ? "#FFFDF8" : "#B9AFA0"} />
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

function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
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
  headerSubtitle: { color: "#8A8173", fontSize: 11, marginTop: 2, textAlign: "right" },
  listContent: { padding: 16, gap: 10, flexGrow: 1 },
  bubbleRow: { flexDirection: "row", width: "100%" },
  myBubbleRow: { justifyContent: "flex-end" },
  theirBubbleRow: { justifyContent: "flex-start" },
  bubble: { borderRadius: 18, maxWidth: "78%", paddingHorizontal: 14, paddingVertical: 10 },
  myBubble: { backgroundColor: "#6B7B3F", borderBottomRightRadius: 5 },
  theirBubble: { backgroundColor: "#F0EBDD", borderBottomLeftRadius: 5 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  myBubbleText: { color: "#FFFDF8" },
  theirBubbleText: { color: "#465132" },
  timeText: { fontSize: 9, marginTop: 4 },
  myTimeText: { color: "rgba(255,253,248,0.7)", textAlign: "right" },
  theirTimeText: { color: "#9A907E", textAlign: "left" },
  chatEmpty: { alignItems: "center", gap: 10, marginTop: 110, paddingHorizontal: 28 },
  chatEmptyText: { color: "#786F61", fontSize: 12, lineHeight: 18, textAlign: "center" },
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
});

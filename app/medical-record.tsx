import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

import { ScreenContainer } from "@/components/screen-container";
import {
  addPatientMedicalUpload,
  getPatientProfile,
  readMedicalAccessGrants,
  readMedicalFile,
  removePatientMedicalUpload,
  revokeMedicalAccess,
  type MedicalAccessGrant,
  type PatientMedicalUpload,
  type PatientProfile,
} from "@/lib/patient-profile";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميغابايت`;
}

type EntryOwner = NonNullable<PatientProfile>["medicalRecords"][number];

const ENTRY_TYPE_META = {
  diagnosis: { icon: "description", color: "#6B7B3F", label: "تشخيص" },
  prescription: { icon: "medication", color: "#C9A961", label: "وصفة طبية" },
  service: { icon: "local-hospital", color: "#465132", label: "خدمة أُنجزت" },
} as const;

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ar-SA-u-ca-islamic-umalqura", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return iso;
  }
}

export default function MedicalRecordScreen() {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [grants, setGrants] = useState<MedicalAccessGrant[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [loadedProfile, loadedGrants] = await Promise.all([
        getPatientProfile(),
        readMedicalAccessGrants(),
      ]);
      setProfile(loadedProfile);
      setGrants(loadedGrants);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const owners: EntryOwner[] = useMemo(() => profile?.medicalRecords ?? [], [profile]);
  const hasAccess = grants.length > 0;
  const accessByProvider = useMemo(() => new Map(grants.map((grant) => [grant.providerId, grant])), [grants]);

  // نافذة رفع ملف جديد
  const [uploadTarget, setUploadTarget] = useState<EntryOwner | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploading, setUploading] = useState(false);

  const pickAndUpload = useCallback(async (source: "image" | "document") => {
    if (!uploadTarget) return;
    let uri: string | undefined;
    if (source === "image") {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.75,
        base64: true,
      });
      if (result.canceled || !result.assets[0]) return;
      uri = result.assets[0].uri;
    } else {
      const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/*"], copyToCacheDirectory: true });
      if (result.canceled || !result.assets[0]) return;
      uri = result.assets[0].uri;
    }
    if (!uri) return;
    const file = await readMedicalFile(uri);
    if (!file) {
      Alert.alert("تعذر قراءة الملف", "تأكد من أن الملف موجود على الجهاز ثم أعد المحاولة.");
      return;
    }
    if (file.sizeBytes > 8 * 1024 * 1024) {
      Alert.alert("الملف كبير جدًا", "الحد الأقصى لحجم الملف هو 8 ميغابايت.");
      return;
    }
    setUploading(true);
    try {
      await addPatientMedicalUpload({
        recordId: uploadTarget.id,
        recordOwnerName: uploadTarget.ownerName,
        ...file,
        title: uploadTitle.trim() || file.fileName,
        description: uploadDescription.trim() || undefined,
      });
      setUploadTitle("");
      setUploadDescription("");
      setUploadTarget(null);
      await load();
    } finally {
      setUploading(false);
    }
  }, [uploadTarget, uploadTitle, uploadDescription, load]);

  const onDeleteUpload = useCallback((owner: EntryOwner, upload: PatientMedicalUpload) => {
    Alert.alert("حذف الملف", `هل تريد حذف «${upload.title}» من الملف الطبي؟`, [
      { text: "إلغاء", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: async () => { await removePatientMedicalUpload(owner.id, upload.id); await load(); } },
    ]);
  }, [load]);

  if (loading) {
    return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.loading}><ActivityIndicator color="#6B7B3F" size="large" /></View></ScreenContainer>;
  }

  if (!profile) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.center}>
          <Text style={styles.emptyBig}>الملف الطبي غير متوفر</Text>
          <Text style={styles.emptySub}>أكمل بياناتك من شاشة حسابي أولًا.</Text>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}><Text style={styles.backText}>العودة</Text></Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Modal visible={uploadTarget !== null} animationType="slide" transparent onRequestClose={() => { if (!uploading) setUploadTarget(null); }}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>إضافة ملف إلى ملف {uploadTarget?.ownerName ?? ""}</Text>
            <TextInput style={styles.modalInput} placeholder="عنوان الملف (مثل: تحاليل 2026)" placeholderTextColor="#B3A994" value={uploadTitle} onChangeText={setUploadTitle} maxLength={60} returnKeyType="done" autoCorrect={false} />
            <TextInput style={[styles.modalInput, styles.modalInputTall]} placeholder="ملاحظة اختيارية" placeholderTextColor="#B3A994" value={uploadDescription} onChangeText={setUploadDescription} maxLength={140} multiline returnKeyType="done" autoCorrect={false} />
            {uploading ? (
              <View style={styles.uploadRow}><ActivityIndicator color="#6B7B3F" /><Text style={styles.uploadRowText}>جارٍ الحفظ...</Text></View>
            ) : (
              <View style={styles.modalActions}>
                <Pressable accessibilityRole="button" accessibilityLabel="اختر صورة" onPress={() => { void pickAndUpload("image"); }} style={({ pressed }) => [styles.modalAction, styles.modalActionImage, pressed && { opacity: 0.7 }]}>
                  <MaterialIcons name="image" size={20} color="#FFFFFF" />
                  <Text style={styles.modalActionText}>صورة</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="اختر مستند" onPress={() => { void pickAndUpload("document"); }} style={({ pressed }) => [styles.modalAction, styles.modalActionDocument, pressed && { opacity: 0.7 }]}>
                  <MaterialIcons name="upload-file" size={20} color="#FFFFFF" />
                  <Text style={styles.modalActionText}>مستند / PDF</Text>
                </Pressable>
              </View>
            )}
            <Pressable accessibilityRole="button" accessibilityLabel="إغلاق" onPress={() => { if (!uploading) setUploadTarget(null); }} style={({ pressed }) => [styles.modalClose, pressed && styles.pressed]}>
              <Text style={styles.modalCloseText}>إلغاء</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
        <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="العودة" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><MaterialIcons name="arrow-forward" size={23} color="#6B7B3F" /></Pressable><Text style={styles.title}>الملف الطبي</Text></View>
        <Text style={styles.helper}>سجّل طبي يحفظ التشخيصات والوصفات والخدمات لكل فرد من العائلة. لا يطّلع عليه أحد إلا بإذنك.</Text>

        <View style={styles.accessCard}>
          <View style={styles.accessIcon}><MaterialIcons name={hasAccess ? "verified-user" : "lock"} size={22} color={hasAccess ? "#6B7B3F" : "#8A8173"} /></View>
          <View style={styles.accessText}>
            <Text style={styles.accessTitle}>{hasAccess ? `${grants.length} مقدم خدمة مصرح لهم بالاطلاع` : "لا صلاحيات إطّلاع نشطة"}</Text>
            <Text style={styles.accessValue}>{hasAccess ? "يمكنك إدارة الصلاحيات من تبويب «طلباتي»." : "عند قبول أي طلب خدمة يمكنك منحه صلاحية الاطلاع."}</Text>
          </View>
        </View>

        {owners.map((owner) => {
          const entries = owner.entries ?? [];
          const ownerGrants = grants.filter((grant) =>
            grant.recordOwnerNames.some((name) => name.toLocaleLowerCase("ar") === owner.ownerName.toLocaleLowerCase("ar")),
          );
          return (
            <View key={owner.id}>
              <View style={styles.ownerHeader}>
                <MaterialIcons name={owner.ownerType === "patient" ? "person" : "people"} size={20} color="#C9A961" />
                <Text style={styles.ownerName}>{owner.ownerName}</Text>
              </View>
              {ownerGrants.length > 0 ? (
                <View style={styles.grantChips}>
                  {ownerGrants.map((grant) => (
                    <View key={grant.id} style={styles.grantChip}>
                      <MaterialIcons name="visibility" size={14} color="#6B7B3F" />
                      <Text style={styles.grantChipText}>{grant.providerName}</Text>
                      <Pressable accessibilityRole="button" accessibilityLabel={`إلغاء إذن الاطلاع لـ ${grant.providerName}`} onPress={() => { void revokeMedicalAccess(grant.id).then(() => load()); }} style={({ pressed }) => [styles.grantRevoke, pressed && { opacity: 0.7 }]}>
                        <MaterialIcons name="cancel" size={14} color="#B55448" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
              <View style={styles.uploadSection}>
                <Pressable accessibilityRole="button" accessibilityLabel={`إضافة ملف طبي لـ ${owner.ownerName}`} onPress={() => setUploadTarget(owner)} style={({ pressed }) => [styles.uploadButton, pressed && styles.pressed]}>
                  <MaterialIcons name="add-circle-outline" size={18} color="#6B7B3F" />
                  <Text style={styles.uploadButtonText}>إضافة ملف طبي (صورة / تقرير)</Text>
                </Pressable>
                <View style={styles.uploadList}>
                  {(owner.patientUploads ?? []).map((upload) => (
                    <View key={upload.id} style={styles.uploadCard}>
                      <View style={[styles.entryIcon, { backgroundColor: "#F0EBDD" }]}>
                        <MaterialIcons name={upload.fileName.toLowerCase().endsWith(".pdf") ? "picture-as-pdf" : "image"} size={21} color="#465132" />
                      </View>
                      <View style={styles.entryText}>
                        <Text style={styles.entryTitle}>{upload.title}</Text>
                        {upload.description ? <Text style={styles.entryDetails}>{upload.description}</Text> : null}
                        <Text style={styles.entryDate}>{upload.fileName} — {formatBytes(upload.sizeBytes)} — {formatDate(upload.createdAt)}</Text>
                      </View>
                      <Pressable accessibilityRole="button" accessibilityLabel={`حذف ${upload.title}`} onPress={() => { onDeleteUpload(owner, upload); }} style={({ pressed }) => [styles.grantRevoke, pressed && { opacity: 0.7 }]}>
                        <MaterialIcons name="delete-outline" size={18} color="#B55448" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
              {entries.length > 0 ? entries.map((entry) => {
                const meta = ENTRY_TYPE_META[entry.type] ?? ENTRY_TYPE_META.diagnosis as (typeof ENTRY_TYPE_META)[EntryOwner["entries"][number]["type"]];
                return (
                  <View key={entry.id} style={styles.entryCard}>
                    <View style={[styles.entryIcon, { backgroundColor: "#F0EBDD" }]}><MaterialIcons name={meta.icon} size={21} color={meta.color} /></View>
                    <View style={styles.entryText}>
                      <View style={styles.entryRow}>
                        <Text style={styles.entryBadge}>{meta.label}</Text>
                        <Text style={styles.entryDate}>{formatDate(entry.createdAt)}</Text>
                      </View>
                      <Text style={styles.entryTitle}>{entry.title}</Text>
                      {entry.details ? <Text style={styles.entryDetails}>{entry.details}</Text> : null}
                      {entry.providerName ? <Text style={styles.entryProvider}>بواسطة: {entry.providerName}</Text> : null}
                    </View>
                  </View>
                );
              }) : (
                <View style={styles.emptyEntry}><Text style={styles.emptyEntryText}>لا توجد إدخالات في هذا الملف بعد.</Text></View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, paddingBottom: 20 },
  uploadSection: { marginTop: 14 },
  uploadButton: { alignItems: "center", backgroundColor: "#FFFDF8", borderColor: "#6B7B3F", borderRadius: 13, borderWidth: 1, borderStyle: "dashed", flexDirection: "row-reverse", gap: 8, justifyContent: "center", paddingVertical: 10 },
  uploadButtonText: { color: "#6B7B3F", fontSize: 13, fontWeight: "800" },
  uploadList: { gap: 7, marginTop: 7 },
  uploadCard: { alignItems: "center", backgroundColor: "#FFFDF8", borderColor: "#E4DCCB", borderRadius: 15, borderWidth: 1, flexDirection: "row-reverse", gap: 9, padding: 10 },
  modalBackdrop: { alignItems: "center", backgroundColor: "rgba(30, 26, 18, 0.55)", flex: 1, justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: "#FFFDF8", borderRadius: 20, gap: 12, padding: 18, width: "100%" },
  modalTitle: { color: "#465132", fontSize: 17, fontWeight: "800", textAlign: "right" },
  modalInput: { backgroundColor: "#F5F0E6", borderRadius: 12, color: "#465132", fontSize: 14, paddingHorizontal: 14, paddingVertical: 12, textAlign: "right" },
  modalInputTall: { minHeight: 70, textAlignVertical: "top" },
  modalActions: { flexDirection: "row-reverse", gap: 10, justifyContent: "space-between" },
  modalAction: { alignItems: "center", borderRadius: 13, flexDirection: "row-reverse", flex: 1, gap: 6, justifyContent: "center", paddingVertical: 12 },
  modalActionImage: { backgroundColor: "#6B7B3F" },
  modalActionDocument: { backgroundColor: "#465132" },
  modalActionText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  modalClose: { alignItems: "center", paddingVertical: 6 },
  modalCloseText: { color: "#8A8173", fontSize: 14, fontWeight: "700" },
  uploadRow: { alignItems: "center", flexDirection: "row-reverse", gap: 8, paddingVertical: 4 },
  uploadRowText: { color: "#465132", fontSize: 14, fontWeight: "700" },
  loading: { alignItems: "center", flex: 1, justifyContent: "center" },
  center: { alignItems: "center", flex: 1, gap: 10, justifyContent: "center" },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  back: { alignItems: "center", backgroundColor: "#F0EBDD", borderRadius: 18, height: 42, justifyContent: "center", width: 42 },
  title: { color: "#465132", fontSize: 22, fontWeight: "800" },
  helper: { color: "#8A8173", fontSize: 12, lineHeight: 18, marginHorizontal: 10, marginTop: 6, textAlign: "center" },
  emptyBig: { color: "#465132", fontSize: 17, fontWeight: "800" },
  emptySub: { color: "#8A8173", fontSize: 13, textAlign: "center" },
  backButton: { alignItems: "center", backgroundColor: "#6B7B3F", borderRadius: 12, paddingHorizontal: 22, paddingVertical: 10, marginTop: 8 },
  backText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  accessCard: { alignItems: "center", backgroundColor: "#FFFDF8", borderColor: "#E4DCCB", borderRadius: 15, borderWidth: 1, flexDirection: "row-reverse", gap: 10, marginTop: 12, padding: 10 },
  accessIcon: { alignItems: "center", backgroundColor: "#F0EBDD", borderRadius: 16, height: 38, justifyContent: "center", width: 38 },
  accessText: { flex: 1 },
  accessTitle: { color: "#465132", fontSize: 14, fontWeight: "800", textAlign: "right" },
  accessValue: { color: "#8A8173", fontSize: 12, lineHeight: 18, marginTop: 2, textAlign: "right" },
  ownerHeader: { alignItems: "center", flexDirection: "row-reverse", gap: 7, marginTop: 14 },
  ownerName: { color: "#465132", fontSize: 17, fontWeight: "800", textAlign: "right" },
  grantChips: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 6, marginTop: 7 },
  grantChip: { alignItems: "center", backgroundColor: "#F5F0E6", borderRadius: 12, flexDirection: "row-reverse", gap: 5, paddingHorizontal: 10, paddingVertical: 5 },
  grantChipText: { color: "#6B7B3F", fontSize: 12, fontWeight: "700" },
  grantRevoke: { alignItems: "center", justifyContent: "center", padding: 3 },
  entryCard: { alignItems: "center", backgroundColor: "#FFFDF8", borderColor: "#E4DCCB", borderRadius: 15, borderWidth: 1, flexDirection: "row-reverse", gap: 9, marginTop: 7, padding: 10 },
  entryIcon: { alignItems: "center", borderRadius: 14, height: 40, justifyContent: "center", width: 40 },
  entryText: { flex: 1 },
  entryRow: { alignItems: "center", flexDirection: "row-reverse", justifyContent: "space-between" },
  entryBadge: { backgroundColor: "#F0EBDD", borderRadius: 10, color: "#465132", fontSize: 11, fontWeight: "800", paddingHorizontal: 8, paddingVertical: 2 },
  entryDate: { color: "#8A8173", fontSize: 11 },
  entryTitle: { color: "#465132", fontSize: 15, fontWeight: "800", marginTop: 4, textAlign: "right" },
  entryDetails: { color: "#5C5346", fontSize: 13, lineHeight: 20, marginTop: 3, textAlign: "right" },
  entryProvider: { color: "#8A8173", fontSize: 12, marginTop: 4, textAlign: "right" },
  emptyEntry: { alignItems: "center", backgroundColor: "#F5F0E6", borderColor: "#E4DCCB", borderRadius: 12, borderStyle: "dashed", borderWidth: 1, marginTop: 7, padding: 10 },
  emptyEntryText: { color: "#8A8173", fontSize: 12 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.98 }] },
});

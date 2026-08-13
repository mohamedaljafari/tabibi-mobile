import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";
import { getPatientProfile, readMedicalAccessGrants, revokeMedicalAccess, type MedicalAccessGrant, type PatientProfile } from "@/lib/patient-profile";

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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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

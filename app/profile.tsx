import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { FormField } from "@/components/form-field";
import { ScreenContainer } from "@/components/screen-container";
import { createFamilyMemberDraft, removeFamilyMemberDraft, type FamilyMemberDraft } from "@/lib/account-setup";
import { getAuthState } from "@/lib/_core/tabibi-api";
import { getLibyaCities } from "@/lib/libya-cities";
import {
  addPatientAddress,
  createMedicalRecords,
  readPatientAddresses,
  readPatientMedicalRecords,
  readPatientSetup,
  savePatientSetup,
  type AddressPayload,
  type MedicalRecordPayload,
  type SetupPayload,
} from "@/lib/_core/tabibi-api";
import type { TabibiUser } from "@/lib/_core/tabibi-api";

export default function ProfileScreen() {
  const [user, setUser] = useState<TabibiUser | null>(null);
  const [addresses, setAddresses] = useState<AddressPayload[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecordPayload[]>([]);
  const [setup, setSetup] = useState<SetupPayload>({ isSetupComplete: false, familyMemberNames: [] });
  const [cityNames, setCityNames] = useState<Record<string, string>>({});
  const [familyName, setFamilyName] = useState("");
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberDraft[]>([]);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);

  const loadProfile = useCallback(async () => {
    const auth = await getAuthState();
    if (!auth) {
      router.replace("/login");
      return;
    }
    setUser(auth.user);
    const [setupRecord, addressRecords, recordData, cities] = await Promise.all([
      readPatientSetup(auth.user),
      readPatientAddresses(auth.user),
      readPatientMedicalRecords(auth.user),
      getLibyaCities(),
    ]);
    setSetup(setupRecord);
    setAddresses(addressRecords);
    setMedicalRecords(recordData);
    setFamilyMembers(setupRecord.familyMemberNames.map((fullName) => createFamilyMemberDraft(fullName)).filter(Boolean as unknown as (m: FamilyMemberDraft | null) => m is FamilyMemberDraft));
    setCityNames(Object.fromEntries(cities.map((city) => [city.id, city.name])));
  }, []);
  useFocusEffect(useCallback(() => { loadProfile(); }, [loadProfile]));

  const addFamilyMember = () => {
    const member = createFamilyMemberDraft(familyName);
    if (!member) {
      Alert.alert("تحقق من الاسم", "اكتب الاسم الكامل لفرد العائلة قبل إضافته.");
      return;
    }
    if (familyMembers.some((item) => item.fullName === member.fullName)) {
      Alert.alert("الاسم مضاف", "هذا الشخص موجود بالفعل ضمن القائمة.");
      return;
    }
    setFamilyMembers((members) => [...members, member]);
    setFamilyName("");
  };

  const completeSetup = async () => {
    if (!user) return;
    if (addresses.length === 0) {
      Alert.alert("أضف عنوانًا", "أضف عنوانًا واحدًا على الأقل قبل إنشاء الملفات الطبية.");
      return;
    }
    setIsCompleting(true);
    try {
      await Promise.all([
        savePatientSetup(user, {
          isSetupComplete: true,
          familyMemberNames: familyMembers.map((member) => member.fullName),
        }),
        createMedicalRecords(
          user,
          [
            { ownerName: user.display_name ?? "المريض", ownerType: "patient" },
            ...familyMembers.map((member) => ({ ownerName: member.fullName, ownerType: "family" as const })),
          ],
        ),
      ]);
      router.replace("/home");
    } finally {
      setIsCompleting(false);
    }
  };

  const addAddress = async () => {
    if (!user || isAddingAddress) return;
    setIsAddingAddress(true);
    try {
      const next = await addPatientAddress(user, {
        label: `عنوان ${addresses.length + 1}`,
        addressLabel: "الموقع المحفوظ من الخريطة",
        latitude: 32.8997,
        longitude: 13.1755,
        source: "map",
      });
      setAddresses(next);
    } finally {
      setIsAddingAddress(false);
    }
  };

  if (!user) {
    return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.loading}><ActivityIndicator color="#6B7B3F" size="large" /></View></ScreenContainer>;
  }

  const setupComplete = setup.isSetupComplete;

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="العودة" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><MaterialIcons name="arrow-forward" size={23} color="#6B7B3F" /></Pressable><Text style={styles.title}>حسابي</Text></View>
        <Text style={styles.helper}>{setupComplete ? "بيانات حسابك وملفاتك الطبية المسجلة." : "أكمل عنوانك وأضف أفراد العائلة قبل إنشاء الملفات الطبية."}</Text>

        <View style={styles.identityCard}>
          <View style={styles.avatar}><MaterialIcons name="person" size={32} color="#6B7B3F" /></View>
          <View style={styles.identityText}><Text style={styles.fullName}>{user.display_name}</Text><Text style={styles.phone}>{user.phone}</Text></View>
        </View>

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>العناوين</Text><Text style={styles.sectionHint}>حدّدها من الخريطة أو موقعك الحالي</Text></View>
        {addresses.length > 0 ? addresses.map((address) => (
          <View key={address.id} style={styles.addressCard}>
            <View style={styles.addressIcon}><MaterialIcons name="location-on" size={21} color="#C9A961" /></View>
            <View style={styles.addressText}><Text style={styles.addressLabel}>{address.label}</Text><Text style={styles.addressValue}>{address.addressLabel}</Text></View>
          </View>
        )) : <View style={styles.emptyCard}><MaterialIcons name="location-off" size={22} color="#8A8173" /><Text style={styles.emptyText}>لم تتم إضافة أي عناوين بعد.</Text></View>}
        <Pressable accessibilityRole="button" onPress={addAddress} style={({ pressed }) => [styles.addAddress, pressed && styles.pressed]}><MaterialIcons name="add" size={22} color="#6B7B3F" /><Text style={styles.addAddressText}>{isAddingAddress ? "جارٍ الإضافة..." : addresses.length === 0 ? "إضافة عنوان" : "إضافة عنوان آخر"}</Text></Pressable>

        {setupComplete ? (
          <View style={styles.recordsSection}>
            <Text style={styles.sectionTitle}>الملفات الطبية</Text>
            {medicalRecords.map((record) => <Pressable key={record.id} accessibilityRole="button" accessibilityLabel={`فتح الملف الطبي لـ ${record.ownerName}`} onPress={() => router.push("/medical-record")} style={({ pressed }) => [styles.recordCard, pressed && styles.pressed]}><MaterialIcons name="folder-shared" size={23} color="#6B7B3F" /><View style={styles.addressText}><Text style={styles.addressLabel}>{record.ownerName}</Text><Text style={styles.addressValue}>{record.ownerType === "patient" ? "ملفك الطبي" : "ملف طبي لعائلة المريض"}</Text></View><MaterialIcons name="chevron-left" size={18} color="#C9A961" /></Pressable>)}
          </View>
        ) : (
          <View style={styles.familySection}>
            <Text style={styles.sectionTitle}>إضافة أفراد العائلة</Text>
            <Text style={styles.familyCopy}>أضف أسماء الأشخاص الذين تريد إنشاء ملفات طبية لهم مع ملفك الطبي.</Text>
            <View style={styles.familyInputRow}><View style={styles.familyInput}><FormField label="اسم فرد العائلة" value={familyName} onChangeText={setFamilyName} placeholder="اكتب الاسم الكامل" returnKeyType="done" onSubmitEditing={addFamilyMember} /></View><Pressable accessibilityRole="button" accessibilityLabel="إضافة فرد من العائلة" onPress={addFamilyMember} style={({ pressed }) => [styles.addFamilyButton, pressed && styles.pressed]}><MaterialIcons name="add" size={24} color="#FFFFFF" /></Pressable></View>
            {familyMembers.map((member) => <View key={member.id} style={styles.familyMember}><Pressable accessibilityRole="button" accessibilityLabel={`إزالة ${member.fullName}`} onPress={() => setFamilyMembers((members) => removeFamilyMemberDraft(members, member.id))} style={({ pressed }) => [styles.removeMember, pressed && styles.pressed]}><MaterialIcons name="close" size={18} color="#B55448" /></Pressable><Text style={styles.memberName}>{member.fullName}</Text><MaterialIcons name="person-outline" size={20} color="#6B7B3F" /></View>)}
          </View>
        )}

        {!setupComplete ? <Pressable accessibilityRole="button" disabled={isCompleting} onPress={completeSetup} style={({ pressed }) => [styles.saveButton, (pressed || isCompleting) && styles.pressed]}><Text style={styles.saveText}>{isCompleting ? "جارٍ إنشاء الملفات الطبية..." : "موافق وإنهاء استكمال البيانات"}</Text></Pressable> : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 18 },
  loading: { alignItems: "center", flex: 1, justifyContent: "center" },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  back: { alignItems: "center", backgroundColor: "#F0EBDD", borderRadius: 18, height: 42, justifyContent: "center", width: 42 },
  title: { color: "#465132", flex: 1, fontSize: 22, fontWeight: "800", textAlign: "center" },
  helper: { color: "#8A8173", fontSize: 12, lineHeight: 18, marginHorizontal: 12, marginTop: 6, textAlign: "center" },
  identityCard: { alignItems: "center", backgroundColor: "#FFFDF8", borderColor: "#E4DCCB", borderRadius: 18, borderWidth: 1, flexDirection: "row-reverse", gap: 10, marginTop: 10, padding: 10 },
  avatar: { alignItems: "center", backgroundColor: "#F0EBDD", borderRadius: 21, height: 42, justifyContent: "center", width: 42 },
  identityText: { flex: 1 },
  fullName: { color: "#465132", fontSize: 17, fontWeight: "800", textAlign: "right" },
  phone: { color: "#8A8173", fontSize: 14, marginTop: 3, textAlign: "right" },
  sectionHeader: { alignItems: "center", flexDirection: "row-reverse", justifyContent: "space-between", marginTop: 12 },
  sectionTitle: { color: "#465132", fontSize: 18, fontWeight: "800", textAlign: "right" },
  sectionHint: { color: "#8A8173", fontSize: 11, textAlign: "left" },
  addressCard: { alignItems: "center", backgroundColor: "#FFFDF8", borderColor: "#E4DCCB", borderRadius: 15, borderWidth: 1, flexDirection: "row-reverse", gap: 8, marginTop: 7, padding: 9 },
  addressIcon: { alignItems: "center", backgroundColor: "#F8F0DF", borderRadius: 14, height: 42, justifyContent: "center", width: 42 },
  addressText: { flex: 1 },
  addressLabel: { color: "#465132", fontSize: 14, fontWeight: "800", textAlign: "right" },
  addressValue: { color: "#8A8173", fontSize: 12, lineHeight: 18, marginTop: 2, textAlign: "right" },
  emptyCard: { alignItems: "center", backgroundColor: "#FFFDF8", borderColor: "#E4DCCB", borderRadius: 15, borderStyle: "dashed", borderWidth: 1, flexDirection: "row-reverse", gap: 8, justifyContent: "center", marginTop: 7, padding: 9 },
  emptyText: { color: "#8A8173", fontSize: 13 },
  addAddress: { alignItems: "center", backgroundColor: "#F0EBDD", borderColor: "#D9D1C0", borderRadius: 14, borderStyle: "dashed", borderWidth: 1, flexDirection: "row-reverse", gap: 7, justifyContent: "center", marginTop: 7, minHeight: 42 },
  addAddressText: { color: "#465132", fontSize: 14, fontWeight: "800" },
  familySection: { backgroundColor: "#FFFDF8", borderColor: "#E4DCCB", borderRadius: 18, borderWidth: 1, marginTop: 12, padding: 11 },
  familyCopy: { color: "#8A8173", fontSize: 13, lineHeight: 20, marginTop: 6, textAlign: "right" },
  familyInputRow: { alignItems: "flex-end", flexDirection: "row-reverse", gap: 8, marginTop: 7 },
  familyInput: { flex: 1 },
  addFamilyButton: { alignItems: "center", backgroundColor: "#6B7B3F", borderRadius: 15, height: 56, justifyContent: "center", width: 56 },
  familyMember: { alignItems: "center", backgroundColor: "#F5F0E6", borderRadius: 12, flexDirection: "row-reverse", gap: 8, marginTop: 7, padding: 8 },
  memberName: { color: "#465132", flex: 1, fontSize: 14, fontWeight: "700", textAlign: "right" },
  removeMember: { alignItems: "center", height: 28, justifyContent: "center", width: 28 },
  recordsSection: { marginTop: 12 },
  recordCard: { alignItems: "center", backgroundColor: "#FFFDF8", borderColor: "#E4DCCB", borderRadius: 15, borderWidth: 1, flexDirection: "row-reverse", gap: 8, marginTop: 7, padding: 9 },
  saveButton: { alignItems: "center", backgroundColor: "#6B7B3F", borderRadius: 14, justifyContent: "center", marginTop: 10, minHeight: 46 },
  saveText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  pressed: { opacity: 0.84, transform: [{ scale: 0.98 }] },
});

import { useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

import { ScreenContainer } from "@/components/screen-container";
import { getPatientProfile, type PatientAddress, type PatientProfile } from "@/lib/patient-profile";
import { getLabScopeSummary, type LabSearchScope, validateLabQuote } from "@/lib/lab-quote";

const TRIPOLI_AREAS = ["الوفاق", "مشاور"];

export default function LabQuoteScreen() {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<PatientAddress | null>(null);
  const [addressMenuOpen, setAddressMenuOpen] = useState(false);
  const [testsRequired, setTestsRequired] = useState("");
  const [prescription, setPrescription] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [testPhotoUri, setTestPhotoUri] = useState<string | null>(null);
  const [scope, setScope] = useState<LabSearchScope>("city");
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [distanceKm, setDistanceKm] = useState("5");

  useEffect(() => {
    getPatientProfile().then((savedProfile) => {
      setProfile(savedProfile);
      setSelectedAddress(savedProfile?.addresses[0] ?? null);
    });
  }, []);

  const choosePrescription = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/*"], copyToCacheDirectory: true });
    if (!result.canceled) setPrescription(result.assets[0]);
  };

  const chooseTestPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
    if (!result.canceled) setTestPhotoUri(result.assets[0].uri);
  };

  const takeTestPhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("إذن الكاميرا", "نحتاج إلى إذن الكاميرا لالتقاط صورة التحاليل أو الوصفة.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
    if (!result.canceled) setTestPhotoUri(result.assets[0].uri);
  };

  const toggleArea = (area: string) => setSelectedAreas((areas) => areas.includes(area) ? areas.filter((item) => item !== area) : [...areas, area]);
  const chooseAddress = (address: PatientAddress) => { setSelectedAddress(address); setAddressMenuOpen(false); };

  const submitQuoteRequest = () => {
    const errors = validateLabQuote({ testsRequired, hasPrescription: Boolean(prescription), hasTestPhoto: Boolean(testPhotoUri), addressId: selectedAddress?.id, scope, city: "طرابلس", selectedAreas, distanceKm });
    const errorMessage = errors.request ?? errors.address ?? errors.scope;
    if (errorMessage) {
      Alert.alert("أكمل بيانات الطلب", errorMessage);
      return;
    }
    Alert.alert("تم إرسال طلب عرض السعر", `سيُحفظ طلب المختبر محليًا في هذه النسخة. نطاق البحث: ${getLabScopeSummary({ scope, city: "طرابلس", selectedAreas, distanceKm })}.`, [{ text: "عرض العروض", onPress: () => router.replace({ pathname: "/quote-offers", params: { source: "lab" } } as never) }]);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="رجوع" onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}><MaterialIcons name="arrow-forward" size={22} color="#627F9D" /></Pressable><View style={styles.headerCopy}><Text style={styles.title}>طلب عرض سعر للمختبر</Text><Text style={styles.subtitle}>أرسل التحاليل المطلوبة للمختبرات ضمن النطاق الذي تختاره.</Text></View></View>
        <View style={styles.notice}><MaterialIcons name="science" size={20} color="#627F9D" /><Text style={styles.noticeText}>أدخل أسماء التحاليل أو أرفق وصفة أو صورة للتحاليل. يكفي خيار واحد للمتابعة.</Text></View>

        <View style={styles.formCard}>
          <Text style={styles.label}>التحاليل المطلوبة</Text>
          <TextInput value={testsRequired} onChangeText={setTestsRequired} multiline placeholder="اكتب أسماء التحاليل، وكل تحليل في سطر إن رغبت" placeholderTextColor="#A19787" textAlign="right" style={styles.multilineInput} />
          <Text style={styles.label}>الوصفة الطبية أو طلب التحاليل</Text>
          {prescription ? <View style={styles.attachmentRow}><MaterialIcons name="description" size={20} color="#627F9D" /><Text numberOfLines={1} style={styles.attachmentName}>{prescription.name}</Text><Pressable accessibilityRole="button" accessibilityLabel="حذف المرفق" onPress={() => setPrescription(null)}><MaterialIcons name="close" size={19} color="#8A8173" /></Pressable></View> : <Pressable accessibilityRole="button" onPress={choosePrescription} style={({ pressed }) => [styles.uploadBox, pressed && styles.pressed]}><MaterialIcons name="upload-file" size={24} color="#627F9D" /><Text style={styles.uploadTitle}>رفع وصفة أو طلب تحاليل</Text><Text style={styles.uploadHint}>PDF أو صورة</Text></Pressable>}
          <Text style={styles.label}>صورة التحاليل المتوفرة لديك</Text>
          {testPhotoUri ? <View style={styles.photoPreview}><Image source={{ uri: testPhotoUri }} style={styles.photo} /><Pressable accessibilityRole="button" accessibilityLabel="حذف صورة التحاليل" onPress={() => setTestPhotoUri(null)} style={styles.removePhoto}><MaterialIcons name="close" size={18} color="#FFFFFF" /></Pressable></View> : <View style={styles.photoActions}><Pressable accessibilityRole="button" onPress={takeTestPhoto} style={({ pressed }) => [styles.photoAction, pressed && styles.pressed]}><MaterialIcons name="photo-camera" size={20} color="#627F9D" /><Text style={styles.photoActionText}>التقاط صورة</Text></Pressable><Pressable accessibilityRole="button" onPress={chooseTestPhoto} style={({ pressed }) => [styles.photoAction, pressed && styles.pressed]}><MaterialIcons name="photo-library" size={20} color="#627F9D" /><Text style={styles.photoActionText}>اختيار من الجهاز</Text></Pressable></View>}
          <Text style={styles.label}>موقعك الجغرافي</Text>
          {selectedAddress ? <View><Pressable accessibilityRole="button" onPress={() => setAddressMenuOpen((open) => !open)} style={({ pressed }) => [styles.addressPicker, pressed && styles.pressed]}><MaterialIcons name="location-on" size={21} color="#627F9D" /><View style={styles.addressCopy}><Text style={styles.addressLabel}>{selectedAddress.label}</Text><Text numberOfLines={1} style={styles.addressValue}>{selectedAddress.addressLabel}</Text></View><MaterialIcons name={addressMenuOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={22} color="#8A8173" /></Pressable>{addressMenuOpen ? <View style={styles.addressMenu}>{profile?.addresses.map((address) => <Pressable key={address.id} accessibilityRole="button" onPress={() => chooseAddress(address)} style={({ pressed }) => [styles.addressOption, pressed && styles.optionPressed]}><MaterialIcons name={address.id === selectedAddress.id ? "check-circle" : "radio-button-unchecked"} size={19} color="#627F9D" /><View style={styles.addressCopy}><Text style={styles.addressLabel}>{address.label}</Text><Text numberOfLines={1} style={styles.addressValue}>{address.addressLabel}</Text></View></Pressable>)}</View> : null}</View> : <View style={styles.noAddress}><Text style={styles.noAddressText}>أضف عنوانًا محفوظًا لتحديد موقعك الجغرافي.</Text><Pressable accessibilityRole="button" onPress={() => router.push("/profile" as never)}><Text style={styles.profileLink}>الذهاب إلى حسابي</Text></Pressable></View>}
          <Text style={styles.label}>نطاق البحث</Text>
          <View style={styles.scopeTabs}>{(["city", "areas", "distance"] as LabSearchScope[]).map((option) => <Pressable key={option} accessibilityRole="button" onPress={() => setScope(option)} style={({ pressed }) => [styles.scopeTab, scope === option && styles.scopeTabActive, pressed && styles.pressed]}><Text style={[styles.scopeTabText, scope === option && styles.scopeTabTextActive]}>{option === "city" ? "المدينة" : option === "areas" ? "المناطق" : "المسافة"}</Text></Pressable>)}</View>
          {scope === "city" ? <View style={styles.cityRow}><MaterialIcons name="location-city" size={20} color="#627F9D" /><View><Text style={styles.cityTitle}>طرابلس كاملة</Text><Text style={styles.cityHint}>سيصل الطلب إلى المختبرات ضمن المدينة.</Text></View></View> : null}
          {scope === "areas" ? <View style={styles.areaWrap}><Text style={styles.fieldHint}>اختر منطقة واحدة أو أكثر داخل طرابلس</Text><View style={styles.areaChips}>{TRIPOLI_AREAS.map((area) => <Pressable key={area} accessibilityRole="checkbox" accessibilityState={{ checked: selectedAreas.includes(area) }} onPress={() => toggleArea(area)} style={({ pressed }) => [styles.areaChip, selectedAreas.includes(area) && styles.areaChipActive, pressed && styles.pressed]}><MaterialIcons name={selectedAreas.includes(area) ? "check" : "add"} size={15} color={selectedAreas.includes(area) ? "#FFFFFF" : "#627F9D"} /><Text style={[styles.areaText, selectedAreas.includes(area) && styles.areaTextActive]}>{area}</Text></Pressable>)}</View></View> : null}
          {scope === "distance" ? <View style={styles.distanceRow}><MaterialIcons name="near-me" size={20} color="#627F9D" /><TextInput value={distanceKm} onChangeText={setDistanceKm} keyboardType="numeric" maxLength={3} placeholder="5" placeholderTextColor="#A19787" style={styles.distanceInput} /><Text style={styles.distanceSuffix}>كم من موقعك الحالي</Text></View> : null}
        </View>
        <Pressable accessibilityRole="button" onPress={submitQuoteRequest} style={({ pressed }) => [styles.submitButton, pressed && styles.pressed]}><Text style={styles.submitText}>طلب عرض سعر</Text><MaterialIcons name="send" size={19} color="#FFFFFF" /></Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 30 }, header: { alignItems: "flex-start", flexDirection: "row", gap: 12 }, backButton: { alignItems: "center", backgroundColor: "#EBF1F6", borderColor: "#D8E4ED", borderRadius: 16, borderWidth: 1, height: 40, justifyContent: "center", width: 40 }, headerCopy: { flex: 1 }, title: { color: "#465132", fontSize: 21, fontWeight: "800", lineHeight: 28, textAlign: "right" }, subtitle: { color: "#8A8173", fontSize: 12, lineHeight: 17, marginTop: 2, textAlign: "right" }, notice: { alignItems: "center", backgroundColor: "#EBF1F6", borderRadius: 15, flexDirection: "row-reverse", gap: 8, marginTop: 18, padding: 11 }, noticeText: { color: "#526E89", flex: 1, fontSize: 11, lineHeight: 16, textAlign: "right" }, formCard: { backgroundColor: "#FFFDF8", borderColor: "#E8E0D1", borderRadius: 20, borderWidth: 1, marginTop: 14, padding: 15 }, label: { color: "#465132", fontSize: 13, fontWeight: "800", marginTop: 8, textAlign: "right" }, multilineInput: { backgroundColor: "#FFFDF8", borderColor: "#E4DCCB", borderRadius: 13, borderWidth: 1, color: "#465132", fontSize: 13, lineHeight: 20, marginTop: 7, minHeight: 76, padding: 11, textAlignVertical: "top" }, uploadBox: { alignItems: "center", backgroundColor: "#F4F8FB", borderColor: "#9CB5C9", borderRadius: 13, borderStyle: "dashed", borderWidth: 1, gap: 2, marginTop: 7, minHeight: 76, justifyContent: "center" }, uploadTitle: { color: "#627F9D", fontSize: 12, fontWeight: "800" }, uploadHint: { color: "#8196A7", fontSize: 10 }, attachmentRow: { alignItems: "center", backgroundColor: "#F4F8FB", borderRadius: 12, flexDirection: "row-reverse", gap: 8, marginTop: 7, minHeight: 46, paddingHorizontal: 10 }, attachmentName: { color: "#526E89", flex: 1, fontSize: 11, textAlign: "right" }, photoActions: { flexDirection: "row-reverse", gap: 8, marginTop: 7 }, photoAction: { alignItems: "center", backgroundColor: "#F4F8FB", borderColor: "#D8E4ED", borderRadius: 12, borderWidth: 1, flex: 1, flexDirection: "row-reverse", gap: 5, justifyContent: "center", minHeight: 46 }, photoActionText: { color: "#627F9D", fontSize: 11, fontWeight: "800" }, photoPreview: { alignSelf: "flex-end", marginTop: 7, position: "relative" }, photo: { borderRadius: 12, height: 92, width: 118 }, removePhoto: { alignItems: "center", backgroundColor: "#627F9D", borderRadius: 12, height: 24, justifyContent: "center", position: "absolute", right: -7, top: -7, width: 24 }, addressPicker: { alignItems: "center", backgroundColor: "#FFFDF8", borderColor: "#E8E0D1", borderRadius: 13, borderWidth: 1, flexDirection: "row-reverse", gap: 9, marginTop: 7, minHeight: 54, paddingHorizontal: 10 }, addressCopy: { flex: 1 }, addressLabel: { color: "#5A624B", fontSize: 12, fontWeight: "800", textAlign: "right" }, addressValue: { color: "#8A8173", fontSize: 10, marginTop: 2, textAlign: "right" }, addressMenu: { backgroundColor: "#FFFDF8", borderColor: "#E8E0D1", borderRadius: 13, borderWidth: 1, marginTop: 4, overflow: "hidden" }, addressOption: { alignItems: "center", borderBottomColor: "#F0EBDD", borderBottomWidth: 1, flexDirection: "row-reverse", gap: 8, minHeight: 51, paddingHorizontal: 10 }, optionPressed: { backgroundColor: "#F4F8FB" }, noAddress: { alignItems: "center", backgroundColor: "#F8F3E8", borderRadius: 12, gap: 4, marginTop: 7, padding: 12 }, noAddressText: { color: "#786F61", fontSize: 11, textAlign: "center" }, profileLink: { color: "#627F9D", fontSize: 11, fontWeight: "800" }, scopeTabs: { flexDirection: "row-reverse", gap: 6, marginTop: 7 }, scopeTab: { backgroundColor: "#F8F3E8", borderColor: "#E4DCCB", borderRadius: 10, borderWidth: 1, flex: 1, minHeight: 39, justifyContent: "center", paddingHorizontal: 4 }, scopeTabActive: { backgroundColor: "#EBF1F6", borderColor: "#627F9D" }, scopeTabText: { color: "#8A8173", fontSize: 10, fontWeight: "800", textAlign: "center" }, scopeTabTextActive: { color: "#627F9D" }, cityRow: { alignItems: "center", backgroundColor: "#F4F8FB", borderRadius: 12, flexDirection: "row-reverse", gap: 8, marginTop: 8, padding: 10 }, cityTitle: { color: "#526E89", fontSize: 12, fontWeight: "800", textAlign: "right" }, cityHint: { color: "#8196A7", fontSize: 10, marginTop: 2, textAlign: "right" }, areaWrap: { marginTop: 8 }, fieldHint: { color: "#8A8173", fontSize: 10, textAlign: "right" }, areaChips: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7, justifyContent: "flex-start", marginTop: 7 }, areaChip: { alignItems: "center", backgroundColor: "#F4F8FB", borderColor: "#B7CAD9", borderRadius: 10, borderWidth: 1, flexDirection: "row-reverse", gap: 3, paddingHorizontal: 9, paddingVertical: 7 }, areaChipActive: { backgroundColor: "#627F9D", borderColor: "#627F9D" }, areaText: { color: "#627F9D", fontSize: 11, fontWeight: "800" }, areaTextActive: { color: "#FFFFFF" }, distanceRow: { alignItems: "center", backgroundColor: "#F4F8FB", borderRadius: 12, flexDirection: "row-reverse", gap: 8, marginTop: 8, padding: 10 }, distanceInput: { backgroundColor: "#FFFFFF", borderColor: "#B7CAD9", borderRadius: 8, borderWidth: 1, color: "#465132", minHeight: 33, paddingHorizontal: 8, textAlign: "center", width: 52 }, distanceSuffix: { color: "#526E89", flex: 1, fontSize: 11, textAlign: "right" }, submitButton: { alignItems: "center", backgroundColor: "#627F9D", borderRadius: 15, flexDirection: "row-reverse", gap: 6, justifyContent: "center", marginTop: 15, minHeight: 51 }, submitText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" }, pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});

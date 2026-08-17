import { useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

import { ScreenContainer } from "@/components/screen-container";
import { getPatientProfile, type PatientAddress, type PatientProfile } from "@/lib/patient-profile";
import { getPharmacyScopeSummary, type PharmacySearchScope, validatePharmacyQuote } from "@/lib/pharmacy-quote";
import { getAreasSortedByDemand, getEnabledCities, getLibyaCities, recordAreaDemand, TRIPOLI_CITY_ID } from "@/lib/libya-cities";

export default function PharmacyQuoteScreen() {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<PatientAddress | null>(null);
  const [addressMenuOpen, setAddressMenuOpen] = useState(false);
  const [medicines, setMedicines] = useState("");
  const [prescription, setPrescription] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [medicinePhotoUri, setMedicinePhotoUri] = useState<string | null>(null);
  const [scope, setScope] = useState<PharmacySearchScope>("city");
  const [selectedCityId, setSelectedCityId] = useState<string>(TRIPOLI_CITY_ID);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [distanceKm, setDistanceKm] = useState("5");
  const [enabledCities, setEnabledCities] = useState<{ id: string; name: string; areas: string[] }[]>([]);
  const [cityMenuOpen, setCityMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPatientProfile().then((savedProfile) => {
      if (cancelled) return;
      setProfile(savedProfile);
      setSelectedAddress(savedProfile?.addresses[0] ?? null);
    });
    getLibyaCities().then((cities) => {
      if (cancelled) return;
      Promise.all(
        getEnabledCities(cities).map((city) =>
          getAreasSortedByDemand(city.areas.map((area) => area.name)).then((sorted) => ({
            id: city.id,
            name: city.name,
            areas: sorted,
          })),
        ),
      ).then((sortedCities) => {
        if (cancelled) return;
        setEnabledCities(sortedCities);
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedCity = enabledCities.find((city) => city.id === selectedCityId) ?? enabledCities[0];

  const selectCity = (cityId: string) => {
    setSelectedCityId(cityId);
    setSelectedAreas([]);
    setCityMenuOpen(false);
  };

  const pickPrescription = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      copyToCacheDirectory: true,
    });
    if (!result.canceled) setPrescription(result.assets[0]);
  };

  const pickMedicinePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) setMedicinePhotoUri(result.assets[0].uri);
  };

  const takeMedicinePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("إذن الكاميرا", "نحتاج إلى إذن الكاميرا لالتقاط صورة الدواء.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
    if (!result.canceled) setMedicinePhotoUri(result.assets[0].uri);
  };

  const toggleArea = (area: string) => {
    setSelectedAreas((areas) => areas.includes(area) ? areas.filter((item) => item !== area) : [...areas, area]);
    void recordAreaDemand(area);
  };

  const submitQuoteRequest = () => {
    const cityName = selectedCity?.name ?? "طرابلس";
    const errors = validatePharmacyQuote({
      medicines,
      hasPrescription: Boolean(prescription),
      hasMedicinePhoto: Boolean(medicinePhotoUri),
      addressId: selectedAddress?.id,
      scope,
      city: cityName,
      selectedAreas,
      distanceKm,
    });
    const errorMessage = errors.request ?? errors.address ?? errors.scope;
    if (errorMessage) {
      Alert.alert("أكمل بيانات الطلب", errorMessage);
      return;
    }

    router.push({ pathname: "/quote-offers", params: { source: "pharmacy", justSubmitted: "1" } } as never);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="رجوع" onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}><MaterialIcons name="arrow-forward" size={22} color="#A65E67" /></Pressable>
          <View style={styles.headerCopy}><Text style={styles.title}>طلب عرض سعر</Text><Text style={styles.subtitle}>أرسل احتياجك للصيدليات ضمن النطاق الذي تختاره.</Text></View>
        </View>

        <View style={styles.notice}><MaterialIcons name="privacy-tip" size={20} color="#A65E67" /><Text style={styles.noticeText}>يمكنك إدخال الأدوية أو إرفاق وصفة أو صورة دواء. يكفي خيار واحد للمتابعة.</Text></View>

        <View style={styles.formCard}>
          <Text style={styles.label}>الأدوية المطلوبة</Text>
          <TextInput value={medicines} onChangeText={setMedicines} multiline placeholder="اكتب أسماء الأدوية، وكل دواء في سطر إن رغبت" placeholderTextColor="#A19787" textAlign="right" style={styles.multilineInput} />

          <Text style={styles.label}>الوصفة الطبية</Text>
          {prescription ? (
            <View style={styles.attachmentRow}><MaterialIcons name="description" size={20} color="#A65E67" /><Text numberOfLines={1} style={styles.attachmentName}>{prescription.name}</Text><Pressable accessibilityRole="button" accessibilityLabel="حذف الوصفة" onPress={() => setPrescription(null)}><MaterialIcons name="close" size={19} color="#8A8173" /></Pressable></View>
          ) : (
            <Pressable accessibilityRole="button" onPress={pickPrescription} style={({ pressed }) => [styles.uploadBox, pressed && styles.pressed]}><MaterialIcons name="upload-file" size={24} color="#A65E67" /><Text style={styles.uploadTitle}>رفع وصفة طبية</Text><Text style={styles.uploadHint}>PDF أو صورة</Text></Pressable>
          )}

          <Text style={styles.label}>صورة الدواء المتوفر لديك</Text>
          {medicinePhotoUri ? (
            <View style={styles.photoPreview}><Image source={{ uri: medicinePhotoUri }} style={styles.photo} /><Pressable accessibilityRole="button" accessibilityLabel="حذف صورة الدواء" onPress={() => setMedicinePhotoUri(null)} style={styles.removePhoto}><MaterialIcons name="close" size={18} color="#FFFFFF" /></Pressable></View>
          ) : (
            <View style={styles.photoActions}><Pressable accessibilityRole="button" onPress={takeMedicinePhoto} style={({ pressed }) => [styles.photoAction, pressed && styles.pressed]}><MaterialIcons name="photo-camera" size={20} color="#A65E67" /><Text style={styles.photoActionText}>التقاط صورة</Text></Pressable><Pressable accessibilityRole="button" onPress={pickMedicinePhoto} style={({ pressed }) => [styles.photoAction, pressed && styles.pressed]}><MaterialIcons name="photo-library" size={20} color="#A65E67" /><Text style={styles.photoActionText}>اختيار من الجهاز</Text></Pressable></View>
          )}

          <Text style={styles.label}>موقعك الجغرافي</Text>
          {selectedAddress ? (
            <View>
              <Pressable accessibilityRole="button" onPress={() => setAddressMenuOpen((open) => !open)} style={({ pressed }) => [styles.addressPicker, pressed && styles.pressed]}><MaterialIcons name="location-on" size={21} color="#A65E67" /><View style={styles.addressCopy}><Text style={styles.addressLabel}>{selectedAddress.label}</Text><Text numberOfLines={1} style={styles.addressValue}>{selectedAddress.addressLabel}</Text></View><MaterialIcons name={addressMenuOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={22} color="#8A8173" /></Pressable>
              {addressMenuOpen ? <View style={styles.addressMenu}>{profile?.addresses.map((address) => <Pressable key={address.id} accessibilityRole="button" onPress={() => { setSelectedAddress(address); setAddressMenuOpen(false); }} style={({ pressed }) => [styles.addressOption, pressed && styles.optionPressed]}><MaterialIcons name={address.id === selectedAddress.id ? "check-circle" : "radio-button-unchecked"} size={19} color="#A65E67" /><View style={styles.addressCopy}><Text style={styles.addressLabel}>{address.label}</Text><Text numberOfLines={1} style={styles.addressValue}>{address.addressLabel}</Text></View></Pressable>)}</View> : null}
            </View>
          ) : (
            <View style={styles.noAddress}><Text style={styles.noAddressText}>أضف عنوانًا محفوظًا لتحديد موقعك الجغرافي.</Text><Pressable accessibilityRole="button" onPress={() => router.push("/profile" as never)}><Text style={styles.profileLink}>الذهاب إلى حسابي</Text></Pressable></View>
          )}

          <Text style={styles.label}>نطاق البحث</Text>
          <View style={styles.scopeTabs}>{(["city", "areas", "distance"] as PharmacySearchScope[]).map((option) => <Pressable key={option} accessibilityRole="button" onPress={() => setScope(option)} style={({ pressed }) => [styles.scopeTab, scope === option && styles.scopeTabActive, pressed && styles.pressed]}><Text style={[styles.scopeTabText, scope === option && styles.scopeTabTextActive]}>{option === "city" ? "المدينة" : option === "areas" ? "المناطق" : "المسافة"}</Text></Pressable>)}</View>
          {scope === "city" ? <View><View style={styles.cityPickerRow}><Pressable accessibilityRole="button" onPress={() => setCityMenuOpen((open) => !open)} style={({ pressed }) => [styles.cityPicker, pressed && styles.pressed]}><MaterialIcons name="location-city" size={20} color="#A65E67" /><Text numberOfLines={1} style={styles.cityPickerText}>{selectedCity?.name ?? "اختر المدينة"}</Text><MaterialIcons name={cityMenuOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={20} color="#8A8173" /></Pressable></View>{cityMenuOpen ? <View style={styles.addressMenu}>{enabledCities.map((city) => <Pressable key={city.id} accessibilityRole="button" onPress={() => selectCity(city.id)} style={({ pressed }) => [styles.addressOption, pressed && styles.optionPressed]}><MaterialIcons name={city.id === selectedCityId ? "check-circle" : "radio-button-unchecked"} size={19} color="#A65E67" /><Text style={styles.addressLabel}>{city.name}</Text></Pressable>)}</View> : null}<View style={styles.cityRow}><MaterialIcons name="map" size={20} color="#A65E67" /><View><Text style={styles.cityTitle}>{selectedCity?.name} كاملة</Text><Text style={styles.cityHint}>سيصل الطلب إلى الصيدليات ضمن هذه المدينة.</Text></View></View></View> : null}
          {scope === "areas" && selectedCity ? <View style={styles.areaWrap}><Text style={styles.fieldHint}>اختر منطقة واحدة أو أكثر داخل {selectedCity.name}</Text><View style={styles.areaChips}>{selectedCity.areas.map((area) => <Pressable key={area} accessibilityRole="checkbox" accessibilityState={{ checked: selectedAreas.includes(area) }} onPress={() => toggleArea(area)} style={({ pressed }) => [styles.areaChip, selectedAreas.includes(area) && styles.areaChipActive, pressed && styles.pressed]}><MaterialIcons name={selectedAreas.includes(area) ? "check" : "add"} size={15} color={selectedAreas.includes(area) ? "#FFFFFF" : "#A65E67"} /><Text style={[styles.areaText, selectedAreas.includes(area) && styles.areaTextActive]}>{area}</Text></Pressable>)}</View></View> : null}
          {scope === "distance" ? <View style={styles.distanceRow}><MaterialIcons name="near-me" size={20} color="#A65E67" /><TextInput value={distanceKm} onChangeText={setDistanceKm} keyboardType="numeric" maxLength={3} placeholder="5" placeholderTextColor="#A19787" style={styles.distanceInput} /><Text style={styles.distanceSuffix}>كم من موقعك الحالي</Text></View> : null}
        </View>

        <Pressable accessibilityRole="button" onPress={submitQuoteRequest} style={({ pressed }) => [styles.submitButton, pressed && styles.pressed]}><Text style={styles.submitText}>طلب عرض سعر</Text><MaterialIcons name="send" size={19} color="#FFFFFF" /></Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 20 },
  header: { alignItems: "flex-start", flexDirection: "row", gap: 8 },
  backButton: { alignItems: "center", backgroundColor: "#F8ECEE", borderColor: "#ECDADD", borderRadius: 16, borderWidth: 1, height: 40, justifyContent: "center", width: 40 },
  headerCopy: { flex: 1 },
  title: { color: "#465132", fontSize: 18, fontWeight: "800", lineHeight: 25, textAlign: "right" },
  subtitle: { color: "#8A8173", fontSize: 12, lineHeight: 17, marginTop: 2, textAlign: "right" },
  notice: { alignItems: "center", backgroundColor: "#F8ECEE", borderRadius: 15, flexDirection: "row-reverse", gap: 8, marginTop: 18, padding: 11 },
  noticeText: { color: "#7D6265", flex: 1, fontSize: 11, lineHeight: 16, textAlign: "right" },
  formCard: { backgroundColor: "#FFFDF8", borderColor: "#E8E0D1", borderRadius: 14, borderWidth: 1, marginTop: 8, padding: 10 },
  label: { color: "#465132", fontSize: 12, fontWeight: "800", marginTop: 4, textAlign: "right" },
  multilineInput: { backgroundColor: "#FFFDF8", borderColor: "#E4DCCB", borderRadius: 13, borderWidth: 1, color: "#465132", fontSize: 12, lineHeight: 18, marginTop: 4, minHeight: 64, padding: 8, textAlignVertical: "top" },
  uploadBox: { alignItems: "center", backgroundColor: "#FCF5F5", borderColor: "#DBA5AB", borderRadius: 10, borderStyle: "dashed", borderWidth: 1, gap: 2, marginTop: 4, minHeight: 58, justifyContent: "center" },
  uploadTitle: { color: "#A65E67", fontSize: 12, fontWeight: "800" },
  uploadHint: { color: "#9A807F", fontSize: 10 },
  attachmentRow: { alignItems: "center", backgroundColor: "#FCF5F5", borderRadius: 9, flexDirection: "row-reverse", gap: 6, marginTop: 4, minHeight: 38, paddingHorizontal: 8 },
  attachmentName: { color: "#6E5558", flex: 1, fontSize: 11, textAlign: "right" },
  photoActions: { flexDirection: "row-reverse", gap: 6, marginTop: 4 },
  photoAction: { alignItems: "center", backgroundColor: "#FCF5F5", borderColor: "#ECDADD", borderRadius: 9, borderWidth: 1, flex: 1, flexDirection: "row-reverse", gap: 4, justifyContent: "center", minHeight: 38 },
  photoActionText: { color: "#A65E67", fontSize: 11, fontWeight: "800" },
  photoPreview: { alignSelf: "flex-end", marginTop: 4, position: "relative" },
  photo: { borderRadius: 12, height: 92, width: 118 },
  removePhoto: { alignItems: "center", backgroundColor: "#A65E67", borderRadius: 12, height: 24, justifyContent: "center", position: "absolute", right: -7, top: -7, width: 24 },
  addressPicker: { alignItems: "center", backgroundColor: "#FFFDF8", borderColor: "#E8E0D1", borderRadius: 10, borderWidth: 1, flexDirection: "row-reverse", gap: 6, marginTop: 4, minHeight: 44, paddingHorizontal: 8 },
  addressCopy: { flex: 1 },
  addressLabel: { color: "#5A624B", fontSize: 11, fontWeight: "800", textAlign: "right" },
  addressValue: { color: "#8A8173", fontSize: 9, marginVertical: 0, textAlign: "right" },
  addressMenu: { backgroundColor: "#FFFDF8", borderColor: "#E8E0D1", borderRadius: 10, borderWidth: 1, marginTop: 2, overflow: "hidden" },
  addressOption: { alignItems: "center", borderBottomColor: "#F0EBDD", borderBottomWidth: 1, flexDirection: "row-reverse", gap: 6, minHeight: 42, paddingHorizontal: 8 },
  optionPressed: { backgroundColor: "#FCF5F5" },
  noAddress: { alignItems: "center", backgroundColor: "#F8F3E8", borderRadius: 12, gap: 3, marginTop: 4, padding: 9 },
  noAddressText: { color: "#786F61", fontSize: 11, textAlign: "center" },
  profileLink: { color: "#A65E67", fontSize: 11, fontWeight: "800" },
  cityPicker: { alignItems: "center", backgroundColor: "#FFFDF8", borderColor: "#E8E0D1", borderRadius: 10, borderWidth: 1, flexDirection: "row-reverse", gap: 6, marginTop: 4, minHeight: 42, paddingHorizontal: 8 },
  cityPickerRow: { alignItems: "flex-start", marginTop: 4 },
  cityPickerText: { color: "#5A624B", flex: 1, fontSize: 11, fontWeight: "800", textAlign: "right" },
  scopeTabs: { flexDirection: "row-reverse", gap: 4, marginTop: 4 },
  scopeTab: { backgroundColor: "#F8F3E8", borderColor: "#E4DCCB", borderRadius: 8, borderWidth: 1, flex: 1, minHeight: 32, justifyContent: "center", paddingHorizontal: 4 },
  scopeTabActive: { backgroundColor: "#F8ECEE", borderColor: "#A65E67" },
  scopeTabText: { color: "#8A8173", fontSize: 9, fontWeight: "800", textAlign: "center" },
  scopeTabTextActive: { color: "#A65E67" },
  cityRow: { alignItems: "center", backgroundColor: "#FCF5F5", borderRadius: 9, flexDirection: "row-reverse", gap: 6, marginTop: 5, padding: 7 },
  cityTitle: { color: "#6E5558", fontSize: 11, fontWeight: "800", textAlign: "right" },
  cityHint: { color: "#9A807F", fontSize: 9, marginVertical: 0, textAlign: "right" },
  areaWrap: { marginTop: 4 },
  fieldHint: { color: "#8A8173", fontSize: 10, textAlign: "right" },
  areaChips: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 5, justifyContent: "flex-start", marginTop: 4 },
  areaChip: { alignItems: "center", backgroundColor: "#FFFDF8", borderColor: "#DBA5AB", borderRadius: 8, borderWidth: 1, flexDirection: "row-reverse", gap: 3, paddingHorizontal: 8, paddingVertical: 5 },
  areaChipActive: { backgroundColor: "#A65E67", borderColor: "#A65E67" },
  areaText: { color: "#A65E67", fontSize: 11, fontWeight: "800" },
  areaTextActive: { color: "#FFFFFF" },
  distanceRow: { alignItems: "center", backgroundColor: "#FCF5F5", borderRadius: 12, flexDirection: "row-reverse", gap: 5, marginTop: 5, minHeight: 40, paddingHorizontal: 8 },
  distanceInput: { backgroundColor: "#FFFDF8", borderColor: "#DBA5AB", borderRadius: 9, borderWidth: 1, color: "#465132", fontSize: 13, height: 33, textAlign: "center", width: 51 },
  distanceSuffix: { color: "#6E5558", flex: 1, fontSize: 11, textAlign: "right" },
  submitButton: { alignItems: "center", backgroundColor: "#A65E67", borderRadius: 16, flexDirection: "row-reverse", gap: 7, justifyContent: "center", marginTop: 18, minHeight: 54 },
  submitText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
});

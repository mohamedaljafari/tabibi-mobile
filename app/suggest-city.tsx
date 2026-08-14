/**
 * شاشة «اقتراح مدينة جديدة».
 * يتيح المستخدم اقتراح مدينة غير مفعّلة للتوسع إليها، مع سبب الاقتراح.
 */
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";
import { getDisabledCities, getLibyaCities } from "@/lib/libya-cities";
import { addCitySuggestion } from "@/lib/city-suggestions";

const OLIVE = "#465132";
const ROSE = "#A65E67";
const SAND = "#8A8173";
const CREAM = "#FFFDF8";
const BORDER = "#E4DCCB";

export default function SuggestCityScreen() {
  const [suggestions, setSuggestions] = useState<{ id: string; name: string }[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string>("");
  const [cityMenuOpen, setCityMenuOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const loadDisabled = () => {
    void Promise.resolve(getLibyaCities()).then((cities) => {
      const disabled = getDisabledCities(cities);
      setSuggestions(disabled.map((city) => ({ id: city.id, name: city.name })));
    });
  };

  useState(() => {
    loadDisabled();
  });

  const selected = suggestions.find((c) => c.id === selectedCityId);

  const submit = async () => {
    if (!selected) {
      Alert.alert("اختر المدينة", "يرجى اختيار المدينة التي تقترح التوسع إليها.");
      return;
    }
    if (reason.trim().length < 5) {
      Alert.alert("أضف سببًا", "اكتب سببًا مختصرًا لاقتراحك (خمس أحرف على الأقل).");
      return;
    }
    setBusy(true);
    try {
      await addCitySuggestion(selected.name, reason.trim());
      setBusy(false);
      Alert.alert("تم إرسال الاقتراح", "شكرًا لمساهمتك! ستُراجع اقتراحات المدن من إدارة النظام.", [
        { text: "حسنًا", onPress: () => router.back() },
      ]);
    } catch {
      setBusy(false);
      Alert.alert("تعذر الإرسال", "حدث خطأ أثناء حفظ اقتراحك، يرجى المحاولة مرة أخرى.");
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable accessibilityRole="button" accessibilityLabel="رجوع" onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
              <MaterialIcons name="arrow-forward" size={22} color={ROSE} />
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>اقتراح مدينة جديدة</Text>
              <Text style={styles.subtitle}>اقترح مدينة للتوسع إليها وسيُراجع اقتراحك من إدارة النظام.</Text>
            </View>
          </View>

          <View style={styles.notice}>
            <MaterialIcons name="lightbulb" size={20} color={ROSE} />
            <Text style={styles.noticeText}>تظهر لك المدن غير المفعّلة حاليًا. عند اعتماد المدينة سيُفعل نظام طبيبي فيها تدريجيًا.</Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.label}>المدينة المقترحة</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setCityMenuOpen((open) => !open)}
              style={({ pressed }) => [styles.cityPicker, pressed && styles.pressed]}
            >
              <MaterialIcons name="location-city" size={20} color={ROSE} />
              <Text numberOfLines={1} style={styles.cityPickerText}>{selected?.name ?? "اختر مدينة"}</Text>
              <MaterialIcons name={cityMenuOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={20} color={SAND} />
            </Pressable>
            {cityMenuOpen ? (
              <View style={styles.addressMenu}>
                {suggestions.map((city) => (
                  <Pressable
                    key={city.id}
                    accessibilityRole="button"
                    onPress={() => { setSelectedCityId(city.id); setCityMenuOpen(false); }}
                    style={({ pressed }) => [styles.addressOption, pressed && styles.optionPressed]}
                  >
                    <MaterialIcons name={city.id === selectedCityId ? "check-circle" : "radio-button-unchecked"} size={19} color={ROSE} />
                    <Text style={styles.addressLabel}>{city.name}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <Text style={styles.label}>سبب الاقتراح</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              multiline
              maxLength={200}
              placeholder="مثال: أحتاج طبيب أطفال في مدينتي ولا توجد خدمات متاحة حاليًا"
              placeholderTextColor="#A19787"
              textAlign="right"
              style={styles.multilineInput}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={submit}
            disabled={busy}
            style={({ pressed }) => [styles.submitButton, busy && styles.submitDisabled, pressed && !busy && styles.pressed]}
          >
            <Text style={styles.submitText}>{busy ? "جارٍ الإرسال…" : "إرسال الاقتراح"}</Text>
            <MaterialIcons name="send" size={19} color="#FFFFFF" />
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 12, paddingBottom: 20 },
  header: { alignItems: "flex-start", flexDirection: "row", gap: 8 },
  backButton: { alignItems: "center", backgroundColor: "#F8ECEE", borderColor: "#ECDADD", borderRadius: 16, borderWidth: 1, height: 40, justifyContent: "center", width: 40 },
  headerCopy: { flex: 1 },
  title: { color: OLIVE, fontSize: 18, fontWeight: "800", lineHeight: 25, textAlign: "right" },
  subtitle: { color: SAND, fontSize: 12, lineHeight: 17, marginTop: 2, textAlign: "right" },
  notice: { alignItems: "center", backgroundColor: "#F8ECEE", borderRadius: 15, flexDirection: "row-reverse", gap: 8, marginTop: 18, padding: 11 },
  noticeText: { color: "#7D6265", flex: 1, fontSize: 11, lineHeight: 16, textAlign: "right" },
  formCard: { backgroundColor: CREAM, borderColor: BORDER, borderRadius: 14, borderWidth: 1, marginTop: 8, padding: 10 },
  label: { color: OLIVE, fontSize: 12, fontWeight: "800", marginTop: 4, textAlign: "right" },
  cityPicker: { alignItems: "center", backgroundColor: CREAM, borderColor: BORDER, borderRadius: 13, borderWidth: 1, flexDirection: "row-reverse", gap: 6, minHeight: 46, marginTop: 4, paddingHorizontal: 10 },
  cityPickerText: { color: OLIVE, flex: 1, fontSize: 13, lineHeight: 19, textAlign: "right" },
  addressMenu: { backgroundColor: CREAM, borderColor: BORDER, borderRadius: 12, borderWidth: 1, marginTop: 4, maxHeight: 220, overflow: "scroll", padding: 4 },
  addressOption: { alignItems: "center", flexDirection: "row-reverse", gap: 8, minHeight: 44, paddingHorizontal: 8 },
  addressLabel: { color: OLIVE, flex: 1, fontSize: 13, lineHeight: 19, textAlign: "right" },
  optionPressed: { opacity: 0.7 },
  multilineInput: { backgroundColor: CREAM, borderColor: BORDER, borderRadius: 13, borderWidth: 1, color: OLIVE, fontSize: 12, lineHeight: 18, marginTop: 4, minHeight: 80, padding: 8, textAlignVertical: "top" },
  submitButton: { alignItems: "center", backgroundColor: OLIVE, borderRadius: 24, flexDirection: "row-reverse", gap: 6, justifyContent: "center", minHeight: 50, marginTop: 18 },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800", lineHeight: 22 },
  pressed: { opacity: 0.85 },
});

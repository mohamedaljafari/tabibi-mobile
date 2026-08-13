import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View , Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ProviderResultCard } from "@/components/provider-result-card";
import { ScreenContainer } from "@/components/screen-container";
import { getHomeService, getHomeServiceProviders, HOME_SERVICE_SORT_LABELS, type HomeServiceSort } from "@/lib/home-service-directory";
import { getPatientProfile, type PatientAddress, type PatientProfile } from "@/lib/patient-profile";
import { mergeNutritionProviders, mergeVeterinaryProviders, readProviderAccounts, type ProviderAccount } from "@/lib/provider-registry";

const PROVIDER_MERGE: Record<string, (accounts: ProviderAccount[]) => ProviderAccount[]> = {
  "nutrition-health-beauty": mergeNutritionProviders,
  veterinary: mergeVeterinaryProviders,
};

const SORT_OPTIONS: HomeServiceSort[] = ["nearest", "rating", "price-high", "price-low"];

export default function HomeServiceSearchScreen() {
  const { serviceId } = useLocalSearchParams<{ serviceId?: string }>();
  const service = getHomeService(serviceId);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<PatientAddress | null>(null);
  const [addressMenuOpen, setAddressMenuOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sort, setSort] = useState<HomeServiceSort>("nearest");
  const [accounts, setAccounts] = useState<ProviderAccount[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { getPatientProfile().then((savedProfile) => { setProfile(savedProfile); setSelectedAddress(savedProfile?.addresses[0] ?? null); }); }, []);
  useEffect(() => { readProviderAccounts().then((allAccounts) => { setAccounts(allAccounts); setLoaded(true); }); }, []);

  const providers = useMemo(() => getHomeServiceProviders(service.id, sort), [service.id, sort]);
  const providerResults = useMemo(() => {
    if (!loaded) return [];
    const mergeFn = PROVIDER_MERGE[service.id];
    return mergeFn ? mergeFn(accounts) : [];
  }, [loaded, accounts, service.id]);
  const sortedProviders = useMemo(() => {
    const results = [...providerResults];
    if (sort === "price-low") return results.sort((a, b) => a.services[0]?.price - b.services[0]?.price);
    if (sort === "price-high") return results.sort((a, b) => (b.services[0]?.price ?? 0) - (a.services[0]?.price ?? 0));
    return results;
  }, [providerResults, sort]);
  const chooseAddress = (address: PatientAddress) => { setSelectedAddress(address); setAddressMenuOpen(false); };
  const chooseSort = (option: HomeServiceSort) => { setSort(option); setFilterOpen(false); };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.page}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="رجوع إلى الصفحة الرئيسية" onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}><MaterialIcons name="arrow-forward" size={22} color="#6B7B3F" /></Pressable><View style={styles.headerCopy}><Text style={styles.title}>طلب {service.title}</Text><Text style={styles.subtitle}>اختر عنوان الزيارة وابحث عن الأقرب إليك</Text></View></View>
          <View style={[styles.serviceChip, { backgroundColor: service.surface }]}><MaterialIcons name={service.icon} size={18} color={service.tint} /><Text style={[styles.serviceChipText, { color: service.tint }]}>{service.title}</Text></View>
          <Text style={styles.label}>اختر عنوان الزيارة</Text>
          {selectedAddress ? <View><Pressable accessibilityRole="button" accessibilityLabel="اختيار عنوان الزيارة" onPress={() => setAddressMenuOpen((open) => !open)} style={({ pressed }) => [styles.addressPicker, pressed && styles.pressed]}><MaterialIcons name="location-on" size={21} color="#6B7B3F" /><View style={styles.addressCopy}><Text style={styles.addressLabel}>{selectedAddress.label}</Text><Text numberOfLines={1} style={styles.addressValue}>{selectedAddress.addressLabel}</Text></View><MaterialIcons name={addressMenuOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={22} color="#8A8173" /></Pressable>{addressMenuOpen ? <View style={styles.addressMenu}>{profile?.addresses.map((address) => <Pressable key={address.id} accessibilityRole="button" onPress={() => chooseAddress(address)} style={({ pressed }) => [styles.addressOption, pressed && styles.optionPressed]}><MaterialIcons name={address.id === selectedAddress.id ? "check-circle" : "radio-button-unchecked"} size={19} color="#6B7B3F" /><View style={styles.addressCopy}><Text style={styles.optionTitle}>{address.label}</Text><Text numberOfLines={1} style={styles.optionText}>{address.addressLabel}</Text></View></Pressable>)}</View> : null}</View> : <View style={styles.emptyAddress}><MaterialIcons name="location-off" size={22} color="#8A8173" /><Text style={styles.emptyAddressText}>أضف عنوانًا محفوظًا أولًا للبحث عن مقدمي الخدمة الأقرب إليك.</Text><Pressable accessibilityRole="button" onPress={() => router.push("/profile" as never)} style={({ pressed }) => [styles.addAddressButton, pressed && styles.pressed]}><Text style={styles.addAddressText}>الذهاب إلى حسابي</Text></Pressable></View>}
          <View style={styles.resultsHeading}><View><Text style={styles.resultsTitle}>مقدمو الخدمة الأقرب</Text><Text style={styles.resultsCaption}>يظهر أولًا مقدمو الخدمة المسجلون في التطبيق</Text></View><Text style={styles.sortText}>{HOME_SERVICE_SORT_LABELS[sort]}</Text></View>
          {sortedProviders.map((provider) => <ProviderResultCard key={provider.id} provider={provider} serviceLabel={service.title} specialtyId={service.id} tint={service.surface} />)}
          {providers.map((provider) => <Pressable key={provider.id} accessibilityRole="button" onPress={() => Alert.alert(provider.name, "سيُضاف عرض الملف الشخصي لمقدم الخدمة والحجز في مرحلة لاحقة.")} style={({ pressed }) => [styles.providerCard, pressed && styles.pressed]}><View style={[styles.providerAvatar, { backgroundColor: service.surface }]}><Text style={[styles.avatarText, { color: service.tint }]}>{provider.initials}</Text></View><View style={styles.providerInfo}><Text style={styles.providerName}>{provider.name}</Text><Text style={styles.providerService}>{service.providerType}</Text><View style={styles.providerMeta}><View style={styles.metaItem}><MaterialIcons name="star" size={14} color="#C9A961" /><Text style={styles.metaText}>{provider.rating} ({provider.reviewCount})</Text></View><View style={styles.metaItem}><MaterialIcons name="location-on" size={14} color="#6B7B3F" /><Text style={styles.metaText}>{provider.distanceKm} كم</Text></View></View></View><View style={styles.priceBlock}><Text style={styles.price}>{provider.price}</Text><Text style={styles.currency}>ر.س</Text></View></Pressable>)}
        </ScrollView>
        {filterOpen ? <View style={styles.filterMenu}>{SORT_OPTIONS.map((option) => <Pressable key={option} accessibilityRole="button" onPress={() => chooseSort(option)} style={({ pressed }) => [styles.filterOption, sort === option && styles.filterOptionActive, pressed && styles.optionPressed]}><Text style={[styles.filterText, sort === option && styles.filterTextActive]}>{HOME_SERVICE_SORT_LABELS[option]}</Text>{sort === option ? <MaterialIcons name="check" size={17} color="#6B7B3F" /> : null}</Pressable>)}</View> : null}
        <Pressable accessibilityRole="button" accessibilityLabel="فلترة النتائج" onPress={() => setFilterOpen((open) => !open)} style={({ pressed }) => [styles.filterButton, pressed && styles.filterPressed]}><MaterialIcons name="tune" size={22} color="#FFFFFF" /><Text style={styles.filterButtonText}>فلترة</Text></Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 }, content: { padding: 20, paddingBottom: 94 }, header: { alignItems: "flex-start", flexDirection: "row", gap: 12 }, backButton: { alignItems: "center", backgroundColor: "#F0EBDD", borderColor: "#E4DCCB", borderRadius: 16, borderWidth: 1, height: 40, justifyContent: "center", width: 40 }, headerCopy: { flex: 1 }, title: { color: "#465132", fontSize: 21, fontWeight: "800", lineHeight: 27, textAlign: "right" }, subtitle: { color: "#8A8173", fontSize: 12, marginTop: 2, textAlign: "right" }, serviceChip: { alignItems: "center", alignSelf: "flex-end", borderRadius: 12, flexDirection: "row-reverse", gap: 6, marginTop: 15, paddingHorizontal: 10, paddingVertical: 7 }, serviceChipText: { fontSize: 12, fontWeight: "800" }, label: { color: "#5A624B", fontSize: 13, fontWeight: "800", marginTop: 18, textAlign: "right" },
  addressPicker: { alignItems: "center", backgroundColor: "#FFFDF8", borderColor: "#E8E0D1", borderRadius: 15, borderWidth: 1, flexDirection: "row-reverse", gap: 9, marginTop: 8, minHeight: 57, paddingHorizontal: 12 }, addressCopy: { flex: 1 }, addressLabel: { color: "#5A624B", fontSize: 12, fontWeight: "800", textAlign: "right" }, addressValue: { color: "#8A8173", fontSize: 10, marginTop: 2, textAlign: "right" }, addressMenu: { backgroundColor: "#FFFDF8", borderColor: "#E8E0D1", borderRadius: 14, borderWidth: 1, marginTop: 5, overflow: "hidden" }, addressOption: { alignItems: "center", borderBottomColor: "#F0EBDD", borderBottomWidth: 1, flexDirection: "row-reverse", gap: 9, minHeight: 55, paddingHorizontal: 12 }, optionTitle: { color: "#5A624B", fontSize: 12, fontWeight: "800", textAlign: "right" }, optionText: { color: "#8A8173", fontSize: 10, marginTop: 2, textAlign: "right" }, optionPressed: { backgroundColor: "#F8F5ED" }, emptyAddress: { alignItems: "center", backgroundColor: "#F0EBDD", borderRadius: 15, gap: 6, marginTop: 8, padding: 15 }, emptyAddressText: { color: "#786F61", fontSize: 11, lineHeight: 16, textAlign: "center" }, addAddressButton: { backgroundColor: "#6B7B3F", borderRadius: 10, marginTop: 3, paddingHorizontal: 11, paddingVertical: 7 }, addAddressText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  resultsHeading: { alignItems: "flex-end", flexDirection: "row-reverse", justifyContent: "space-between", marginTop: 20 }, resultsTitle: { color: "#465132", fontSize: 17, fontWeight: "800", textAlign: "right" }, resultsCaption: { color: "#9A907E", fontSize: 10, marginTop: 1, textAlign: "right" }, sortText: { color: "#6B7B3F", fontSize: 10, fontWeight: "800" }, providerCard: { alignItems: "center", backgroundColor: "#FFFDF8", borderColor: "#E8E0D1", borderRadius: 17, borderWidth: 1, flexDirection: "row-reverse", gap: 10, marginTop: 10, minHeight: 91, padding: 11 }, providerAvatar: { alignItems: "center", borderRadius: 24, height: 48, justifyContent: "center", width: 48 }, avatarText: { fontSize: 12, fontWeight: "800" }, providerInfo: { flex: 1 }, providerName: { color: "#465132", fontSize: 14, fontWeight: "800", textAlign: "right" }, providerService: { color: "#8A8173", fontSize: 11, marginTop: 2, textAlign: "right" }, providerMeta: { flexDirection: "row-reverse", gap: 9, marginTop: 6 }, metaItem: { alignItems: "center", flexDirection: "row-reverse", gap: 3 }, metaText: { color: "#786F61", fontSize: 10 }, priceBlock: { alignItems: "center", backgroundColor: "#F8F5ED", borderRadius: 11, minWidth: 46, paddingHorizontal: 6, paddingVertical: 7 }, price: { color: "#5A624B", fontSize: 13, fontWeight: "800" }, currency: { color: "#8A8173", fontSize: 9, marginTop: 1 },
  filterButton: { alignItems: "center", backgroundColor: "#6B7B3F", borderRadius: 18, bottom: 16, flexDirection: "row-reverse", gap: 5, left: 16, paddingHorizontal: 14, paddingVertical: 10, position: "absolute", shadowColor: "#465132", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6 }, filterButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" }, filterPressed: { opacity: 0.84, transform: [{ scale: 0.97 }] }, filterMenu: { backgroundColor: "#FFFDF8", borderColor: "#E8E0D1", borderRadius: 15, borderWidth: 1, bottom: 66, left: 16, overflow: "hidden", position: "absolute", width: 155 }, filterOption: { alignItems: "center", flexDirection: "row-reverse", justifyContent: "space-between", minHeight: 39, paddingHorizontal: 11 }, filterOptionActive: { backgroundColor: "#EFF2E6" }, filterText: { color: "#786F61", fontSize: 11, textAlign: "right" }, filterTextActive: { color: "#465132", fontWeight: "800" }, pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});

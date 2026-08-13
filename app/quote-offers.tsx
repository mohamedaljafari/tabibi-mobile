import { useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { getPatientProfile } from "@/lib/patient-profile";
import { addWalletEntry } from "@/lib/wallets";
import { getOfferSourceLabel, getPaymentMethodLabel, getQuoteOfferRating, getQuoteOffers, QUOTE_OFFER_SORT_LABELS, type LocalPaymentMethod, type QuoteOfferFilter, type QuoteOfferQuery, type QuoteOfferSort, type QuoteOfferSource } from "@/lib/quote-offers";

const FILTERS: { id: QuoteOfferFilter; label: string }[] = [
  { id: "all", label: "الكل" },
  { id: "pharmacy", label: "الصيدليات" },
  { id: "lab", label: "المختبرات" },
];

const PRICE_LIMITS: { id: number | null; label: string }[] = [
  { id: null, label: "الكل" },
  { id: 100, label: "حتى 100" },
  { id: 150, label: "حتى 150" },
  { id: 200, label: "حتى 200" },
];

const DISTANCE_LIMITS: { id: number | null; label: string }[] = [
  { id: null, label: "الكل" },
  { id: 2, label: "حتى 2 كم" },
  { id: 4, label: "حتى 4 كم" },
  { id: 6, label: "حتى 6 كم" },
];

export default function QuoteOffersScreen() {
  const params = useLocalSearchParams<{ source?: QuoteOfferSource }>();
  const initialFilter: QuoteOfferFilter = params.source === "pharmacy" || params.source === "lab" ? params.source : "all";
  const [filter, setFilter] = useState<QuoteOfferFilter>(initialFilter);
  const [sort, setSort] = useState<QuoteOfferSort>("price-asc");
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<LocalPaymentMethod | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const query: QuoteOfferQuery = useMemo(() => ({ filter, sort, maxPrice, maxDistanceKm }), [filter, sort, maxPrice, maxDistanceKm]);
  const offers = useMemo(() => getQuoteOffers(query), [query]);
  const selectedOffer = useMemo(() => getQuoteOffers({ ...query, filter: "all", sort: "price-asc", maxPrice: null, maxDistanceKm: null }).find((offer) => offer.id === selectedOfferId) ?? null, [selectedOfferId]);
  const visibleOffers = isConfirmed && selectedOffer ? [selectedOffer] : offers;

  const changeFilter = (nextFilter: QuoteOfferFilter) => {
    setFilter(nextFilter);
    setSelectedOfferId(null);
    setPaymentMethod(null);
    setIsConfirmed(false);
  };

  const resetToggles = () => {
    setSelectedOfferId(null);
    setPaymentMethod(null);
    setIsConfirmed(false);
  };

  const confirmOffer = async () => {
    if (!selectedOffer) {
      Alert.alert("اختر عرضًا", "اختر عرضًا واحدًا أولًا للمتابعة إلى طريقة الدفع.");
      return;
    }
    if (!paymentMethod) {
      Alert.alert("اختر طريقة الدفع", "اختر الدفع الإلكتروني أو الدفع نقدًا لإتمام اختيار العرض.");
      return;
    }
    // قيد «دفع مقابل خدمة» يُسجَّل تلقائيًا في محفظة المريض عند تأكيد العرض المدفوع.
    const profile = await getPatientProfile();
    if (profile) {
      try {
        await addWalletEntry({
          ownerId: profile.phone,
          ownerName: profile.fullName,
          role: "patient",
          kind: "debit",
          type: "payment",
          amount: selectedOffer.total,
          description: `دفع مقابل عرض ${selectedOffer.providerName} (${getOfferSourceLabel(selectedOffer.source)}: ${selectedOffer.itemsSummary})`,
          reference: `عرض ${selectedOffer.id} · ${paymentMethod === "electronic" ? "إلكتروني" : "نقدي"}`,
        });
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (error) {
        // تسجيل القيود معلوماتي؛ لا يمنع اعتماد العرض، ويُنبَّه المستخدم برسالة.
        Alert.alert(
          "تعذّر تسجيل القيد المحاسبي",
          error instanceof Error ? error.message : "حدث خطأ غير متوقع عند تسجيل الدفع في المحفظة.",
        );
      }
    }
    setIsConfirmed(true);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="رجوع" onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}><MaterialIcons name="arrow-forward" size={22} color="#6B7B3F" /></Pressable>
          <View style={styles.headerCopy}><Text style={styles.title}>عروض الأسعار</Text><Text style={styles.subtitle}>اختر العرض الأنسب من الصيدليات أو المختبرات.</Text></View>
        </View>

        <View style={styles.notice}><MaterialIcons name="info-outline" size={20} color="#627F9D" /><Text style={styles.noticeText}>هذه العروض نموذجية محلية في هذه المرحلة، ولا يجري تحصيل أي دفعة فعلية قبل ربط بوابة الدفع.</Text></View>

        {!isConfirmed ? <View style={styles.filterRow}>{FILTERS.map((item) => <Pressable key={item.id} accessibilityRole="button" onPress={() => changeFilter(item.id)} style={({ pressed }) => [styles.filterButton, filter === item.id && styles.filterButtonActive, pressed && styles.pressed]}><Text style={[styles.filterText, filter === item.id && styles.filterTextActive]}>{item.label}</Text></Pressable>)}</View> : null}

        {!isConfirmed ? <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>فرز حسب</Text>
          <View style={styles.sortRow}>{Object.entries(QUOTE_OFFER_SORT_LABELS).map(([id, label]) => <Pressable key={id} accessibilityRole="button" onPress={() => { setSort(id as QuoteOfferSort); resetToggles(); }} style={({ pressed }) => [styles.sortChip, sort === id && styles.sortChipActive, pressed && styles.pressed]}><MaterialIcons name={id === "price-asc" ? "attach-money" : id === "price-desc" ? "monetization-on" : id === "distance" ? "near-me" : "star"} size={15} color={sort === id ? "#FFFFFF" : "#786F61"} /><Text style={[styles.sortChipText, sort === id && styles.sortChipTextActive]}>{label}</Text></Pressable>)}</View>
          <View style={styles.limitRow}>
            <View style={styles.limitGroup}>
              <Text style={styles.filterSectionTitle}>سعر حتى</Text>
              <View style={styles.limitChips}>{PRICE_LIMITS.map((item) => <Pressable key={String(item.id ?? "all")} accessibilityRole="button" onPress={() => { setMaxPrice(item.id); resetToggles(); }} style={({ pressed }) => [styles.limitChip, maxPrice === item.id && styles.limitChipActive, pressed && styles.pressed]}><Text style={[styles.limitChipText, maxPrice === item.id && styles.limitChipTextActive]}>{item.label}</Text></Pressable>)}</View>
            </View>
            <View style={styles.limitGroup}>
              <Text style={styles.filterSectionTitle}>مسافة حتى</Text>
              <View style={styles.limitChips}>{DISTANCE_LIMITS.map((item) => <Pressable key={String(item.id ?? "all")} accessibilityRole="button" onPress={() => { setMaxDistanceKm(item.id); resetToggles(); }} style={({ pressed }) => [styles.limitChip, maxDistanceKm === item.id && styles.limitChipActive, pressed && styles.pressed]}><Text style={[styles.limitChipText, maxDistanceKm === item.id && styles.limitChipTextActive]}>{item.label}</Text></Pressable>)}</View>
            </View>
          </View>
        </View> : null}

        <View style={styles.resultsHeader}><Text style={styles.resultsTitle}>{isConfirmed ? "العرض الذي اخترته" : "العروض المتاحة"}</Text><Text style={styles.resultsCount}>{visibleOffers.length} {visibleOffers.length === 1 ? "عرض" : "عروض"}</Text></View>

        {visibleOffers.map((offer) => {
          const isSelected = selectedOfferId === offer.id;
          return (
            <Pressable key={offer.id} accessibilityRole="button" accessibilityState={{ selected: isSelected }} onPress={() => !isConfirmed && setSelectedOfferId(offer.id)} style={({ pressed }) => [styles.offerCard, isSelected && styles.offerCardSelected, pressed && !isConfirmed && styles.pressed]}>
              <View style={styles.offerTop}><View style={[styles.sourceBadge, offer.source === "lab" && styles.labBadge]}><MaterialIcons name={offer.source === "pharmacy" ? "local-pharmacy" : "science"} size={16} color={offer.source === "pharmacy" ? "#6B7B3F" : "#627F9D"} /><Text style={[styles.sourceText, offer.source === "lab" && styles.labText]}>{getOfferSourceLabel(offer.source)}</Text></View>{isSelected ? <MaterialIcons name="check-circle" size={23} color="#6B7B3F" /> : <MaterialIcons name="radio-button-unchecked" size={22} color="#B6AC9B" />}</View>
              <View style={styles.providerRow}><View style={styles.providerCopy}><Text style={styles.providerName}>{offer.providerName}</Text><Text style={styles.providerSubtitle}>{offer.providerSubtitle}</Text></View><View style={styles.priceBlock}><Text style={styles.price}>{offer.total}</Text><Text style={styles.currency}>د.ل</Text></View></View>
              <View style={styles.detailLine}><MaterialIcons name="check-circle-outline" size={16} color="#6B7B3F" /><Text style={styles.detailText}>{offer.itemsSummary}</Text></View>
              <View style={styles.detailLine}><MaterialIcons name="schedule" size={16} color="#6B7B3F" /><Text style={styles.detailText}>{offer.fulfilment}</Text></View>
              <View style={styles.detailLine}><MaterialIcons name="place" size={16} color="#6B7B3F" /><Text style={styles.detailText}>{offer.distanceKm} كم · {offer.validUntil}</Text><View style={styles.ratingChip}><MaterialIcons name="star" size={12} color="#C9A961" /><Text style={styles.ratingText}>{getQuoteOfferRating(offer).toFixed(1)}</Text></View></View>
              <View style={styles.offerNote}><Text style={styles.noteText}>{offer.note}</Text></View>
            </Pressable>
          );
        })}

        {selectedOffer && !isConfirmed ? <View style={styles.paymentCard}>
          <Text style={styles.paymentTitle}>طريقة الدفع</Text>
          <Text style={styles.paymentHint}>اختر الطريقة المناسبة لإتمام اختيار عرض {selectedOffer.providerName}.</Text>
          <View style={styles.paymentOptions}>
            <Pressable accessibilityRole="button" onPress={() => setPaymentMethod("electronic")} style={({ pressed }) => [styles.paymentOption, paymentMethod === "electronic" && styles.paymentOptionActive, pressed && styles.pressed]}><MaterialIcons name="credit-card" size={21} color={paymentMethod === "electronic" ? "#FFFFFF" : "#627F9D"} /><Text style={[styles.paymentOptionText, paymentMethod === "electronic" && styles.paymentOptionTextActive]}>دفع إلكتروني</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => setPaymentMethod("cash")} style={({ pressed }) => [styles.paymentOption, paymentMethod === "cash" && styles.paymentOptionActive, pressed && styles.pressed]}><MaterialIcons name="payments" size={21} color={paymentMethod === "cash" ? "#FFFFFF" : "#627F9D"} /><Text style={[styles.paymentOptionText, paymentMethod === "cash" && styles.paymentOptionTextActive]}>دفع نقدي</Text></Pressable>
          </View>
          <Pressable accessibilityRole="button" onPress={confirmOffer} style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed]}><Text style={styles.confirmText}>تأكيد العرض وطريقة الدفع</Text><MaterialIcons name="arrow-back" size={19} color="#FFFFFF" /></Pressable>
        </View> : null}

        {isConfirmed && selectedOffer && paymentMethod ? <View style={styles.confirmedCard}><View style={styles.confirmedIcon}><MaterialIcons name="check" size={28} color="#FFFFFF" /></View><Text style={styles.confirmedTitle}>تم اختيار العرض</Text><Text style={styles.confirmedText}>تم اعتماد عرض {selectedOffer.providerName} عبر {getPaymentMethodLabel(paymentMethod)}. أُخفيت العروض الأخرى لهذا الطلب.</Text><Text style={styles.confirmedHint}>{paymentMethod === "electronic" ? "سيُضاف الربط ببوابة الدفع عند توفيرها." : "يُستكمل الدفع نقدًا عند التوصيل أو الزيارة."}</Text><Pressable accessibilityRole="button" onPress={() => router.replace("/home" as never)} style={({ pressed }) => [styles.homeButton, pressed && styles.pressed]}><Text style={styles.homeButtonText}>العودة إلى الرئيسية</Text></Pressable></View> : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 20 },
  header: { alignItems: "flex-start", flexDirection: "row", gap: 8 },
  backButton: { alignItems: "center", backgroundColor: "#F0EBDD", borderColor: "#E4DCCB", borderRadius: 16, borderWidth: 1, height: 40, justifyContent: "center", width: 40 },
  headerCopy: { flex: 1 },
  title: { color: "#465132", fontSize: 17, fontWeight: "800", lineHeight: 24, textAlign: "right" },
  subtitle: { color: "#8A8173", fontSize: 12, lineHeight: 17, marginTop: 2, textAlign: "right" },
  notice: { alignItems: "center", backgroundColor: "#EBF1F6", borderRadius: 11, flexDirection: "row-reverse", gap: 6, marginTop: 10, padding: 8 },
  noticeText: { color: "#526E89", flex: 1, fontSize: 11, lineHeight: 16, textAlign: "right" },
  filterRow: { flexDirection: "row-reverse", gap: 5, marginTop: 8 },
  filterSection: { backgroundColor: "#FFFDF8", borderColor: "#E8E0D1", borderRadius: 13, borderWidth: 1, marginTop: 9, padding: 9 },
  filterSectionTitle: { color: "#675F53", fontSize: 11, fontWeight: "800", textAlign: "right" },
  sortRow: { flexDirection: "row-reverse", gap: 5, marginTop: 6 },
  sortChip: { alignItems: "center", backgroundColor: "#F8F3E8", borderColor: "#E4DCCB", borderRadius: 10, borderWidth: 1, flexDirection: "row-reverse", gap: 4, justifyContent: "center", paddingHorizontal: 8, paddingVertical: 6 },
  sortChipActive: { backgroundColor: "#6B7B3F", borderColor: "#6B7B3F" },
  sortChipText: { color: "#786F61", fontSize: 10, fontWeight: "800" },
  sortChipTextActive: { color: "#FFFFFF" },
  limitRow: { flexDirection: "row-reverse", gap: 10, marginTop: 8 },
  limitGroup: { flex: 1 },
  limitChips: { flexDirection: "row-reverse", gap: 4, marginTop: 5 },
  limitChip: { backgroundColor: "#F4F8FB", borderColor: "#D8E4ED", borderRadius: 8, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 4 },
  limitChipActive: { backgroundColor: "#627F9D", borderColor: "#627F9D" },
  limitChipText: { color: "#526E89", fontSize: 9, fontWeight: "800" },
  limitChipTextActive: { color: "#FFFFFF" },
  ratingChip: { alignItems: "center", backgroundColor: "#FAF4E4", borderColor: "#EADDB6", borderRadius: 7, borderWidth: 1, flexDirection: "row-reverse", gap: 2, marginLeft: 4, paddingHorizontal: 5, paddingVertical: 3 },
  ratingText: { color: "#96772F", fontSize: 10, fontWeight: "800" },
  filterButton: { backgroundColor: "#F8F3E8", borderColor: "#E4DCCB", borderRadius: 11, borderWidth: 1, flex: 1, minHeight: 39, justifyContent: "center" },
  filterButtonActive: { backgroundColor: "#6B7B3F", borderColor: "#6B7B3F" },
  filterText: { color: "#786F61", fontSize: 11, fontWeight: "800", textAlign: "center" },
  filterTextActive: { color: "#FFFFFF" },
  resultsHeader: { alignItems: "center", flexDirection: "row-reverse", justifyContent: "space-between", marginTop: 11 },
  resultsTitle: { color: "#465132", fontSize: 17, fontWeight: "800", textAlign: "right" },
  resultsCount: { color: "#6B7B3F", fontSize: 11, fontWeight: "800" },
  offerCard: { backgroundColor: "#FFFDF8", borderColor: "#E8E0D1", borderRadius: 13, borderWidth: 1, marginTop: 7, padding: 9 },
  offerCardSelected: { backgroundColor: "#FBFDF5", borderColor: "#6B7B3F", borderWidth: 1.5 },
  offerTop: { alignItems: "center", flexDirection: "row-reverse", justifyContent: "space-between" },
  sourceBadge: { alignItems: "center", backgroundColor: "#EFF2E6", borderRadius: 9, flexDirection: "row-reverse", gap: 4, paddingHorizontal: 8, paddingVertical: 5 },
  labBadge: { backgroundColor: "#EBF1F6" },
  sourceText: { color: "#6B7B3F", fontSize: 10, fontWeight: "800" },
  labText: { color: "#627F9D" },
  providerRow: { alignItems: "center", flexDirection: "row-reverse", justifyContent: "space-between", marginTop: 6 },
  providerCopy: { flex: 1 },
  providerName: { color: "#465132", fontSize: 15, fontWeight: "800", textAlign: "right" },
  providerSubtitle: { color: "#8A8173", fontSize: 10, marginTop: 2, textAlign: "right" },
  priceBlock: { alignItems: "center", backgroundColor: "#F8F3E8", borderRadius: 11, minWidth: 52, paddingHorizontal: 7, paddingVertical: 6 },
  price: { color: "#465132", fontSize: 14, fontWeight: "800" },
  currency: { color: "#8A8173", fontSize: 9, marginTop: 1 },
  detailLine: { alignItems: "center", flexDirection: "row-reverse", gap: 5, marginTop: 5 },
  detailText: { color: "#675F53", flex: 1, fontSize: 11, lineHeight: 16, textAlign: "right" },
  offerNote: { backgroundColor: "#F8F5ED", borderRadius: 7, marginTop: 5, padding: 6 },
  noteText: { color: "#817667", fontSize: 10, lineHeight: 14, textAlign: "right" },
  paymentCard: { backgroundColor: "#FFFDF8", borderColor: "#D7E0C5", borderRadius: 14, borderWidth: 1, marginTop: 10, padding: 10 },
  paymentTitle: { color: "#465132", fontSize: 15, fontWeight: "800", textAlign: "right" },
  paymentHint: { color: "#786F61", fontSize: 11, lineHeight: 16, marginTop: 3, textAlign: "right" },
  paymentOptions: { flexDirection: "row-reverse", gap: 6, marginTop: 7 },
  paymentOption: { alignItems: "center", backgroundColor: "#F4F8FB", borderColor: "#D8E4ED", borderRadius: 12, borderWidth: 1, flex: 1, flexDirection: "row-reverse", gap: 6, justifyContent: "center", minHeight: 48 },
  paymentOptionActive: { backgroundColor: "#627F9D", borderColor: "#627F9D" },
  paymentOptionText: { color: "#526E89", fontSize: 11, fontWeight: "800" },
  paymentOptionTextActive: { color: "#FFFFFF" },
  confirmButton: { alignItems: "center", backgroundColor: "#6B7B3F", borderRadius: 10, flexDirection: "row-reverse", gap: 5, justifyContent: "center", marginTop: 8, minHeight: 40 },
  confirmText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  confirmedCard: { alignItems: "center", backgroundColor: "#EFF2E6", borderRadius: 14, marginTop: 11, padding: 13 },
  confirmedIcon: { alignItems: "center", backgroundColor: "#6B7B3F", borderRadius: 23, height: 46, justifyContent: "center", width: 46 },
  confirmedTitle: { color: "#465132", fontSize: 14, fontWeight: "800", marginTop: 6, textAlign: "center" },
  confirmedText: { color: "#5D6552", fontSize: 11, lineHeight: 16, marginTop: 3, textAlign: "center" },
  confirmedHint: { color: "#786F61", fontSize: 11, lineHeight: 16, marginTop: 6, textAlign: "center" },
  homeButton: { backgroundColor: "#465132", borderRadius: 9, marginTop: 8, paddingHorizontal: 14, paddingVertical: 7 },
  homeButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});

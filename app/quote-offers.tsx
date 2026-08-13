import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";
import { getOfferSourceLabel, getPaymentMethodLabel, getQuoteOffers, type LocalPaymentMethod, type QuoteOfferFilter, type QuoteOfferSource } from "@/lib/quote-offers";

const FILTERS: { id: QuoteOfferFilter; label: string }[] = [
  { id: "all", label: "الكل" },
  { id: "pharmacy", label: "الصيدليات" },
  { id: "lab", label: "المختبرات" },
];

export default function QuoteOffersScreen() {
  const params = useLocalSearchParams<{ source?: QuoteOfferSource }>();
  const initialFilter: QuoteOfferFilter = params.source === "pharmacy" || params.source === "lab" ? params.source : "all";
  const [filter, setFilter] = useState<QuoteOfferFilter>(initialFilter);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<LocalPaymentMethod | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const offers = useMemo(() => getQuoteOffers(filter), [filter]);
  const selectedOffer = useMemo(() => getQuoteOffers("all").find((offer) => offer.id === selectedOfferId) ?? null, [selectedOfferId]);
  const visibleOffers = isConfirmed && selectedOffer ? [selectedOffer] : offers;

  const changeFilter = (nextFilter: QuoteOfferFilter) => {
    setFilter(nextFilter);
    setSelectedOfferId(null);
    setPaymentMethod(null);
    setIsConfirmed(false);
  };

  const confirmOffer = () => {
    if (!selectedOffer) {
      Alert.alert("اختر عرضًا", "اختر عرضًا واحدًا أولًا للمتابعة إلى طريقة الدفع.");
      return;
    }
    if (!paymentMethod) {
      Alert.alert("اختر طريقة الدفع", "اختر الدفع الإلكتروني أو الدفع نقدًا لإتمام اختيار العرض.");
      return;
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

        <View style={styles.resultsHeader}><Text style={styles.resultsTitle}>{isConfirmed ? "العرض الذي اخترته" : "العروض المتاحة"}</Text><Text style={styles.resultsCount}>{visibleOffers.length} {visibleOffers.length === 1 ? "عرض" : "عروض"}</Text></View>

        {visibleOffers.map((offer) => {
          const isSelected = selectedOfferId === offer.id;
          return (
            <Pressable key={offer.id} accessibilityRole="button" accessibilityState={{ selected: isSelected }} onPress={() => !isConfirmed && setSelectedOfferId(offer.id)} style={({ pressed }) => [styles.offerCard, isSelected && styles.offerCardSelected, pressed && !isConfirmed && styles.pressed]}>
              <View style={styles.offerTop}><View style={[styles.sourceBadge, offer.source === "lab" && styles.labBadge]}><MaterialIcons name={offer.source === "pharmacy" ? "local-pharmacy" : "science"} size={16} color={offer.source === "pharmacy" ? "#6B7B3F" : "#627F9D"} /><Text style={[styles.sourceText, offer.source === "lab" && styles.labText]}>{getOfferSourceLabel(offer.source)}</Text></View>{isSelected ? <MaterialIcons name="check-circle" size={23} color="#6B7B3F" /> : <MaterialIcons name="radio-button-unchecked" size={22} color="#B6AC9B" />}</View>
              <View style={styles.providerRow}><View style={styles.providerCopy}><Text style={styles.providerName}>{offer.providerName}</Text><Text style={styles.providerSubtitle}>{offer.providerSubtitle}</Text></View><View style={styles.priceBlock}><Text style={styles.price}>{offer.total}</Text><Text style={styles.currency}>د.ل</Text></View></View>
              <View style={styles.detailLine}><MaterialIcons name="check-circle-outline" size={16} color="#6B7B3F" /><Text style={styles.detailText}>{offer.itemsSummary}</Text></View>
              <View style={styles.detailLine}><MaterialIcons name="schedule" size={16} color="#6B7B3F" /><Text style={styles.detailText}>{offer.fulfilment}</Text></View>
              <View style={styles.detailLine}><MaterialIcons name="place" size={16} color="#6B7B3F" /><Text style={styles.detailText}>{offer.distanceKm} كم · {offer.validUntil}</Text></View>
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
  content: { padding: 20, paddingBottom: 30 },
  header: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  backButton: { alignItems: "center", backgroundColor: "#F0EBDD", borderColor: "#E4DCCB", borderRadius: 16, borderWidth: 1, height: 40, justifyContent: "center", width: 40 },
  headerCopy: { flex: 1 },
  title: { color: "#465132", fontSize: 21, fontWeight: "800", lineHeight: 28, textAlign: "right" },
  subtitle: { color: "#8A8173", fontSize: 12, lineHeight: 17, marginTop: 2, textAlign: "right" },
  notice: { alignItems: "center", backgroundColor: "#EBF1F6", borderRadius: 15, flexDirection: "row-reverse", gap: 8, marginTop: 18, padding: 11 },
  noticeText: { color: "#526E89", flex: 1, fontSize: 11, lineHeight: 16, textAlign: "right" },
  filterRow: { flexDirection: "row-reverse", gap: 7, marginTop: 15 },
  filterButton: { backgroundColor: "#F8F3E8", borderColor: "#E4DCCB", borderRadius: 11, borderWidth: 1, flex: 1, minHeight: 39, justifyContent: "center" },
  filterButtonActive: { backgroundColor: "#6B7B3F", borderColor: "#6B7B3F" },
  filterText: { color: "#786F61", fontSize: 11, fontWeight: "800", textAlign: "center" },
  filterTextActive: { color: "#FFFFFF" },
  resultsHeader: { alignItems: "center", flexDirection: "row-reverse", justifyContent: "space-between", marginTop: 20 },
  resultsTitle: { color: "#465132", fontSize: 17, fontWeight: "800", textAlign: "right" },
  resultsCount: { color: "#6B7B3F", fontSize: 11, fontWeight: "800" },
  offerCard: { backgroundColor: "#FFFDF8", borderColor: "#E8E0D1", borderRadius: 18, borderWidth: 1, marginTop: 11, padding: 13 },
  offerCardSelected: { backgroundColor: "#FBFDF5", borderColor: "#6B7B3F", borderWidth: 1.5 },
  offerTop: { alignItems: "center", flexDirection: "row-reverse", justifyContent: "space-between" },
  sourceBadge: { alignItems: "center", backgroundColor: "#EFF2E6", borderRadius: 9, flexDirection: "row-reverse", gap: 4, paddingHorizontal: 8, paddingVertical: 5 },
  labBadge: { backgroundColor: "#EBF1F6" },
  sourceText: { color: "#6B7B3F", fontSize: 10, fontWeight: "800" },
  labText: { color: "#627F9D" },
  providerRow: { alignItems: "center", flexDirection: "row-reverse", justifyContent: "space-between", marginTop: 10 },
  providerCopy: { flex: 1 },
  providerName: { color: "#465132", fontSize: 15, fontWeight: "800", textAlign: "right" },
  providerSubtitle: { color: "#8A8173", fontSize: 10, marginTop: 2, textAlign: "right" },
  priceBlock: { alignItems: "center", backgroundColor: "#F8F3E8", borderRadius: 11, minWidth: 52, paddingHorizontal: 7, paddingVertical: 6 },
  price: { color: "#465132", fontSize: 14, fontWeight: "800" },
  currency: { color: "#8A8173", fontSize: 9, marginTop: 1 },
  detailLine: { alignItems: "center", flexDirection: "row-reverse", gap: 6, marginTop: 8 },
  detailText: { color: "#675F53", flex: 1, fontSize: 11, lineHeight: 16, textAlign: "right" },
  offerNote: { backgroundColor: "#F8F5ED", borderRadius: 9, marginTop: 9, padding: 8 },
  noteText: { color: "#817667", fontSize: 10, lineHeight: 14, textAlign: "right" },
  paymentCard: { backgroundColor: "#FFFDF8", borderColor: "#D7E0C5", borderRadius: 19, borderWidth: 1, marginTop: 17, padding: 14 },
  paymentTitle: { color: "#465132", fontSize: 15, fontWeight: "800", textAlign: "right" },
  paymentHint: { color: "#786F61", fontSize: 11, lineHeight: 16, marginTop: 3, textAlign: "right" },
  paymentOptions: { flexDirection: "row-reverse", gap: 8, marginTop: 11 },
  paymentOption: { alignItems: "center", backgroundColor: "#F4F8FB", borderColor: "#D8E4ED", borderRadius: 12, borderWidth: 1, flex: 1, flexDirection: "row-reverse", gap: 6, justifyContent: "center", minHeight: 48 },
  paymentOptionActive: { backgroundColor: "#627F9D", borderColor: "#627F9D" },
  paymentOptionText: { color: "#526E89", fontSize: 11, fontWeight: "800" },
  paymentOptionTextActive: { color: "#FFFFFF" },
  confirmButton: { alignItems: "center", backgroundColor: "#6B7B3F", borderRadius: 13, flexDirection: "row-reverse", gap: 7, justifyContent: "center", marginTop: 13, minHeight: 48 },
  confirmText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  confirmedCard: { alignItems: "center", backgroundColor: "#EFF2E6", borderRadius: 20, marginTop: 18, padding: 20 },
  confirmedIcon: { alignItems: "center", backgroundColor: "#6B7B3F", borderRadius: 23, height: 46, justifyContent: "center", width: 46 },
  confirmedTitle: { color: "#465132", fontSize: 17, fontWeight: "800", marginTop: 10, textAlign: "center" },
  confirmedText: { color: "#5D6552", fontSize: 12, lineHeight: 18, marginTop: 5, textAlign: "center" },
  confirmedHint: { color: "#786F61", fontSize: 11, lineHeight: 16, marginTop: 6, textAlign: "center" },
  homeButton: { backgroundColor: "#465132", borderRadius: 12, marginTop: 14, paddingHorizontal: 18, paddingVertical: 10 },
  homeButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});

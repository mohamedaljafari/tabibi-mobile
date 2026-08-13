/**
 * صفحة تفاصيل مقدم الخدمة (المريض).
 *
 * تعرض ملف مقدم خدمة حقيقي (مفعّل) مع:
 * - الصورة الاختيارية أو الأحرف الأولى
 * - الاسم والصفة والتخصصات وسنوات الخبرة والنبذة
 * - شارة «موثّق» وشريط التوفر
 * - قائمة خدماته مع السعر والمدة لكل خدمة، وإمكانية اختيار أكثر من خدمة
 * - زر إرسال الطلب للخدمات المختارة
 *
 * تدعم أيضًا بطاقات الأطباء النموذجية (demoDoctorId) لعرض تهيئة موحدة.
 */
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { DEMO_DOCTORS, getDoctorSpecialty, type DemoDoctor } from "@/lib/doctor-directory";
import {
  formatProviderAvailability,
  formatYearsOfExperience,
  initialsFromName,
  readProviderAccounts,
  type ProviderAccount,
} from "@/lib/provider-registry";

export default function DoctorDetailScreen() {
  const { specialtyId, providerId, demoDoctorId } = useLocalSearchParams<{
    specialtyId?: string;
    providerId?: string;
    demoDoctorId?: string;
  }>();
  const specialty = getDoctorSpecialty(specialtyId);

  const [accounts, setAccounts] = useState<ProviderAccount[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());

  useEffect(() => {
    readProviderAccounts().then((allAccounts) => {
      setAccounts(allAccounts);
      setLoaded(true);
    });
  }, []);

  const provider: ProviderAccount | null = useMemo(() => {
    if (!loaded || !providerId) return null;
    return accounts.find((account) => account.id === providerId) ?? null;
  }, [loaded, accounts, providerId]);

  const demoDoctor = useMemo(() => {
    if (!demoDoctorId) return null;
    return DEMO_DOCTORS.find((doctor) => doctor.id === demoDoctorId) ?? null;
  }, [demoDoctorId]);

  const toggleService = (serviceId: string) => {
    setSelectedServices((previous) => {
      const next = new Set(previous);
      if (next.has(serviceId)) {
        next.delete(serviceId);
      } else {
        next.add(serviceId);
      }
      return next;
    });
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const totalSelectedPrice = useMemo(() => {
    if (!provider) return 0;
    return provider.services
      .filter((service) => selectedServices.has(service.id))
      .reduce((total, service) => total + service.price, 0);
  }, [provider, selectedServices]);

  const submitRequest = () => {
    if (!provider || selectedServices.size === 0) return;
    router.push({
      pathname: "/care-request",
      params: {
        providerId: provider.id,
        serviceName: provider.services
          .filter((service) => selectedServices.has(service.id))
          .map((service) => service.name)
          .join("،"),
        total: String(totalSelectedPrice),
      },
    } as never);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.page}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable accessibilityRole="button" accessibilityLabel="رجوع إلى نتائج البحث" onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
              <MaterialIcons name="arrow-forward" size={22} color="#6B7B3F" />
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>{provider ? provider.fullName : demoDoctor ? demoDoctor.name : specialty.title}</Text>
              <Text style={styles.subtitle}>{specialty.title}</Text>
            </View>
          </View>

          {provider ? (
            <View style={styles.profileCard}>
              {provider.photoUri ? (
                <Image source={{ uri: provider.photoUri }} style={styles.profilePhoto} />
              ) : (
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>{initialsFromName(provider.fullName)}</Text>
                </View>
              )}
              <View style={styles.profileCopy}>
                <View style={styles.nameRow}>
                  <Text style={styles.profileName}>{provider.fullName}</Text>
                  <View style={styles.verifiedBadge}>
                    <MaterialIcons name="verified" size={14} color="#C9A961" />
                    <Text style={styles.verifiedText}>موثّق</Text>
                  </View>
                </View>
                <Text style={styles.profileRole}>{provider.role}</Text>
                <View style={styles.experienceRow}>
                  {formatYearsOfExperience(provider.yearsOfExperience) ? (
                    <View style={styles.metaItem}>
                      <MaterialIcons name="work-outline" size={14} color="#6B7B3F" />
                      <Text style={styles.metaText}>{formatYearsOfExperience(provider.yearsOfExperience)}</Text>
                    </View>
                  ) : null}
                  <View style={styles.metaItem}>
                    <MaterialIcons name="event-available" size={14} color="#6B7B3F" />
                    <Text style={styles.metaText}>{formatProviderAvailability(provider.availability)}</Text>
                  </View>
                </View>
                <View style={styles.specialtyChips}>
                  {provider.specializations.map((specialization) => (
                    <View key={specialization} style={styles.specialtyChip}>
                      <Text style={styles.specialtyChipText}>{specialization}</Text>
                    </View>
                  ))}
                </View>
              </View>
              {provider.bio ? <Text style={styles.providerBio}>{provider.bio}</Text> : null}
            </View>
          ) : null}

          {provider && provider.services.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>الخدمات والأسعار</Text>
              <Text style={styles.sectionCaption}>اختر خدمة أو أكثر لإرسال الطلب</Text>
              {provider.services.map((service) => {
                const selected = selectedServices.has(service.id);
                return (
                  <Pressable
                    key={service.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => toggleService(service.id)}
                    style={({ pressed }) => [
                      styles.serviceRow,
                      selected && styles.serviceRowSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <MaterialIcons name={selected ? "check-box" : "check-box-outline-blank"} size={22} color={selected ? "#6B7B3F" : "#B9AFA0"} />
                    <View style={styles.serviceCopy}>
                      <Text style={[styles.serviceName, selected && styles.serviceNameSelected]}>{service.name}{service.isCustom ? " (خدمة مضافة)" : ""}</Text>
                      {service.durationMinutes ? (
                        <Text style={styles.serviceDuration}>
                          <MaterialIcons name="schedule" size={11} color="#8A8173" /> {service.durationMinutes} دقيقة تقريبًا
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.servicePriceBlock}>
                      <Text style={styles.servicePrice}>{service.price}</Text>
                      <Text style={styles.serviceCurrency}>ر.س</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : demoDoctor ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>خدمات الطبيب</Text>
              <View style={styles.demoServiceRow}>
                <Text style={styles.demoServiceName}>كشف منزلي</Text>
                <View style={styles.servicePriceBlock}>
                  <Text style={styles.servicePrice}>{demoDoctor.price}</Text>
                  <Text style={styles.serviceCurrency}>ر.س</Text>
                </View>
              </View>
              <Text style={styles.demoCaption}>البيانات النموذجية للواجهة؛ خدمات هذا الطبيب تُضاف لاحقًا.</Text>
            </View>
          ) : (
            <View style={styles.emptySection}>
              <MaterialIcons name="info-outline" size={24} color="#8A8173" />
              <Text style={styles.emptyText}>مقدم الخدمة غير متاح حاليًا أو انتهت بياناته.</Text>
              <Pressable accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.backToListButton, pressed && styles.pressed]}>
                <Text style={styles.backToListText}>العودة إلى نتائج البحث</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>

        {provider && selectedServices.size > 0 ? (
          <View style={styles.submitBar}>
            <View style={styles.totalCopy}>
              <Text style={styles.totalLabel}>إجمالي الخدمات المختارة</Text>
              <Text style={styles.totalValue}>{totalSelectedPrice} ر.س</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="إرسال الطلب للخدمات المختارة" onPress={submitRequest} style={({ pressed }) => [styles.submitButton, pressed && styles.submitPressed]}>
              <Text style={styles.submitButtonText}>إرسال الطلب ({selectedServices.size})</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: 20, paddingBottom: 110 },
  header: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  backButton: { alignItems: "center", backgroundColor: "#F0EBDD", borderColor: "#E4DCCB", borderRadius: 16, borderWidth: 1, height: 40, justifyContent: "center", width: 40 },
  headerCopy: { flex: 1 },
  title: { color: "#465132", fontSize: 19, fontWeight: "800", lineHeight: 25, textAlign: "right" },
  subtitle: { color: "#8A8173", fontSize: 12, marginTop: 2, textAlign: "right" },
  profileCard: { alignItems: "center", backgroundColor: "#FFFDF8", borderColor: "#E8E0D1", borderRadius: 20, borderWidth: 1, flexDirection: "row-reverse", gap: 12, marginTop: 16, padding: 14 },
  profilePhoto: { borderRadius: 34, height: 68, width: 68 },
  profileAvatar: { alignItems: "center", backgroundColor: "#EFF2E6", borderRadius: 34, height: 68, justifyContent: "center", width: 68 },
  profileAvatarText: { color: "#6B7B3F", fontSize: 17, fontWeight: "800" },
  profileCopy: { flex: 1 },
  nameRow: { alignItems: "center", flexDirection: "row-reverse", gap: 7 },
  profileName: { color: "#465132", fontSize: 16, fontWeight: "800", textAlign: "right" },
  verifiedBadge: { alignItems: "center", backgroundColor: "#FBF7EC", borderRadius: 8, flexDirection: "row-reverse", gap: 3, paddingHorizontal: 6, paddingVertical: 2 },
  verifiedText: { color: "#B8943F", fontSize: 10, fontWeight: "800" },
  profileRole: { color: "#8A8173", fontSize: 11, marginTop: 3, textAlign: "right" },
  experienceRow: { flexDirection: "row-reverse", gap: 12, marginTop: 7 },
  metaItem: { alignItems: "center", flexDirection: "row-reverse", gap: 4 },
  metaText: { color: "#786F61", fontSize: 10 },
  specialtyChips: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 5, marginTop: 8 },
  specialtyChip: { alignItems: "center", backgroundColor: "#EFF2E6", borderRadius: 9, paddingHorizontal: 9, paddingVertical: 4 },
  specialtyChipText: { color: "#6B7B3F", fontSize: 10, fontWeight: "800" },
  providerBio: { color: "#786F61", fontSize: 11, lineHeight: 16, marginTop: 10, textAlign: "right", width: "100%" },
  section: { marginTop: 20 },
  sectionTitle: { color: "#465132", fontSize: 16, fontWeight: "800", textAlign: "right" },
  sectionCaption: { color: "#9A907E", fontSize: 10, marginTop: 2, textAlign: "right" },
  serviceRow: { alignItems: "center", backgroundColor: "#FFFDF8", borderColor: "#E8E0D1", borderRadius: 14, borderWidth: 1, flexDirection: "row-reverse", gap: 10, marginTop: 9, minHeight: 58, paddingHorizontal: 11, paddingVertical: 9 },
  serviceRowSelected: { backgroundColor: "#F3F6EA", borderColor: "#6B7B3F" },
  serviceCopy: { flex: 1 },
  serviceName: { color: "#465132", fontSize: 13, fontWeight: "800", textAlign: "right" },
  serviceNameSelected: { color: "#5A6A2E" },
  serviceDuration: { color: "#8A8173", fontSize: 10, marginTop: 2, textAlign: "right" },
  servicePriceBlock: { alignItems: "center", backgroundColor: "#F8F5ED", borderRadius: 11, minWidth: 52, paddingHorizontal: 6, paddingVertical: 7 },
  servicePrice: { color: "#5A624B", fontSize: 13, fontWeight: "800" },
  serviceCurrency: { color: "#8A8173", fontSize: 9, marginTop: 1 },
  demoServiceRow: { alignItems: "center", backgroundColor: "#F0EBDD", borderColor: "#E8E0D1", borderRadius: 14, borderWidth: 1, flexDirection: "row-reverse", gap: 10, marginTop: 9, minHeight: 52, paddingHorizontal: 11, paddingVertical: 9 },
  demoServiceName: { color: "#5A624B", fontSize: 13, fontWeight: "800", flex: 1, textAlign: "right" },
  demoCaption: { color: "#9A907E", fontSize: 10, marginTop: 6, textAlign: "right" },
  emptySection: { alignItems: "center", backgroundColor: "#F0EBDD", borderRadius: 15, gap: 8, marginTop: 24, padding: 22 },
  emptyText: { color: "#786F61", fontSize: 11, lineHeight: 16, textAlign: "center" },
  backToListButton: { backgroundColor: "#6B7B3F", borderRadius: 10, marginTop: 4, paddingHorizontal: 14, paddingVertical: 9 },
  backToListText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  submitBar: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E8E0D1", borderTopWidth: 1, flexDirection: "row-reverse", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  totalCopy: { alignItems: "flex-start", flex: 1 },
  totalLabel: { color: "#8A8173", fontSize: 10, textAlign: "right" },
  totalValue: { color: "#465132", fontSize: 15, fontWeight: "800", marginTop: 1, textAlign: "right" },
  submitButton: { alignItems: "center", backgroundColor: "#6B7B3F", borderRadius: 14, minHeight: 44, paddingHorizontal: 18, paddingVertical: 11, shadowColor: "#465132", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6 },
  submitButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  submitPressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});

/**
 * بطاقة نتيجة بحث تعرض مقدم خدمة حقيقيًا (من تطبيق طبيب شريك).
 *
 * تعرض الصورة الاختيارية أو الأحرف الأولى، الاسم مع شارة «موثّق»،
 * التخصص، سنوات الخبرة، التوفر، وسعر أول خدمة. التوجيه إلى صفحة التفاصيل.
 */
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useState } from "react";

import {
  formatProviderAvailability,
  formatYearsOfExperience,
  initialsFromName,
  type ProviderAccount,
} from "@/lib/provider-registry";
import { getProviderRatingSummary, type RatingSummary } from "@/lib/ratings";

export interface ProviderResultCardProps {
  provider: ProviderAccount;
  /** العنوان الظاهر أسفل الاسم (مثل «تمريض منزلي» أو اسم التخصص المختار) */
  serviceLabel: string;
  /** معرف التخصص الحالي للتوجيه إلى صفحة التفاصيل */
  specialtyId: string;
  /** ألوان خاصة بالمسار (ذهبي للتمريض مثلًا) */
  tint?: string;
}

export function ProviderResultCard({ provider, serviceLabel, specialtyId, tint }: ProviderResultCardProps) {
  const price = provider.services[0]?.price ?? 0;
  const hasPhoto = !!provider.photoUri;
  const [summary, setSummary] = useState<RatingSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await getProviderRatingSummary(provider.id);
      if (!cancelled && result.count > 0) setSummary(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [provider.id]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${provider.fullName} — ${serviceLabel}`}
      onPress={() => router.push({ pathname: "/doctor-detail", params: { specialtyId, providerId: provider.id } } as never)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {hasPhoto ? (
        <Image source={{ uri: provider.photoUri }} style={styles.photo} />
      ) : (
        <View style={[styles.avatar, tint ? { backgroundColor: tint } : undefined]}>
          <Text style={[styles.avatarText, tint ? styles.avatarTextInverse : undefined]}>
            {initialsFromName(provider.fullName)}
          </Text>
        </View>
      )}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{provider.fullName}</Text>
          <View style={styles.verifiedBadge}>
            <MaterialIcons name="verified" size={13} color="#C9A961" />
            <Text style={styles.verifiedText}>موثّق</Text>
          </View>
        </View>
        <Text style={styles.service}>{serviceLabel}</Text>
        <View style={styles.meta}>
          {summary ? (
            <View style={styles.ratingRow}>
              <MaterialIcons name="star" size={13} color="#C9A961" />
              <Text style={styles.ratingText}>
                {summary.average.toFixed(1)} ({summary.count})
              </Text>
            </View>
          ) : null}
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
        {provider.bio ? <Text numberOfLines={2} style={styles.bio}>{provider.bio}</Text> : null}
      </View>
      {price > 0 ? (
        <View style={styles.priceBlock}>
          <Text style={styles.price}>{price}</Text>
          <Text style={styles.currency}>ر.س</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "center", backgroundColor: "#FFFDF8", borderColor: "#E8E0D1", borderRadius: 17, borderWidth: 1, flexDirection: "row-reverse", gap: 10, marginTop: 10, minHeight: 91, padding: 11 },
  photo: { borderRadius: 24, height: 48, width: 48 },
  avatar: { alignItems: "center", backgroundColor: "#EFF2E6", borderRadius: 24, height: 48, justifyContent: "center", width: 48 },
  avatarText: { color: "#6B7B3F", fontSize: 12, fontWeight: "800" },
  avatarTextInverse: { color: "#FFFFFF" },
  info: { flex: 1 },
  nameRow: { alignItems: "center", flexDirection: "row-reverse", gap: 6 },
  name: { color: "#465132", fontSize: 14, fontWeight: "800", textAlign: "right" },
  verifiedBadge: { alignItems: "center", backgroundColor: "#FBF7EC", borderRadius: 8, flexDirection: "row-reverse", gap: 3, paddingHorizontal: 6, paddingVertical: 2 },
  verifiedText: { color: "#B8943F", fontSize: 10, fontWeight: "800" },
  service: { color: "#8A8173", fontSize: 11, marginTop: 2, textAlign: "right" },
  meta: { flexDirection: "row-reverse", gap: 9, marginTop: 6 },
  metaItem: { alignItems: "center", flexDirection: "row-reverse", gap: 3 },
  metaText: { color: "#786F61", fontSize: 10 },
  ratingRow: { alignItems: "center", flexDirection: "row-reverse", gap: 3 },
  ratingText: { color: "#B8943F", fontSize: 10, fontWeight: "800" },
  bio: { color: "#8A8173", fontSize: 10, lineHeight: 14, marginTop: 4, textAlign: "right" },
  priceBlock: { alignItems: "center", backgroundColor: "#F8F5ED", borderRadius: 11, minWidth: 46, paddingHorizontal: 6, paddingVertical: 7 },
  price: { color: "#5A624B", fontSize: 13, fontWeight: "800" },
  currency: { color: "#8A8173", fontSize: 9, marginTop: 1 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});

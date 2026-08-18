import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Location from "expo-location";

import { ScreenContainer } from "@/components/screen-container";
import { addPatientAddress, type AddressSource } from "@/lib/patient-profile";
import { getAuthState } from "@/lib/auth-supabase";
import { addPatientAddress as addSupabaseAddress } from "@/lib/records-supabase";
import {
  getLibyaCities,
  getEnabledCities,
  TRIPOLI_CITY_ID,
  getAreasSortedByDemand,
  type LibyaCity,
} from "@/lib/libya-cities";

type Coordinates = { latitude: number; longitude: number } | null;

type SelectedLocation =
  | { mode: "city-area"; cityName: string; areaName: string; coordinates: Coordinates }
  | { mode: "current"; label: string; coordinates: Coordinates };

export default function AddressPickerContent() {
  const { label } = useLocalSearchParams<{ label?: string }>();
  const [cities, setCities] = useState<LibyaCity[] | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [locatedName, setLocatedName] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<Coordinates>(null);
  const safeLabel = label?.trim() || "عنوان جديد";

  const enabledCities = useMemo(() => (cities ? getEnabledCities(cities) : []), [cities]);
  const selectedCity = useMemo(
    () => cities?.find((city) => city.id === selectedCityId) ?? null,
    [cities, selectedCityId],
  );
  const cityAreas = useMemo(() => (selectedCity ? selectedCity.areas : []), [selectedCity]);

  const [areasByDemand, setAreasByDemand] = useState<string[]>([]);

  useState(() => {
    void getAreasSortedByDemand(cityAreas.map((area) => area.name)).then(setAreasByDemand);
  });

  const sortedAreas = useMemo(() => {
    const ranked = new Set(areasByDemand);
    const rankedList = cityAreas.filter((area) => ranked.has(area.name));
    const rest = cityAreas.filter((area) => !ranked.has(area.name));
    return [...rankedList, ...rest];
  }, [cityAreas, areasByDemand]);

  const locationSummary: string = useMemo(() => {
    if (locatedName) return locatedName;
    if (selectedCity && selectedArea) return `${selectedCity.name} — ${selectedArea}`;
    return "";
  }, [locatedName, selectedCity, selectedArea]);

  const loadCities = async () => {
    const all = await getLibyaCities();
    setCities(all);
    const enabled = getEnabledCities(all);
    if (enabled.length > 0 && !enabled.some((city) => city.id === selectedCityId)) {
      setSelectedCityId(enabled[0].id);
    }
    setLoaded(true);
  };

  useState(() => { void loadCities(); });

  const requestLocationPermission = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    return permission.status === "granted";
  };

  const useCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const granted = await requestLocationPermission();
      if (!granted) {
        Alert.alert("تعذر استخدام الموقع", "يمكنك اختيار مدينتك ومنطقتك من القائمة بدلًا من ذلك.");
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords: Coordinates = { latitude: current.coords.latitude, longitude: current.coords.longitude };
      setCoordinates(coords);
      const places = await Location.reverseGeocodeAsync(coords).catch(() => [] as Location.LocationGeocodedAddress[]);
      const place = places[0];
      const hints = [place?.district, place?.city].filter(Boolean).map((hint) => String(hint).toLocaleLowerCase("ar"));
      const all = await getLibyaCities();
      const enabled = getEnabledCities(all);
      let resolvedName: string | null = null;
      if (hints.length > 0) {
        for (const hint of hints) {
          const matchedCity = enabled.find((city) => city.name.toLocaleLowerCase("ar").includes(hint) || hint.includes(city.name.toLocaleLowerCase("ar")));
          if (matchedCity) {
            const matchedArea = matchedCity.areas.find((area) => area.name.toLocaleLowerCase("ar").includes(hint) || hint.includes(area.name.toLocaleLowerCase("ar")));
            resolvedName = matchedArea ? `${matchedCity.name} — ${matchedArea.name}` : matchedCity.name;
            setSelectedCityId(matchedCity.id);
            if (matchedArea) setSelectedArea(matchedArea.name);
            break;
          }
        }
      }
      setLocatedName(resolvedName ?? `موقعي الحالي (${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)})`);
    } catch {
      Alert.alert("تعذر تحديد الموقع", "تأكد من تفعيل خدمات الموقع، أو اختر مدينتك ومنطقتك من القائمة.");
    } finally {
      setIsLocating(false);
    }
  };

  const chooseCity = (cityId: string) => {
    setSelectedCityId(cityId);
    setSelectedArea(null);
  };

  const saveAddress = async () => {
    const hasManualSelection = selectedCity && selectedArea;
    const hasLocated = !!locatedName;
    if (!hasManualSelection && !hasLocated) {
      Alert.alert("أكمل البيانات", "اختر مدينتك ومنطقتك، أو استخدم موقعك الحالي أولًا.");
      return;
    }

    setIsSaving(true);
    try {
      const all = await getLibyaCities();
      const enabled = getEnabledCities(all);
      const city = enabled.find((c) => c.id === (selectedCityId ?? TRIPOLI_CITY_ID)) ?? enabled[0];
      const cityData = city ? { cityId: city.id } : undefined;
      const addressLabel = locationSummary || locatedName || `${city?.name ?? "ليبيا"} — ${selectedArea ?? ""}`.trim();
      const commonPayload = {
        label: safeLabel,
        addressLabel,
        ...(cityData ?? {}),
      };
      if (coordinates) {
        await addPatientAddress({
          ...commonPayload,
          ...coordinates,
          source: locatedName ? ("current-location" as AddressSource) : ("map" as AddressSource),
        });
      } else {
        await addPatientAddress({
          ...commonPayload,
          source: "manual" as AddressSource,
        });
      }
      // حفظ العنوان أيضًا في سجل التطبيق المركزي حتى يظهر في «حسابي».
      const auth = await getAuthState();
      if (auth?.user) {
        const supabaseSource = locatedName ? ("current-location" as const) : ("map" as const);
        void addSupabaseAddress(auth.user, {
          label: safeLabel,
          addressLabel,
          latitude: coordinates?.latitude ?? 0,
          longitude: coordinates?.longitude ?? 0,
          source: supabaseSource,
          ...(cityData ?? {}),
        }).catch(() => undefined);
      }
      router.back();
    } catch {
      Alert.alert("تعذر حفظ العنوان", "حاول مرة أخرى.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="العودة إلى حسابي" onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}><MaterialIcons name="arrow-forward" size={23} color="#6B7B3F" /></Pressable>
          <View><Text style={styles.title}>{safeLabel}</Text><Text style={styles.subtitle}>اختر مدينتك ومنطقتك، أو استخدم موقعك الحالي.</Text></View>
        </View>

        {!loaded ? (
          <View style={styles.center}><ActivityIndicator size="large" color="#6B7B3F" /></View>
        ) : (
          <FlatList
            data={[{ key: "gps" }, ...enabledCities.map((city) => ({ key: `city-${city.id}` })), ...cityAreas.map((area) => ({ key: `area-${area.name}` }))]}
            keyExtractor={(item) => item.key}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              if (item.key === "gps") {
                return (
                  <View style={styles.gpsCard}>
                    <Pressable accessibilityRole="button" onPress={useCurrentLocation} disabled={isLocating} style={({ pressed }) => [styles.locationButton, (pressed || isLocating) && styles.pressed]}>
                      {isLocating ? <ActivityIndicator color="#6B7B3F" /> : <MaterialIcons name="my-location" size={20} color="#6B7B3F" />}
                      <Text style={styles.locationText}>{isLocating ? "جارٍ تحديد الموقع..." : "استخدام موقعي الحالي (GPS)"}</Text>
                    </Pressable>
                    {locatedName ? (
                      <View style={styles.locatedRow}><MaterialIcons name="location-on" size={18} color="#6B7B3F" /><Text style={styles.locatedText} numberOfLines={2}>{locatedName}</Text></View>
                    ) : null}
                  </View>
                );
              }
              if (item.key.startsWith("city-")) {
                const city = enabledCities.find((c) => c.id === item.key.replace("city-", ""));
                if (!city) return null;
                const isSelected = city.id === selectedCityId;
                return (
                  <Pressable accessibilityRole="button" accessibilityLabel={`اختيار مدينة ${city.name}`} onPress={() => chooseCity(city.id)} style={({ pressed }) => [styles.cityItem, isSelected && styles.cityItemSelected, pressed && styles.pressed]}>
                    <MaterialIcons name={isSelected ? "check-circle" : "location-city"} size={20} color={isSelected ? "#6B7B3F" : "#8A8173"} />
                    <Text style={[styles.cityText, isSelected && styles.cityTextSelected]}>{city.name}</Text>
                  </Pressable>
                );
              }
              const areaName = item.key.replace("area-", "");
              const area = cityAreas.find((a) => a.name === areaName);
              if (!area) return null;
              const isAreaSelected = selectedArea === area.name;
              return (
                <Pressable accessibilityRole="button" accessibilityLabel={`اختيار منطقة ${area.name}`} onPress={() => setSelectedArea(area.name)} style={({ pressed }) => [styles.areaItem, isAreaSelected && styles.areaItemSelected, pressed && styles.pressed]}>
                  <MaterialIcons name={isAreaSelected ? "check-circle" : "place"} size={18} color={isAreaSelected ? "#6B7B3F" : "#8A8173"} />
                  <Text style={[styles.areaText, isAreaSelected && styles.areaTextSelected]}>{area.name}</Text>
                </Pressable>
              );
            }}
            ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>لا توجد مدن مفعّلة حاليًا. اتصل بالإدارة لتفعيل مدينتك.</Text></View>}
            ListHeaderComponent={selectedCity ? <Text style={styles.areasLabel}>{`مناطق ${selectedCity.name}`}</Text> : null}
            contentContainerStyle={styles.listContent}
          />
        )}

        <View style={styles.selectionRow}>
          <MaterialIcons name={locationSummary || locatedName ? "location-on" : "location-off"} size={21} color={locationSummary || locatedName ? "#6B7B3F" : "#8A8173"} />
          <Text style={styles.selectionText}>{locationSummary || locatedName ? `المحدد: ${locationSummary || locatedName}` : "لم يتم اختيار موقع بعد."}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={saveAddress} disabled={isSaving} style={({ pressed }) => [styles.confirmButton, (pressed || isSaving) && styles.pressed]}>
          {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.confirmText}>تأكيد العنوان</Text>}
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { alignItems: "flex-start", flexDirection: "row", gap: 13, marginBottom: 12 },
  backButton: { alignItems: "center", backgroundColor: "#F0EBDD", borderRadius: 18, height: 42, justifyContent: "center", width: 42 },
  title: { color: "#465132", fontSize: 22, fontWeight: "800", lineHeight: 28, textAlign: "right" },
  subtitle: { color: "#8A8173", fontSize: 13, lineHeight: 19, marginTop: 2, textAlign: "right" },
  center: { alignItems: "center", flex: 1, justifyContent: "center", padding: 20 },
  emptyText: { color: "#8A8173", fontSize: 13, textAlign: "center" },
  listContent: { paddingBottom: 16 },
  gpsCard: { marginBottom: 10 },
  locationButton: { alignItems: "center", backgroundColor: "#F0EBDD", borderColor: "#E4DCCB", borderRadius: 15, borderWidth: 1, flexDirection: "row-reverse", gap: 8, justifyContent: "center", minHeight: 52, paddingHorizontal: 12 },
  locationText: { color: "#465132", fontSize: 15, fontWeight: "800" },
  locatedRow: { alignItems: "center", backgroundColor: "#FFFDF8", borderColor: "#E4DCCB", borderRadius: 12, borderWidth: 1, flexDirection: "row-reverse", gap: 7, marginTop: 8, paddingHorizontal: 12, paddingVertical: 10 },
  locatedText: { color: "#6F6658", flex: 1, fontSize: 13, lineHeight: 19, textAlign: "right" },
  cityItem: { alignItems: "center", backgroundColor: "#F5F0E6", borderColor: "#E4DCCB", borderRadius: 14, borderWidth: 1, flexDirection: "row-reverse", gap: 10, marginBottom: 6, paddingHorizontal: 14, paddingVertical: 12 },
  cityItemSelected: { backgroundColor: "#EFF2E6", borderColor: "#6B7B3F" },
  cityText: { color: "#465132", fontSize: 15, fontWeight: "700", flex: 1, textAlign: "right" },
  cityTextSelected: { fontWeight: "800" },
  areasLabel: { color: "#6B7B3F", fontSize: 14, fontWeight: "800", marginBottom: 8, textAlign: "right" },
  areaItem: { alignItems: "center", backgroundColor: "#FFFDF8", borderColor: "#E4DCCB", borderRadius: 12, borderWidth: 1, flexDirection: "row-reverse", gap: 8, marginBottom: 6, paddingHorizontal: 14, paddingVertical: 10 },
  areaItemSelected: { backgroundColor: "#EFF2E6", borderColor: "#6B7B3F" },
  areaText: { color: "#465132", fontSize: 14, flex: 1, textAlign: "right" },
  areaTextSelected: { fontWeight: "800" },
  selectionRow: { alignItems: "center", backgroundColor: "#FFFDF8", borderRadius: 14, flexDirection: "row-reverse", gap: 8, marginTop: 12, padding: 14 },
  selectionText: { color: "#6F6658", flex: 1, fontSize: 13, lineHeight: 20, textAlign: "right" },
  confirmButton: { alignItems: "center", backgroundColor: "#6B7B3F", borderRadius: 16, flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 16, minHeight: 56, paddingHorizontal: 20 },
  confirmText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  pressed: { opacity: 0.84, transform: [{ scale: 0.98 }] },
});

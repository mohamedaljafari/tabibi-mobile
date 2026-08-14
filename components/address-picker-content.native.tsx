import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import MapView, { Marker, type MapPressEvent, type Region } from "react-native-maps";
import * as Location from "expo-location";

import { ScreenContainer } from "@/components/screen-container";
import { addPatientAddress, type AddressSource } from "@/lib/patient-profile";
import { getLibyaCities, getEnabledCities, TRIPOLI_CITY_ID, type LibyaCity } from "@/lib/libya-cities";

const INITIAL_REGION: Region = {
  latitude: 0,
  longitude: 0,
  latitudeDelta: 80,
  longitudeDelta: 80,
};

type Coordinates = { latitude: number; longitude: number };

function formatAddress(
  place: Location.LocationGeocodedAddress | undefined,
  coordinates: Coordinates,
) {
  if (place?.formattedAddress) return place.formattedAddress;
  const parts = [place?.name, place?.street, place?.district, place?.city, place?.region, place?.country].filter(Boolean);
  return parts.length > 0
    ? parts.join("، ")
    : `الموقع المحدد (${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)})`;
}

export default function AddressPickerContent() {
  const { label } = useLocalSearchParams<{ label?: string }>();
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [source, setSource] = useState<AddressSource>("map");
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [resolvedCity, setResolvedCity] = useState<{ cityId: string; areaNames: string[] } | null>(null);
  const safeLabel = label?.trim() || "عنوان جديد";

  const region = useMemo<Region>(() => (
    coordinates
      ? { latitude: coordinates.latitude, longitude: coordinates.longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 }
      : INITIAL_REGION
  ), [coordinates]);

  const requestLocationPermission = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    return permission.status === "granted";
  };

  const useCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const granted = await requestLocationPermission();
      if (!granted) {
        Alert.alert("تعذر استخدام الموقع", "يمكنك تحريك الخريطة وتحديد العنوان يدويًا.");
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: current.coords.latitude, longitude: current.coords.longitude };
      setCoordinates(coords);
      setSource("current-location");
      await resolveCity(coords);
    } catch {
      Alert.alert("تعذر تحديد الموقع", "تأكد من تفعيل خدمات الموقع، أو حدّد العنوان يدويًا من الخريطة.");
    } finally {
      setIsLocating(false);
    }
  };

  /**
   * تحديد المدينة الليبية المفعّلة المناظرة للموقع.
   * يطابق area/district/city على أسماء مناطق المدن المفعّلة؛ عند عدم التطابق
   * يُعاد إلى طرابلس (المدينة المفعّلة افتراضيًا) مع أقرب منطقة مطابقة.
   */
  const resolveCity = async (coords: Coordinates) => {
    try {
      const places = await Location.reverseGeocodeAsync(coords);
      const place = places[0];
      const hints = [place?.district, place?.city].filter(Boolean).map((hint) => String(hint).toLocaleLowerCase("ar"));
      const enabled = getEnabledCities(await getLibyaCities());
      const best = matchEnabledCity(enabled, hints);
      setResolvedCity(best);
    } catch {
      setResolvedCity(null);
    }
  };

  /**
   * مطابقةHints الموقع مع المدن المفعّلة ومناطقها.
   * يعيد أقرب مطابقة لمنطقة ضمن مدينة مفعّلة، أو طرابلس افتراضيًا إذا لم تُفعّل طرابلس.
   */
  function matchEnabledCity(cities: LibyaCity[], hints: string[]): { cityId: string; areaNames: string[] } {
    const fallback = { cityId: TRIPOLI_CITY_ID, areaNames: [] as string[] };
    for (const hint of hints) {
      for (const city of cities) {
        if (!city.enabled) continue;
        const matched = city.areas.filter((area) => {
          const areaName = area.name.toLocaleLowerCase("ar");
          return areaName.includes(hint) || hint.includes(areaName);
        });
        if (matched.length > 0) return { cityId: city.id, areaNames: matched.map((area) => area.name) };
        if (city.name.toLocaleLowerCase("ar").includes(hint) || hint.includes(city.name.toLocaleLowerCase("ar"))) {
          return { cityId: city.id, areaNames: [] };
        }
      }
    }
    return cities.some((city) => city.id === TRIPOLI_CITY_ID && city.enabled) ? fallback : { cityId: "", areaNames: [] };
  }

  const selectOnMap = (event: MapPressEvent) => {
    setCoordinates(event.nativeEvent.coordinate);
    setSource("map");
  };

  const saveAddress = async () => {
    if (!coordinates) {
      Alert.alert("اختر موقعًا", "استخدم موقعك الحالي أو اضغط على الخريطة لتحديد العنوان.");
      return;
    }

    setIsSaving(true);
    try {
      let addressLabel = `الموقع المحدد (${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)})`;
      const granted = await requestLocationPermission();
      if (granted) {
        const places = await Location.reverseGeocodeAsync(coordinates);
        addressLabel = formatAddress(places[0], coordinates);
      }
      const cityData = source === "current-location" ? resolvedCity : undefined;
      await addPatientAddress({ label: safeLabel, addressLabel, ...coordinates, source, ...(cityData ?? {}) });
      router.back();
    } catch {
      Alert.alert("تعذر حفظ العنوان", "حاول مرة أخرى بعد التحقق من اتصال الإنترنت وخدمات الموقع.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="العودة إلى حسابي" onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}><MaterialIcons name="arrow-forward" size={23} color="#6B7B3F" /></Pressable>
          <View><Text style={styles.title}>{safeLabel}</Text><Text style={styles.subtitle}>حدّد موقعك من الخريطة أو موقعك الحالي.</Text></View>
        </View>

        <View style={styles.mapFrame}>
          <MapView style={styles.map} initialRegion={region} region={coordinates ? region : undefined} onPress={selectOnMap}>
            {coordinates ? <Marker coordinate={coordinates} pinColor="#C9A961" /> : null}
          </MapView>
          <View pointerEvents="none" style={styles.mapHint}><MaterialIcons name="touch-app" size={18} color="#465132" /><Text style={styles.mapHintText}>اضغط على الخريطة لتحديد العنوان</Text></View>
        </View>

        <Pressable accessibilityRole="button" onPress={useCurrentLocation} disabled={isLocating} style={({ pressed }) => [styles.locationButton, (pressed || isLocating) && styles.pressed]}>
          {isLocating ? <ActivityIndicator color="#6B7B3F" /> : <MaterialIcons name="my-location" size={20} color="#6B7B3F" />}
          <Text style={styles.locationText}>{isLocating ? "جارٍ تحديد الموقع..." : "استخدام موقعي الحالي"}</Text>
        </Pressable>

        <View style={styles.selectionRow}><MaterialIcons name={coordinates ? "location-on" : "location-off"} size={21} color={coordinates ? "#6B7B3F" : "#8A8173"} /><Text style={styles.selectionText}>{coordinates ? "تم تحديد موقع؛ يمكنك حفظ العنوان الآن." : "لم يتم تحديد موقع بعد."}</Text></View>
        <Pressable accessibilityRole="button" onPress={saveAddress} disabled={isSaving} style={({ pressed }) => [styles.confirmButton, (pressed || isSaving) && styles.pressed]}><Text style={styles.confirmText}>{isSaving ? "جارٍ حفظ العنوان..." : "تأكيد العنوان"}</Text></Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { alignItems: "flex-start", flexDirection: "row", gap: 13, marginBottom: 20 },
  backButton: { alignItems: "center", backgroundColor: "#F0EBDD", borderRadius: 18, height: 42, justifyContent: "center", width: 42 },
  title: { color: "#465132", fontSize: 22, fontWeight: "800", lineHeight: 28, textAlign: "right" },
  subtitle: { color: "#8A8173", fontSize: 13, lineHeight: 19, marginTop: 2, textAlign: "right" },
  mapFrame: { borderColor: "#E4DCCB", borderRadius: 22, borderWidth: 1, flex: 1, minHeight: 330, overflow: "hidden" },
  map: { flex: 1 },
  mapHint: { alignItems: "center", alignSelf: "center", backgroundColor: "rgba(255,253,248,0.94)", borderRadius: 16, flexDirection: "row-reverse", gap: 7, paddingHorizontal: 13, paddingVertical: 9, position: "absolute", top: 14 },
  mapHintText: { color: "#465132", fontSize: 12, fontWeight: "700" },
  locationButton: { alignItems: "center", backgroundColor: "#F0EBDD", borderColor: "#E4DCCB", borderRadius: 15, borderWidth: 1, flexDirection: "row-reverse", gap: 8, justifyContent: "center", marginTop: 15, minHeight: 52 },
  locationText: { color: "#465132", fontSize: 15, fontWeight: "800" },
  selectionRow: { alignItems: "center", backgroundColor: "#FFFDF8", borderRadius: 14, flexDirection: "row-reverse", gap: 8, marginTop: 12, padding: 14 },
  selectionText: { color: "#6F6658", flex: 1, fontSize: 13, lineHeight: 20, textAlign: "right" },
  confirmButton: { alignItems: "center", backgroundColor: "#6B7B3F", borderRadius: 16, justifyContent: "center", marginTop: 16, minHeight: 56 },
  confirmText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  pressed: { opacity: 0.84, transform: [{ scale: 0.98 }] },
});

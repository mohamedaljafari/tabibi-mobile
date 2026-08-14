/**
 * بوابة الاستشارات الطبية: اختيار استشارة داخل ليبيا أو خارج ليبيا.
 */
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ScreenContainer } from "@/components/screen-container";

type ConsultationGate = {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  tint: string;
  surface: string;
};

const GATES: ConsultationGate[] = [
  {
    id: "local",
    title: "استشارة داخل ليبيا",
    subtitle: "تواصل مع أطباء متخصصين داخل ليبيا عبر استشارة عن بعد.",
    icon: "local-hospital",
    tint: "#6B7B3F",
    surface: "#EFF2E6",
  },
  {
    id: "international",
    title: "استشارة خارج ليبيا",
    subtitle: "استشر كبار الأطباء والمراكز المتخصصة خارج ليبيا.",
    icon: "public",
    tint: "#5B8CA3",
    surface: "#EAF3F7",
  },
];

export default function ConsultationScreen() {
  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="رجوع"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <MaterialIcons name="arrow-forward" size={22} color="#6B7B3F" />
          </Pressable>
          <View>
            <Text style={styles.title}>الاستشارات الطبية</Text>
            <Text style={styles.subtitle}>اختر نطاق الاستشارة المناسبة لك</Text>
          </View>
        </View>
        <View style={styles.intro}>
          <View style={styles.introIcon}>
            <MaterialIcons name="videocam" size={26} color="#6B7B3F" />
          </View>
          <View style={styles.introCopy}>
            <Text style={styles.introTitle}>استشارة طبية عن بعد</Text>
            <Text style={styles.introText}>
              سواء اخترت استشارة داخل ليبيا أو خارجها، ستصلك بعد اختيار التخصص.
            </Text>
          </View>
        </View>
        <View style={styles.grid}>
          {GATES.map((gate) => (
            <Pressable
              key={gate.id}
              accessibilityRole="button"
              accessibilityLabel={gate.title}
              onPress={() =>
                router.push({ pathname: "/consultation-specialties", params: { type: gate.id } } as never)
              }
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
              <View style={[styles.iconWrap, { backgroundColor: gate.surface }]}>
                <MaterialIcons name={gate.icon} size={30} color={gate.tint} />
              </View>
              <Text numberOfLines={2} style={styles.cardTitle}>
                {gate.title}
              </Text>
              <Text style={styles.cardSubtitle}>{gate.subtitle}</Text>
              <MaterialIcons name="chevron-left" size={16} color="#9A907E" style={styles.chevron} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 28 },
  header: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  backButton: {
    alignItems: "center",
    backgroundColor: "#F0EBDD",
    borderColor: "#E4DCCB",
    borderRadius: 16,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  title: { color: "#465132", fontSize: 22, fontWeight: "800", lineHeight: 29, textAlign: "right" },
  subtitle: { color: "#8A8173", fontSize: 12, marginTop: 2, textAlign: "right" },
  intro: {
    alignItems: "center",
    backgroundColor: "#EFF2E6",
    borderRadius: 18,
    flexDirection: "row-reverse",
    gap: 11,
    marginTop: 23,
    padding: 14,
  },
  introIcon: {
    alignItems: "center",
    backgroundColor: "#FFFDF8",
    borderRadius: 15,
    height: 50,
    justifyContent: "center",
    width: 50,
  },
  introCopy: { flex: 1 },
  introTitle: { color: "#465132", fontSize: 14, fontWeight: "800", textAlign: "right" },
  introText: { color: "#786F61", fontSize: 11, lineHeight: 16, marginTop: 2, textAlign: "right" },
  grid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 10, marginTop: 16 },
  card: {
    alignItems: "center",
    backgroundColor: "#FFFDF8",
    borderColor: "#E8E0D1",
    borderRadius: 17,
    borderWidth: 1,
    flex: 1,
    padding: 14,
    position: "relative",
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: 18,
    height: 62,
    justifyContent: "center",
    width: 62,
  },
  cardTitle: { color: "#5A624B", fontSize: 15, fontWeight: "800", lineHeight: 21, marginTop: 12, textAlign: "center" },
  cardSubtitle: { color: "#8A8173", fontSize: 11, lineHeight: 16, marginTop: 4, textAlign: "center" },
  chevron: { bottom: 10, left: 10, position: "absolute" },
  pressed: { opacity: 0.76, transform: [{ scale: 0.98 }] },
});

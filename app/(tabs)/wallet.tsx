/**
 * تبويب «المحفظة» في تطبيق المريض.
 *
 * يعرض السجل المحاسبي المحلي لمحفظة المريض: الرصيد التجميعي
 * (شحن رصيد + استرداد - دفع مقابل خدمة)، وسجل القيود المحاسبية
 * المسجلة في wallets_v1. القيود تُسجل يدويًا من لوحة التحكم أو
 * تلقائيًا عند دفع مقابل خدمة.
 */
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { getPatientProfile } from "@/lib/patient-profile";
import {
  getWalletSummary,
  type WalletLedgerEntry,
  type WalletSummary,
} from "@/lib/wallets";

function typeArabicLabel(type: string): string {
  switch (type) {
    case "recharge":
      return "شحن رصيد";
    case "payment":
      return "دفع مقابل خدمة";
    case "refund":
      return "استرداد";
    default:
      return type;
  }
}

function formatEntryDate(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year} — ${hours}:${minutes}`;
}

export default function WalletScreen() {
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [loaded, setLoaded] = useState(false);

  const loadWallet = useCallback(async () => {
    const profile = await getPatientProfile();
    if (!profile) {
      setSummary(null);
      setLoaded(true);
      return;
    }
    setSummary(await getWalletSummary(profile.phone));
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadWallet();
    }, [loadWallet]),
  );

  if (!loaded) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text style={styles.emptyText}>جارٍ تحميل المحفظة...</Text>
      </ScreenContainer>
    );
  }

  if (!summary) {
    return (
      <ScreenContainer className="items-center justify-center gap-4 p-6">
        <Text style={styles.emptyText}>أنشئ حسابك أولًا لعرض محفظتك المحاسبية.</Text>
        <Pressable
          onPress={() => router.push("/login")}
          style={({ pressed }) => [styles.loginButton, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.loginButtonText}>تسجيل الدخول / إنشاء حساب</Text>
        </Pressable>
      </ScreenContainer>
    );
  }

  const balanceColor =
    summary.balance > 0 ? "#4E7A3F" : summary.balance < 0 ? "#B55448" : "#6A6256";

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>رصيد المحفظة</Text>
          <Text style={[styles.balanceValue, { color: balanceColor }]}>
            {summary.balance.toFixed(2)} د.ل
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValueIncoming}>{summary.credit.toFixed(2)} د.ل</Text>
              <Text style={styles.statLabel}>الوارد</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValueOutgoing}>{summary.debit.toFixed(2)} د.ل</Text>
              <Text style={styles.statLabel}>الصادر</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValueEntries}>{summary.entries.length}</Text>
              <Text style={styles.statLabel}>قيود</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>سجل القيود المحاسبية</Text>
        {summary.entries.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialIcons name="account-balance-wallet" size={26} color="#B7AFA0" />
            <Text style={styles.emptyText}>
              لا توجد قيود محاسبية بعد. تُسجَّل القيود هنا عند شحن الرصيد أو الدفع مقابل خدمة أو الاسترداد.
            </Text>
          </View>
        ) : (
          <FlatList
            data={[...summary.entries].sort((first, second) => second.createdAt - first.createdAt)}
            keyExtractor={(entry) => entry.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.entriesList}
            renderItem={({ item }) => (
              <EntryRow entry={item} />
            )}
          />
        )}
      </View>
    </ScreenContainer>
  );
}

function EntryRow({ entry }: { entry: WalletLedgerEntry }) {
  const isCredit = entry.kind === "credit";
  return (
    <View style={styles.entryCard}>
      <View style={[styles.entryIcon, isCredit ? styles.entryIconCredit : styles.entryIconDebit]}>
        <MaterialIcons
          name={isCredit ? "add" : "remove"}
          size={16}
          color={isCredit ? "#4E7A3F" : "#B55448"}
        />
      </View>
      <View style={styles.entryBody}>
        <Text style={styles.entryType}>{typeArabicLabel(entry.type)}</Text>
        <Text style={styles.entryDescription} numberOfLines={2}>
          {entry.description || "—"}
        </Text>
        <Text style={styles.entryMeta}>{formatEntryDate(entry.createdAt)}</Text>
      </View>
      <Text
        style={[
          styles.entryAmount,
          { color: isCredit ? "#4E7A3F" : "#B55448" },
        ]}
      >
        {isCredit ? "+" : "-"}{entry.amount.toFixed(2)} د.ل
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 16 },
  balanceCard: {
    alignItems: "center",
    backgroundColor: "#6B7B3F",
    borderRadius: 18,
    padding: 20,
  },
  balanceLabel: { color: "#E8E4D6", fontSize: 13, fontWeight: "700" },
  balanceValue: { fontSize: 34, fontWeight: "800", lineHeight: 42, marginTop: 2 },
  statsRow: {
    alignItems: "center",
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginTop: 14,
    paddingHorizontal: 6,
    width: "100%",
  },
  statItem: { alignItems: "center", flex: 1 },
  statDivider: {
    backgroundColor: "#FFFFFF40",
    height: 34,
    width: 1,
  },
  statValueIncoming: { color: "#CDE3B8", fontSize: 17, fontWeight: "800" },
  statValueOutgoing: { color: "#F2C9C2", fontSize: 17, fontWeight: "800" },
  statValueEntries: { color: "#E8E4D6", fontSize: 17, fontWeight: "800" },
  statLabel: { color: "#E8E4D6CC", fontSize: 11, marginTop: 2 },
  sectionTitle: {
    color: "#465132",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 8,
    marginTop: 16,
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: "#FBF7EC",
    borderColor: "#E8E0D1",
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 24,
  },
  emptyText: {
    color: "#9A907E",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  entriesList: { gap: 8 },
  entryCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#EDE6D6",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row-reverse",
    gap: 10,
    padding: 12,
  },
  entryIcon: {
    alignItems: "center",
    borderRadius: 12,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  entryIconCredit: { backgroundColor: "#EAF3E4" },
  entryIconDebit: { backgroundColor: "#F6E8E6" },
  entryBody: { flex: 1 },
  entryType: { color: "#465132", fontSize: 13, fontWeight: "800" },
  entryDescription: {
    color: "#786F61",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
    textAlign: "right",
  },
  entryMeta: { color: "#B7AFA0", fontSize: 10, marginTop: 2, textAlign: "right" },
  entryAmount: { fontSize: 14, fontWeight: "800" },
  loginButton: {
    backgroundColor: "#6B7B3F",
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  loginButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
});

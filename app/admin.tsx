import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";
import type { ServiceRequest } from "@/lib/service-requests";
import { isValidAdminPin } from "@/lib/admin-auth";
import {
  addProviderAccount,
  addService,
  cancelAdminRequest,
  deleteAdminAd,
  deleteAdminRating,
  readAdminProviderAccounts,
  readAdminRequests,
  readAdminRatings,
  readAdminSummary,
  readAdminAds,
  toggleAdminAd,
  toggleService,
  updateProviderStatus,
  upsertAdminAd,
  readServicesCatalog,
  type AdminAdSlide,
  type ServicesCatalog,
} from "@/lib/admin";
import * as Haptics from "expo-haptics";

import type { ProviderAccount } from "@/lib/provider-registry";
import {
  addWalletEntry,
  getWalletSummaries,
  getWalletSummary,
  removeWalletEntry,
  validateNewWalletEntry,
  type LedgerEntryKind,
  type LedgerEntryType,
  type NewWalletEntry,
  type WalletSummary,
  type WalletLedgerEntry,
} from "@/lib/wallets";
import {
  getPatientProfile,
  readMedicalAccessGrants,
  revokeMedicalAccess,
} from "@/lib/patient-profile";
import { getEnabledCities, getLibyaCities, setCityEnabled, setAreaEnabled, TRIPOLI_CITY_ID, type LibyaCity } from "@/lib/libya-cities";

type AdminTabId = "summary" | "providers" | "ads" | "services" | "requests" | "patients" | "wallets" | "cities";

const OLIVE = "#6B7B3F";
const GOLD = "#C9A961";

export default function AdminScreen() {
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [tab, setTab] = useState<AdminTabId>("summary");

  const verifyPin = useCallback(() => {
    if (isValidAdminPin(pin)) {
      setPinError("");
      setAuthenticated(true);
    } else {
      setPinError("الرمز غير صحيح، حاول مرة أخرى.");
    }
  }, [pin]);

  if (!authenticated) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]} className="p-6">
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingBottom: 32 }}>
          <View className="items-center gap-4">
            <MaterialIcons name="admin-panel-settings" size={56} color={OLIVE} />
            <Text style={styles.pinTitle}>لوحة تحكم طبيبي</Text>
            <Text style={styles.pinHint}>أدخل الرمز الإداري للمتابعة</Text>
            <TextInput
              style={styles.pinInput}
              value={pin}
              onChangeText={(value) => {
                setPin(value);
                setPinError("");
              }}
              secureTextEntry
              keyboardType={Platform.OS === "web" ? "default" : "number-pad"}
              placeholder="الرمز الإداري"
              placeholderTextColor="#B5AD9C"
              returnKeyType="done"
              onSubmitEditing={verifyPin}
              autoCapitalize="none"
              autoComplete="off"
            />
            {pinError ? <Text style={styles.pinError}>{pinError}</Text> : null}
            <TouchableOpacity style={styles.primaryButton} onPress={verifyPin} activeOpacity={0.8}>
              <Text style={styles.primaryButtonText}>دخول</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>لوحة تحكم طبيبي</Text>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            setAuthenticated(false);
            setPin("");
            router.back();
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="logout" size={18} color={OLIVE} />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.tabBar} horizontal showsHorizontalScrollIndicator={false}>
        {(
          [
            { id: "summary", title: "نظرة عامة", icon: "dashboard" },
            { id: "providers", title: "مقدمو الخدمة", icon: "local-hospital" },
            { id: "ads", title: "الإعلانات", icon: "campaign" },
            { id: "services", title: "الخدمات", icon: "apps" },
            { id: "requests", title: "الطلبات", icon: "swap-horiz" },
            { id: "patients", title: "المرضى", icon: "people" },
            { id: "wallets", title: "المحفظات", icon: "account-balance-wallet" },
            { id: "cities", title: "المدن والمناطق", icon: "location-city" },
          ] as { id: AdminTabId; title: string; icon: string }[]
        ).map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.tabItem, tab === item.id && styles.activeTab]}
            onPress={() => setTab(item.id)}
            activeOpacity={0.7}
          >
            <MaterialIcons name={item.icon as keyof typeof MaterialIcons.glyphMap} size={15} color={tab === item.id ? "#FFFFFF" : "#6A6256"} />
            <Text style={[styles.tabText, tab === item.id && styles.activeTabText]}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.tabContent}>
        {tab === "summary" ? <SummaryPanel /> : null}
        {tab === "providers" ? <ProvidersPanel /> : null}
        {tab === "ads" ? <AdsPanel /> : null}
        {tab === "services" ? <ServicesPanel /> : null}
        {tab === "requests" ? <RequestsPanel /> : null}
        {tab === "patients" ? <PatientsPanel /> : null}
        {tab === "wallets" ? <WalletsPanel /> : null}
        {tab === "cities" ? <CitiesPanel /> : null}
      </View>
    </ScreenContainer>
  );
}

// ───────────────────── المدن والمناطق ─────────────────────

function CitiesPanel() {
  const [cities, setCities] = useState<LibyaCity[]>([]);

  const load = useCallback(async () => {
    setCities(await getLibyaCities());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const confirmToggleCity = (city: LibyaCity, enabled: boolean) => {
    Alert.alert(
      enabled ? "تفعيل المدينة" : "إيقاف المدينة",
      enabled
        ? `هل تريد إظهار مدينة «${city.name}» ومناطقها في التطبيق؟`
        : `هل تريد إخفاء مدينة «${city.name}» ومناطقها من التطبيق؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "تأكيد",
          onPress: async () => setCities(await setCityEnabled(city.id, enabled)),
        },
      ],
    );
  };

  const confirmToggleArea = (city: LibyaCity, area: { id: string; name: string }, enabled: boolean) => {
    Alert.alert(
      enabled ? "إظهار المنطقة" : "إخفاء المنطقة",
      enabled
        ? `هل تريد إعادة إظهار منطقة «${area.name}» في مدينة ${city.name}؟`
        : `هل تريد إخفاء منطقة «${area.name}» من مدينة ${city.name}؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "تأكيد",
          onPress: async () => setCities(await setAreaEnabled(city.id, area.id, enabled)),
        },
      ],
    );
  };

  if (cities.length === 0) return null;
  const enabledCount = cities.filter((city) => city.enabled).length;
  const areaCount = cities.reduce((total, city) => total + city.areas.length, 0);

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeaderRow}>
        <Text style={styles.panelTitle}>المدن والمناطق ({enabledCount} مفعّلة)</Text>
      </View>
      <Text style={styles.panelHint}>المدن والمناطق الموقفة لا تظهر في قوائم اختيار العناوين ونطاق البحث، ويمكن تفعيلها لاحقًا عند التوسع إلى مدن جديدة.</Text>
      <View style={styles.grid}>
        <View style={[styles.statCard, { borderColor: OLIVE + "55" }]}>
          <Text style={[styles.statValue, { color: OLIVE }]}>{enabledCount}</Text>
          <Text style={styles.statLabel}>مدينة مفعّلة</Text>
        </View>
        <View style={[styles.statCard, { borderColor: GOLD + "55" }]}>
          <Text style={[styles.statValue, { color: GOLD }]}>{areaCount}</Text>
          <Text style={styles.statLabel}>منطقة مفعّلة</Text>
        </View>
      </View>
      {cities.map((city) => (
        <View key={city.id} style={[styles.card, !city.enabled && styles.dimCard]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIdentity}>
              <Text style={styles.cardName}>{city.name}</Text>
              <Text style={styles.cardSubtitle}>{city.areas.length} منطقة</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: (city.enabled ? "#4E7A3F" : "#B55448") + "22", borderColor: (city.enabled ? "#4E7A3F" : "#B55448") + "66" }]}>
              <Text style={[styles.badgeText, { color: city.enabled ? "#4E7A3F" : "#B55448" }]}>{city.enabled ? "مفعّلة" : "موقوفة"}</Text>
            </View>
          </View>
          <View style={styles.actionRow}>
            <ActionChip label={city.enabled ? "إيقاف المدينة" : "تفعيل المدينة"} color={city.enabled ? "#9A8159" : "#4E7A3F"} disabled={city.enabled} onPress={() => confirmToggleCity(city, !city.enabled)} />
          </View>
          {city.enabled && city.areas.length > 0 ? (
            <View style={styles.areasGrid}>
              {city.areas.map((area) => (
                <View key={area.id} style={styles.areaRow}>
                  <Text style={styles.areaName}>{area.name}</Text>
                  <TouchableOpacity style={styles.areaToggle} onPress={() => confirmToggleArea(city, area, false)} activeOpacity={0.7}>
                    <MaterialIcons name="visibility-off" size={14} color="#B55448" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}
          {!city.enabled && city.areas.length > 0 ? (
            <Text style={styles.dimHint}>فعّل المدينة أولًا لإدارة مناطقها.</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

// ───────────────────── نظرة عامة ─────────────────────

function SummaryPanel() {
  const [summary, setSummary] = useState<ReturnType<typeof createEmptySummary>>(createEmptySummary);

  const load = useCallback(async () => {
    setSummary(await readAdminSummary());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats: { label: string; value: number; color: string }[] = [
    { label: "مقدمو الخدمة", value: summary.providers, color: OLIVE },
    { label: "مفعّلون", value: summary.activeProviders, color: "#4E7A3F" },
    { label: "مجمّدون", value: summary.frozenProviders, color: GOLD },
    { label: "بانتظار الموافقة", value: summary.pendingProviders, color: "#9A8159" },
    { label: "الطلبات", value: summary.requests, color: "#627F9D" },
    { label: "طلبات معلّقة", value: summary.pendingRequests, color: "#A65E67" },
    { label: "طلبات مقبولة", value: summary.acceptedRequests, color: "#4E7A3F" },
    { label: "التقييمات", value: summary.ratings, color: GOLD },
    { label: "الإعلانات", value: summary.ads, color: "#8F7D98" },
    { label: "إعلانات مفعّلة", value: summary.enabledAds, color: "#4E7A3F" },
  ];

  return (
    <View style={styles.grid}>
      {stats.map((stat) => (
        <View key={stat.label} style={[styles.statCard, { borderColor: stat.color + "55" }]}>
          <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
          <Text style={styles.statLabel}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}

function createEmptySummary() {
  return {
    providers: 0,
    activeProviders: 0,
    frozenProviders: 0,
    pendingProviders: 0,
    requests: 0,
    pendingRequests: 0,
    acceptedRequests: 0,
    ratings: 0,
    ads: 0,
    enabledAds: 0,
  };
}

// ───────────────────── مقدمو الخدمة ─────────────────────

function ProvidersPanel() {
  const [accounts, setAccounts] = useState<ProviderAccount[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ fullName: "", title: "", specialty: "", phone: "", experience: "", years: "", password: "" });

  const load = useCallback(async () => setAccounts(await readAdminProviderAccounts()), []);

  useEffect(() => {
    load();
  }, [load]);

  const setProviderStatus = (account: ProviderAccount, status: "active" | "frozen" | "cancelled" | "pending") => {
    Alert.alert(
      "تأكيد تغيير الحالة",
      `هل تريد نقل «${account.fullName}» إلى حالة ${status === "active" ? "مفعّل" : status === "frozen" ? "مجمّد" : status === "cancelled" ? "ملغى" : "بانتظار الموافقة"}؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "تأكيد",
          onPress: async () => {
            setAccounts(await updateProviderStatus(account.id, status));
          },
        },
      ],
    );
  };

  const submitAdd = async () => {
    if (!form.fullName.trim() || !form.password.trim() || !form.title.trim() || !form.specialty.trim()) {
      Alert.alert("بيانات ناقصة", "يجب إدخال الاسم ورمز الدخول والصفة والتخصص.");
      return;
    }
    try {
      const account = await addProviderAccount({
        fullName: form.fullName.trim(),
        role: form.title.trim(),
        phone: form.phone.trim(),
        password: form.password,
        status: "active",
        specializations: form.specialty.trim() ? [form.specialty.trim()] : [],
        yearsOfExperience: Number(form.years) || 0,
        bio: form.experience.trim(),
        services: [],
        availability: { availableNow: false, slots: [] },
        documents: [],
      });
      setAccounts((current) => [...current, account]);
      setAdding(false);
      setForm({ fullName: "", title: "", specialty: "", phone: "", experience: "", years: "", password: "" });
      Alert.alert("تمت الإضافة", `أُضيف «${account.fullName}» كحساب مقدم خدمة جديد، ويمكنه الدخول الآن برمز الدخول الذي حددته.`);
    } catch (error) {
      Alert.alert("فشل الإضافة", error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
    }
  };

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeaderRow}>
        <Text style={styles.panelTitle}>حسابات مقدمي الخدمة</Text>
        <TouchableOpacity style={styles.smallButton} onPress={() => setAdding((value) => !value)} activeOpacity={0.7}>
          <MaterialIcons name={adding ? "close" : "person-add"} size={17} color="#FFFFFF" />
          <Text style={styles.smallButtonText}>{adding ? "إلغاء" : "إضافة مقدم خدمة"}</Text>
        </TouchableOpacity>
      </View>
      {adding ? (
        <View style={styles.formCard}>
          <Text style={styles.formSectionTitle}>إضافة مقدم خدمة جديد</Text>
          <TextInput style={styles.input} value={form.fullName} onChangeText={(value) => setForm((current) => ({ ...current, fullName: value }))} placeholder="الاسم الكامل" placeholderTextColor="#B5AD9C" autoCapitalize="none" returnKeyType="done" />
          <TextInput style={styles.input} value={form.title} onChangeText={(value) => setForm((current) => ({ ...current, title: value }))} placeholder="الصفة: دكتور / ممرض / أخصائي" placeholderTextColor="#B5AD9C" autoCapitalize="none" returnKeyType="done" />
          <TextInput style={styles.input} value={form.specialty} onChangeText={(value) => setForm((current) => ({ ...current, specialty: value }))} placeholder="التخصص (مثل: أطفال)" placeholderTextColor="#B5AD9C" autoCapitalize="none" returnKeyType="done" />
          <TextInput style={styles.input} value={form.phone} onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))} placeholder="رقم الهاتف" placeholderTextColor="#B5AD9C" keyboardType="phone-pad" returnKeyType="done" />
          <TextInput style={styles.input} value={form.experience} onChangeText={(value) => setForm((current) => ({ ...current, experience: value }))} placeholder="نبذة مختصرة (اختياري)" placeholderTextColor="#B5AD9C" autoCapitalize="none" returnKeyType="done" />
          <TextInput style={styles.input} value={form.years} onChangeText={(value) => setForm((current) => ({ ...current, years: value }))} placeholder="سنوات الخبرة (رقم)" placeholderTextColor="#B5AD9C" keyboardType="numeric" returnKeyType="done" />
          <TextInput style={styles.input} value={form.password} onChangeText={(value) => setForm((current) => ({ ...current, password: value }))} placeholder="رمز دخول للحساب" placeholderTextColor="#B5AD9C" secureTextEntry returnKeyType="done" />
          <TouchableOpacity style={styles.primaryButton} onPress={submitAdd} activeOpacity={0.8}>
            <Text style={styles.primaryButtonText}>إضافة الحساب</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {accounts.length === 0 ? (
        <Text style={styles.emptyText}>لا توجد حسابات لمقدمي الخدمة بعد.</Text>
      ) : null}
      {accounts.map((account) => (
        <View key={account.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIdentity}>
              <Text style={styles.cardName}>{account.fullName}</Text>
              <Text style={styles.cardSubtitle}>{[account.role, ...account.specializations].filter(Boolean).join(" · ")}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: statusColor(account.status) + "22", borderColor: statusColor(account.status) + "66" }]}>
              <Text style={[styles.badgeText, { color: statusColor(account.status) }]}>{statusLabel(account.status)}</Text>
            </View>
          </View>
          <View style={styles.actionRow}>
            <ActionChip
              label="مفعّل"
              color={account.status === "active" ? GOLD : OLIVE}
              disabled={account.status === "active"}
              onPress={() => setProviderStatus(account, "active")}
            />
            <ActionChip
              label="تجميد"
              color={account.status === "frozen" ? GOLD : "#9A8159"}
              disabled={account.status === "frozen"}
              onPress={() => setProviderStatus(account, "frozen")}
            />
            <ActionChip
              label="إلغاء"
              color={account.status === "cancelled" ? "#A65E67" : "#B55448"}
              disabled={account.status === "cancelled"}
              onPress={() => setProviderStatus(account, "cancelled")}
            />
            <ActionChip
              label="تفعيل"
              color={account.status === "pending" ? "#627F9D" : "#4E7A3F"}
              disabled={account.status === "pending"}
              onPress={() => setProviderStatus(account, "pending")}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

function statusLabel(status: string): string {
  switch (status) {
    case "active":
      return "مفعّل";
    case "frozen":
      return "مجمّد";
    case "cancelled":
      return "ملغى";
    default:
      return "بانتظار الموافقة";
  }
}

function statusColor(status: string): string {
  switch (status) {
    case "active":
      return "#4E7A3F";
    case "frozen":
      return "#9A8159";
    case "cancelled":
      return "#B55448";
    default:
      return GOLD;
  }
}

function ActionChip({ label, color, disabled, onPress }: { label: string; color: string; disabled: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, { borderColor: color + "88", backgroundColor: disabled ? color + "22" : "transparent" }, disabled && styles.chipDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ───────────────────── الإعلانات ─────────────────────

function AdsPanel() {
  const [ads, setAds] = useState<AdminAdSlide[]>([]);
  const [editing, setEditing] = useState<AdminAdSlide | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => setAds(await readAdminAds()), []);

  useEffect(() => {
    load();
  }, [load]);

  const confirmToggle = (ad: AdminAdSlide) => {
    Alert.alert(
      ad.enabled ? "إيقاف الإعلان" : "تفعيل الإعلان",
      ad.enabled ? `هل تريد إيقاف «${ad.title}» عن الظهور في التطبيق؟` : `هل تريد تفعيل «${ad.title}» في التطبيق؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "تأكيد",
          onPress: async () => setAds(await toggleAdminAd(ad.id, !ad.enabled)),
        },
      ],
    );
  };

  const confirmDelete = (ad: AdminAdSlide) => {
    Alert.alert(
      "حذف الإعلان",
      `هل تريد حذف «${ad.title}» نهائيًا؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: async () => {
            setAds(await deleteAdminAd(ad.id));
            if (editing?.id === ad.id) setEditing(null);
          },
        },
      ],
    );
  };

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeaderRow}>
        <Text style={styles.panelTitle}>إدارة الإعلانات</Text>
        <TouchableOpacity style={styles.smallButton} onPress={() => setCreating(true)} activeOpacity={0.7}>
          <MaterialIcons name="add" size={17} color="#FFFFFF" />
          <Text style={styles.smallButtonText}>إضافة إعلان</Text>
        </TouchableOpacity>
      </View>
      {creating ? <AdForm onDone={(ad) => setEditing(ad)} onCancel={() => setCreating(false)} /> : null}
      {editing ? <AdForm ad={editing} onDone={(ad) => { setEditing(null); load(); }} onCancel={() => setEditing(null)} /> : null}
      {ads.length === 0 ? <Text style={styles.emptyText}>لا توجد إعلانات تديرها اللوحة بعد؛ سيعرض التطبيق الإعلانات الافتراضية.</Text> : null}
      {ads.map((ad) => (
        <View key={ad.id} style={[styles.card, !ad.enabled && styles.dimCard]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIdentity}>
              <Text style={styles.cardName}>{ad.title}</Text>
              <Text style={styles.cardSubtitle}>{ad.eyebrow} · {ad.position === "top" ? "بانر علوي" : "بانر سفلي"}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: ad.enabled ? "#4E7A3F22" : "#B5544822", borderColor: ad.enabled ? "#4E7A3F66" : "#B5544866" }]}>
              <Text style={[styles.badgeText, { color: ad.enabled ? "#4E7A3F" : "#B55448" }]}>{ad.enabled ? "مفعّل" : "متوقف"}</Text>
            </View>
          </View>
          <Text style={styles.adCopyText}>{ad.copy}</Text>
          <View style={styles.actionRow}>
            <ActionChip label={ad.enabled ? "إيقاف" : "تفعيل"} color={ad.enabled ? "#9A8159" : "#4E7A3F"} disabled={false} onPress={() => confirmToggle(ad)} />
            <ActionChip label="تعديل" color={OLIVE} disabled={false} onPress={() => { setCreating(false); setEditing(ad); }} />
            <ActionChip label="حذف" color="#B55448" disabled={false} onPress={() => confirmDelete(ad)} />
          </View>
        </View>
      ))}
    </View>
  );
}

function AdForm({ ad, onDone, onCancel }: { ad?: AdminAdSlide; onDone: (ad: AdminAdSlide) => void; onCancel: () => void }) {
  const [fields, setFields] = useState<Omit<AdminAdSlide, "id">>(
    ad ?? { enabled: true, position: "top", eyebrow: "", title: "", copy: "", icon: "campaign", accent: OLIVE, accentSoft: "#EFF2E6" },
  );

  const submit = async () => {
    if (!fields.title.trim() || !fields.copy.trim()) {
      Alert.alert("بيانات ناقصة", "يجب إدخال عنوان الإعلان ونصّه.");
      return;
    }
    const saved = await upsertAdminAd({ ...fields, id: ad?.id ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}` });
    onDone(saved[ad ? saved.findIndex((item) => item.id === ad.id) : saved.length - 1]);
  };

  const accentOptions = [
    { label: "زيتوني", value: OLIVE, soft: "#EFF2E6" },
    { label: "ذهبي", value: GOLD, soft: "#F7EFDE" },
    { label: "أزرق", value: "#627F9D", soft: "#EBF1F6" },
    { label: "وردي", value: "#A65E67", soft: "#F8ECEE" },
    { label: "بنفسجي", value: "#8F7D98", soft: "#F2EDF4" },
  ];

  return (
    <View style={styles.formCard}>
      <Text style={styles.formSectionTitle}>{ad ? "تعديل الإعلان" : "إعلان جديد"}</Text>
      <TextInput style={styles.input} value={fields.eyebrow} onChangeText={(value) => setFields((current) => ({ ...current, eyebrow: value }))} placeholder="سطر صغير أعلى (مثل: عروض رمضان)" placeholderTextColor="#B5AD9C" autoCapitalize="none" returnKeyType="done" />
      <TextInput style={styles.input} value={fields.title} onChangeText={(value) => setFields((current) => ({ ...current, title: value }))} placeholder="عنوان الإعلان" placeholderTextColor="#B5AD9C" autoCapitalize="none" returnKeyType="done" />
      <TextInput style={styles.input} value={fields.copy} onChangeText={(value) => setFields((current) => ({ ...current, copy: value }))} placeholder="نص الإعلان" placeholderTextColor="#B5AD9C" autoCapitalize="none" returnKeyType="done" />
      <View style={styles.positionRow}>
        {(["top", "bottom"] as const).map((position) => (
          <TouchableOpacity
            key={position}
            style={[styles.chip, { borderColor: fields.position === position ? OLIVE : "#D8CFBD", backgroundColor: fields.position === position ? OLIVE + "22" : "transparent" }]}
            onPress={() => setFields((current) => ({ ...current, position }))}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, { color: fields.position === position ? OLIVE : "#6A6256" }]}>{position === "top" ? "بانر علوي" : "بانر سفلي"}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.positionRow}>
        {accentOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[styles.chip, { borderColor: fields.accent === option.value ? option.value : "#D8CFBD", backgroundColor: fields.accent === option.value ? option.soft : "transparent" }]}
            onPress={() => setFields((current) => ({ ...current, accent: option.value, accentSoft: option.soft }))}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, { color: fields.accent === option.value ? "#465132" : "#6A6256" }]}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.formButtonsRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={onCancel} activeOpacity={0.7}>
          <Text style={styles.secondaryButtonText}>إلغاء</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={submit} activeOpacity={0.8}>
          <Text style={styles.primaryButtonText}>{ad ? "حفظ التعديل" : "إضافة الإعلان"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ───────────────────── الخدمات ─────────────────────

function ServicesPanel() {
  const [catalog, setCatalog] = useState<ServicesCatalog | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const load = useCallback(async () => setCatalog(await readServicesCatalog()), []);

  useEffect(() => {
    load();
  }, [load]);

  const confirmToggle = (key: string, title: string, enabled: boolean) => {
    Alert.alert(
      enabled ? "إيقاف الخدمة" : "تفعيل الخدمة",
      enabled ? `هل تريد إخفاء خدمة «${title}» من الصفحة الرئيسية للمرضى؟` : `هل تريد إعادة إظهار خدمة «${title}» في الصفحة الرئيسية؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "تأكيد",
          onPress: async () => setCatalog(await toggleService(key, !enabled)),
        },
      ],
    );
  };

  const add = async () => {
    if (!newTitle.trim()) {
      Alert.alert("اسم ناقص", "اكتب اسم الخدمة أولًا.");
      return;
    }
    setCatalog(await addService(newTitle));
    setNewTitle("");
  };

  if (!catalog) return null;

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeaderRow}>
        <Text style={styles.panelTitle}>كتالوج الخدمات</Text>
      </View>
      <Text style={styles.panelHint}>الخدمات المعطّلة لن تظهر في الصفحة الرئيسية للمرضى.</Text>
      {catalog.services.map((service) => (
        <View key={service.key} style={[styles.card, !service.enabled && styles.dimCard]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardName}>{service.title}</Text>
            <View style={[styles.badge, { backgroundColor: service.enabled ? "#4E7A3F22" : "#B5544822", borderColor: service.enabled ? "#4E7A3F66" : "#B5544866" }]}>
              <Text style={[styles.badgeText, { color: service.enabled ? "#4E7A3F" : "#B55448" }]}>{service.enabled ? "ظاهرة" : "مخفية"}</Text>
            </View>
          </View>
          <View style={styles.actionRow}>
            <ActionChip label={service.enabled ? "إخفاء" : "إظهار"} color={service.enabled ? "#9A8159" : "#4E7A3F"} disabled={false} onPress={() => confirmToggle(service.key, service.title, service.enabled)} />
          </View>
        </View>
      ))}
      <View style={styles.addServiceRow}>
        <TextInput style={[styles.input, styles.addServiceInput]} value={newTitle} onChangeText={setNewTitle} placeholder="اسم خدمة جديدة" placeholderTextColor="#B5AD9C" autoCapitalize="none" returnKeyType="done" onSubmitEditing={add} />
        <TouchableOpacity style={styles.smallButton} onPress={add} activeOpacity={0.7}>
          <MaterialIcons name="add" size={17} color="#FFFFFF" />
          <Text style={styles.smallButtonText}>إضافة</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ───────────────────── الطلبات ─────────────────────

function RequestsPanel() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);

  const load = useCallback(async () => {
    const all = await readAdminRequests();
    setRequests(all.sort((first, second) => Number(second.createdAt) - Number(first.createdAt)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const confirmCancel = (requestId: string, title: string) => {
    Alert.alert(
      "إلغاء الطلب",
      `هل تريد إلغاء الطلب «${title}» نهائيًا؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "نعم، ألغِ الطلب",
          style: "destructive",
          onPress: async () => setRequests(await cancelAdminRequest(requestId)),
        },
      ],
    );
  };

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>سجل الطلبات</Text>
      {requests.length === 0 ? <Text style={styles.emptyText}>لا توجد طلبات بعد.</Text> : null}
      {requests.map((request) => (
        <View key={request.id} style={[styles.card, request.status === "cancelled" && styles.dimCard]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIdentity}>
              <Text style={styles.cardName}>{request.services.map((service) => service.serviceName).join("، ")}</Text>
              <Text style={styles.cardSubtitle}>من {request.patientName} · {new Date(request.createdAt).toLocaleString("ar-LY")}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: requestStatusColor(request.status) + "22", borderColor: requestStatusColor(request.status) + "66" }]}>
              <Text style={[styles.badgeText, { color: requestStatusColor(request.status) }]}>{requestStatusLabel(request.status)}</Text>
            </View>
          </View>
          {request.status !== "cancelled" && request.status !== "completed" ? (
            <View style={styles.actionRow}>
              <ActionChip label="إلغاء الطلب" color="#B55448" disabled={false} onPress={() => confirmCancel(request.id, request.services.map((service) => service.serviceName).join("، "))} />
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function requestStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "معلّق";
    case "accepted":
      return "مقبول";
    case "completed":
      return "مكتمل";
    case "rejected":
      return "مرفوض";
    default:
      return "ملغى";
  }
}

function requestStatusColor(status: string): string {
  switch (status) {
    case "pending":
      return GOLD;
    case "accepted":
      return "#4E7A3F";
    case "completed":
      return OLIVE;
    case "rejected":
      return "#B55448";
    default:
      return "#6A6256";
  }
}

// ───────────────────── المرضى ─────────────────────

function PatientsPanel() {
  const [patients, setPatients] = useState<ReturnType<typeof createEmptyPatients>>(createEmptyPatients);
  const [access, setAccess] = useState<ReturnType<typeof createEmptyAccess>>(createEmptyAccess);

  const load = useCallback(async () => {
    const profile = await getPatientProfile();
    setPatients(profile ? [{ id: profile.phone, fullName: profile.fullName }] : []);
    setAccess(await readMedicalAccessGrants());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleAccess = async (grantId: string) => {
    try {
      setAccess(await revokeMedicalAccess(grantId));
    } catch (error) {
      Alert.alert("تعذّر التعديل", error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
    }
  };

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>الملفات الطبية والصلاحيات</Text>
      <Text style={styles.panelHint}>يمكن للوحة إلغاء صلاحية الاطلاع التي منحها المريض لمقدم الخدمة.</Text>
      {patients.length === 0 ? <Text style={styles.emptyText}>لا توجد ملفات مرضى مسجلة بعد.</Text> : null}
      {patients.map((patient) => (
        <View key={patient.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardName}>{patient.fullName}</Text>
            <View style={[styles.badge, { backgroundColor: "#4E7A3F22", borderColor: "#4E7A3F66" }]}>
              <Text style={[styles.badgeText, { color: "#4E7A3F" }]}>نشط</Text>
            </View>
          </View>
          <PatientAccessRow patientId={patient.id} patientName={patient.fullName} access={access} onToggle={toggleAccess} />
        </View>
      ))}
    </View>
  );
}

// ───────────────────── المحفظات ─────────────────────

function WalletsPanel() {
  const [role, setRole] = useState<"patient" | "provider">("patient");
  const [summaries, setSummaries] = useState<WalletSummary[]>([]);
  const [form, setForm] = useState<NewWalletEntry>({
    ownerId: "",
    ownerName: "",
    role: "patient",
    kind: "credit",
    type: "recharge",
    amount: 0,
    description: "",
    reference: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setSummaries(await getWalletSummaries(role));
  }, [role]);

  useEffect(() => {
    load();
  }, [load]);

  const patientKinds = [
    { kind: "credit" as const, type: "recharge" as const, label: "شحن رصيد" },
    { kind: "debit" as const, type: "payment" as const, label: "دفع مقابل خدمة" },
    { kind: "credit" as const, type: "refund" as const, label: "استرداد للمريض" },
  ];
  const providerKinds = [
    { kind: "credit" as const, type: "earned" as const, label: "مستحق له" },
    { kind: "debit" as const, type: "charge" as const, label: "مستحق عليه" },
  ];
  const kindOptions = role === "patient" ? patientKinds : providerKinds;

  const setAmount = (value: string) => {
    const numeric = Number(value.replace(/[^0-9.]/g, ""));
    setForm((prev) => ({ ...prev, amount: Number.isFinite(numeric) ? numeric : 0 }));
  };

  const applyKind = (option: { kind: LedgerEntryKind; type: LedgerEntryType; label: string }) => {
    setForm((prev) => ({ ...prev, kind: option.kind, type: option.type }));
  };

  const submitAdd = async () => {
    const error = validateNewWalletEntry(form);
    setFormError(error);
    if (error) return;
    if (busy) return;
    setBusy(true);
    try {
      await addWalletEntry(form);
      setForm((prev) => ({ ...prev, description: "", reference: "", amount: 0 }));
      setSummaries(await getWalletSummaries(role));
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert("تعذّر الإضافة", error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = (entry: WalletLedgerEntry) => {
    Alert.alert(
      "حذف القيد",
      `هل تريد حذف قيد بقيمة ${entry.amount.toFixed(2)} د.ل من محفظة «${entry.ownerName}»؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: async () => {
            await removeWalletEntry(entry.id);
            setSummaries(await getWalletSummaries(role));
          },
        },
      ],
    );
  };

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>المحفظة المحاسبية</Text>
      <Text style={styles.panelHint}>
        سجل محاسبي لمحفظة المريض (شحن/دفع/استرداد) ومحفظة مقدم الخدمة (مستحق له/مستحق عليه). الرصيد التجميعي يُحسب من القيود.
      </Text>

      {/* تبديل بين محفظة المريض والشريك */}
      <View style={styles.positionRow}>
        <TouchableOpacity
          style={[styles.roleSwitch, role === "patient" && styles.roleSwitchActive]}
          onPress={() => {
            setRole("patient");
            setForm((prev) => ({ ...prev, role: "patient" }));
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.roleSwitchText, role === "patient" && styles.roleSwitchActiveText]}>محفظة المريض</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.roleSwitch, role === "provider" && styles.roleSwitchActive]}
          onPress={() => {
            setRole("provider");
            setForm((prev) => ({ ...prev, role: "provider" }));
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.roleSwitchText, role === "provider" && styles.roleSwitchActiveText]}>محفظة الشريك</Text>
        </TouchableOpacity>
      </View>

      {/* نموذج إضافة قيد يدوي */}
      <View style={styles.formCard}>
        <Text style={styles.formSectionTitle}>إضافة قيد محاسبي يدوي</Text>
        <TextInput
          style={styles.input}
          placeholder="اسم صاحب المحفظة"
          placeholderTextColor="#B7AFA0"
          value={form.ownerName}
          onChangeText={(value) => setForm((prev) => ({ ...prev, ownerName: value }))}
        />
        <TextInput
          style={styles.input}
          placeholder={role === "patient" ? "رقم الهاتف (معرّف المريض)" : "معرّف مقدم الخدمة"}
          placeholderTextColor="#B7AFA0"
          value={form.ownerId}
          onChangeText={(value) => setForm((prev) => ({ ...prev, ownerId: value }))}
          keyboardType="phone-pad"
        />
        <View style={styles.kindRow}>
          {kindOptions.map((option) => {
            const active = form.kind === option.kind && form.type === option.type;
            return (
              <TouchableOpacity
                key={option.type}
                style={[styles.kindChip, active && styles.kindChipActive]}
                onPress={() => applyKind(option)}
                activeOpacity={0.7}
              >
                <Text style={[styles.kindChipText, active && styles.kindChipActiveText]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.amountRow}>
          <TextInput
            style={[styles.input, styles.amountInput]}
            placeholder="المبلغ"
            placeholderTextColor="#B7AFA0"
            value={form.amount ? String(form.amount) : ""}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="الوصف"
            placeholderTextColor="#B7AFA0"
            value={form.description}
            onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="مرجع (اختياري)"
            placeholderTextColor="#B7AFA0"
            value={form.reference ?? ""}
            onChangeText={(value) => setForm((prev) => ({ ...prev, reference: value }))}
          />
        </View>
        {formError ? <Text style={styles.formError}>{formError}</Text> : null}
        <TouchableOpacity
          style={[styles.primaryButton, busy && { opacity: 0.6 }]}
          onPress={submitAdd}
          disabled={busy}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>{busy ? "جارٍ الحفظ..." : "إضافة القيد"}</Text>
        </TouchableOpacity>
      </View>

      {/* استعلام أرباح مقدم خدمة محدد */}
      <ProviderEarningsLookup role={role} onRefresh={load} />

      {/* قائمة المحافظ والقيود */}
      <Text style={[styles.panelTitle, { marginTop: 4 }]}>ملخصات المحافظ</Text>
      {summaries.length === 0 ? (
        <Text style={styles.emptyText}>
          لا توجد محفظ{role === "patient" ? " للمرضى" : " لمقدمي الخدمة"} بعد.
        </Text>
      ) : (
        summaries.map((summary) => (
          <WalletSummaryCard
            key={summary.ownerId}
            summary={summary}
            onRemove={confirmRemove}
          />
        ))
      )}
    </View>
  );
}

function ProviderEarningsLookup({ role, onRefresh }: { role: "patient" | "provider"; onRefresh: () => void }) {
  if (role !== "provider") return null;
  const [query, setQuery] = useState("");
  const [lookup, setLookup] = useState<WalletSummary | null>(null);
  const [providers, setProviders] = useState<ProviderAccount[]>([]);
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => {
    void readAdminProviderAccounts().then(setProviders);
  }, []);

  const performLookup = async (ownerId: string) => {
    const normalized = ownerId.replace(/\s+/g, "");
    setQuery(normalized);
    setLookupError(null);
    const summary = await getWalletSummary(normalized);
    if (!summary) {
      setLookupError("لا توجد قيود محاسبية مسجلة لمقدم الخدمة بهذا المعرّف حتى الآن.");
      setLookup(null);
      return;
    }
    setLookup(summary);
  };

  return (
    <View style={styles.formCard}>
      <Text style={styles.formSectionTitle}>استعلام أرباح مقدم خدمة</Text>
      <Text style={styles.panelHint}>
        ابحث عن مقدم خدمة بالاسم أدناه لعرض ملخص محفظته المحاسبية (المستحق له والمستحق عليه والرصيد).
      </Text>
      <View style={styles.providerChipsRow}>
        {providers.map((provider) => {
          const active = query === provider.id;
          return (
            <TouchableOpacity
              key={provider.id}
              style={[styles.kindChip, active && styles.kindChipActive]}
              onPress={() => void performLookup(provider.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.kindChipText, active && styles.kindChipActiveText, { fontSize: 11 }]}>
                {provider.role} — {provider.fullName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {providers.length === 0 ? (
        <Text style={styles.emptyAccessText}>لا يوجد مقدمو خدمة مسجلون بعد.</Text>
      ) : null}
      {lookup ? (
        <WalletSummaryCard summary={lookup} onRemove={() => void onRefresh()} />
      ) : (
        <Text style={lookupError ? styles.formError : styles.emptyAccessText}>
          {lookupError || "اختر مقدم خدمة لعرض أرباحه."}
        </Text>
      )}
    </View>
  );
}

function WalletSummaryCard({ summary, onRemove }: { summary: WalletSummary; onRemove: (entry: WalletLedgerEntry) => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIdentity}>
          <Text style={styles.cardName}>{summary.ownerName}</Text>
          <Text style={styles.cardSubtitle}>{summary.ownerId}</Text>
        </View>
        <View style={styles.balanceBox}>
          <Text style={[styles.badgeText, { color: "#6A6256", fontSize: 11 }]}>الرصيد</Text>
          <Text
            style={[
              styles.balanceValue,
              {
                color:
                  summary.balance > 0 ? "#4E7A3F" : summary.balance < 0 ? "#B55448" : "#6A6256",
              },
            ]}
          >
            {summary.balance.toFixed(2)}
          </Text>
        </View>
      </View>
      <View style={styles.walletStatsRow}>
        <Text style={[styles.walletStat, { color: "#4E7A3F" }]}>وارد: {summary.credit.toFixed(2)}</Text>
        <Text style={[styles.walletStat, { color: "#B55448" }]}>صادر: {summary.debit.toFixed(2)}</Text>
        <Text style={styles.walletStat}>{summary.entries.length} قيود</Text>
      </View>
      {summary.entries.length === 0 ? (
        <Text style={styles.emptyAccessText}>لا توجد قيود محاسبية لهذه المحفظة.</Text>
      ) : (
        <View style={styles.entriesList}>
          {summary.entries.map((entry) => (
            <View key={entry.id} style={styles.entryRow}>
              <View style={styles.entryKindDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.entryText}>{entry.description || entry.type}</Text>
                <Text style={styles.entryMeta}>
                  {kindArabicLabel(entry.type)} · {new Date(entry.createdAt).toLocaleDateString("ar-LY")}
                  {entry.reference ? ` · مرجع: ${entry.reference}` : ""}
                </Text>
              </View>
              <Text
                style={[
                  styles.entryAmount,
                  {
                    color: entry.kind === "credit" ? "#4E7A3F" : "#B55448",
                  },
                ]}
              >
                {entry.kind === "credit" ? "+" : "-"}{entry.amount.toFixed(2)} د.ل
              </Text>
              <TouchableOpacity
                style={styles.entryDelete}
                onPress={() => onRemove(entry)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="delete-outline" size={15} color="#B55448" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function kindArabicLabel(type: string): string {
  switch (type) {
    case "recharge":
      return "شحن رصيد";
    case "payment":
      return "دفع خدمة";
    case "refund":
      return "استرداد";
    case "earned":
      return "مستحق له";
    case "charge":
      return "مستحق عليه";
    default:
      return type;
  }
}

function createEmptyPatients() {
  return [] as { id: string; fullName: string }[];
}

function createEmptyAccess() {
  return [] as unknown[];
}

function PatientAccessRow({ patientId, patientName, access, onToggle }: { patientId: string; patientName: string; access: unknown; onToggle: (grantId: string) => void }) {
  const grants = useMemo(() => {
    const raw = (access ?? []) as { id?: string; providerId?: string; providerName?: string; recordOwnerNames?: string[] }[];
    return raw.filter((grant) =>
      (grant.recordOwnerNames ?? []).some((owner) => owner.trim().toLowerCase() === patientId.trim().toLowerCase()),
    );
  }, [access, patientId]);

  if (grants.length === 0) {
    return (
      <View style={styles.emptyAccessRow}>
        <Text style={styles.emptyAccessText}>لا توجد صلاحيات اطّلاع ممنوحة لهذا الملف.</Text>
      </View>
    );
  }

  return (
    <View style={styles.accessList}>
      {grants.map((grant) => (
        <View key={grant.id ?? `${patientId}-${grant.providerId}`} style={styles.accessRow}>
          <MaterialIcons name="visibility" size={15} color={OLIVE} />
          <Text style={styles.accessText}>مصرّح لمقدم الخدمة «{grant.providerName ?? grant.providerId}» بالاطلاع على ملف {patientName}</Text>
          <TouchableOpacity
            style={styles.accessRevoke}
            onPress={() => grant.id && onToggle(grant.id)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="cancel" size={16} color="#B55448" />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pinTitle: { color: "#465132", fontSize: 20, fontWeight: "800", lineHeight: 27 },
  pinHint: { color: "#8A8173", fontSize: 12 },
  pinInput: {
    backgroundColor: "#FFFDF8",
    borderColor: "#E4DCCB",
    borderRadius: 13,
    borderWidth: 1,
    color: "#465132",
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    width: 250,
    textAlign: "center",
  },
  pinError: { color: "#B55448", fontSize: 12 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: OLIVE,
    borderRadius: 14,
    marginTop: 10,
    paddingHorizontal: 26,
    paddingVertical: 11,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#F0EBDD",
    borderColor: "#E4DCCB",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  secondaryButtonText: { color: "#6A6256", fontSize: 13, fontWeight: "800" },
  headerRow: {
    alignItems: "center",
    borderBottomColor: "#EDE6D6",
    borderBottomWidth: 1,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { color: "#465132", fontSize: 17, fontWeight: "800" },
  logoutButton: {
    alignItems: "center",
    backgroundColor: "#F0EBDD",
    borderRadius: 13,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  tabBar: { maxHeight: 46, paddingHorizontal: 10 },
  tabItem: {
    alignItems: "center",
    backgroundColor: "#F0EBDD",
    borderColor: "#E4DCCB",
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row-reverse",
    gap: 4,
    justifyContent: "center",
    marginHorizontal: 3,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  activeTab: { backgroundColor: OLIVE, borderColor: OLIVE },
  tabText: { color: "#6A6256", fontSize: 11, fontWeight: "700" },
  activeTabText: { color: "#FFFFFF" },
  tabContent: { padding: 16 },
  panel: { gap: 10 },
  panelHeaderRow: {
    alignItems: "center",
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  panelTitle: { color: "#465132", fontSize: 15, fontWeight: "800" },
  panelHint: { color: "#8A8173", fontSize: 11, marginBottom: 2 },
  smallButton: {
    alignItems: "center",
    backgroundColor: GOLD,
    borderRadius: 12,
    flexDirection: "row-reverse",
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  smallButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  grid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 9 },
  statCard: {
    alignItems: "center",
    backgroundColor: "#FFFDF8",
    borderColor: "#E8E0D1",
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    paddingVertical: 14,
    width: "30.5%",
  },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { color: "#8A8173", fontSize: 10, marginTop: 2 },
  card: {
    backgroundColor: "#FFFDF8",
    borderColor: "#E8E0D1",
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  dimCard: { opacity: 0.72 },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row-reverse",
    justifyContent: "space-between",
  },
  cardIdentity: { flex: 1 },
  cardName: { color: "#465132", fontSize: 13, fontWeight: "800", lineHeight: 18, textAlign: "right" },
  cardSubtitle: { color: "#8A8173", fontSize: 11, marginTop: 1, textAlign: "right" },
  badge: {
    borderColor: "#4E7A3F66",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 10, fontWeight: "800" },
  adCopyText: { color: "#786F61", fontSize: 11, lineHeight: 16, marginTop: 6, textAlign: "right" },
  actionRow: {
    alignItems: "center",
    flexDirection: "row-reverse",
    gap: 7,
    justifyContent: "flex-end",
    marginTop: 9,
  },
  chip: {
    borderColor: "#D8CFBD",
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  chipText: { fontSize: 10, fontWeight: "800" },
  chipDisabled: { opacity: 0.55 },
  formCard: {
    backgroundColor: "#FBF7EC",
    borderColor: "#E8E0D1",
    borderRadius: 16,
    borderWidth: 1,
    gap: 9,
    marginBottom: 4,
    padding: 13,
  },
  formSectionTitle: { color: "#465132", fontSize: 13, fontWeight: "800" },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E4DCCB",
    borderRadius: 11,
    borderWidth: 1,
    color: "#465132",
    fontSize: 13,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  positionRow: { alignItems: "center", flexDirection: "row-reverse", gap: 7 },
  formButtonsRow: { alignItems: "center", flexDirection: "row-reverse", gap: 9, justifyContent: "flex-end" },
  addServiceRow: {
    alignItems: "center",
    flexDirection: "row-reverse",
    gap: 8,
    marginTop: 3,
  },
  addServiceInput: { flex: 1 },
  emptyText: { color: "#9A907E", fontSize: 12, textAlign: "center", marginVertical: 10 },
  emptyAccessRow: {
    backgroundColor: "#FBF7EC",
    borderRadius: 10,
    marginTop: 8,
    padding: 9,
  },
  emptyAccessText: { color: "#9A907E", fontSize: 11, textAlign: "right" },
  accessList: { gap: 6, marginTop: 8 },
  accessRow: {
    alignItems: "center",
    backgroundColor: "#FBF7EC",
    borderRadius: 10,
    flexDirection: "row-reverse",
    gap: 6,
    padding: 9,
  },
  accessText: { color: "#5A624B", flex: 1, fontSize: 11, textAlign: "right" },
  accessRevoke: { alignItems: "center", justifyContent: "center", padding: 4 },
  roleSwitch: {
    alignItems: "center",
    backgroundColor: "#F0EBDD",
    borderColor: "#E4DCCB",
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    paddingVertical: 9,
  },
  roleSwitchActive: { backgroundColor: OLIVE, borderColor: OLIVE },
  roleSwitchText: { color: "#6A6256", fontSize: 12, fontWeight: "800" },
  roleSwitchActiveText: { color: "#FFFFFF" },
  kindRow: { alignItems: "center", flexDirection: "row-reverse", gap: 6 },
  kindChip: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E4DCCB",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  kindChipActive: { backgroundColor: GOLD, borderColor: GOLD },
  kindChipText: { color: "#6A6256", fontSize: 11, fontWeight: "800" },
  kindChipActiveText: { color: "#FFFFFF" },
  amountRow: { alignItems: "center", flexDirection: "row-reverse", gap: 7 },
  amountInput: { width: 80 },
  formError: { color: "#B55448", fontSize: 11 },
  balanceBox: { alignItems: "center", gap: 1, justifyContent: "center" },
  balanceValue: { fontSize: 17, fontWeight: "800", lineHeight: 22 },
  walletStatsRow: { alignItems: "center", flexDirection: "row-reverse", gap: 12, marginTop: 8 },
  walletStat: { color: "#8A8173", fontSize: 10, fontWeight: "700" },
  entriesList: { gap: 5, marginTop: 8 },
  entryRow: {
    alignItems: "center",
    backgroundColor: "#FBF7EC",
    borderRadius: 10,
    flexDirection: "row-reverse",
    gap: 7,
    padding: 9,
  },
  entryKindDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
    backgroundColor: "#6B7B3F",
  },
  entryText: { color: "#465132", fontSize: 11, fontWeight: "700", textAlign: "right" },
  entryMeta: { color: "#9A907E", fontSize: 10, marginTop: 1, textAlign: "right" },
  entryAmount: { fontSize: 12, fontWeight: "800", textAlign: "right" },
  entryDelete: { alignItems: "center", justifyContent: "center", padding: 3 },
  providerChipsRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 6, marginTop: 8 },
  areasGrid: { gap: 4, marginTop: 6 },
  areaRow: {
    alignItems: "center",
    flexDirection: "row-reverse",
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  areaName: { color: "#6A6256", flex: 1, fontSize: 10.5, textAlign: "right" },
  areaToggle: { padding: 4 },
  dimHint: { color: "#A69B88", fontSize: 10, paddingHorizontal: 7, paddingTop: 3 },
});

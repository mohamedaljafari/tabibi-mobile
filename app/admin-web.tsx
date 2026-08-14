/**
 * لوحة التحكم الإدارية المستقلة — واجهة ويب كاملة (admin-web).
 *
 * هذه الصفحة منفصلة تمامًا عن تطبيق المريض: تُفتح من المتصفح على أي جهاز
 * (كمبيوتر أو هاتف) عبر المسار /admin-web في نفس نطاق تشغيل التطبيقين،
 * وتقرأ وتكتب البيانات نفسها التي يستخدمها التطبيقان (AsyncStorage تتشارك
 * localStorage في المتصفح ضمن النطاق الواحد).
 *
 * الحماية: الرمز السري الإداري (ADMIN_PIN / EXPO_PUBLIC_ADMIN_PIN).
 *
 * ملاحظة هندسية: الواجهة مكتوبة بعناصر React DOM قياسية (div/button/input)
 * لأن مسارها مخصص للويب فقط ولا يجري تحميلها على أجهزة الجوال.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { isValidAdminPin } from "@/lib/admin-auth";
import {
  addProviderAccount,
  addService,
  cancelAdminRequest,
  deleteAdminAd,
  deleteAdminRating,
  readAdminAds,
  updateProviderStatus,
  readAdminProviderAccounts,
  readAdminRequests,
  readAdminRatings,
  readAdminSummary,
  readServicesCatalog,
  toggleAdminAd,
  toggleService,
  upsertAdminAd,
  type AdminAccountStatus,
  type AdminAdSlide,
  type AdminSummary,
} from "@/lib/admin";
import type { ServiceRequest } from "@/lib/service-requests";
import {
  getWalletSummaries,
  getWalletSummary,
  removeWalletEntry,
  validateNewWalletEntry,
  type LedgerEntryKind,
  type NewWalletEntry,
  type WalletSummary,
} from "@/lib/wallets";
import { addWalletEntry, readWalletEntries } from "@/lib/wallets";
import { getPatientProfile, readMedicalAccessGrants, revokeMedicalAccess } from "@/lib/patient-profile";
import { getEnabledCities, getLibyaCities, setCityEnabled, setAreaEnabled, TRIPOLI_CITY_ID, type LibyaCity } from "@/lib/libya-cities";
import { readCitySuggestions, markCitySuggestionReviewed, removeCitySuggestion, type CitySuggestion } from "@/lib/city-suggestions";
import {
  addExternalDoctor,
  makeInitials,
  readExternalDoctors,
  removeExternalDoctor,
  toggleExternalDoctor,
  updateExternalDoctor,
  type ExternalConsultationDoctor,
} from "@/lib/consultation-doctors";
import type { ProviderAccount } from "@/lib/provider-registry";
import {
  countUnreadByChannel,
  countUnreadByRole,
  createPromoNotification,
  deleteAdminNotification,
  markAllNotificationsRead,
  markAdminNotificationRead,
  readAdminNotifications,
  readMarketingNotifications,
  readPatientNotifications,
  readProviderNotifications,
} from "@/lib/notifications-admin";
import {
  readNotificationRules,
  readNotifications,
  toggleNotificationChannel,
  type Notification,
  type NotificationChannel,
} from "@/lib/notifications";
import { readAuditLog, type AuditLogEntry } from "@/lib/admin-audit-log";
import {
  providerShareAfterCommission,
  readPlatformSettings,
  writePlatformSettings,
  type PlatformSettings,
} from "@/lib/platform-settings";

type AdminTabId = "summary" | "providers" | "ads" | "services" | "requests" | "patients" | "wallets" | "cities" | "international" | "monthly" | "notifications" | "audit" | "settings";

const OLIVE = "#6B7B3F";
const GOLD = "#C9A961";

// ══════════════════════ عناصر مشتركة ══════════════════════
const sharedCss = `
body { margin: 0; font-family: 'Segoe UI', Tahoma, sans-serif; direction: rtl; }
`;

function useRefreshToken() {
  const [token, setToken] = useState(0);
  return { token, refresh: () => setToken((t) => t + 1) };
}

// ══════════════════════ شاشة الدخول ══════════════════════
function AdminPinGate({ onAuth }: { onAuth: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const submit = useCallback(() => {
    if (isValidAdminPin(pin)) {
      setError("");
      onAuth();
    } else {
      setError("الرمز غير صحيح، حاول مرة أخرى.");
    }
  }, [pin, onAuth]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F7F4EC",
      }}
    >
      <div style={{ background: "#fff", borderRadius: 16, padding: 40, width: 340, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🛡️</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#3A3A3A" }}>لوحة تحكم طبيبي</div>
        <div style={{ fontSize: 13, color: "#8A8278", marginTop: 4 }}>أدخل الرمز الإداري للمتابعة</div>
        <input
          type="password"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="الرمز الإداري"
          autoComplete="off"
          style={{
            width: "100%",
            marginTop: 24,
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid #DDD6C8",
            fontSize: 15,
            textAlign: "center",
            letterSpacing: 4,
            boxSizing: "border-box",
          }}
        />
        {error ? <div style={{ color: "#B55448", fontSize: 13, marginTop: 8 }}>{error}</div> : null}
        <button
          onClick={submit}
          style={{
            marginTop: 16,
            width: "100%",
            padding: 12,
            borderRadius: 10,
            border: "none",
            background: OLIVE,
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          دخول
        </button>
      </div>
    </div>
  );
}

// ══════════════════════ الإطار الرئيسي ══════════════════════
const TABS: { id: AdminTabId; title: string; icon: string }[] = [
  { id: "summary", title: "نظرة عامة", icon: "📊" },
  { id: "providers", title: "مقدمو الخدمة", icon: "🏥" },
  { id: "ads", title: "الإعلانات", icon: "📢" },
  { id: "services", title: "الخدمات", icon: "🧩" },
  { id: "requests", title: "الطلبات", icon: "🔄" },
  { id: "patients", title: "المرضى", icon: "👥" },
  { id: "wallets", title: "المحفظات", icon: "💼" },
  { id: "cities", title: "المدن والمناطق", icon: "🏙️" },
  { id: "international", title: "أطباء الخارج", icon: "🌍" },
  { id: "monthly", title: "التقرير الشهري", icon: "📈" },
  { id: "notifications", title: "مركز الإشعارات", icon: "📨" },
  { id: "audit", title: "سجل نشاط الإدارة", icon: "📋" },
  { id: "settings", title: "الإعدادات العامة", icon: "⚙️" },
];

export default function AdminWebScreen() {
  const [authenticated, setAuthenticated] = useState(false);
  const [tab, setTab] = useState<AdminTabId>("summary");
  const { token, refresh } = useRefreshToken();

  if (!authenticated) {
    return (
      <>
        <style>{sharedCss}</style>
        <AdminPinGate onAuth={() => setAuthenticated(true)} />
      </>
    );
  }

  return (
    <>
      <style>{sharedCss}</style>
      <div style={{ minHeight: "100vh", background: "#F7F4EC" }}>
        <header style={{ background: "#fff", borderBottom: "1px solid #E7E0D2", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🛡️</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#3A3A3A" }}>لوحة تحكم طبيبي</span>
          </div>
          <button
            onClick={() => {
              setAuthenticated(false);
              setTab("summary");
            }}
            style={{
              background: "none",
              border: "1px solid #DDD6C8",
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: 13,
              color: "#6A6256",
              cursor: "pointer",
            }}
          >
            تسجيل خروج
          </button>
        </header>
        <nav
          style={{
            background: "#fff",
            borderBottom: "1px solid #E7E0D2",
            padding: "8px 16px",
            display: "flex",
            gap: 6,
            overflowX: "auto",
          }}
        >
          {TABS.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                border: "none",
                background: tab === item.id ? OLIVE : "#F1EDE3",
                color: tab === item.id ? "#fff" : "#6A6256",
                fontSize: 13,
                fontWeight: tab === item.id ? 700 : 400,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <span>{item.icon}</span>
              <span>{item.title}</span>
            </button>
          ))}
        </nav>
        <main key={token} style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
          {tab === "summary" ? <SummaryPanel onRefresh={refresh} /> : null}
          {tab === "providers" ? <ProvidersPanel onRefresh={refresh} /> : null}
          {tab === "ads" ? <AdsPanel onRefresh={refresh} /> : null}
          {tab === "services" ? <ServicesPanel onRefresh={refresh} /> : null}
          {tab === "requests" ? <RequestsPanel onRefresh={refresh} /> : null}
          {tab === "patients" ? <PatientsPanel onRefresh={refresh} /> : null}
          {tab === "wallets" ? <WalletsPanel onRefresh={refresh} /> : null}
          {tab === "cities" ? <CitiesPanel onRefresh={refresh} /> : null}
          {tab === "international" ? <InternationalDoctorsPanel onRefresh={refresh} /> : null}
          {tab === "monthly" ? <MonthlyReportPanel onRefresh={refresh} /> : null}
          {tab === "notifications" ? <NotificationsCenterPanel onRefresh={refresh} /> : null}
          {tab === "audit" ? <AuditLogPanel onRefresh={refresh} /> : null}
          {tab === "settings" ? <GeneralSettingsPanel onRefresh={refresh} /> : null}
        </main>
      </div>
    </>
  );
}

// ══════════════════════ لوحة أطباء الخارج ══════════════════════
function InternationalDoctorsPanel({ onRefresh }: { onRefresh: () => void }) {
  const [doctors, setDoctors] = useState<ExternalConsultationDoctor[]>([]);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [experience, setExperience] = useState("");
  const [price, setPrice] = useState("");
  const [formError, setFormError] = useState("");
  const [editingDoctor, setEditingDoctor] = useState<ExternalConsultationDoctor | null>(null);

  useEffect(() => {
    if (editingDoctor) {
      setName(editingDoctor.name);
      setCountry(editingDoctor.country);
      setSpecialty(editingDoctor.specialty);
      setExperience(String(editingDoctor.experience));
      setPrice(String(editingDoctor.price));
    } else {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingDoctor]);

  const load = useCallback(async () => {
    setDoctors(await readExternalDoctors());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setName("");
    setCountry("");
    setSpecialty("");
    setExperience("");
    setPrice("");
  };

  const submit = async () => {
    setFormError("");
    const parsedExperience = Number(experience);
    const parsedPrice = Number(price);
    if (!name.trim()) return setFormError("أدخل اسم الطبيب");
    if (!country.trim()) return setFormError("أدخل الدولة");
    if (!specialty.trim()) return setFormError("أدخل التخصص");
    if (Number.isNaN(parsedExperience) || parsedExperience < 0) return setFormError("أدخل سنوات خبرة صحيحة");
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) return setFormError("أدخل سعر استشارة صحيح");

    try {
      if (editingDoctor) {
        await updateExternalDoctor(editingDoctor.id, {
          name: name.trim(),
          country: country.trim(),
          specialty: specialty.trim(),
          experience: parsedExperience,
          price: parsedPrice,
        });
      } else {
        await addExternalDoctor({
          name: name.trim(),
          country: country.trim(),
          specialty: specialty.trim(),
          experience: parsedExperience,
          price: parsedPrice,
          initials: makeInitials(name.trim()),
          enabled: true,
        });
      }
      resetForm();
      setEditingDoctor(null);
      await load();
      onRefresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "تعذر حفظ الطبيب");
    }
  };

  const handleToggle = async (doctor: ExternalConsultationDoctor) => {
    await toggleExternalDoctor(doctor.id, !doctor.enabled);
    await load();
    onRefresh();
  };

  const handleDelete = async (doctor: ExternalConsultationDoctor) => {
    if (!window.confirm(`هل تريد حذف الطبيب «${doctor.name}»؟`)) return;
    await removeExternalDoctor(doctor.id);
    await load();
    onRefresh();
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Card title="إدارة أطباء الاستشارات خارج ليبيا" note="التسجيل يدوي من هنا فقط، ولا يُستخدم رقم هاتف إطلاقًا">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <Field label="الاسم" value={name} onChange={setName} />
          <Field label="الدولة" value={country} onChange={setCountry} />
          <Field label="التخصص" value={specialty} onChange={setSpecialty} />
          <Field label="سنوات الخبرة" value={experience} onChange={setExperience} type="number" />
          <Field label="سعر الاستشارة (د.ل)" value={price} onChange={setPrice} type="number" />
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <PrimaryButton label={editingDoctor ? "حفظ التعديل" : "إضافة الطبيب"} onPress={submit} />
          {editingDoctor ? (
            <button
              onClick={() => {
                setEditingDoctor(null);
                resetForm();
                setFormError("");
              }}
              style={{ background: "none", border: "1px solid #DDD6C8", borderRadius: 8, padding: "10px 16px", color: "#6A6256", cursor: "pointer" }}
            >
              إلغاء التعديل
            </button>
          ) : null}
          {formError ? <span style={{ color: "#B55448", fontSize: 13 }}>{formError}</span> : null}
        </div>
      </Card>
      {doctors.length === 0 ? (
        <Card title="لا يوجد أطباء خارجيون مسجلون">
          <div style={{ color: "#8A8278", fontSize: 14 }}>أضف طبيبًا من النموذج أعلاه ليظهر للمرضى عند تفعيله.</div>
        </Card>
      ) : (
        <Card title={`الأطباء المسجلون (${doctors.length})`}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "right" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #E7E0D2" }}>
                  {["الاسم", "الدولة", "التخصص", "الخبرة", "السعر", "الحالة", "إجراءات"].map((h) => (
                    <th key={h} style={{ padding: 10, color: "#6A6256" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {doctors.map((doctor) => (
                  <tr key={doctor.id} style={{ borderBottom: "1px solid #EFE9DD" }}>
                    <td style={{ padding: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Avatar initials={makeInitials(doctor.name)} />
                        <div>
                          <div style={{ fontWeight: 700, color: "#3A3A3A" }}>{doctor.name}</div>
                          <div style={{ fontSize: 12, color: "#8A8278" }}>{doctor.id.slice(0, 8)}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: 10 }}>{doctor.country}</td>
                    <td style={{ padding: 10 }}>{doctor.specialty}</td>
                    <td style={{ padding: 10 }}>{doctor.experience} سنة</td>
                    <td style={{ padding: 10 }}>{doctor.price} د.ل</td>
                    <td style={{ padding: 10 }}>
                      <StatusBadge active={doctor.enabled} />
                    </td>
                    <td style={{ padding: 10 }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <ActionChip label="تعديل" color="#C9A961" onPress={() => setEditingDoctor(doctor)} />
                        <ActionChip label={doctor.enabled ? "إيقاف" : "تفعيل"} color={doctor.enabled ? "#B55448" : OLIVE} onPress={() => handleToggle(doctor)} />
                        <ActionChip label="حذف" color="#8A8278" onPress={() => handleDelete(doctor)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ══════════════════════ لوحة المدن والمناطق ══════════════════════
function CitiesPanel({ onRefresh }: { onRefresh: () => void }) {
  const [cities, setCities] = useState<LibyaCity[]>([]);
  const [areaEnabled, setAreaEnabledState] = useState<Record<string, boolean>>({});
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);

  const load = useCallback(async () => {
    const loadedCities = await getLibyaCities();
    setCities(loadedCities);
    setSuggestions(await readCitySuggestions());
    const areaStates: Record<string, boolean> = {};
    for (const city of loadedCities) {
      for (const area of city.areas) {
        areaStates[area.id] = await isAreaEnabled(area.id);
      }
    }
    setAreaEnabledState(areaStates);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleCity = async (cityId: string) => {
    await setCityEnabled(cityId, !cities.find((c) => c.id === cityId)?.enabled);
    await load();
    onRefresh();
  };

  const toggleArea = async (cityId: string, areaId: string) => {
    const currentlyEnabled = areaEnabled[areaId] ?? true;
    await setAreaEnabled(cityId, areaId, !currentlyEnabled);
    await load();
    onRefresh();
  };

  const markReviewed = async (suggestion: CitySuggestion) => {
    await markCitySuggestionReviewed(suggestion.id, true);
    await load();
  };

  const removeSuggestion = async (suggestion: CitySuggestion) => {
    await removeCitySuggestion(suggestion.id);
    await load();
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Card title="اقتراحات المدن الجديدة">
        {suggestions.length === 0 ? (
          <div style={{ color: "#8A8278", fontSize: 14 }}>لا توجد اقتراحات مدن جديدة من المستخدمين.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {suggestions.map((s) => (
              <div key={s.id} style={{ background: "#F1EDE3", borderRadius: 10, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontSize: 14, color: "#3A3A3A" }}>
                  <span style={{ fontWeight: 700 }}>{s.cityName}</span>
                  <div style={{ fontSize: 13, color: "#6A6256", marginTop: 4 }}>{s.reason || "بدون سبب مذكور"}</div>
                  <div style={{ fontSize: 12, color: "#8A8278", marginTop: 2 }}>{new Date(s.suggestedAt).toLocaleString("ar-LY")}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <ActionChip label={s.status === "reviewed" ? "تمت مراجعتها" : "تسجيل مراجعة"} color={s.status === "reviewed" ? "#8A8278" : OLIVE} disabled={s.status === "reviewed"} onPress={() => markReviewed(s)} />
                  <ActionChip label="حذف" color="#8A8278" onPress={() => removeSuggestion(s)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card title="المدن والمناطق">
        {suggestions.length > 0 ? (
          <div style={{ fontSize: 13, color: "#6A6256", marginBottom: 10 }}>تفعيل المدينة هنا سيُظهرها في التطبيق للمرضى ومقدمي الخدمة.</div>
        ) : null}
        <div style={{ display: "grid", gap: 10 }}>
          {cities.map((city) => (
            <details key={city.id} style={{ background: "#F1EDE3", borderRadius: 10, padding: 12 }}>
              <summary style={{ cursor: "pointer", fontWeight: 700, color: "#3A3A3A", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14 }}>
                <span>{city.name} ({city.areas.filter((a) => areaEnabled[a.id] !== false).length}/{city.areas.length} منطقة مفعلة)</span>
                <StatusBadge active={city.enabled} />
              </summary>
              <div style={{ marginTop: 10 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                  <button
                    onClick={() => toggleCity(city.id)}
                    style={{
                      background: city.enabled ? "#B55448" : OLIVE,
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "8px 14px",
                      fontSize: 13,
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    {city.enabled ? "إيقاف المدينة" : "تفعيل المدينة"}
                  </button>
                  {city.id !== TRIPOLI_CITY_ID ? (
                    <span style={{ fontSize: 12, color: "#8A8278", alignSelf: "center" }}>ملاحظة: طرابلس هي المفعلة افتراضيًا</span>
                  ) : null}
                </div>
                {city.enabled ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {city.areas.map((area) => {
                      const enabled = areaEnabled[area.id] !== false;
                      return (
                        <button
                          key={area.id}
                          onClick={() => toggleArea(city.id, area.id)}
                          style={{
                            background: enabled ? "#fff" : "#E7E0D2",
                            border: `1px solid ${enabled ? OLIVE : "#DDD6C8"}`,
                            borderRadius: 16,
                            padding: "4px 12px",
                            fontSize: 12,
                            color: enabled ? OLIVE : "#6A6256",
                            cursor: "pointer",
                          }}
                        >
                          {area.name}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "#8A8278" }}>فعّل المدينة أولًا لإدارة مناطقها.</div>
                )}
              </div>
            </details>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════ لوحة النظرة العامة ══════════════════════
function SummaryPanel({ onRefresh }: { onRefresh: () => void }) {
  const [summary, setSummary] = useState<AdminSummary | null>(null);

  useEffect(() => {
    (async () => {
      setSummary(await readAdminSummary());
    })();
  }, []);

  if (!summary) {
    return <div style={{ color: "#8A8278" }}>جارٍ التحميل...</div>;
  }

  const stats = [
    { label: "مقدمو الخدمة (مفعّل)", value: summary.activeProviders, icon: "🏥" },
    { label: "في انتظار المراجعة", value: summary.pendingProviders, icon: "⏳" },
    { label: "طلبات معلقة", value: summary.pendingRequests, icon: "🔄" },
    { label: "طلبات مقبولة", value: summary.acceptedRequests, icon: "✅" },
    { label: "الإعلانات المفعلة", value: summary.enabledAds, icon: "📢" },
    { label: "التقييمات", value: summary.ratings, icon: "⭐" },
  ];

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {summary.pendingProviders > 0 ? (
        <div
          style={{
            background: "#FDF3DC",
            border: "1px solid #E8C77E",
            borderRadius: 12,
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 14, color: "#7A5C1E", fontWeight: 600 }}>
            🔔 يوجد <strong>{summary.pendingProviders}</strong> حسابًا لمقدم خدمة بانتظار موافقتك. افتح تبويب «مقدمو الخدمة» للمراجعة والتفعيل.
          </div>
        </div>
      ) : null}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        {stats.map((stat) => (
          <div key={stat.label} style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #E7E0D2" }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{stat.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: OLIVE }}>{stat.value}</div>
            <div style={{ fontSize: 13, color: "#6A6256", marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </div>
      <Card title="روابط سريعة">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ActionChip label="إدارة مقدمي الخدمة" color="#C9A961" onPress={() => {}} />
          <ActionChip label="إدارة الإعلانات" color="#C9A961" onPress={() => {}} />
          <ActionChip label="متابعة الطلبات" color="#C9A961" onPress={() => {}} />
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════ عناصر مساعدة مشتركة ══════════════════════
function Card({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #E7E0D2" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#3A3A3A" }}>{title}</span>
      </div>
      {note ? <div style={{ fontSize: 12, color: "#8A8278", marginBottom: 12 }}>{note}</div> : null}
      <div style={{ marginTop: 8 }}>{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label style={{ display: "grid", gap: 4, fontSize: 13, color: "#6A6256" }}>
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: 10,
          borderRadius: 8,
          border: "1px solid #DDD6C8",
          fontSize: 14,
          background: "#fff",
        }}
      />
    </label>
  );
}

function ActionChip({ label, color, disabled, onPress }: { label: string; color: string; disabled?: boolean; onPress: () => void }) {
  return (
    <button
      onClick={onPress}
      disabled={disabled}
      style={{
        background: "#fff",
        border: `1px solid ${color}`,
        borderRadius: 16,
        padding: "5px 12px",
        fontSize: 12,
        color: disabled ? "#B5B0A6" : color,
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 700,
      }}
    >
      {label}
    </button>
  );
}

function Avatar({ initials, size = 32 }: { initials: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        background: "#E7E0D2",
        color: "#6A6256",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.4,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

function StatusBadge({ active, activeLabel = "مفعّل", inactiveLabel = "متوقف" }: { active: boolean; activeLabel?: string; inactiveLabel?: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        background: active ? "#E8F0DC" : "#F3E3E0",
        color: active ? "#4E6B2A" : "#B55448",
        borderRadius: 12,
        padding: "3px 10px",
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

function PrimaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onPress}
      disabled={disabled}
      style={{
        background: disabled ? "#B5B0A6" : OLIVE,
        color: "#fff",
        border: "none",
        borderRadius: 8,
        padding: "10px 20px",
        fontSize: 14,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {label}
    </button>
  );
}

/** هل المنطقة مفعلة؟ تفعيل المناطق محفوظ في.disabledAreas داخل AsyncStorage. */
async function isAreaEnabled(areaId: string): Promise<boolean> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const raw = await AsyncStorage.getItem("tabibi.libya_cities.v1");
    if (!raw) return true;
    const overrides = JSON.parse(raw) as { disabledAreas?: string[] };
    return !(overrides.disabledAreas ?? []).includes(areaId);
  } catch {
    return true;
  }
}

// ══════════════════════ لوحة مقدمي الخدمة ══════════════════════
const SPECIALTIES = [
  "طب عام",
  "طب باطني",
  "طب أطفال",
  "جراحة عامة",
  "نساء وولادة",
  "عظام",
  "قلب وأوعية دموية",
  "جلدية",
  "عيون",
  "أنف وأذن وحنجرة",
  "مخ وأعصاب",
  "مسالك بولية",
  "طب أسنان",
  "تمريض",
  "علاج طبيعي",
  "رعاية نفسية",
  "تغذية علاجية",
  "رعاية منزلية",
  "صيدلة",
  "مختبرات",
];

const ROLES = ["طبيب", "ممرض", "أخصائي", "صيدلي", "مختبر", "مساعد رعاية"];

const PROVIDER_STATUS_LABEL: Record<string, string> = {
  active: "مفعّل",
  frozen: "مجمّد",
  cancelled: "ملغى",
  pending: "بانتظار الموافقة",
};

const PROVIDER_STATUS_COLOR: Record<string, string> = {
  active: "#4E7A3F",
  frozen: "#9A8159",
  cancelled: "#B55448",
  pending: GOLD,
};

function ProvidersPanel({ onRefresh }: { onRefresh: () => void }) {
  const [providers, setProviders] = useState<ProviderAccount[]>([]);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    role: "طبيب",
    phone: "",
    password: "",
    specializations: [] as string[],
    yearsOfExperience: "0",
    bio: "",
  });

  useEffect(() => {
    void readAdminProviderAccounts().then(setProviders);
  }, [onRefresh]);

  const toggleSpecialty = (spec: string) => {
    setForm((current) => ({
      ...current,
      specializations: current.specializations.includes(spec)
        ? current.specializations.filter((item) => item !== spec)
        : [...current.specializations, spec],
    }));
  };

  const confirmStatusChange = (provider: ProviderAccount, next: ProviderAccount["status"]) => {
    if (!window.confirm(
      next === "cancelled"
        ? `هل تريد إلغاء حساب مقدم الخدمة «${provider.fullName}» نهائيًا؟`
        : `هل تريد تغيير حالة مقدم الخدمة «${provider.fullName}» إلى «${PROVIDER_STATUS_LABEL[next]}»؟`,
    )) return;
    void updateProviderStatus(provider.id, next).then(async () => {
      setProviders(await readAdminProviderAccounts());
      onRefresh();
    });
  };

  const addProvider = async () => {
    setFormError(null);
    if (!form.fullName.trim() || !form.password.trim() || !form.phone.trim()) {
      setFormError("الاسم الكامل ورقم الهاتف وكلمة المرور حقول مطلوبة.");
      return;
    }
    setBusy(true);
    try {
      await addProviderAccount({
        fullName: form.fullName.trim(),
        role: form.role,
        phone: form.phone.trim(),
        password: form.password,
        status: "pending",
        specializations: [...form.specializations],
        yearsOfExperience: Number(form.yearsOfExperience) || 0,
        bio: form.bio.trim(),
        services: [],
        availability: { availableNow: false, slots: [] },
        documents: [],
      });
      setAdding(false);
      setProviders(await readAdminProviderAccounts());
      setForm({ fullName: "", role: "طبيب", phone: "", password: "", specializations: [], yearsOfExperience: "0", bio: "" });
      onRefresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
    } finally {
      setBusy(false);
    }
  };

  const filtered = providers.filter(
    (provider) =>
      !search.trim() ||
      provider.fullName.toLowerCase().includes(search.toLowerCase()) ||
      provider.role.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <h2 style={panelTitleStyle}>مقدمو الخدمة</h2>
      <div style={panelHintStyle}>يمكن إضافة مقدم خدمة جديد وتغيير حالة حسابه (تفعيل / تجميد / إلغاء) دون تعديل الكود.</div>

      {adding ? (
        <div style={formCardStyle}>
          <div style={formSectionTitleStyle}>مقدم خدمة جديد</div>
          <input style={inputStyle} placeholder="الاسم الكامل" value={form.fullName} onChange={(e) => setForm((current) => ({ ...current, fullName: e.target.value }))} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {ROLES.map((role) => (
              <button key={role} style={{ ...chipStyle, ...(form.role === role ? activeChipStyle : {}) }} onClick={() => setForm((current) => ({ ...current, role }))}>{role}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input style={{ ...inputStyle, flex: 1 }} placeholder="رقم الهاتف" dir="ltr" value={form.phone} onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))} />

          </div>
          <input style={inputStyle} placeholder="كلمة المرور" type="password" value={form.password} onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))} />
          <div style={formSectionTitleStyle}>التخصصات (متعددة)</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {SPECIALTIES.map((spec) => (
              <button key={spec} style={{ ...chipStyle, ...(form.specializations.includes(spec) ? activeChipStyle : {}) }} onClick={() => toggleSpecialty(spec)}>{spec}</button>
            ))}
          </div>
          <input style={inputStyle} placeholder="سنوات الخبرة" dir="ltr" value={form.yearsOfExperience} onChange={(e) => setForm((current) => ({ ...current, yearsOfExperience: e.target.value }))} />
          <input style={inputStyle} placeholder="نبذة عن مقدم الخدمة (اختياري)" value={form.bio} onChange={(e) => setForm((current) => ({ ...current, bio: e.target.value }))} />
          {formError ? <div style={errorTextStyle}>{formError}</div> : null}
          <div style={{ display: "flex", gap: 8 }}>
            <button style={secondaryButtonStyle} onClick={() => setAdding(false)}>إلغاء</button>
            <button style={primaryButtonStyle} disabled={busy} onClick={addProvider}>{busy ? "جارٍ الحفظ..." : "إضافة مقدم الخدمة"}</button>
          </div>
        </div>
      ) : (
        <button style={primaryButtonStyle} onClick={() => setAdding(true)}>+ إضافة مقدم خدمة جديد</button>
      )}

      <input
        style={inputStyle}
        placeholder="بحث بالاسم أو الصفة..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? <div style={emptyTextStyle}>لا يوجد مقدمو خدمة بعد.</div> : null}
      {filtered.map((provider) => (
        <div key={provider.id} style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div>
              <div style={cardNameStyle}>{provider.fullName}</div>
              <div style={cardSubtitleStyle}>
                {provider.role} · {provider.specializations.join("، ")} · {provider.yearsOfExperience ?? 0} سنة خبرة
              </div>
              <div style={cardSubtitleStyle} dir="ltr">{provider.phone}</div>
            </div>
            <span style={{ ...badgeStyle, backgroundColor: PROVIDER_STATUS_COLOR[provider.status] + "22", borderColor: PROVIDER_STATUS_COLOR[provider.status] + "66", color: PROVIDER_STATUS_COLOR[provider.status] }}>
              {PROVIDER_STATUS_LABEL[provider.status]}
            </span>
          </div>
          <div style={actionRowStyle}>
            {provider.status !== "active" ? (
              <button style={actionChipStyle("#4E7A3F")} onClick={() => confirmStatusChange(provider, "active")}>تفعيل</button>
            ) : null}
            {provider.status !== "frozen" ? (
              <button style={actionChipStyle("#9A8159")} onClick={() => confirmStatusChange(provider, "frozen")}>تجميد</button>
            ) : null}
            {provider.status !== "cancelled" ? (
              <button style={actionChipStyle("#B55448")} onClick={() => confirmStatusChange(provider, "cancelled")}>إلغاء</button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════ لوحة الإعلانات ══════════════════════
const AD_POSITIONS: { value: "top" | "bottom"; label: string }[] = [
  { value: "top", label: "بانر علوي" },
  { value: "bottom", label: "بانر سفلي" },
];

const AD_ACCENTS = [
  { label: "زيتوني", value: OLIVE, soft: "#EFF2E6" },
  { label: "ذهبي", value: GOLD, soft: "#F7EFDE" },
  { label: "أزرق", value: "#627F9D", soft: "#EBF1F6" },
  { label: "وردي", value: "#A65E67", soft: "#F8ECEE" },
  { label: "بنفسجي", value: "#8F7D98", soft: "#F2EDF4" },
];

function AdsPanel({ onRefresh }: { onRefresh: () => void }) {
  const [ads, setAds] = useState<AdminAdSlide[]>([]);
  const [editing, setEditing] = useState<AdminAdSlide | null>(null);
  const [adding, setAdding] = useState(false);
  const [fields, setFields] = useState<Omit<AdminAdSlide, "id">>({
    enabled: true,
    position: "top",
    eyebrow: "",
    title: "",
    copy: "",
    icon: "campaign",
    accent: OLIVE,
    accentSoft: "#EFF2E6",
  });

  useEffect(() => {
    void readAdminAds().then(setAds);
  }, [onRefresh]);

  const save = async () => {
    if (!fields.title.trim() || !fields.copy.trim()) {
      window.alert("يجب إدخال عنوان الإعلان ونصّه.");
      return;
    }
    const id = editing?.id ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    await upsertAdminAd({ ...fields, id });
    setAds(await readAdminAds());
    setEditing(null);
    setAdding(false);
    onRefresh();
  };

  const confirmToggle = async (ad: AdminAdSlide) => {
    if (!window.confirm(ad.enabled ? `هل تريد إخفاء إعلان «${ad.title}»؟` : `هل تريد إعادة إظهار إعلان «${ad.title}»؟`)) return;
    await toggleAdminAd(ad.id, !ad.enabled);
    setAds(await readAdminAds());
    onRefresh();
  };

  const confirmDelete = async (ad: AdminAdSlide) => {
    if (!window.confirm(`هل تريد حذف إعلان «${ad.title}» نهائيًا؟`)) return;
    await deleteAdminAd(ad.id);
    setAds(await readAdminAds());
    onRefresh();
  };

  return (
    <div>
      <h2 style={panelTitleStyle}>الإعلانات والبانرات</h2>
      <div style={panelHintStyle}>الإعلانات المعطّلة لن تظهر على الصفحة الرئيسية للمرضى.</div>

      {adding || editing ? (
        <div style={formCardStyle}>
          <div style={formSectionTitleStyle}>{editing ? "تعديل الإعلان" : "إعلان جديد"}</div>
          <input style={inputStyle} placeholder="سطر صغير أعلى (مثل: عروض رمضان)" value={fields.eyebrow} onChange={(e) => setFields((current) => ({ ...current, eyebrow: e.target.value }))} />
          <input style={inputStyle} placeholder="عنوان الإعلان" value={fields.title} onChange={(e) => setFields((current) => ({ ...current, title: e.target.value }))} />
          <input style={inputStyle} placeholder="نص الإعلان" value={fields.copy} onChange={(e) => setFields((current) => ({ ...current, copy: e.target.value }))} />
          <div style={chipRowStyle}>
            {AD_POSITIONS.map((option) => (
              <button key={option.value} style={{ ...chipStyle, ...(fields.position === option.value ? activeChipStyle : {}) }} onClick={() => setFields((current) => ({ ...current, position: option.value }))}>{option.label}</button>
            ))}
          </div>
          <div style={chipRowStyle}>
            {AD_ACCENTS.map((option) => (
              <button
                key={option.value}
                style={{ ...chipStyle, borderColor: fields.accent === option.value ? option.value : "#D8CFBD", backgroundColor: fields.accent === option.value ? option.soft : "transparent", color: fields.accent === option.value ? "#465132" : "#6A6256" }}
                onClick={() => setFields((current) => ({ ...current, accent: option.value, accentSoft: option.soft }))}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={secondaryButtonStyle} onClick={() => { setEditing(null); setAdding(false); }}>إلغاء</button>
            <button style={primaryButtonStyle} onClick={save}>{editing ? "حفظ التعديل" : "إضافة الإعلان"}</button>
          </div>
        </div>
      ) : (
        <button style={primaryButtonStyle} onClick={() => setAdding(true)}>+ إضافة إعلان جديد</button>
      )}

      {ads.length === 0 ? <div style={emptyTextStyle}>لا توجد إعلانات بعد.</div> : null}
      {ads.map((ad) => (
        <div key={ad.id} style={{ ...cardStyle, ...(ad.enabled ? {} : dimCardStyle) }}>
          <div style={cardHeaderStyle}>
            <div style={cardIdentityStyle}>
              <div style={cardNameStyle}>{ad.title}</div>
              <div style={cardSubtitleStyle}>{ad.position === "top" ? "بانر علوي" : "بانر سفلي"} · {ad.copy}</div>
            </div>
            <span style={{ ...badgeStyle, backgroundColor: ad.enabled ? "#4E7A3F22" : "#B5544822", borderColor: ad.enabled ? "#4E7A3F66" : "#B5544866", color: ad.enabled ? "#4E7A3F" : "#B55448" }}>
              {ad.enabled ? "ظاهر" : "مخفي"}
            </span>
          </div>
          <div style={actionRowStyle}>
            <button style={actionChipStyle(ad.enabled ? "#9A8159" : "#4E7A3F")} onClick={() => confirmToggle(ad)}>{ad.enabled ? "إخفاء" : "إظهار"}</button>
            <button style={actionChipStyle("#6A6256")} onClick={() => { setEditing(ad); setFields({ ...ad }); setAdding(false); }}>تعديل</button>
            <button style={actionChipStyle("#B55448")} onClick={() => confirmDelete(ad)}>حذف</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════ لوحة الخدمات ══════════════════════
function ServicesPanel({ onRefresh }: { onRefresh: () => void }) {
  const [catalog, setCatalog] = useState<{ services: { key: string; title: string; enabled: boolean }[] } | null>(null);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    void readServicesCatalog().then(setCatalog);
  }, [onRefresh]);

  const confirmToggle = (key: string, title: string, enabled: boolean) => {
    if (!window.confirm(enabled ? `هل تريد إخفاء خدمة «${title}» من الصفحة الرئيسية للمرضى؟` : `هل تريد إعادة إظهار خدمة «${title}» في الصفحة الرئيسية؟`)) return;
    void toggleService(key, !enabled).then(async (updated) => {
      setCatalog(updated);
      onRefresh();
    });
  };

  const add = async () => {
    if (!newTitle.trim()) {
      window.alert("اكتب اسم الخدمة أولًا.");
      return;
    }
    setCatalog(await addService(newTitle));
    setNewTitle("");
    onRefresh();
  };

  if (!catalog) return <div style={emptyTextStyle}>جارٍ التحميل...</div>;

  return (
    <div>
      <h2 style={panelTitleStyle}>كتالوج الخدمات</h2>
      <div style={panelHintStyle}>الخدمات المعطّلة لن تظهر في الصفحة الرئيسية للمرضى.</div>
      {catalog.services.map((service) => (
        <div key={service.key} style={{ ...cardStyle, ...(service.enabled ? {} : dimCardStyle) }}>
          <div style={cardHeaderStyle}>
            <div style={cardNameStyle}>{service.title}</div>
            <span style={{ ...badgeStyle, backgroundColor: service.enabled ? "#4E7A3F22" : "#B5544822", borderColor: service.enabled ? "#4E7A3F66" : "#B5544866", color: service.enabled ? "#4E7A3F" : "#B55448" }}>
              {service.enabled ? "ظاهرة" : "مخفية"}
            </span>
          </div>
          <div style={actionRowStyle}>
            <button style={actionChipStyle(service.enabled ? "#9A8159" : "#4E7A3F")} onClick={() => confirmToggle(service.key, service.title, service.enabled)}>
              {service.enabled ? "إخفاء" : "إظهار"}
            </button>
          </div>
        </div>
      ))}
      <div style={addRowStyle}>
        <input style={{ ...inputStyle, flex: 1 }} placeholder="اسم خدمة جديدة" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
        <button style={smallButtonStyle} onClick={add}>+ إضافة</button>
      </div>
    </div>
  );
}

// ══════════════════════ لوحة الطلبات ══════════════════════
function RequestsPanel({ onRefresh }: { onRefresh: () => void }) {
  const [requests, setRequests] = useState<{ id: string; services: { serviceName: string }[]; patientName: string; providerName?: string; createdAt: number; status: string; paymentMethod?: string }[]>([]);

  useEffect(() => {
    void readAdminRequests().then((all) => setRequests(all.sort((first, second) => Number(second.createdAt) - Number(first.createdAt))));
  }, [onRefresh]);

  const confirmCancel = (requestId: string, title: string) => {
    if (!window.confirm(`هل تريد إلغاء الطلب «${title}» نهائيًا؟`)) return;
    void cancelAdminRequest(requestId).then(async () => {
      setRequests((await readAdminRequests()).sort((first, second) => Number(second.createdAt) - Number(first.createdAt)));
      onRefresh();
    });
  };

  return (
    <div>
      <h2 style={panelTitleStyle}>سجل الطلبات</h2>
      {requests.length === 0 ? <div style={emptyTextStyle}>لا توجد طلبات بعد.</div> : null}
      {requests.map((request) => (
        <div key={request.id} style={{ ...cardStyle, ...(request.status === "cancelled" ? dimCardStyle : {}) }}>
          <div style={cardHeaderStyle}>
            <div style={cardIdentityStyle}>
              <div style={cardNameStyle}>{request.services.map((service) => service.serviceName).join("، ")}</div>
              <div style={cardSubtitleStyle}>
                من {request.patientName}{request.providerName ? ` · مقدم الخدمة: ${request.providerName}` : ""} · {new Date(request.createdAt).toLocaleString("ar-LY")}
              </div>
            </div>
            <span style={{ ...badgeStyle, backgroundColor: requestStatusColor(request.status) + "22", borderColor: requestStatusColor(request.status) + "66", color: requestStatusColor(request.status) }}>
              {requestStatusLabel(request.status)}
            </span>
          </div>
          {request.status !== "cancelled" && request.status !== "completed" ? (
            <div style={actionRowStyle}>
              <button style={actionChipStyle("#B55448")} onClick={() => confirmCancel(request.id, request.services.map((service) => service.serviceName).join("، "))}>إلغاء الطلب</button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function requestStatusLabel(status: string): string {
  switch (status) {
    case "pending": return "معلّق";
    case "accepted": return "مقبول";
    case "completed": return "مكتمل";
    case "rejected": return "مرفوض";
    default: return "ملغى";
  }
}

function requestStatusColor(status: string): string {
  switch (status) {
    case "pending": return GOLD;
    case "accepted": return "#4E7A3F";
    case "completed": return OLIVE;
    case "rejected": return "#B55448";
    default: return "#6A6256";
  }
}

// ══════════════════════ لوحة المرضى ══════════════════════
function PatientsPanel({ onRefresh }: { onRefresh: () => void }) {
  const [patients, setPatients] = useState<{ id: string; fullName: string }[]>([]);
  const [access, setAccess] = useState<{ id: string; providerId: string; providerName?: string; recordOwnerNames: string[] }[]>([]);

  useEffect(() => {
    void Promise.all([getPatientProfile(), readMedicalAccessGrants()]).then(([profile, grants]) => {
      setPatients(profile ? [{ id: profile.phone, fullName: profile.fullName }] : []);
      setAccess(grants as { id: string; providerId: string; providerName?: string; recordOwnerNames: string[] }[]);
    });
  }, [onRefresh]);

  const toggleAccess = async (grantId: string) => {
    try {
      setAccess(await revokeMedicalAccess(grantId));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
    }
    onRefresh();
  };

  return (
    <div>
      <h2 style={panelTitleStyle}>الملفات الطبية والصلاحيات</h2>
      <div style={panelHintStyle}>يمكن للوحة إلغاء صلاحية الاطلاع التي منحها المريض لمقدم الخدمة.</div>
      {patients.length === 0 ? <div style={emptyTextStyle}>لا توجد ملفات مرضى مسجلة بعد.</div> : null}
      {patients.map((patient) => (
        <div key={patient.id} style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={cardNameStyle}>{patient.fullName}</div>
            <span style={{ ...badgeStyle, backgroundColor: "#4E7A3F22", borderColor: "#4E7A3F66", color: "#4E7A3F" }}>نشط</span>
          </div>
          <PatientAccessRow patientId={patient.id} patientName={patient.fullName} access={access} onToggle={toggleAccess} />
        </div>
      ))}
    </div>
  );
}

function PatientAccessRow({ patientId, patientName, access, onToggle }: { patientId: string; patientName: string; access: { id: string; providerId: string; providerName?: string; recordOwnerNames: string[] }[]; onToggle: (grantId: string) => void }) {
  const grants = useMemo(() => access.filter((grant) => grant.recordOwnerNames.some((owner) => owner.trim().toLowerCase() === patientId.trim().toLowerCase())), [access, patientId]);

  if (grants.length === 0) {
    return <div style={emptyTextStyle}>لا توجد صلاحيات اطّلاع ممنوحة لهذا الملف.</div>;
  }

  return (
    <div style={{ marginTop: 8 }}>
      {grants.map((grant) => (
        <div key={grant.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
          <span>👁️</span>
          <div style={{ flex: 1, fontSize: 13, color: "#6A6256" }}>مصرّح لمقدم الخدمة «{grant.providerName ?? grant.providerId}» بالاطلاع على ملف {patientName}</div>
          <button style={actionChipStyle("#B55448")} onClick={() => onToggle(grant.id)}>إلغاء</button>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════ لوحة المحفظات ══════════════════════
function WalletsPanel({ onRefresh }: { onRefresh: () => void }) {
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

  useEffect(() => {
    void getWalletSummaries(role).then(setSummaries);
  }, [role, onRefresh]);

  const kindOptions = role === "patient"
    ? [
        { kind: "credit" as const, type: "recharge" as const, label: "شحن رصيد" },
        { kind: "debit" as const, type: "payment" as const, label: "دفع مقابل خدمة" },
        { kind: "credit" as const, type: "refund" as const, label: "استرداد للمريض" },
      ]
    : [
        { kind: "credit" as const, type: "earned" as const, label: "مستحق له" },
        { kind: "debit" as const, type: "charge" as const, label: "مستحق عليه" },
      ];

  const setAmount = (value: string) => {
    const numeric = Number(value.replace(/[^0-9.]/g, ""));
    setForm((prev) => ({ ...prev, amount: Number.isFinite(numeric) ? numeric : 0 }));
  };

  const applyKind = (option: { kind: "credit" | "debit"; type: "recharge" | "payment" | "refund" | "earned" | "charge"; label: string }) => {
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
      onRefresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = async (entry: { id: string; amount: number; ownerName: string }) => {
    if (!window.confirm(`هل تريد حذف قيد بقيمة ${entry.amount.toFixed(2)} د.ل من محفظة «${entry.ownerName}»؟`)) return;
    await removeWalletEntry(entry.id);
    setSummaries(await getWalletSummaries(role));
    onRefresh();
  };

  return (
    <div>
      <h2 style={panelTitleStyle}>المحفظة المحاسبية</h2>
      <div style={panelHintStyle}>سجل محاسبي لمحفظة المريض (شحن/دفع/استرداد) ومحفظة مقدم الخدمة (مستحق له/مستحق عليه). الرصيد التجميعي يُحسب من القيود.</div>

      <div style={chipRowStyle}>
        <button style={{ ...chipStyle, ...(role === "patient" ? activeChipStyle : {}) }} onClick={() => { setRole("patient"); setForm((prev) => ({ ...prev, role: "patient" })); }}>محفظة المريض</button>
        <button style={{ ...chipStyle, ...(role === "provider" ? activeChipStyle : {}) }} onClick={() => { setRole("provider"); setForm((prev) => ({ ...prev, role: "provider" })); }}>محفظة الشريك</button>
      </div>

      <div style={formCardStyle}>
        <div style={formSectionTitleStyle}>إضافة قيد محاسبي يدوي</div>
        <input style={inputStyle} placeholder="اسم صاحب المحفظة" value={form.ownerName} onChange={(e) => setForm((prev) => ({ ...prev, ownerName: e.target.value }))} />
        <input style={inputStyle} placeholder={role === "patient" ? "رقم الهاتف (معرّف المريض)" : "معرّف مقدم الخدمة"} value={form.ownerId} onChange={(e) => setForm((prev) => ({ ...prev, ownerId: e.target.value }))} />
        <div style={chipRowStyle}>
          {kindOptions.map((option) => (
            <button
              key={option.type}
              style={{ ...chipStyle, ...(form.kind === option.kind && form.type === option.type ? activeChipStyle : {}) }}
              onClick={() => applyKind(option)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div style={addRowStyle}>
          <input style={{ ...inputStyle, width: 120 }} placeholder="المبلغ" value={form.amount ? String(form.amount) : ""} onChange={(e) => setAmount(e.target.value)} />
          <input style={{ ...inputStyle, flex: 1 }} placeholder="الوصف" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
          <input style={{ ...inputStyle, flex: 1 }} placeholder="مرجع (اختياري)" value={form.reference ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, reference: e.target.value }))} />
        </div>
        {formError ? <div style={errorTextStyle}>{formError}</div> : null}
        <button style={primaryButtonStyle} disabled={busy} onClick={submitAdd}>{busy ? "جارٍ الحفظ..." : "إضافة القيد"}</button>
      </div>

      {role === "provider" ? <ProviderEarningsLookup onRefresh={onRefresh} /> : null}

      <h3 style={{ ...panelTitleStyle, marginTop: 16 }}>ملخصات المحافظ</h3>
      {summaries.length === 0 ? <div style={emptyTextStyle}>لا توجد محفظ{role === "patient" ? " للمرضى" : " لمقدمي الخدمة"} بعد.</div> : null}
      {summaries.map((summary) => (
        <WalletSummaryCard key={summary.ownerId} summary={summary} onRemove={confirmRemove} />
      ))}
    </div>
  );
}

function ProviderEarningsLookup({ onRefresh }: { onRefresh: () => void }) {
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
    <div style={formCardStyle}>
      <div style={formSectionTitleStyle}>استعلام أرباح مقدم خدمة</div>
      <div style={panelHintStyle}>ابحث عن مقدم خدمة بالاسم لعرض ملخص محفظته المحاسبية (المستحق له والمستحق عليه والرصيد).</div>
      <div style={chipRowStyle}>
        {providers.map((provider) => (
          <button
            key={provider.id}
            style={{ ...chipStyle, ...(query === provider.id ? activeChipStyle : {}) }}
            onClick={() => void performLookup(provider.id)}
          >
            <span style={{ fontSize: 11 }}>{provider.role} — {provider.fullName}</span>
          </button>
        ))}
      </div>
      {providers.length === 0 ? <div style={emptyTextStyle}>لا يوجد مقدمو خدمة مسجلون بعد.</div> : null}
      {lookup ? <WalletSummaryCard summary={lookup} onRemove={() => void onRefresh()} /> : <div style={lookupError ? errorTextStyle : emptyTextStyle}>{lookupError || "اختر مقدم خدمة لعرض أرباحه."}</div>}
    </div>
  );
}

function WalletSummaryCard({ summary, onRemove }: { summary: WalletSummary; onRemove: (entry: { id: string; amount: number; ownerName: string }) => void }) {
  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>
        <div style={cardIdentityStyle}>
          <div style={cardNameStyle}>{summary.ownerName}</div>
          <div style={cardSubtitleStyle}>{summary.ownerId}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#6A6256" }}>الرصيد</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: summary.balance > 0 ? "#4E7A3F" : summary.balance < 0 ? "#B55448" : "#6A6256" }}>
            {summary.balance.toFixed(2)}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, fontSize: 12, marginTop: 6, color: "#6A6256" }}>
        <span style={{ color: "#4E7A3F" }}>وارد: {summary.credit.toFixed(2)}</span>
        <span style={{ color: "#B55448" }}>صادر: {summary.debit.toFixed(2)}</span>
        <span>{summary.entries.length} قيود</span>
      </div>
      {summary.entries.length === 0 ? (
        <div style={emptyTextStyle}>لا توجد قيود محاسبية لهذه المحفظة.</div>
      ) : (
        <div style={{ marginTop: 8 }}>
          {summary.entries.map((entry) => (
            <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: "1px solid #EDE6D6" }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: entry.kind === "credit" ? "#4E7A3F" : "#B55448" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: "#3A3A3A" }}>{entry.description || entry.type}</div>
                <div style={{ fontSize: 11, color: "#8A8173" }}>
                  {kindArabicLabel(entry.type)} · {new Date(entry.createdAt).toLocaleDateString("ar-LY")}
                  {entry.reference ? ` · مرجع: ${entry.reference}` : ""}
                </div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: entry.kind === "credit" ? "#4E7A3F" : "#B55448" }}>
                {entry.kind === "credit" ? "+" : "-"}{entry.amount.toFixed(2)} د.ل
              </span>
              <button style={{ background: "none", border: "none", color: "#B55448", cursor: "pointer", fontSize: 16 }} onClick={() => onRemove({ id: entry.id, amount: entry.amount, ownerName: entry.ownerName })}>🗑️</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function kindArabicLabel(type: string): string {
  switch (type) {
    case "recharge": return "شحن رصيد";
    case "payment": return "دفع خدمة";
    case "refund": return "استرداد";
    case "earned": return "مستحق له";
    case "charge": return "مستحق عليه";
    default: return type;
  }
}

// ══════════════════════ الأنماط المشتركة ══════════════════════
const panelTitleStyle: React.CSSProperties = { fontSize: 20, fontWeight: 700, color: "#3A3A3A", margin: 0 };
const panelHintStyle: React.CSSProperties = { fontSize: 13, color: "#8A8278", marginTop: 6, marginBottom: 16 };
const formCardStyle: React.CSSProperties = { background: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" };
const formSectionTitleStyle: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: "#3A3A3A", marginBottom: 10 };
const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 8, border: "1px solid #DDD6C8", fontSize: 14, marginBottom: 10, background: "#fff" };
const chipStyle: React.CSSProperties = { padding: "7px 12px", borderRadius: 8, border: "1px solid #D8CFBD", background: "transparent", color: "#6A6256", fontSize: 13, cursor: "pointer" };
const chipRowStyle: React.CSSProperties = { display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" };
const activeChipStyle: React.CSSProperties = { background: OLIVE, borderColor: OLIVE, color: "#fff", fontWeight: 700 };
const actionChipStyle = (color: string): React.CSSProperties => ({
  padding: "6px 12px",
  borderRadius: 8,
  border: "none",
  background: color + "1A",
  color,
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
});
const actionRowStyle: React.CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap" };
const cardStyle: React.CSSProperties = { background: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" };
const cardHeaderStyle: React.CSSProperties = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 };
const cardIdentityStyle: React.CSSProperties = { flex: 1, minWidth: 0 };
const cardNameStyle: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: "#3A3A3A" };
const cardSubtitleStyle: React.CSSProperties = { fontSize: 13, color: "#8A8278", marginTop: 2 };
const badgeStyle: React.CSSProperties = { display: "inline-block", padding: "3px 10px", borderRadius: 999, border: "1px solid", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" };
const dimCardStyle: React.CSSProperties = { opacity: 0.6 };
const emptyTextStyle: React.CSSProperties = { fontSize: 14, color: "#8A8278", textAlign: "center", padding: 24 };
const errorTextStyle: React.CSSProperties = { fontSize: 13, color: "#B55448", marginTop: 4 };
const primaryButtonStyle: React.CSSProperties = { padding: "10px 18px", borderRadius: 10, border: "none", background: OLIVE, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" };
const secondaryButtonStyle: React.CSSProperties = { padding: "10px 18px", borderRadius: 10, border: "1px solid #DDD6C8", background: "#fff", color: "#6A6256", fontSize: 14, fontWeight: 600, cursor: "pointer" };
const smallButtonStyle: React.CSSProperties = { padding: "6px 12px", borderRadius: 8, border: "1px solid #DDD6C8", background: "#fff", color: "#6A6256", fontSize: 12, fontWeight: 600, cursor: "pointer" };
const addRowStyle: React.CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 };

// ══════════════════════ لوحة التقرير الشهري ══════════════════════
type MonthlyAggregation = {
  monthLabel: string;
  completedServices: number;
  completedConsultations: number;
  grossRevenue: number;
  platformCommission: number;
  providersShare: number;
  topProviders: { providerName: string; count: number; amount: number }[];
  completedEntries: { ownerId: string; ownerName: string; amount: number }[];
};

async function buildMonthlyReport(monthKey?: string): Promise<MonthlyAggregation> {
  const now = new Date();
  const thisMonth = monthKey ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const reportDate = monthKey ? (() => {
    const [year, month] = monthKey.split("-").map(Number);
    return new Date(year, month - 1, 1);
  })() : now;
  const [requests, consultations, entries, settings] = await Promise.all([
    readAdminRequests(),
    (async () => {
      try {
        const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
        const raw = await AsyncStorage.getItem("consultation_requests_v1");
        if (!raw) return [];
        return JSON.parse(raw) as Array<{ id: string; createdAt: number; status: string; providerName?: string; doctorName?: string; total?: number; type?: string }>;
      } catch {
        return [];
      }
    })(),
    readWalletEntries(),
    readPlatformSettings(),
  ]);

  const inMonth = (createdAt: number) => {
    const date = new Date(createdAt);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` === thisMonth;
  };

  const completed = requests.filter((request: ServiceRequest) => request.status === "completed").filter((request: ServiceRequest) => inMonth(request.updatedAt));
  const completedConsultations = consultations.filter((consultation: { id: string; createdAt: number; status: string; total?: number }) => consultation.status === "completed").filter((consultation: { createdAt: number; total?: number }) => inMonth(consultation.createdAt));

  const completedEntries = entries.filter((entry: { role: "patient" | "provider"; type: string; createdAt: number; ownerId: string; ownerName: string; amount: number }) => entry.role === "provider" && entry.type === "earned" && inMonth(entry.createdAt));

  const grossRevenue = completed.reduce((sum: number, request: ServiceRequest) => sum + request.total, 0) + completedConsultations.reduce((sum: number, consultation: { total?: number }) => sum + (consultation.total ?? 0), 0);

  const commissionPercent = settings.platformCommissionPercent;
  const platformCommission = Math.round(grossRevenue * (commissionPercent / 100) * 100) / 100;
  const providersShare = Math.round((grossRevenue - platformCommission) * 100) / 100;

  const byProvider = new Map<string, { count: number; amount: number }>();
  for (const entry of completedEntries) {
    const current = byProvider.get(entry.ownerId) ?? { count: 0, amount: 0 };
    byProvider.set(entry.ownerId, {
      count: current.count + 1,
      amount: Math.round((current.amount + entry.amount) * 100) / 100,
    });
  }
  const topProviders = Array.from(byProvider.entries())
    .map(([providerName, stats]) => ({ providerName, ...stats }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);

  return {
    monthLabel: reportDate.toLocaleDateString("ar-LY", { month: "long", year: "numeric" }),
    completedServices: completed.length,
    completedConsultations: completedConsultations.length,
    grossRevenue,
    platformCommission,
    providersShare,
    topProviders,
    completedEntries,
  };
}

function monthKeyFor(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function buildMonthOptions(): { key: string; label: string }[] {
  const options: { key: string; label: string }[] = [];
  const now = new Date();
  const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  for (let offset = 0; offset < 12; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    options.push({ key: monthKeyFor(date), label: `${monthNames[date.getMonth()]} ${date.getFullYear()}` });
  }
  return options;
}

function MonthlyReportPanel({ onRefresh }: { onRefresh: () => void }) {
  const [report, setReport] = useState<MonthlyAggregation | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(monthKeyFor(new Date()));
  const [monthOptions] = useState(() => buildMonthOptions());

  const load = useCallback(async (key: string) => {
    setLoading(true);
    try {
      setReport(await buildMonthlyReport(key));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(selectedMonth);
  }, [selectedMonth, load]);

  void onRefresh;
  void load;

  const statStyle: React.CSSProperties = { flex: 1, minWidth: 160, background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #E7E0D2" };
  const statValueStyle: React.CSSProperties = { fontSize: 22, fontWeight: 700, color: "#3A3A3A" };
  const statLabelStyle: React.CSSProperties = { fontSize: 12, color: "#8A8278", marginTop: 4 };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Card title={`التقرير الشهري — ${report?.monthLabel ?? ""}`}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: "#6A6256" }}>عرض شهر:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ fontSize: 13, padding: "6px 10px", borderRadius: 8, border: "1px solid #E7E0D2", background: "#fff", color: "#3A3A3A" }}
          >
            {monthOptions.map((option) => (
              <option key={option.key} value={option.key}>{option.label}</option>
            ))}
          </select>
        </div>
        {loading ? (
          <div style={{ textAlign: "center", color: "#8A8278", padding: 20 }}>جارٍ تجميع البيانات…</div>
        ) : !report ? (
          <div style={{ textAlign: "center", color: "#8A8278", padding: 20 }}>لا توجد بيانات للشهر الحالي.</div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <div style={statStyle}>
                <div style={statValueStyle}>{report.completedServices}</div>
                <div style={statLabelStyle}>خدمة منزلية مكتملة</div>
              </div>
              <div style={statStyle}>
                <div style={statValueStyle}>{report.completedConsultations}</div>
                <div style={statLabelStyle}>استشارة مكتملة</div>
              </div>
              <div style={statStyle}>
                <div style={statValueStyle}>{report.grossRevenue.toLocaleString("ar-LY")} د.ل</div>
                <div style={statLabelStyle}>إجمالي المدفوعات</div>
              </div>
              <div style={statStyle}>
                <div style={statValueStyle}>{report.platformCommission.toLocaleString("ar-LY")} د.ل</div>
                <div style={statLabelStyle}>عمولة المنصة</div>
              </div>
              <div style={statStyle}>
                <div style={statValueStyle}>{report.providersShare.toLocaleString("ar-LY")} د.ل</div>
                <div style={statLabelStyle}>مستحقات مقدمي الخدمة</div>
              </div>
            </div>
            {report.topProviders.length === 0 ? (
              <div style={{ marginTop: 16, fontSize: 13, color: "#8A8278", textAlign: "center" }}>
                لا توجد مستحقات لمقدمي الخدمة خلال هذا الشهر حتى الآن.
              </div>
            ) : (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#3A3A3A", marginBottom: 8 }}>أكثر مقدمي الخدمة نشاطًا هذا الشهر</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {report.topProviders.map((provider, index) => (
                    <div key={provider.providerName} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F7F4EC", borderRadius: 8, padding: "8px 14px", fontSize: 13 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ width: 22, height: 22, borderRadius: 11, background: OLIVE, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{index + 1}</span>
                        <span style={{ fontWeight: 600, color: "#3A3A3A" }}>{provider.providerName}</span>
                      </div>
                      <span style={{ color: "#6A6256" }}>{provider.count} عملية — {provider.amount.toLocaleString("ar-LY")} د.ل</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

// ══════════════════════ لوحة الإعدادات العامة ══════════════════════
function GeneralSettingsPanel({ onRefresh }: { onRefresh: () => void }) {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [commission, setCommission] = useState("");
  const [discount, setDiscount] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    const current = await readPlatformSettings();
    setSettings(current);
    setCommission(String(current.platformCommissionPercent));
    setDiscount(String(current.defaultOfferDiscountPercent));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    setFormError("");
    const parsedCommission = Number(commission);
    const parsedDiscount = Number(discount);
    if (Number.isNaN(parsedCommission) || parsedCommission < 0 || parsedCommission > 100) return setFormError("عمولة المنصة يجب أن تكون بين 0 و 100");
    if (Number.isNaN(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 100) return setFormError("نسبة الخصم يجب أن تكون بين 0 و 100");

    setSaving(true);
    try {
      const updated = await writePlatformSettings({
        platformCommissionPercent: parsedCommission,
        defaultOfferDiscountPercent: parsedDiscount,
      });
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const infoStyle: React.CSSProperties = { background: "#F7F4EC", borderRadius: 10, padding: 14, fontSize: 13, color: "#6A6256", marginBottom: 16, border: "1px solid #E7E0D2" };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Card title="الإعدادات العامة للمنصة" note="هذه الإعدادات تنطبق تلقائيًا على جميع العمليات دون تعديل الكود">
        <div style={infoStyle}>
          <strong>عمولة المنصة:</strong> نسبة يُخصمها النظام من كل دفعة يستلمها مقدم الخدمة ويحتفظ بها لحساب المنصة. مثال: عند عمولة 10% ودفع 100 د.ل، يحصل مقدم الخدمة على 90 د.ل وتسجل محفظته بذلك المبلغ.
          <br />
          <strong>نسبة الخصم الافتراضية للعروض:</strong> تُطبَّق تلقائيًا على العروض الترويجية عند عدم تحديد نسبة خصم خاصة لكل عرض.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <Field label="عمولة المنصة (%)" value={commission} onChange={setCommission} type="number" />
          <Field label="نسبة الخصم الافتراضية للعروض (%)" value={discount} onChange={setDiscount} type="number" />
        </div>
        <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <PrimaryButton label={saving ? "جارٍ الحفظ…" : "حفظ الإعدادات"} onPress={submit} disabled={saving} />
          {saved ? <span style={{ color: "#4E6B2A", fontSize: 13, fontWeight: 700 }}>✓ تم الحفظ بنجاح</span> : null}
          {formError ? <span style={{ color: "#B55448", fontSize: 13 }}>{formError}</span> : null}
        </div>
        {settings?.updatedAt ? <div style={{ fontSize: 11, color: "#8A8278", marginTop: 8 }}>آخر تحديث: {new Date(settings.updatedAt).toLocaleString("ar-LY")}</div> : null}
      </Card>
      <Card title="أثر الإعدادات الحالية">
        <div style={{ fontSize: 13, color: "#6A6256" }}>
          عند عمولة {settings?.platformCommissionPercent ?? 0}%، كل 100 د.ل يدفعها المريض يُسجَّل لمقدم الخدمة في محفظته {providerShareAfterCommission(100, settings?.platformCommissionPercent ?? 0).toLocaleString("ar-LY")} د.ل، وتبقى {(100 - providerShareAfterCommission(100, settings?.platformCommissionPercent ?? 0)).toLocaleString("ar-LY")} د.ل لحساب المنصة.
        </div>
      </Card>
    </div>
  );
}



// ══════════════════════ لوحة مركز الإشعارات ══════════════════════
const NOTIFICATION_SECTIONS: { channel: NotificationChannel; role: "patient" | "provider" | "admin" | "marketing"; title: string; icon: string; description: string }[] = [
  { channel: "admin", role: "admin", title: "إشعارات الإدارة", icon: "🛡️", description: "حسابات شريك جديدة بانتظار الموافقة، طلبات جديدة، وتعديلات يدوية في النظام" },
  { channel: "patient_request", role: "patient", title: "إشعارات المريض", icon: "🧑‍⚕️", description: "قبول ورفض طلبات المريض والرسائل الواردة إليه من مقدمي الخدمة" },
  { channel: "provider_alert", role: "provider", title: "إشعارات الشريك", icon: "👨‍⚕️", description: "طلبات الخدمة الجديدة والرسائل والتنبيهات التي تصل مقدمي الخدمة" },
  { channel: "done", role: "patient", title: "إشعارات «تم»", icon: "✅", description: "تأكيد الدفع، إتمام الخدمة، وتأكيد بدء الاستشارة" },
  { channel: "promo", role: "marketing", title: "الإشعارات الدعائية التسويقية", icon: "📣", description: "العروض والإعلانات الدعائية التي ترسلها الإدارة لعموم المرضى" },
];

function NotificationsCenterPanel({ onRefresh }: { onRefresh: () => void }) {
  const [sections, setSections] = useState<Record<string, { notifications: Notification[]; unread: number }>>({});
  const [rules, setRules] = useState<Record<string, { enabled: boolean }>>({});
  const [channelUnread, setChannelUnread] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [promoTitle, setPromoTitle] = useState("");
  const [promoBody, setPromoBody] = useState("");
  const [promoSending, setPromoSending] = useState(false);
  const [promoSent, setPromoSent] = useState(false);
  const [channelToggling, setChannelToggling] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [patientNotifications, providerNotifications, adminNotifications, marketingNotifications, currentRules, ...unreads] = await Promise.all([
        readPatientNotifications(),
        readProviderNotifications(),
        readAdminNotifications(),
        readMarketingNotifications(),
        readNotificationRules(),
        countUnreadByChannel("admin"),
        countUnreadByChannel("patient_request"),
        countUnreadByChannel("provider_alert"),
        countUnreadByChannel("done"),
        countUnreadByChannel("promo"),
      ]);
      setSections({
        patient_request: { notifications: patientNotifications, unread: unreads[0] },
        provider_alert: { notifications: providerNotifications, unread: unreads[1] },
        admin: { notifications: adminNotifications, unread: unreads[2] },
        done: { notifications: [], unread: unreads[3] },
        promo: { notifications: marketingNotifications, unread: unreads[4] },
      });
      setRules(currentRules as Record<string, { enabled: boolean }>);
      setChannelUnread({ admin: unreads[0], patient_request: unreads[0], provider_alert: unreads[1], done: unreads[3], promo: unreads[4] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  void onRefresh;
  void load;

  const toggleChannel = async (channel: NotificationChannel) => {
    setChannelToggling(channel);
    try {
      const next = await toggleNotificationChannel(channel);
      setRules(next as unknown as Record<string, { enabled: boolean }>);
      onRefresh();
    } finally {
      setChannelToggling("");
    }
  };

  const handleMarkRead = async (id: string) => {
    await markAdminNotificationRead(id);
    await load();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    await load();
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل تريد حذف هذا الإشعار نهائيًا؟")) return;
    await deleteAdminNotification(id);
    await load();
    onRefresh();
  };

  const sendPromo = async () => {
    if (!promoTitle.trim() || !promoBody.trim()) return;
    setPromoSending(true);
    try {
      const result = await createPromoNotification({ title: promoTitle.trim(), body: promoBody.trim() });
      setPromoSent(Boolean(result));
      if (result) {
        setPromoTitle("");
        setPromoBody("");
        setTimeout(() => setPromoSent(false), 3000);
      }
      await load();
    } finally {
      setPromoSending(false);
    }
  };

  const cardStyle: React.CSSProperties = { background: "#fff", borderRadius: 12, padding: 18, border: "1px solid #E7E0D2" };
  const notifRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", borderBottom: "1px solid #F1EDE3", fontSize: 13 };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Card title="مركز الإشعارات" note="قنوات التبديل تحدد وصول الإشعارات: عند الإيقاف لا يصل الإشعار جديد للقناة المعنية حتى إعادة تشغيلها">
        {loading ? (
          <div style={{ textAlign: "center", color: "#8A8278", padding: 20 }}>جارٍ تحميل الإشعارات…</div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
              <button
                onClick={handleMarkAllRead}
                style={{ fontSize: 13, padding: "7px 14px", borderRadius: 8, border: "1px solid #E7E0D2", background: "#F7F4EC", color: "#6A6256", cursor: "pointer" }}
              >
                تعليم الكل كمقروءة
              </button>
            </div>
            {NOTIFICATION_SECTIONS.map((section) => {
              const sectionData = sections[section.channel] ?? { notifications: [], unread: channelUnread[section.channel] ?? 0 };
              const enabled = rules[section.channel]?.enabled ?? true;
              return (
                <div key={section.channel} style={{ ...cardStyle, marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{section.icon}</span>
                      <span style={{ fontWeight: 700, color: "#3A3A3A", fontSize: 14 }}>{section.title}</span>
                      {sectionData.unread > 0 ? (
                        <span style={{ background: "#B55448", color: "#fff", borderRadius: 10, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{sectionData.unread} غير مقروءة</span>
                      ) : null}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, color: enabled ? "#4E6B2A" : "#B55448", fontWeight: 700 }}>{enabled ? "مفعّلة" : "متوقفة"}</span>
                      <button
                        onClick={() => toggleChannel(section.channel)}
                        disabled={channelToggling === section.channel}
                        style={{ fontSize: 12, padding: "5px 12px", borderRadius: 8, border: "none", background: enabled ? "#B55448" : OLIVE, color: "#fff", cursor: "pointer", fontWeight: 700 }}
                      >
                        {channelToggling === section.channel ? "جارٍ…" : enabled ? "إيقاف" : "تشغيل"}
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#8A8278", marginBottom: 8 }}>{section.description}</div>
                  {sectionData.notifications.length === 0 ? (
                    <div style={{ fontSize: 12, color: "#8A8278" }}>لا توجد إشعارات حتى الآن.</div>
                  ) : (
                    <div style={{ maxHeight: 280, overflowY: "auto" }}>
                      {sectionData.notifications.slice(0, 20).map((notification) => (
                        <div key={notification.id} style={{ ...notifRow, opacity: notification.read ? 0.65 : 1 }}>
                          {!notification.read ? <span style={{ width: 7, height: 7, borderRadius: 4, background: OLIVE, flexShrink: 0 }} /> : null}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: "#3A3A3A" }}>{notification.title}</div>
                            <div style={{ color: "#8A8278", fontSize: 12 }}>{notification.body}</div>
                            <div style={{ color: "#B0A898", fontSize: 11 }}>{new Date(notification.createdAt).toLocaleString("ar-LY")}</div>
                          </div>
                          <button onClick={() => handleMarkRead(notification.id)} title="تعليم كمقروء" style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: "1px solid #E7E0D2", background: "#fff", color: "#6A6256", cursor: "pointer" }}>مقروء</button>
                          <button onClick={() => handleDelete(notification.id)} title="حذف" style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: "1px solid #E7E0D2", background: "#fff", color: "#B55448", cursor: "pointer" }}>حذف</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <div style={cardStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 16 }}>📣</span>
                <span style={{ fontWeight: 700, color: "#3A3A3A", fontSize: 14 }}>إرسال إشعار دعائي تسويقي جديد</span>
              </div>
              <div style={{ fontSize: 12, color: "#8A8278", marginBottom: 10 }}>يظهر لكل المرضى في الصفحة الرئيسية. لا يُرسل إذا كانت قناة «الدعائية» متوقفة.</div>
              <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
                <input value={promoTitle} onChange={(e) => setPromoTitle(e.target.value)} placeholder="عنوان الإعلان" style={{ fontSize: 13, padding: 9, borderRadius: 8, border: "1px solid #E7E0D2" }} />
                <textarea value={promoBody} onChange={(e) => setPromoBody(e.target.value)} placeholder="نص الإعلان الدعائي" rows={3} style={{ fontSize: 13, padding: 9, borderRadius: 8, border: "1px solid #E7E0D2", fontFamily: "inherit" }} />
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button onClick={sendPromo} disabled={promoSending || !promoTitle.trim() || !promoBody.trim()} style={{ fontSize: 13, padding: "8px 16px", borderRadius: 8, border: "none", background: promoSending ? "#C4BBA6" : OLIVE, color: "#fff", cursor: promoSending ? "wait" : "pointer", fontWeight: 700 }}>
                  {promoSending ? "جارٍ الإرسال…" : "إرسال الدعائي"}
                </button>
                {promoSent ? <span style={{ color: "#4E6B2A", fontSize: 13, fontWeight: 700 }}>✓ أُرسل بنجاح</span> : null}
                {(rules.promo?.enabled ?? true) === false ? <span style={{ color: "#B55448", fontSize: 12 }}>⚠ قناة الدعائية متوقفة، لن يصل الإشعار حتى إعادة تشغيلها</span> : null}
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

// ══════════════════════ لوحة سجل نشاط الإدارة ══════════════════════
function AuditLogPanel({ onRefresh }: { onRefresh: () => void }) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const log = await readAuditLog();
      setEntries(log.slice().reverse());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  void onRefresh;
  void load;

  const rowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, padding: "9px 4px", borderBottom: "1px solid #F1EDE3", fontSize: 13 };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Card title="سجل نشاط الإدارة" note="كل إجراء يدوي تنفذه الإدارة يُسجَّل هنا تلقائيًا مع التاريخ والوقت للتتبع والمساءلة">
        {loading ? (
          <div style={{ textAlign: "center", color: "#8A8278", padding: 20 }}>جارٍ تحميل السجل…</div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: "center", color: "#8A8278", padding: 20 }}>لا توجد إجراءات مسجلة بعد. أي تفعيل أو إيقاف أو تعديل من هذه اللوحة سيظهر هنا.</div>
        ) : (
          <div style={{ maxHeight: 520, overflowY: "auto" }}>
            {entries.map((entry) => (
              <div key={entry.id} style={rowStyle}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>📌</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: "#3A3A3A" }}>{entry.action}</div>
                  {entry.details ? <div style={{ color: "#8A8278", fontSize: 12 }}>{entry.details}</div> : null}
                </div>
                <div style={{ color: "#B0A898", fontSize: 11, flexShrink: 0 }}>{new Date(entry.createdAt).toLocaleString("ar-LY")}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

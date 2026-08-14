/**
 * مكتبة إدارة لوحة التحكم.
 *
 * تعمل مباشرة على مفاتيح التخزين المشترك (AsyncStorage) دون طبقة خادم،
 * لأن التطبيقان يعملان محليًا على نفس الجهاز/المتصفح. كل العمليات
 * يدوية بالكامل من واجهة اللوحة: تجميد/إلغاء الحسابات، إدارة البانرات
 * الإعلانية، تفعيل/إيقاف الخدمات، إضافة مقدمي خدمة جدد.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ProviderAccount, ProviderService } from "./provider-registry";
import { PROVIDER_ACCOUNTS_KEY } from "./provider-registry";
import { SERVICE_REQUESTS_KEY, type ServiceRequest } from "./service-requests";
import { RATINGS_KEY, type ProviderRating } from "./ratings";
import { MEDICAL_ACCESS_KEY } from "./patient-profile";
import { CHAT_THREADS_KEY } from "./chat";

export const ADMINS_STORAGE_KEY = "tabibi.admin.ads.v1";
export const SERVICES_CATALOG_KEY = "tabibi.admin.services.v1";
export const PATIENTS_REGISTRY_KEY = "tabibi.patients.v1";

/**
 * شريحة إعلانية تديرها لوحة التحكم (بانر علوي أو سفلي).
 * الألوان مقبولة بصيغة #RRGGBB لأن البانر يعرضها كخلفية.
 */
export type AdminAdSlide = {
  id: string;
  enabled: boolean;
  position: "top" | "bottom";
  eyebrow: string;
  title: string;
  copy: string;
  icon: string;
  accent: string;
  accentSoft: string;
};

export type ServicesCatalog = {
  /** مفتاح الخدمة (مثل "doctor") وحالة تفعيلها الظهور للمرضى. */
  services: { key: string; title: string; enabled: boolean }[];
};

export type PatientRegistryEntry = {
  id: string;
  fullName: string;
  phone: string;
  status: "active" | "frozen" | "cancelled";
  createdAt: number;
};

// ───────────────────── دوال مساعدة عامة ─────────────────────

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ───────────────────── الإعلانات ─────────────────────

export async function readAdminAds(): Promise<AdminAdSlide[]> {
  return readJson<AdminAdSlide[]>(ADMINS_STORAGE_KEY, []);
}

export async function upsertAdminAd(ad: AdminAdSlide): Promise<AdminAdSlide[]> {
  const all = await readAdminAds();
  const index = all.findIndex((item) => item.id === ad.id);
  const next = index >= 0 ? [...all.slice(0, index), ad, ...all.slice(index + 1)] : [...all, ad];
  await writeJson(ADMINS_STORAGE_KEY, next);
  return next;
}

export async function deleteAdminAd(id: string): Promise<AdminAdSlide[]> {
  const all = await readAdminAds();
  const next = all.filter((item) => item.id !== id);
  await writeJson(ADMINS_STORAGE_KEY, next);
  return next;
}

export async function toggleAdminAd(id: string, enabled: boolean): Promise<AdminAdSlide[]> {
  const all = await readAdminAds();
  const next = all.map((item) => (item.id === id ? { ...item, enabled } : item));
  await writeJson(ADMINS_STORAGE_KEY, next);
  return next;
}

export const DEFAULT_AD_SLIDES: Omit<AdminAdSlide, "id">[] = [
  {
    enabled: true,
    position: "top",
    eyebrow: "رعاية من مكانك",
    title: "خطوة أبسط لصحتك",
    copy: "اختر الخدمة المناسبة وابدأ طلبك في وقتك.",
    icon: "favorite-border",
    accent: "#6B7B3F",
    accentSoft: "#EFF2E6",
  },
  {
    enabled: true,
    position: "top",
    eyebrow: "خدمة المختبر",
    title: "تحاليلك أقرب إليك",
    copy: "ابدأ طلب خدمة المختبر من خلال التطبيق.",
    icon: "science",
    accent: "#5D7D9B",
    accentSoft: "#EAF1F7",
  },
  {
    enabled: true,
    position: "top",
    eyebrow: "الصيدليات",
    title: "كل ما تحتاجه في مكان واحد",
    copy: "انتقل إلى خدمات الصيدليات من شبكة طبيبي.",
    icon: "local-pharmacy",
    accent: "#A65E67",
    accentSoft: "#F8ECEE",
  },
  {
    enabled: true,
    position: "bottom",
    eyebrow: "رعاية على مدار الساعة",
    title: "إسعاف منزلي عند الحاجة",
    copy: "خدمات طبية منزلية تصلك أينما كنت.",
    icon: "local-hospital",
    accent: "#6B7B3F",
    accentSoft: "#EFF2E6",
  },
];

// ───────────────────── كاتالوج الخدمات ─────────────────────

export const DEFAULT_SERVICES_CATALOG: ServicesCatalog = {
  services: [
    { key: "doctor", title: "طبيب", enabled: true },
    { key: "assisted", title: "خدمات طبية مساعدة", enabled: true },
    { key: "mental-health", title: "صحة نفسية", enabled: true },
    { key: "nutrition", title: "التغذية والصحة والجمال", enabled: true },
    { key: "veterinary", title: "طب بيطري", enabled: true },
    { key: "lab", title: "المختبر", enabled: true },
    { key: "pharmacy", title: "الصيدليات", enabled: true },
    { key: "consultation", title: "الاستشارات الطبية", enabled: true },
    { key: "senior-care", title: "رعاية كبار السن", enabled: true },
    { key: "physio", title: "العلاج الطبيعي", enabled: true },
    { key: "home-care", title: "الرعاية المنزلية", enabled: true },
  ],
};

export async function readServicesCatalog(): Promise<ServicesCatalog> {
  return readJson<ServicesCatalog>(SERVICES_CATALOG_KEY, DEFAULT_SERVICES_CATALOG);
}

export async function writeServicesCatalog(catalog: ServicesCatalog): Promise<ServicesCatalog> {
  await writeJson(SERVICES_CATALOG_KEY, catalog);
  return catalog;
}

export async function toggleService(key: string, enabled: boolean): Promise<ServicesCatalog> {
  const catalog = await readServicesCatalog();
  catalog.services = catalog.services.map((service) =>
    service.key === key ? { ...service, enabled } : service,
  );
  return writeServicesCatalog(catalog);
}

export async function addService(title: string): Promise<ServicesCatalog> {
  const catalog = await readServicesCatalog();
  const key = title.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\u0600-\u06FF-]/g, "");
  if (!key) return catalog;
  if (catalog.services.some((service) => service.key === key)) return catalog;
  catalog.services.push({ key, title: title.trim(), enabled: true });
  return writeServicesCatalog(catalog);
}

// ───────────────────── الحسابات (مقدمو الخدمة) ─────────────────────

export type AdminAccountStatus = "pending" | "active" | "frozen" | "cancelled";

export async function readAdminProviderAccounts(): Promise<ProviderAccount[]> {
  return readJson<ProviderAccount[]>(PROVIDER_ACCOUNTS_KEY, []);
}

export async function updateProviderStatus(
  id: string,
  status: AdminAccountStatus,
): Promise<ProviderAccount[]> {
  const accounts = await readAdminProviderAccounts();
  const next = accounts.map((account) => (account.id === id ? { ...account, status } : account));
  await writeJson(PROVIDER_ACCOUNTS_KEY, next);
  return next;
}

export async function addProviderAccount(
  input: Omit<ProviderAccount, "id" | "createdAt" | "passwordHash" | "documents"> & {
    password: string;
    documents?: ProviderAccount["documents"];
  },
): Promise<ProviderAccount> {
  const accounts = await readAdminProviderAccounts();
  const account: ProviderAccount = {
    ...input,
    id: newId(),
    passwordHash: hashPassword(input.password),
    documents: input.documents ?? [],
    createdAt: Date.now(),
  };
  await writeJson(PROVIDER_ACCOUNTS_KEY, [...accounts, account]);
  return account;
}

export async function updateProviderAccount(
  id: string,
  patch: Partial<ProviderAccount>,
): Promise<ProviderAccount | null> {
  const accounts = await readAdminProviderAccounts();
  const index = accounts.findIndex((account) => account.id === id);
  if (index < 0) return null;
  accounts[index] = { ...accounts[index], ...patch };
  await writeJson(PROVIDER_ACCOUNTS_KEY, accounts);
  return accounts[index];
}

function hashPassword(password: string): number {
  let hash = 5381;
  for (let index = 0; index < password.length; index++) {
    hash = ((hash << 5) + hash + password.charCodeAt(index)) >>> 0;
  }
  return hash;
}

// ───────────────────── الطلبات ─────────────────────

export async function readAdminRequests(): Promise<ServiceRequest[]> {
  return readJson<ServiceRequest[]>(SERVICE_REQUESTS_KEY, []);
}

export async function cancelAdminRequest(id: string): Promise<ServiceRequest[]> {
  const requests = await readAdminRequests();
  const next = requests.map((request) =>
    request.id === id ? { ...request, status: "cancelled" as const } : request,
  );
  await writeJson(SERVICE_REQUESTS_KEY, next);
  return next;
}

// ───────────────────── التقييمات والصلاحيات والدردشة ─────────────────────

export async function readAdminRatings(): Promise<ProviderRating[]> {
  return readJson<ProviderRating[]>(RATINGS_KEY, []);
}

export async function deleteAdminRating(id: string): Promise<ProviderRating[]> {
  const ratings = await readAdminRatings();
  const next = ratings.filter((rating) => rating.id !== id);
  await writeJson(RATINGS_KEY, next);
  return next;
}

export async function readAdminMedicalAccess(): Promise<unknown> {
  return readJson(MEDICAL_ACCESS_KEY, []);
}

export async function readAdminChatThreads(): Promise<unknown> {
  return readJson(CHAT_THREADS_KEY, []);
}

// ───────────────────── إحصاءات سريعة للوحة ─────────────────────

export type AdminSummary = {
  providers: number;
  activeProviders: number;
  frozenProviders: number;
  pendingProviders: number;
  requests: number;
  pendingRequests: number;
  acceptedRequests: number;
  ratings: number;
  ads: number;
  enabledAds: number;
};

export async function readAdminSummary(): Promise<AdminSummary> {
  const [providers, requests, ratings, ads] = await Promise.all([
    readAdminProviderAccounts(),
    readAdminRequests(),
    readAdminRatings(),
    readAdminAds(),
  ]);
  return {
    providers: providers.length,
    activeProviders: providers.filter((provider) => provider.status === "active").length,
    frozenProviders: providers.filter((provider) => provider.status === "frozen").length,
    pendingProviders: providers.filter((provider) => provider.status === "pending").length,
    requests: requests.length,
    pendingRequests: requests.filter((request) => request.status === "pending").length,
    acceptedRequests: requests.filter((request) => request.status === "accepted").length,
    ratings: ratings.length,
    ads: ads.length,
    enabledAds: ads.filter((ad) => ad.enabled).length,
  };
}

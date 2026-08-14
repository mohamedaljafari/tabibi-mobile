import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => {
  const store = new Map<string, string>();
  return {
    default: {
      getItem: vi.fn(async (key: string) => store.get(key) ?? null),
      setItem: vi.fn(async (key: string, value: string) => store.set(key, value)),
      removeItem: vi.fn(async (key: string) => store.delete(key)),
      clear: vi.fn(async () => store.clear()),
      __store: store,
    },
  };
});

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ADMINS_STORAGE_KEY,
  DEFAULT_SERVICES_CATALOG,
  addProviderAccount,
  addService,
  cancelAdminRequest,
  deleteAdminAd,
  deleteAdminRating,
  readAdminProviderAccounts,
  readAdminRequests,
  readAdminSummary,
  readAdminAds,
  readAdminRatings,
  readServicesCatalog,
  toggleAdminAd,
  toggleService,
  updateProviderAccount,
  updateProviderStatus,
  upsertAdminAd,
} from "../lib/admin";
import { PROVIDER_ACCOUNTS_KEY, type ProviderAccount } from "../lib/provider-registry";
import { RATINGS_KEY, type ProviderRating } from "../lib/ratings";
import { SERVICE_REQUESTS_KEY, type ServiceRequest } from "../lib/service-requests";

const sampleProvider: Omit<ProviderAccount, "id" | "createdAt" | "passwordHash" | "documents"> & {
  password: string;
} = {
  fullName: "د. سارة أحمد",
  role: "طبيب",
  phone: "091122233",
  status: "pending",
  specializations: ["طب عام"],
  yearsOfExperience: 6,
  bio: "طبيبة عامة",
  services: [{ id: "s1", name: "كشف منزلي", price: 120, durationMinutes: 45 }],
  availability: { availableNow: true, slots: [] },
  password: "SecurePass123!",
};

const sampleRating: ProviderRating = {
  id: "rating-1",
  requestId: "req-1",
  patientId: "patient-1",
  patientName: "أحمد محمد",
  providerId: "provider-1",
  providerName: "د. سارة أحمد",
  stars: 5,
  comment: "خدمة ممتازة",
  createdAt: Date.now(),
};

const sampleRequest: ServiceRequest = {
  id: "req-1",
  patientId: "patient-1",
  patientName: "أحمد محمد",
  patientPhone: "0912345678",
  providerId: "provider-1",
  providerName: "د. سارة أحمد",
  status: "pending",
  services: [{ serviceId: "s1", serviceName: "كشف منزلي", price: 120 }],
  total: 120,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

beforeEach(() => {
  (AsyncStorage as unknown as { __store: Map<string, string> }).__store.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("إعلانات لوحة التحكم", () => {
  it("يعيد مصفوفة فارغة عند عدم وجود إعلانات", async () => {
    expect(await readAdminAds()).toEqual([]);
  });

  it("يضيف إعلانًا جديدًا ويسترجعه", async () => {
    const ad = {
      id: "ad-1",
      enabled: true,
      position: "top" as const,
      eyebrow: "عرض جديد",
      title: "خصم على الكشف",
      copy: "خصم 20%",
      icon: "discount",
      accent: "#6B7B3F",
      accentSoft: "#EFF2E6",
    };
    await upsertAdminAd(ad);
    expect(await readAdminAds()).toEqual([ad]);
  });

  it("يحدّث إعلانًا موجودًا بدل تكراره", async () => {
    await upsertAdminAd({
      id: "ad-1",
      enabled: true,
      position: "top",
      eyebrow: "قديم",
      title: "عنوان",
      copy: "نص",
      icon: "star",
      accent: "#6B7B3F",
      accentSoft: "#EFF2E6",
    });
    await upsertAdminAd({
      id: "ad-1",
      enabled: false,
      position: "bottom",
      eyebrow: "محدّث",
      title: "عنوان",
      copy: "نص",
      icon: "star",
      accent: "#6B7B3F",
      accentSoft: "#EFF2E6",
    });
    const ads = await readAdminAds();
    expect(ads).toHaveLength(1);
    expect(ads[0].position).toBe("bottom");
  });

  it("يحذف إعلانًا بالهوية", async () => {
    await upsertAdminAd({
      id: "ad-1",
      enabled: true,
      position: "top",
      eyebrow: "ع",
      title: "ت",
      copy: "ن",
      icon: "star",
      accent: "#6B7B3F",
      accentSoft: "#EFF2E6",
    });
    await deleteAdminAd("ad-1");
    expect(await readAdminAds()).toEqual([]);
  });

  it("يبدّل حالة تفعيل إعلان", async () => {
    await upsertAdminAd({
      id: "ad-1",
      enabled: true,
      position: "top",
      eyebrow: "ع",
      title: "ت",
      copy: "ن",
      icon: "star",
      accent: "#6B7B3F",
      accentSoft: "#EFF2E6",
    });
    const result = await toggleAdminAd("ad-1", false);
    expect(result[0].enabled).toBe(false);
  });
});

describe("كتالوج الخدمات", () => {
  it("يُرجع الكاتالوج الافتراضي عند عدم وجوده", async () => {
    const catalog = await readServicesCatalog();
    expect(catalog.services.length).toBeGreaterThan(0);
    expect(catalog.services[0].key).toBe("doctor");
  });

  it("يوقف خدمة ويعيد تفعيلها", async () => {
    await toggleService("doctor", false);
    let catalog = await readServicesCatalog();
    expect(catalog.services.find((s) => s.key === "doctor")?.enabled).toBe(false);

    await toggleService("doctor", true);
    catalog = await readServicesCatalog();
    expect(catalog.services.find((s) => s.key === "doctor")?.enabled).toBe(true);
  });

  it("يضيف خدمة جديدة بمفتاح مشتق من اسمها", async () => {
    const catalog = await addService("تحاليل منزلية");
    const added = catalog.services.find((s) => s.title === "تحاليل منزلية");
    expect(added?.key).toBe("تحاليل-منزلية");
    expect(added?.enabled).toBe(true);
  });

  it("يرفض إضافة خدمة فارغة أو مكررة", async () => {
    const before = await readServicesCatalog();
    const afterEmpty = await addService("   ");
    expect(afterEmpty.services).toEqual(before.services);
    await addService("تحاليل منزلية");
    const afterDuplicate = await addService("تحاليل منزلية");
    const count = afterDuplicate.services.filter((s) => s.title === "تحاليل منزلية").length;
    expect(count).toBe(1);
  });

  it("يسمح باستبدال الكاتالوج كاملًا", async () => {
    await readServicesCatalog();
    await readServicesCatalog();
  });
});

describe("حسابات مقدمي الخدمة", () => {
  it("يضيف مقدم خدمة جديدًا من اللوحة مع تشفير كلمة المرور", async () => {
    const account = await addProviderAccount(sampleProvider);
    expect(account.id).toBeTruthy();
    expect(account.passwordHash).not.toBe(0);
    const stored = await readAdminProviderAccounts();
    expect(stored).toHaveLength(1);
    expect(stored[0].fullName).toBe("د. سارة أحمد");
  });

  it("يجمّد مقدم خدمة فيعيد غير مفعّل للمريض", async () => {
    const account = await addProviderAccount(sampleProvider);
    await updateProviderStatus(account.id, "frozen");
    const stored = await readAdminProviderAccounts();
    expect(stored[0].status).toBe("frozen");
    expect(account.status).toBe("pending");
  });

  it("يُفعّل مقدم خدمة معلقًا", async () => {
    const account = await addProviderAccount(sampleProvider);
    await updateProviderStatus(account.id, "active");
    const stored = await readAdminProviderAccounts();
    expect(stored[0].status).toBe("active");
  });

  it("يحدّث بيانات مقدم خدمة جزئيًا", async () => {
    const account = await addProviderAccount(sampleProvider);
    const updated = await updateProviderAccount(account.id, { bio: "طبيبة أطفال" });
    expect(updated?.bio).toBe("طبيبة أطفال");
  });

  it("يرفض التحديث لحساب غير موجود", async () => {
    const updated = await updateProviderAccount("non-existent", { bio: "تغيير" });
    expect(updated).toBeNull();
  });
});

describe("الطلبات والإعلانات المشتركة", () => {
  it("يجمّد طلبًا إداريًا فيحوله إلى cancelled", async () => {
    const store = (AsyncStorage as unknown as { __store: Map<string, string> }).__store;
    store.set(SERVICE_REQUESTS_KEY, JSON.stringify([sampleRequest]));
    const result = await cancelAdminRequest("req-1");
    expect(result[0].status).toBe("cancelled");
  });

  it("يحذف تقييمًا مخالفًا", async () => {
    const store = (AsyncStorage as unknown as { __store: Map<string, string> }).__store;
    store.set(RATINGS_KEY, JSON.stringify([sampleRating]));
    await deleteAdminRating("rating-1");
    expect(await readAdminRatings()).toEqual([]);
  });
});

describe("الإحصاءات", () => {
  it("يجمع إحصاءات صحيحة من مفاتيح التخزين المشتركة", async () => {
    const store = (AsyncStorage as unknown as { __store: Map<string, string> }).__store;
    store.set(PROVIDER_ACCOUNTS_KEY, JSON.stringify([{ ...sampleProvider, id: "p1", passwordHash: 1, createdAt: 1, documents: [] }]));
    store.set(SERVICE_REQUESTS_KEY, JSON.stringify([sampleRequest]));
    store.set(RATINGS_KEY, JSON.stringify([sampleRating]));
    store.set(ADMINS_STORAGE_KEY, JSON.stringify([{ id: "ad1", enabled: true }]));
    const summary = await readAdminSummary();
    expect(summary.providers).toBe(1);
    expect(summary.requests).toBe(1);
    expect(summary.ratings).toBe(1);
    expect(summary.enabledAds).toBe(1);
  });

  it("يتعامل مع تخزين فارغ", async () => {
    const summary = await readAdminSummary();
    expect(summary.providers).toBe(0);
    expect(summary.requests).toBe(0);
  });
});

describe("الحماية من بيانات فاسدة", () => {
  it("يعيد الافتراضي عند JSON فاسد في الكاتالوج", async () => {
    (AsyncStorage as unknown as { __store: Map<string, string> }).__store.set(
      "tabibi.admin.services.v1",
      "JSON فاسد{{",
    );
    const catalog = await readServicesCatalog();
    expect(catalog.services[0].key).toBe("doctor");
  });

  it("يحفظ الكاتالوج بعد التعديل في المفتاح الصحيح", async () => {
    await toggleService("doctor", false);
    expect(
      (AsyncStorage as unknown as { __store: Map<string, string> }).__store.has(
        "tabibi.admin.services.v1",
      ),
    ).toBe(true);
  });
});

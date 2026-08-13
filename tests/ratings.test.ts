import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  RATINGS_KEY,
  createRating,
  getProviderRatingSummaries,
  getProviderRatingSummary,
  isRequestRated,
  validateNewRating,
  validateStars,
} from "../lib/ratings";

const mockedStorage = vi.mocked(AsyncStorage);

let stored: unknown[] = [];

beforeEach(() => {
  vi.mocked(AsyncStorage.getItem).mockClear();
  vi.mocked(AsyncStorage.setItem).mockClear();
  stored = [];
  mockedStorage.getItem.mockImplementation(
    ((key: string) => {
      void key;
      return Promise.resolve(stored.length > 0 ? JSON.stringify(stored) : null);
    }) as never,
  );
  mockedStorage.setItem.mockImplementation(
    ((key: string, value: string) => {
      void key;
      stored = JSON.parse(value);
      return Promise.resolve();
    }) as never,
  );
}
);

function sampleInput(overrides: Record<string, unknown> = {}) {
  return {
    id: "rt_1",
    requestId: "req_abc",
    patientId: "patient_1",
    patientName: "سارة أحمد",
    providerId: "provider_1",
    providerName: "د. محمد الطيب",
    stars: 5,
    ...overrides,
  };
}

describe("validateStars", () => {
  it("يقبل النجوم الصحيحة من 1 إلى 5", () => {
    for (let stars = 1; stars <= 5; stars++) {
      expect(validateStars(stars)).toBe(stars);
    }
  });

  it("يرفض الأرقام خارج النطاق", () => {
    expect(validateStars(0)).toBeNull();
    expect(validateStars(6)).toBeNull();
    expect(validateStars(-1)).toBeNull();
  });

  it("يرفض القيم غير الرقمية", () => {
    expect(validateStars("5")).toBeNull();
    expect(validateStars(4.5)).toBeNull();
    expect(validateStars(undefined)).toBeNull();
  });
});

describe("validateNewRating", () => {
  it("يقبل تقييمًا صالحًا مع تعليق اختياري", () => {
    expect(validateNewRating(sampleInput({ comment: "ممتاز" }))).toMatchObject({ valid: true, stars: 5 });
    expect(validateNewRating(sampleInput())).toMatchObject({ valid: true });
  });

  it("يرفض حقول المعرّفات الفارغة", () => {
    expect(validateNewRating(sampleInput({ requestId: "" }))).toMatchObject({ valid: false });
    expect(validateNewRating(sampleInput({ patientId: "" }))).toMatchObject({ valid: false });
    expect(validateNewRating(sampleInput({ providerId: "" }))).toMatchObject({ valid: false });
  });

  it("يرفض التعليق الأطول من 500 حرف", () => {
    const longComment = "أ".repeat(501);
    const result = validateNewRating(sampleInput({ comment: longComment }));
    expect(result).toMatchObject({ valid: false });
  });
});

describe("createRating", () => {
  it("ينشئ تقييمًا جديدًا ويحفظه في المفتاح المشترك", async () => {
    stored = [];
    const { rating } = await createRating(sampleInput({ comment: "خدمة ممتازة" }));
    expect(rating).not.toBeNull();
    expect(rating!.stars).toBe(5);
    expect(rating!.comment).toBe("خدمة ممتازة");
    expect(mockedStorage.setItem).toHaveBeenCalledWith(
      RATINGS_KEY,
      expect.stringContaining('"requestId":"req_abc"'),
    );
  });

  it("يمنع التقييم المكرر لنفس الطلب", async () => {
    const existing = sampleInput({});
    stored = [existing];
    const result = await createRating(sampleInput());
    expect(result.rating).toBeNull();
    expect(result.error).toBe("تم تقييم هذا الطلب مسبقًا");
    expect(mockedStorage.setItem).not.toHaveBeenCalled();
  });

  it("يرفض التقييم غير الصالح ولا يحفظ", async () => {
    stored = [];
    const result = await createRating(sampleInput({ stars: 6 }));
    expect(result.rating).toBeNull();
    expect(result.error).toContain("نجوم");
    expect(mockedStorage.setItem).not.toHaveBeenCalled();
  });

  it("يقص التعليق الفارغ ولا يخزنه", async () => {
    stored = [];
    const { rating } = await createRating(sampleInput({ comment: "   " }));
    expect(rating!.comment).toBeUndefined();
  });
});

describe("getProviderRatingSummary", () => {
  it("يحسب المتوسط وعدد التقييمات", async () => {
    stored = [sampleInput({ stars: 4 }), sampleInput({ stars: 2 })];
    const summary = await getProviderRatingSummary("provider_1");
    expect(summary.count).toBe(2);
    expect(summary.average).toBe(3);
  });

  it("يعيد صفرًا عند عدم وجود تقييمات", async () => {
    stored = [];
    const summary = await getProviderRatingSummary("provider_unknown");
    expect(summary.count).toBe(0);
    expect(summary.average).toBe(0);
  });

  it("يدوّر المتوسط لعشرة عشريات", async () => {
    stored = [sampleInput({ stars: 5 }), sampleInput({ stars: 5 }), sampleInput({ stars: 4 })];
    const summary = await getProviderRatingSummary("provider_1");
    expect(summary.average).toBe(4.7);
  });
});

describe("getProviderRatingSummaries", () => {
  it("يحسب عدة ملخصات دفعة واحدة", async () => {
    stored = [sampleInput({ stars: 5 }), sampleInput({ stars: 3, providerId: "provider_2", providerName: "أخرى" })];
    const summaries = await getProviderRatingSummaries(["provider_1", "provider_2"]);
    expect(summaries).toHaveLength(2);
    expect(summaries.find((s) => s.providerId === "provider_1")?.count).toBe(1);
    expect(summaries.find((s) => s.providerId === "provider_2")?.count).toBe(1);
  });

  it("يعيد صفرًا لمقدم خدمة بلا تقييمات", async () => {
    stored = [sampleInput({ stars: 4 })];
    const summaries = await getProviderRatingSummaries(["no_one"]);
    expect(summaries[0].count).toBe(0);
    expect(summaries[0].average).toBe(0);
  });
});

describe("isRequestRated", () => {
  it("يحدد أن الطلب قيّم عليه", async () => {
    stored = [sampleInput()];
    expect(await isRequestRated("req_abc")).toBe(true);
    expect(await isRequestRated("other_req")).toBe(false);
  });
});

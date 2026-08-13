/** اختبارات مكتبة تسجيل مقدمي الخدمة: المطابقة والدمج والفلترة */
import { describe, expect, it } from "vitest";
import {
  filterActiveProviders,
  formatProviderAvailability,
  formatYearsOfExperience,
  initialsFromName,
  matchSpecialty,
  mergeAssistedServiceProviders,
  mergeDoctorsForSpecialty,
  mergeMentalHealthProviders,
  mergeNursingProviders,
  mergeNutritionProviders,
  mergePhysioProviders,
  mergeSeniorCareProviders,
  mergeVeterinaryProviders,
  type ProviderAccount,
} from "../lib/provider-registry";

function makeProvider(partial: Partial<ProviderAccount> = {}): ProviderAccount {
  return {
    id: "provider-1",
    fullName: "د. أحمد رائد",
    role: "طبيب",
    phone: "+218912345678",
    passwordHash: 123,
    createdAt: Date.now(),
    status: "active",
    specializations: ["طب عام"],
    yearsOfExperience: 8,
    bio: "طبيب عام منزلي",
    documents: [],
    services: [{ id: "s1", name: "كشف منزلي", price: 150, durationMinutes: 30 }],
    availability: { availableNow: true, slots: [] },
    ...partial,
  } as ProviderAccount;
}

describe("matchSpecialty", () => {
  it("يطابق طب عام مع طبيب عام", () => {
    expect(matchSpecialty("طب عام", "طبيب عام")).toBe(true);
  });
  it("يطابق رعاية كبار السن مع أخصائي رعاية كبار السن", () => {
    expect(matchSpecialty("رعاية كبار السن", "أخصائي رعاية كبار السن")).toBe(true);
  });
  it("يرفض تخصصات مختلفة", () => {
    expect(matchSpecialty("طب أطفال", "طبيب باطنة")).toBe(false);
  });
  it("يطابق التمريض المنزلي مع تمريض رعاية منزلية", () => {
    expect(matchSpecialty("تمريض رعاية منزلية", "تمريض رعاية منزلية")).toBe(true);
  });
});

describe("mergeDoctorsForSpecialty", () => {
  it("يعيد طبيبًا مفعّلًا بتخصص مطابق", () => {
    const providers = [makeProvider({ specializations: ["طب عام"] })];
    expect(mergeDoctorsForSpecialty(providers, "طبيب عام")).toHaveLength(1);
  });
  it("يستبعد طبيبًا غير مفعّل (pending)", () => {
    const providers = [makeProvider({ status: "pending", specializations: ["طب عام"] })];
    expect(mergeDoctorsForSpecialty(providers, "طبيب عام")).toHaveLength(0);
  });
  it("يستبعد ممرضًا من بحث الأطباء", () => {
    const providers = [makeProvider({ role: "ممرض" as never, specializations: ["طب عام"] })];
    expect(mergeDoctorsForSpecialty(providers, "طبيب عام")).toHaveLength(0);
  });
  it("يستبعد طبيبًا بتخصص غير مطابق", () => {
    const providers = [makeProvider({ specializations: ["طب أطفال"] })];
    expect(mergeDoctorsForSpecialty(providers, "طبيب عام")).toHaveLength(0);
  });
});

describe("دوال الدمج لكل مسار خدمة", () => {
  it("mergeNursingProviders يلتقط ممرضًا بتخصصات التمريض", () => {
    const providers = [makeProvider({ role: "ممرضة" as never, specializations: ["تمريض رعاية منزلية"] })];
    expect(mergeNursingProviders(providers)).toHaveLength(1);
  });
  it("mergeMentalHealthProviders يلتقط أخصائي صحة نفسية", () => {
    const providers = [makeProvider({ role: "أخصائي صحة نفسية" as never, specializations: ["استشارات نفسية"] })];
    expect(mergeMentalHealthProviders(providers)).toHaveLength(1);
  });
  it("mergeNutritionProviders يلتقط أخصائي تغذية", () => {
    const providers = [makeProvider({ role: "أخصائي تغذية" as never, specializations: ["تغذية علاجية"] })];
    expect(mergeNutritionProviders(providers)).toHaveLength(1);
  });
  it("mergePhysioProviders يلتقط أخصائي علاج طبيعي", () => {
    const providers = [makeProvider({ role: "أخصائي علاج طبيعي" as never, specializations: ["تأهيل بدني"] })];
    expect(mergePhysioProviders(providers)).toHaveLength(1);
  });
  it("mergeSeniorCareProviders يلتقط أخصائي رعاية كبار السن", () => {
    const providers = [makeProvider({ role: "أخصائي رعاية كبار السن" as never, specializations: ["رعاية كبار السن"] })];
    expect(mergeSeniorCareProviders(providers)).toHaveLength(1);
  });
  it("mergeVeterinaryProviders يلتقط طبيب بيطري", () => {
    const providers = [makeProvider({ role: "طبيب بيطري" as never, specializations: ["علاج بيطري"] })];
    expect(mergeVeterinaryProviders(providers)).toHaveLength(1);
  });
  it("mergeAssistedServiceProviders يلتقط مجموعات الخدمات المساعدة", () => {
    const providers = [
      makeProvider({ role: "ممرض" as never, specializations: ["إسعافات أولية"] }),
      makeProvider({ role: "أخصائي علاج طبيعي" as never, specializations: ["علاج طبيعي"] }),
      makeProvider({ role: "طبيب بيطري" as never, specializations: ["علاج بيطري"] }),
    ];
    expect(mergeAssistedServiceProviders(providers)).toHaveLength(2);
  });
  it("فلترة elderly-care تلتقط أخصائي رعاية كبار السن وتمريض منزلي وتستبعد العلاج الطبيعي", () => {
    const providers = [
      makeProvider({ id: "senior", role: "أخصائي رعاية كبار السن" as never, specializations: ["رعاية كبار السن"] }),
      makeProvider({ id: "nurse", role: "ممرض" as never, specializations: ["تمريض رعاية منزلية"] }),
      makeProvider({ id: "physio", role: "أخصائي علاج طبيعي" as never, specializations: ["علاج طبيعي"] }),
    ];
    const result = mergeAssistedServiceProviders(providers, "elderly-care");
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.id)).toEqual(["senior", "nurse"]);
  });
  it("فلترة physical-therapy تلتقط أخصائي العلاج الطبيعي وتستبعد الآخرين", () => {
    const providers = [
      makeProvider({ id: "physio", role: "أخصائي علاج طبيعي" as never, specializations: ["إعادة تأهيل"] }),
      makeProvider({ id: "senior", role: "أخصائي رعاية كبار السن" as never, specializations: ["رعاية كبار السن"] }),
      makeProvider({ id: "nurse", role: "ممرضة" as never, specializations: ["إسعافات أولية"] }),
    ];
    const result = mergeAssistedServiceProviders(providers, "physical-therapy");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("physio");
  });
});

describe("formatProviderAvailability", () => {
  it("يعرض متاح الآن", () => {
    expect(formatProviderAvailability({ availableNow: true, slots: [] })).toBe("متاح الآن");
  });
  it("يعرض أول توقيت من الجدول", () => {
    expect(
      formatProviderAvailability({
        availableNow: false,
        slots: [{ day: "monday", startHour: "09:00", endHour: "14:00" }],
      }),
    ).toBe("الاثنين 09:00–14:00");
  });
});

describe("formatYearsOfExperience", () => {
  it("يصيغ السنوات الصحيحة", () => {
    expect(formatYearsOfExperience(8)).toBe("8 سنوات خبرة");
    expect(formatYearsOfExperience(1)).toBe("1 سنة خبرة");
    expect(formatYearsOfExperience(0)).toBe("");
  });
});

describe("initialsFromName", () => {
  it("يأخذ الحرف الأول من الاسم الأول والأخير", () => {
    expect(initialsFromName("أحمد رائد")).toBe("أر");
  });
});

describe("filterActiveProviders", () => {
  it("يحتفظ بالمفعّل فقط", () => {
    const providers = [
      makeProvider({ id: "a", status: "active" }),
      makeProvider({ id: "b", status: "pending" }),
    ];
    expect(filterActiveProviders(providers)).toHaveLength(1);
  });
});

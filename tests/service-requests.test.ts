import AsyncStorage from "@react-native-async-storage/async-storage";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: vi.fn(), setItem: vi.fn() },
}));

import {
  SERVICE_REQUESTS_KEY,
  createServiceRequest,
  parseStatus,
  readPatientRequests,
  readProviderRequests,
  readServiceRequests,
  updateRequestStatus,
  type ServiceRequest,
} from "../lib/service-requests";

function buildRequest(overrides: Partial<ServiceRequest> = {}): ServiceRequest {
  return {
    id: "req_1",
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    status: "pending",
    patientId: "patient-a",
    patientName: "مريض تجريبي",
    patientPhone: "0500000000",
    providerId: "provider-x",
    providerName: "د. شريك تجريبي",
    services: [{ serviceId: "s1", serviceName: "كشف منزلي", price: 200 }],
    total: 200,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.mocked(AsyncStorage.getItem).mockReset();
});

describe("readServiceRequests", () => {
  it("يعيد مصفوفة فارغة عند عدم وجود بيانات", async () => {
    expect(await readServiceRequests()).toEqual([]);
  });

  it("يقرأ الطلبات المصنفة ويهمل التالفة", async () => {
    const valid = buildRequest();
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify([valid, "bad-string", null, { id: "missing-patient" }]));
    const result = await readServiceRequests();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("req_1");
  });

  it("يعيد مصفوفة فارغة عند قيمة JSON تالفة", async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue("not-json");
    expect(await readServiceRequests()).toEqual([]);
  });
});

describe("createServiceRequest", () => {
  it("ينشئ طلبًا جديدًا بحالة قيد الانتظار ويحفظه", async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify([]));
    const request = await createServiceRequest({
      patientId: "patient-a",
      patientName: "مريض تجريبي",
      patientPhone: "0500000000",
      addressLabel: "المنزل",
      providerId: "provider-x",
      providerName: "د. شريك تجريبي",
      services: [{ serviceId: "s1", serviceName: "كشف منزلي", price: 200 }],
      total: 200,
    });
    expect(request.status).toBe("pending");
    expect(request.id).toMatch(/^req_/);
    expect(request.createdAt).toBeGreaterThan(0);
    expect(AsyncStorage.setItem).toHaveBeenCalledOnce();
    const saved = JSON.parse((AsyncStorage.setItem as ReturnType<typeof vi.fn>).mock.calls[0][1]);
    expect(saved).toHaveLength(1);
    expect(saved[0].status).toBe("pending");
  });

  it("يضيف الطلب الجديد إلى طلبات موجودة", async () => {
    const existing = [buildRequest({ id: "req_old" })];
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(existing));
    await createServiceRequest({
      patientId: "patient-a",
      patientName: "مريض تجريبي",
      patientPhone: "0500000000",
      providerId: "provider-x",
      providerName: "د. شريك تجريبي",
      services: [],
      total: 0,
    });
    const saved = JSON.parse((AsyncStorage.setItem as ReturnType<typeof vi.fn>).mock.calls[0][1]);
    expect(saved).toHaveLength(2);
  });
});

describe("readPatientRequests / readProviderRequests", () => {
  const requests = [
    buildRequest({ id: "req-1", patientId: "p1", providerId: "v1" }),
    buildRequest({ id: "req-2", patientId: "p2", providerId: "v1" }),
    buildRequest({ id: "req-3", patientId: "p1", providerId: "v2" }),
  ];

  beforeEach(() => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(requests));
  });

  it("يرجع طلبات مريض محدد", async () => {
    const result = await readPatientRequests("p1");
    expect(result).toHaveLength(2);
    expect(result.every((request) => request.patientId === "p1")).toBe(true);
  });

  it("يرجع الطلبات الموجهة لمقدم خدمة محدد", async () => {
    const result = await readProviderRequests("v1");
    expect(result).toHaveLength(2);
    expect(result.every((request) => request.providerId === "v1")).toBe(true);
  });

  it("يعيد مصفوفة فارغة عند عدم التطابق", async () => {
    expect(await readProviderRequests("no-such-provider")).toEqual([]);
  });
});

describe("updateRequestStatus", () => {
  const requests = [buildRequest({ id: "req-1", status: "pending" })];

  beforeEach(() => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(requests));
  });

  it("يقبل الطلب ويحفظه", async () => {
    const updated = await updateRequestStatus("req-1", "accepted");
    expect(updated?.status).toBe("accepted");
    expect(updated?.updatedAt).toBeGreaterThan(requests[0].updatedAt);
    const saved = JSON.parse((AsyncStorage.setItem as ReturnType<typeof vi.fn>).mock.calls[0][1]);
    expect(saved[0].status).toBe("accepted");
  });

  it("يرفض الطلب مع رسالة من مقدم الخدمة", async () => {
    const updated = await updateRequestStatus("req-1", "rejected", "غير متاح في هذا الوقت");
    expect(updated?.status).toBe("rejected");
    expect(updated?.providerReply).toBe("غير متاح في هذا الوقت");
  });

  it("يعيد null عند عدم وجود الطلب", async () => {
    expect(await updateRequestStatus("no-such-id", "accepted")).toBeNull();
  });
});

describe("parseStatus", () => {
  it("يقبل القيم الصحيحة", () => {
    expect(parseStatus("pending")).toBe("pending");
    expect(parseStatus("accepted")).toBe("accepted");
    expect(parseStatus("rejected")).toBe("rejected");
  });
  it("يعيد pending للقيم غير المعروفة", () => {
    expect(parseStatus(undefined)).toBe("pending");
    expect(parseStatus("unknown")).toBe("pending");
  });
});

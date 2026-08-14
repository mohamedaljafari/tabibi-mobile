/**
 * نظام طلبات الاستشارات الطبية (داخل وخارج ليبيا).
 *
 * يخزن طلبات الاستشارة محليًا في AsyncStorage بمفتاح مستقل
 * (consultation_requests_v1). تظهر الطلبات للمريض في تبويب «طلباتي»،
 * ويمكن لاحقًا دمجها مع نظام الطلبات المشترك.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ConsultationType } from "./consultation-doctors";

export type ConsultationRequestStatus = "pending" | "accepted" | "rejected" | "completed" | "cancelled";

export type ConsultationRequest = {
  id: string;
  type: ConsultationType;
  patientId: string;
  patientName: string;
  patientPhone: string;
  specialtyLabel: string;
  doctorId: string;
  doctorName: string;
  price: number;
  status: ConsultationRequestStatus;
  notes?: string;
  createdAt: number;
  updatedAt: number;
};

export const CONSULTATION_REQUESTS_KEY = "consultation_requests_v1";

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

export async function readConsultationRequests(): Promise<ConsultationRequest[]> {
  return readJson<ConsultationRequest[]>(CONSULTATION_REQUESTS_KEY, []);
}

export async function submitConsultationRequest(
  request: ConsultationRequest,
): Promise<ConsultationRequest[]> {
  const all = await readConsultationRequests();
  const next = [...all, request];
  await writeJson(CONSULTATION_REQUESTS_KEY, next);
  return next;
}

export async function updateConsultationRequest(
  id: string,
  patch: Partial<ConsultationRequest>,
): Promise<ConsultationRequest[]> {
  const all = await readConsultationRequests();
  const next = all.map((request) =>
    request.id === id
      ? { ...request, ...patch, updatedAt: Date.now() }
      : request,
  );
  await writeJson(CONSULTATION_REQUESTS_KEY, next);
  return next;
}

export async function cancelConsultationRequest(id: string): Promise<ConsultationRequest[]> {
  return updateConsultationRequest(id, { status: "cancelled" });
}

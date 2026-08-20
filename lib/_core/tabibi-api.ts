import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { hashPasswordStrong } from "@/lib/patient-profile";
import { SESSION_TOKEN_KEY } from "@/constants/oauth";
import { trpc } from "@/lib/trpc";
import type { AppRouter } from "@/server/routers";
import { getApiBaseUrl } from "@/constants/oauth";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";

/**
 * طبقة المصادقة والسجلات المشتركة عبر خادم tRPC المدمج (بديل Supabase).
 * كل العمليات تمر عبر `tabibi.*` (Bearer token للجلسات) و`system.*` على الخادم المحلي.
 */
export type TabibiUser = {
  id: string;
  phone: string;
  role: "patient" | "provider" | "admin";
  display_name: string;
  password_hash: string;
  status: "active" | "pending" | "rejected" | "suspended";
  metadata: Record<string, unknown>;
  created_at: string;
  failed_attempts: number;
  locked_until: string | null;
};

export type TabibiRecordRow = { id: number; payload: unknown };

export type MedicalRecordPayload = {
  id: string;
  ownerName: string;
  ownerType: "patient" | "family";
  createdAt: string;
  entries: ClinicalEntryPayload[];
};

export type ClinicalEntryPayload = {
  id: string;
  type: "diagnosis" | "prescription" | "service";
  title: string;
  details: string;
  providerName?: string;
  createdAt: string;
};

export type AddressPayload = {
  id: string;
  label: string;
  addressLabel: string;
  latitude: number;
  longitude: number;
  source: "map" | "current-location";
  cityId?: string;
  areaNames?: string[];
  createdAt: string;
};

export type SetupPayload = { isSetupComplete: boolean; familyMemberNames: string[] };

/** عميل tRPC مرفوع بإصدار Bearer جديد (تغيير التوكن يتطلب عميلًا جديدًا). */
function trpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink<AppRouter>({
        url: `${getApiBaseUrl()}/api/trpc`,
        transformer: superjson,
        async headers() {
          const token = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        fetch(url, options) {
          return fetch(url, { ...options, credentials: "include" });
        },
      }),
    ],
  });
}


async function persistToken(token: string | null): Promise<void> {
  if (Platform.OS === "web") {
    if (token === null) window.localStorage.removeItem(SESSION_TOKEN_KEY);
    else window.localStorage.setItem(SESSION_TOKEN_KEY, token);
    return;
  }
  if (token === null) {
    await AsyncStorage.removeItem(SESSION_TOKEN_KEY);
    return;
  }
  await AsyncStorage.setItem(SESSION_TOKEN_KEY, token);
}

function persistUserInfo(user: TabibiUser): void {
  if (Platform.OS === "web") {
    window.localStorage.setItem("tabibi.user-info.v1", JSON.stringify(user));
    return;
  }
  void AsyncStorage.setItem("tabibi.user-info.v1", JSON.stringify(user));
}

function readUserInfo(): TabibiUser | null {
  try {
    const raw =
      Platform.OS === "web"
        ? window.localStorage.getItem("tabibi.user-info.v1")
        : null;
    if (!raw) return null;
    return JSON.parse(raw) as TabibiUser;
  } catch {
    return null;
  }
}

export type AuthState = { user: TabibiUser; token: string } | null;

/** حالة المصادقة المحلية (الكاش) مع تحقق من الخادم عند توفر الشبكة. */
export async function getAuthState(): Promise<AuthState> {
  const token = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) return null;
  try {
    const me = await trpcClient().tabibi.me.query();
    const user = me ?? readUserInfo();
    if (user) {
      persistUserInfo(user);
      return { user, token };
    }
  } catch {
    // بدون شبكة نعتمد على الكاش المحلي.
    const cached = readUserInfo();
    if (cached) return { user: cached, token };
  }
  return null;
}

/** تسجيل الخروج وحذف الجلسات في الخادم. */
export async function signOut(): Promise<void> {
  const token = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
  if (token) {
    try {
      await trpcClient().tabibi.deleteSessions.mutate({ token });
    } catch {
      // تجاهل أخطاء الشبكة عند تسجيل الخروج.
    }
  }
  await persistToken(null);
  if (Platform.OS === "web") window.localStorage.removeItem("tabibi.user-info.v1");
  else await AsyncStorage.removeItem("tabibi.user-info.v1");
}

/** تسجيل الدخول برقم الهاتف وكلمة المرور عبر الخادم المحلي (PBKDF2 في العميل). */
export async function signInWithPhone(
  phone: string,
  password: string,
): Promise<{ user: TabibiUser; token: string } | { error: string }> {
  try {
    const passwordHash = await hashPasswordStrong(password);
    const result = await trpcClient().tabibi.signIn.mutate({ phone, password_hash: passwordHash });
    await persistToken(result.token);
    persistUserInfo(result.user);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const isNotFound = /غير موجود|NOT_FOUND/i.test(message);
    const isPending = /مراجعة|FORBIDDEN/.test(message);
    const isLocked = /مقفل|TOO_MANY/.test(message);
    if (isNotFound) return { error: "الحساب غير موجود في هذه الخدمة؛ جرّب إنشاء حساب جديد." };
    if (isPending) return { error: "حسابك قيد مراجعة الإدارة، سيتم تفعيله قريبًا." };
    if (isLocked) return { error: "الحساب مقفل مؤقتًا بسبب محاولات فاشلة متكررة. أعد المحاولة لاحقًا." };
    if (/UNAUTHORIZED|غير صحيحة/.test(message)) return { error: "كلمة المرور غير صحيحة. تحقق منها وحاول مرة أخرى." };
    console.error("[tabibi-auth] signIn failed:", error);
    return { error: "تعذر الاتصال بخدمة المصادقة؛ تحقق من اتصالك بالإنترنت." };
  }
}

/** إنشاء حساب جديد مشترك عبر التطبيقات الثلاثة (الهاش يُحسب محليًا). */
export async function registerWithPhone(input: {
  fullName: string;
  phone: string;
  password: string;
  role: "patient" | "provider";
  metadata?: Record<string, unknown>;
}): Promise<{ user: TabibiUser; token: string } | { error: string }> {
  try {
    const passwordHash = await hashPasswordStrong(input.password);
    const user = await trpcClient().tabibi.createUser.mutate({
      phone: input.phone,
      role: input.role,
      display_name: input.fullName.trim(),
      password_hash: passwordHash,
      status: "active",
      metadata: input.metadata ?? {},
    });
    const token = await randomToken();
    await trpcClient().tabibi.createSession.mutate({ userId: user.id, token });
    await persistToken(token);
    persistUserInfo(user);
    return { user, token };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/مسجل مسبقًا|CONFLICT/.test(message)) return { error: "هذا الرقم مسجل مسبقًا؛ سجّل الدخول مباشرة." };
    console.error("[tabibi-auth] register failed:", error);
    return { error: "تعذر إنشاء الحساب؛ تحقق من اتصالك بالإنترنت." };
  }
}

async function randomToken(): Promise<string> {
  let values: number[];
  if (Platform.OS === "web" && typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const buf = new Uint8Array(32);
    window.crypto.getRandomValues(buf);
    values = Array.from(buf);
  } else {
    values = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256));
  }
  return values.map((b) => b.toString(16).padStart(2, "0")).join("") + Date.now().toString(36);
}

function now(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** قراءة سجل مشترك بمالك ومجموعة معينة. */
async function readRecord<T>(
  collection: string,
  ownerKey: string,
  token: string,
): Promise<(T & { id: string }) | null> {
  const result = (await trpcClient().tabibi.readRecord.query({ collection, ownerKey })) as
    | (T & { id: number })
    | null;
  if (!result) return null;
  const { id, ...payload } = result as unknown as Record<string, unknown>;
  return { ...(payload as T), id: String(id) } as T & { id: string };
}

/** إنشاء أو تحديث سجل مشترك. */
async function upsertRecord(
  collection: string,
  ownerKey: string,
  payload: unknown,
  createdBy: string,
  token: string,
): Promise<void> {
  await trpcClient().tabibi.upsertRecord.mutate({
    collection,
    ownerKey,
    payload,
    createdBy,
  });
}

export async function readPatientSetup(user: TabibiUser): Promise<SetupPayload> {
  const token = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) return { isSetupComplete: false, familyMemberNames: [] };
  const record = await readRecord<SetupPayload>("setup", `patient:${user.id}`, token);
  return record ?? { isSetupComplete: false, familyMemberNames: [] };
}

export async function savePatientSetup(
  user: TabibiUser,
  input: Partial<SetupPayload>,
): Promise<SetupPayload> {
  const token = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) throw new Error("not authenticated");
  const current = await readPatientSetup(user);
  const next: SetupPayload = { ...current, ...input };
  await upsertRecord("setup", `patient:${user.id}`, next, user.id, token);
  return next;
}

export async function readPatientAddresses(user: TabibiUser): Promise<AddressPayload[]> {
  const token = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) return [];
  const record = await readRecord<{ addresses: AddressPayload[] }>("addresses", `patient:${user.id}`, token);
  return record?.addresses ?? [];
}

export async function addPatientAddress(
  user: TabibiUser,
  address: Omit<AddressPayload, "id" | "createdAt">,
): Promise<AddressPayload[]> {
  const token = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) throw new Error("not authenticated");
  const current = await readPatientAddresses(user);
  const next = [...current, { ...address, id: createId("address"), createdAt: now() }];
  await upsertRecord("addresses", `patient:${user.id}`, { addresses: next }, user.id, token);
  return next;
}

export async function readPatientMedicalRecords(user: TabibiUser): Promise<MedicalRecordPayload[]> {
  const token = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) return [];
  const record = await readRecord<{ records: MedicalRecordPayload[] }>(
    "medical-records",
    `patient:${user.id}`,
    token,
  );
  return record?.records ?? [];
}

export async function createMedicalRecords(
  user: TabibiUser,
  ownerNames: Array<{ ownerName: string; ownerType: "patient" | "family" }>,
): Promise<MedicalRecordPayload[]> {
  const token = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) throw new Error("not authenticated");
  const current = await readPatientMedicalRecords(user);
  const keys = new Set(
    current.map((r) => `${r.ownerType}:${r.ownerName.toLocaleLowerCase("ar")}`),
  );
  const added: MedicalRecordPayload[] = [];
  for (const owner of ownerNames) {
    const key = `${owner.ownerType}:${owner.ownerName.toLocaleLowerCase("ar")}`;
    if (keys.has(key) || owner.ownerName.trim().length < 3) continue;
    keys.add(key);
    added.push({
      id: createId("medical-record"),
      ownerName: owner.ownerName.trim(),
      ownerType: owner.ownerType,
      createdAt: now(),
      entries: [],
    });
  }
  const next = [...current, ...added];
  await upsertRecord("medical-records", `patient:${user.id}`, { records: next }, user.id, token);
  return next;
}

export async function addClinicalEntry(
  user: TabibiUser,
  ownerName: string,
  entry: Omit<ClinicalEntryPayload, "id" | "createdAt">,
): Promise<MedicalRecordPayload[]> {
  const token = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) throw new Error("not authenticated");
  const records = await readPatientMedicalRecords(user);
  const next = records.map((record) =>
    record.ownerName.toLocaleLowerCase("ar") === ownerName.toLocaleLowerCase("ar")
      ? {
          ...record,
          entries: [
            ...record.entries,
            { ...entry, id: createId("entry"), createdAt: now() },
          ],
        }
      : record,
  );
  await upsertRecord("medical-records", `patient:${user.id}`, { records: next }, user.id, token);
  return next;
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import {
  TabibiUser,
  createTabibiSession,
  createTabibiUser,
  deleteSessionToken,
  findUserByPhone,
  newSessionToken,
  verifySessionToken,
} from "@/lib/supabase";
import { hashPasswordStrong, verifyPassword } from "@/lib/patient-profile";

/**
 * طبقة المصادقة المشتركة فوق Supabase لمشروع Afiyati.
 * تتجاوز التخزين المحلي للحسابات وتجعل المريض والشريك والإدارة يتشاركون
 * الحسابات والطلبات في قاعدة بيانات واحدة.
 */
const SESSION_TOKEN_LOCAL_KEY = "tabibi.supabase-token.v1";

/** حفظ/قراءة رمز الجلسة محليًا بعد إصداره من Supabase. */
export async function storeSupabaseToken(token: string | null): Promise<void> {
  if (Platform.OS === "web") {
    if (token === null) {
      window.localStorage.removeItem(SESSION_TOKEN_LOCAL_KEY);
    } else {
      window.localStorage.setItem(SESSION_TOKEN_LOCAL_KEY, token);
    }
    return;
  }
  if (token === null) {
    await AsyncStorage.removeItem(SESSION_TOKEN_LOCAL_KEY);
    return;
  }
  await AsyncStorage.setItem(SESSION_TOKEN_LOCAL_KEY, token);
}

export async function readSupabaseToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return window.localStorage.getItem(SESSION_TOKEN_LOCAL_KEY);
  }
  return await AsyncStorage.getItem(SESSION_TOKEN_LOCAL_KEY);
}

export type AuthState = { user: TabibiUser; token: string } | null;

export async function getAuthState(): Promise<AuthState> {
  const token = await readSupabaseToken();
  if (!token) return null;
  const user = await verifySessionToken(token);
  if (!user) {
    await storeSupabaseToken(null);
    return null;
  }
  return { user, token };
}

export async function signOut(): Promise<void> {
  const token = await readSupabaseToken();
  if (token) {
    try {
      await deleteSessionToken(token);
    } catch {
      // تجاهل أخطاء الحذف في Supabase عند تسجيل الخروج.
    }
  }
  await storeSupabaseToken(null);
}

/** تسجيل الدخول: رقم الهاتف + كلمة المرور، مع دعم ترقية الهاش القديم. */
export async function signInWithPhone(
  phone: string,
  password: string,
): Promise<{ user: TabibiUser; token: string } | { error: string }> {
  try {
    const user = await findUserByPhone(phone);
    if (!user) return { error: "الحساب غير موجود في هذه الخدمة؛ جرّب إنشاء حساب جديد." };
    if (user.status === "pending") return { error: "حسابك قيد مراجعة الإدارة، سيتم تفعيله قريبًا." };
    if (user.status !== "active") return { error: "الحساب غير نشط حاليًا. تواصل مع الإدارة." };
    const ok = await verifyPassword(user.password_hash as unknown, password);
    if (!ok) return { error: "كلمة المرور غير صحيحة. تحقق منها وحاول مرة أخرى." };
    const token = newSessionToken();
    await createTabibiSession({ id: user.id, role: user.role }, token);
    await storeSupabaseToken(token);
    return { user, token };
  } catch (error) {
    console.error("[supabase-auth] signIn failed:", error);
    return { error: "تعذر الاتصال بخدمة المصادقة؛ تحقق من اتصالك بالإنترنت." };
  }
}

/** إنشاء حساب جديد مشترك عبر التطبيقات الثلاثة. */
export async function registerWithPhone(input: {
  fullName: string;
  phone: string;
  password: string;
  role: "patient" | "provider";
  metadata?: Record<string, unknown>;
}): Promise<{ user: TabibiUser; token: string } | { error: string }> {
  try {
    const existing = await findUserByPhone(input.phone);
    if (existing) return { error: "هذا الرقم مسجل مسبقًا؛ سجّل الدخول مباشرة." };
    const password_hash = await hashPasswordStrong(input.password);
    const user = await createTabibiUser({
      phone: input.phone,
      role: input.role,
      display_name: input.fullName.trim(),
      password_hash,
      metadata: input.metadata ?? {},
    });
    const token = newSessionToken();
    await createTabibiSession({ id: user.id, role: user.role }, token);
    await storeSupabaseToken(token);
    return { user, token };
  } catch (error) {
    console.error("[supabase-auth] register failed:", error);
    return { error: "تعذر إنشاء الحساب؛ تحقق من اتصالك بالإنترنت." };
  }
}

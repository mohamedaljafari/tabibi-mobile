/**
 * نظام اقتراح المدن الجديدة.
 * يتيح للمستخدمين اقتراح مدن غير مفعّلة للتوسع إليها، وتخزين الاقتراحات
 * محليًا في AsyncStorage ليُراجِعها مدير النظام من لوحة التحكم.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "tabibi_city_suggestions_v1";

export interface CitySuggestion {
  id: string;
  cityName: string;
  reason: string;
  suggestedAt: string; // ISO timestamp
  status: "pending" | "reviewed";
}

let memoryCache: CitySuggestion[] | null = null;

function bump(): void {
  memoryCache = null;
}

export async function readCitySuggestions(): Promise<CitySuggestion[]> {
  if (memoryCache) return memoryCache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    memoryCache = raw ? (JSON.parse(raw) as CitySuggestion[]) : [];
  } catch {
    memoryCache = [];
  }
  return memoryCache;
}

export async function addCitySuggestion(cityName: string, reason: string): Promise<CitySuggestion> {
  const suggestion: CitySuggestion = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    cityName: cityName.trim(),
    reason: reason.trim(),
    suggestedAt: new Date().toISOString(),
    status: "pending",
  };
  const existing = await readCitySuggestions();
  const next = [suggestion, ...existing];
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  bump();
  return suggestion;
}

export async function markCitySuggestionReviewed(id: string, reviewed: boolean): Promise<void> {
  const existing = await readCitySuggestions();
  const next = existing.map((s) => (s.id === id ? { ...s, status: reviewed ? "reviewed" as const : "pending" as const } : s));
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  bump();
}

export async function removeCitySuggestion(id: string): Promise<void> {
  const existing = await readCitySuggestions();
  const next = existing.filter((s) => s.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  bump();
}

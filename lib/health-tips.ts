import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ComponentProps } from "react";
import type MaterialIcons from "@expo/vector-icons/MaterialIcons";

export type HealthTip = {
  id: string;
  title: string;
  body: string;
  icon: ComponentProps<typeof MaterialIcons>["name"];
  accent: string;
  accentSoft: string;
  enabled: boolean;
  createdAt: number;
};

const HEALTH_TIPS_KEY = "tabibi_health_tips";

const DEFAULT_TIPS: HealthTip[] = [
  {
    id: "tip-hydration",
    title: "اشرب الماء بانتظام",
    body: "يُنصح بشرب ما لا يقل عن 8 أكواب من الماء يوميًا، خاصة في الأجواء الحارة.",
    icon: "water-drop",
    accent: "#3B82A6",
    accentSoft: "#EAF3F7",
    enabled: true,
    createdAt: Date.now(),
  },
  {
    id: "tip-blood-pressure",
    title: "راقب ضغطك الدم",
    body: "إذا كان لديك تاريخ عائلي بأمراض الضغط، قس ضغطك أسبوعيًا وسجّل النتائج.",
    icon: "monitor-heart",
    accent: "#A65E67",
    accentSoft: "#F8ECEE",
    enabled: true,
    createdAt: Date.now() + 1,
  },
  {
    id: "tip-walk",
    title: "المشي اليومي",
    body: "30 دقيقة مشي يوميًا تحسّن صحة القلب والمفاصل وتقلل التوتر.",
    icon: "directions-walk",
    accent: "#6B7B3F",
    accentSoft: "#F0F3EA",
    enabled: true,
    createdAt: Date.now() + 2,
  },
  {
    id: "tip-medicines",
    title: "نظّم أدويتك",
    body: "استخدم جدولًا يوميًا لأدويتك، ولا تغيّر الجرعة دون استشارة طبيبك.",
    icon: "medication",
    accent: "#8F7D98",
    accentSoft: "#F2EDF4",
    enabled: true,
    createdAt: Date.now() + 3,
  },
  {
    id: "tip-sleep",
    title: "نوم كافٍ",
    body: "7 إلى 8 ساعات نوم يوميًا تدعم المناعة وتحسّن الذاكرة والتركيز.",
    icon: "bedtime",
    accent: "#5B8CA3",
    accentSoft: "#EAF3F7",
    enabled: true,
    createdAt: Date.now() + 4,
  },
  {
    id: "tip-checkup",
    title: "فحوصات دورية",
    body: "أجرِ الفحوصات المخبرية الدورية سنويًا لاكتشاف أي مشكلة مبكرًا.",
    icon: "science",
    accent: "#B97E52",
    accentSoft: "#FBEEE7",
    enabled: true,
    createdAt: Date.now() + 5,
  },
];

export async function readHealthTips(): Promise<HealthTip[]> {
  try {
    const raw = await AsyncStorage.getItem(HEALTH_TIPS_KEY);
    if (!raw) return DEFAULT_TIPS;
    const parsed = JSON.parse(raw) as HealthTip[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_TIPS;
    return parsed;
  } catch {
    return DEFAULT_TIPS;
  }
}

export async function updateHealthTips(tips: HealthTip[]): Promise<HealthTip[]> {
  await AsyncStorage.setItem(HEALTH_TIPS_KEY, JSON.stringify(tips));
  return tips;
}

export function addHealthTip(input: Omit<HealthTip, "id" | "createdAt" | "enabled">): HealthTip {
  return {
    ...input,
    id: `tip-${Date.now()}`,
    enabled: true,
    createdAt: Date.now(),
  };
}

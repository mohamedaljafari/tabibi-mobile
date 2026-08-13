import type { ComponentProps } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export type MentalHealthSpecialty = {
  id: string;
  title: string;
  icon: ComponentProps<typeof MaterialIcons>["name"];
  tint: string;
  surface: string;
};

export type MentalHealthSort = "nearest" | "rating" | "price-high" | "price-low";

export type DemoMentalHealthProvider = {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  price: number;
  distanceKm: number;
  initials: string;
};

export const MENTAL_HEALTH_SPECIALTIES: MentalHealthSpecialty[] = [
  { id: "general-therapy", title: "العلاج النفسي العام", icon: "psychology", tint: "#8F7D98", surface: "#F2EDF4" },
  { id: "anxiety-depression", title: "القلق والاكتئاب", icon: "sentiment-satisfied", tint: "#B07381", surface: "#FAEDF0" },
  { id: "children-adolescents", title: "الأطفال والمراهقون", icon: "child-care", tint: "#5B8CA3", surface: "#EAF3F7" },
  { id: "cbt", title: "العلاج السلوكي المعرفي", icon: "lightbulb", tint: "#BD8A4D", surface: "#FBF2E2" },
  { id: "family-couples", title: "الإرشاد الأسري والزوجي", icon: "people", tint: "#72895F", surface: "#F0F4EB" },
  { id: "addiction", title: "الإدمان والتعافي", icon: "healing", tint: "#4F91A3", surface: "#E7F4F6" },
  { id: "trauma", title: "الصدمات النفسية", icon: "favorite-border", tint: "#B35F62", surface: "#F9ECEC" },
  { id: "older-adults", title: "كبار السن", icon: "elderly", tint: "#7B8A62", surface: "#F0F3EA" },
  { id: "perinatal", title: "حول الولادة", icon: "pregnant-woman", tint: "#B37483", surface: "#FAEDF0" },
  { id: "neuropsychology", title: "علم النفس العصبي", icon: "memory", tint: "#627F9D", surface: "#EBF1F6" },
  { id: "group-support", title: "الدعم النفسي الجماعي", icon: "groups", tint: "#887692", surface: "#F1EDF4" },
];

const DEMO_PROVIDERS: DemoMentalHealthProvider[] = [
  { id: "mental-1", name: "الأخصائية ليلى صادق", rating: 4.9, reviewCount: 112, price: 230, distanceKm: 1.7, initials: "لص" },
  { id: "mental-2", name: "الأخصائي مازن رائد", rating: 4.8, reviewCount: 85, price: 200, distanceKm: 2.6, initials: "مر" },
  { id: "mental-3", name: "الأخصائية ندى حسان", rating: 4.7, reviewCount: 69, price: 180, distanceKm: 4.0, initials: "نح" },
  { id: "mental-4", name: "الأخصائي سامر ناصر", rating: 4.6, reviewCount: 43, price: 270, distanceKm: 5.4, initials: "سن" },
];

export const MENTAL_HEALTH_SORT_LABELS: Record<MentalHealthSort, string> = {
  nearest: "الأقرب إليك",
  rating: "الأعلى تقييمًا",
  "price-high": "الأعلى سعرًا",
  "price-low": "الأقل سعرًا",
};

export function getMentalHealthSpecialty(id?: string) {
  return MENTAL_HEALTH_SPECIALTIES.find((specialty) => specialty.id === id) ?? MENTAL_HEALTH_SPECIALTIES[0];
}

export function getMentalHealthProvidersForSpecialty(_specialtyId: string, sort: MentalHealthSort) {
  const providers = [...DEMO_PROVIDERS];
  if (sort === "rating") return providers.sort((a, b) => b.rating - a.rating);
  if (sort === "price-high") return providers.sort((a, b) => b.price - a.price);
  if (sort === "price-low") return providers.sort((a, b) => a.price - b.price);
  return providers.sort((a, b) => a.distanceKm - b.distanceKm);
}

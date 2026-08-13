import type { ComponentProps } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export type DoctorSpecialty = {
  id: string;
  title: string;
  icon: ComponentProps<typeof MaterialIcons>["name"];
  tint: string;
  surface: string;
};

export type DoctorSort = "nearest" | "rating" | "price-high" | "price-low";

export type DemoDoctor = {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  price: number;
  distanceKm: number;
  initials: string;
};

export const DOCTOR_SPECIALTIES: DoctorSpecialty[] = [
  { id: "general", title: "طبيب عام", icon: "medical-services", tint: "#6B7B3F", surface: "#EFF2E6" },
  { id: "pediatrics", title: "طبيب أطفال", icon: "child-care", tint: "#5B8CA3", surface: "#EAF3F7" },
  { id: "obgyn", title: "نساء وولادة", icon: "pregnant-woman", tint: "#B37483", surface: "#FAEDF0" },
  { id: "internal", title: "طبيب باطنة", icon: "local-hospital", tint: "#737B9B", surface: "#EEF0F7" },
  { id: "surgery", title: "جراحة عامة", icon: "content-cut", tint: "#9A6D58", surface: "#F7EEE9" },
  { id: "cardiology", title: "قلب", icon: "favorite", tint: "#B35F62", surface: "#F9ECEC" },
  { id: "dermatology", title: "جلدية", icon: "face", tint: "#BE895A", surface: "#FBF0E5" },
  { id: "orthopedics", title: "عظام", icon: "accessibility-new", tint: "#688B8A", surface: "#EAF4F3" },
  { id: "ent", title: "أنف وأذن وحنجرة", icon: "hearing", tint: "#72895F", surface: "#F0F4EB" },
  { id: "ophthalmology", title: "عيون", icon: "visibility", tint: "#627F9D", surface: "#EBF1F6" },
  { id: "urology", title: "مسالك بولية", icon: "water-drop", tint: "#4F91A3", surface: "#E7F4F6" },
  { id: "neurology", title: "أعصاب", icon: "psychology", tint: "#887692", surface: "#F1EDF4" },
];

const DEMO_DOCTORS: DemoDoctor[] = [
  { id: "demo-1", name: "د. سارة محمود", rating: 4.9, reviewCount: 128, price: 260, distanceKm: 1.2, initials: "سم" },
  { id: "demo-2", name: "د. أحمد رائد", rating: 4.8, reviewCount: 96, price: 210, distanceKm: 2.8, initials: "أر" },
  { id: "demo-3", name: "د. نور حسان", rating: 4.7, reviewCount: 74, price: 180, distanceKm: 4.1, initials: "نح" },
  { id: "demo-4", name: "د. عمر ناصر", rating: 4.6, reviewCount: 51, price: 320, distanceKm: 5.6, initials: "عن" },
];

export function getDoctorSpecialty(id?: string) {
  return DOCTOR_SPECIALTIES.find((specialty) => specialty.id === id) ?? DOCTOR_SPECIALTIES[0];
}

export function getDoctorsForSpecialty(_specialtyId: string, sort: DoctorSort) {
  const doctors = [...DEMO_DOCTORS];
  if (sort === "rating") return doctors.sort((a, b) => b.rating - a.rating);
  if (sort === "price-high") return doctors.sort((a, b) => b.price - a.price);
  if (sort === "price-low") return doctors.sort((a, b) => a.price - b.price);
  return doctors.sort((a, b) => a.distanceKm - b.distanceKm);
}

export const SORT_LABELS: Record<DoctorSort, string> = {
  nearest: "الأقرب إليك",
  rating: "الأعلى تقييمًا",
  "price-high": "الأعلى سعرًا",
  "price-low": "الأقل سعرًا",
};

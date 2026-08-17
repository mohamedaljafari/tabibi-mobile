import type { ComponentProps } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export type AssistedServiceSort = "nearest" | "rating" | "price-high" | "price-low";

export type AssistedService = {
  id: "elderly-care" | "physical-therapy" | "nursing";
  title: string;
  singularProviderLabel: string;
  icon: ComponentProps<typeof MaterialIcons>["name"];
  tint: string;
  surface: string;
};

export type AssistedServiceProvider = {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  price: number;
  distanceKm: number;
  initials: string;
};

export const ASSISTED_SERVICES: AssistedService[] = [
  { id: "elderly-care", title: "رعاية كبار السن", singularProviderLabel: "مقدم رعاية", icon: "elderly", tint: "#7B8A62", surface: "#F0F3EA" },
  { id: "nursing", title: "التمريض المنزلي", singularProviderLabel: "ممرض", icon: "local-hospital", tint: "#627F9D", surface: "#EBF1F6" },
  { id: "physical-therapy", title: "العلاج الطبيعي", singularProviderLabel: "أخصائي علاج طبيعي", icon: "accessibility-new", tint: "#628C8B", surface: "#E8F3F2" },
];

const PROVIDERS: Record<AssistedService["id"], AssistedServiceProvider[]> = {
  "elderly-care": [
    { id: "elderly-1", name: "الأخصائية هناء عادل", rating: 4.9, reviewCount: 118, price: 210, distanceKm: 1.4, initials: "هع" },
    { id: "elderly-2", name: "الأخصائي رائد سالم", rating: 4.8, reviewCount: 91, price: 190, distanceKm: 2.5, initials: "رس" },
    { id: "elderly-3", name: "الأخصائية ريم ناصر", rating: 4.7, reviewCount: 63, price: 180, distanceKm: 3.9, initials: "رن" },
    { id: "elderly-4", name: "الأخصائي نبيل حسن", rating: 4.6, reviewCount: 47, price: 240, distanceKm: 5.2, initials: "نح" },
  ],
  "physical-therapy": [
    { id: "therapy-1", name: "الأخصائي طارق عادل", rating: 4.9, reviewCount: 106, price: 250, distanceKm: 1.8, initials: "طع" },
    { id: "therapy-2", name: "الأخصائية دانا فهد", rating: 4.8, reviewCount: 83, price: 220, distanceKm: 2.7, initials: "دف" },
    { id: "therapy-3", name: "الأخصائي فهد ناصر", rating: 4.7, reviewCount: 59, price: 200, distanceKm: 4.3, initials: "فن" },
    { id: "therapy-4", name: "الأخصائية سمر علي", rating: 4.6, reviewCount: 42, price: 280, distanceKm: 5.5, initials: "سع" },
  ],
  nursing: [
    { id: "nursing-1", name: "الممرضة هالة عبد السلام", rating: 4.9, reviewCount: 132, price: 150, distanceKm: 1.2, initials: "هع" },
    { id: "nursing-2", name: "الممرض يوسف الفيتوري", rating: 4.8, reviewCount: 97, price: 140, distanceKm: 2.4, initials: "يغ" },
    { id: "nursing-3", name: "الممرضة نجلاء الصادق", rating: 4.7, reviewCount: 66, price: 130, distanceKm: 3.8, initials: "نص" },
    { id: "nursing-4", name: "الممرض خالد المبروك", rating: 4.6, reviewCount: 51, price: 160, distanceKm: 4.9, initials: "خم" },
  ],
};

export const ASSISTED_SERVICE_SORT_LABELS: Record<AssistedServiceSort, string> = {
  nearest: "الأقرب إليك",
  rating: "الأعلى تقييمًا",
  "price-high": "الأعلى سعرًا",
  "price-low": "الأقل سعرًا",
};

export function getAssistedService(id?: string) {
  return ASSISTED_SERVICES.find((service) => service.id === id) ?? ASSISTED_SERVICES[0];
}

export function getAssistedServiceProviders(serviceId: AssistedService["id"], sort: AssistedServiceSort) {
  const providers = [...PROVIDERS[serviceId]];
  if (sort === "rating") return providers.sort((a, b) => b.rating - a.rating);
  if (sort === "price-high") return providers.sort((a, b) => b.price - a.price);
  if (sort === "price-low") return providers.sort((a, b) => a.price - b.price);
  return providers.sort((a, b) => a.distanceKm - b.distanceKm);
}

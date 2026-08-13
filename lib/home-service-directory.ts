import type { ComponentProps } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export type HomeServiceId = "nutrition-health-beauty" | "veterinary";
export type HomeServiceSort = "nearest" | "rating" | "price-high" | "price-low";

export type HomeService = {
  id: HomeServiceId;
  title: string;
  providerType: string;
  icon: ComponentProps<typeof MaterialIcons>["name"];
  tint: string;
  surface: string;
};

export type HomeServiceProvider = {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  price: number;
  distanceKm: number;
  initials: string;
};

export const HOME_SERVICES: HomeService[] = [
  { id: "nutrition-health-beauty", title: "التغذية والصحة والجمال", providerType: "أخصائي تغذية", icon: "restaurant", tint: "#B97E52", surface: "#FBEEE7" },
  { id: "veterinary", title: "الطب البيطري", providerType: "طبيب بيطري", icon: "pets", tint: "#A07255", surface: "#F7EDE7" },
];

const PROVIDERS: Record<HomeServiceId, HomeServiceProvider[]> = {
  "nutrition-health-beauty": [
    { id: "nutrition-1", name: "أ. دينا سامر", rating: 4.9, reviewCount: 137, price: 190, distanceKm: 1.5, initials: "دس" },
    { id: "nutrition-2", name: "أ. رنا خالد", rating: 4.8, reviewCount: 102, price: 170, distanceKm: 2.6, initials: "رخ" },
    { id: "nutrition-3", name: "أ. شهد مازن", rating: 4.7, reviewCount: 78, price: 150, distanceKm: 3.8, initials: "شم" },
    { id: "nutrition-4", name: "أ. ريم عادل", rating: 4.6, reviewCount: 49, price: 230, distanceKm: 5.1, initials: "رع" },
  ],
  veterinary: [
    { id: "vet-1", name: "د. محمد فهد", rating: 4.9, reviewCount: 121, price: 240, distanceKm: 1.7, initials: "مف" },
    { id: "vet-2", name: "د. ليان حسن", rating: 4.8, reviewCount: 95, price: 210, distanceKm: 2.9, initials: "لح" },
    { id: "vet-3", name: "د. سامر ناصر", rating: 4.7, reviewCount: 66, price: 190, distanceKm: 4.2, initials: "سن" },
    { id: "vet-4", name: "د. هدى عادل", rating: 4.6, reviewCount: 44, price: 280, distanceKm: 5.4, initials: "هع" },
  ],
};

export const HOME_SERVICE_SORT_LABELS: Record<HomeServiceSort, string> = {
  nearest: "الأقرب إليك",
  rating: "الأعلى تقييمًا",
  "price-high": "الأعلى سعرًا",
  "price-low": "الأقل سعرًا",
};

export function getHomeService(id?: string) {
  return HOME_SERVICES.find((service) => service.id === id) ?? HOME_SERVICES[0];
}

export function getHomeServiceProviders(serviceId: HomeServiceId, sort: HomeServiceSort) {
  const providers = [...PROVIDERS[serviceId]];
  if (sort === "rating") return providers.sort((a, b) => b.rating - a.rating);
  if (sort === "price-high") return providers.sort((a, b) => b.price - a.price);
  if (sort === "price-low") return providers.sort((a, b) => a.price - b.price);
  return providers.sort((a, b) => a.distanceKm - b.distanceKm);
}

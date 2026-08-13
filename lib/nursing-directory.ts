export type NursingSort = "nearest" | "rating" | "price-high" | "price-low";

export type DemoNurse = {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  price: number;
  distanceKm: number;
  initials: string;
};

const DEMO_NURSES: DemoNurse[] = [
  { id: "nurse-1", name: "الممرضة سارة محمود", rating: 4.9, reviewCount: 117, price: 190, distanceKm: 1.5, initials: "سم" },
  { id: "nurse-2", name: "الممرض أحمد رائد", rating: 4.8, reviewCount: 89, price: 160, distanceKm: 2.3, initials: "أر" },
  { id: "nurse-3", name: "الممرضة نور حسان", rating: 4.7, reviewCount: 63, price: 220, distanceKm: 3.9, initials: "نح" },
  { id: "nurse-4", name: "الممرض عمر ناصر", rating: 4.6, reviewCount: 48, price: 145, distanceKm: 5.1, initials: "عن" },
];

export const NURSING_SORT_LABELS: Record<NursingSort, string> = {
  nearest: "الأقرب إليك",
  rating: "الأعلى تقييمًا",
  "price-high": "الأعلى سعرًا",
  "price-low": "الأقل سعرًا",
};

export function getNurses(sort: NursingSort) {
  const nurses = [...DEMO_NURSES];
  if (sort === "rating") return nurses.sort((a, b) => b.rating - a.rating);
  if (sort === "price-high") return nurses.sort((a, b) => b.price - a.price);
  if (sort === "price-low") return nurses.sort((a, b) => a.price - b.price);
  return nurses.sort((a, b) => a.distanceKm - b.distanceKm);
}

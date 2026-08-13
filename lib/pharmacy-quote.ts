export type PharmacySearchScope = "city" | "areas" | "distance";

export type PharmacyQuoteValidationInput = {
  medicines: string;
  hasPrescription: boolean;
  hasMedicinePhoto: boolean;
  addressId?: string;
  scope: PharmacySearchScope;
  city: string;
  selectedAreas: string[];
  distanceKm: string;
};

export type PharmacyQuoteValidation = {
  request?: string;
  address?: string;
  scope?: string;
};

export function validatePharmacyQuote(input: PharmacyQuoteValidationInput): PharmacyQuoteValidation {
  const errors: PharmacyQuoteValidation = {};
  const hasRequestDetails = input.medicines.trim().length > 0 || input.hasPrescription || input.hasMedicinePhoto;

  if (!hasRequestDetails) {
    errors.request = "أدخل اسم دواء واحد على الأقل أو أرفق وصفة أو صورة دواء.";
  }
  if (!input.addressId) {
    errors.address = "اختر موقعك الجغرافي لإرسال طلب عرض السعر.";
  }
  if (input.scope === "city" && !input.city.trim()) {
    errors.scope = "اختر المدينة التي تريد البحث فيها.";
  }
  if (input.scope === "areas" && input.selectedAreas.length === 0) {
    errors.scope = "اختر منطقة واحدة على الأقل ضمن نطاق البحث.";
  }
  if (input.scope === "distance" && (!Number.isFinite(Number(input.distanceKm)) || Number(input.distanceKm) <= 0)) {
    errors.scope = "أدخل مسافة صحيحة بالكيلومترات.";
  }

  return errors;
}

export function getPharmacyScopeSummary(input: Pick<PharmacyQuoteValidationInput, "scope" | "city" | "selectedAreas" | "distanceKm">) {
  if (input.scope === "city") return `المدينة كاملة: ${input.city}`;
  if (input.scope === "areas") return `المناطق: ${input.selectedAreas.join("، ")}`;
  return `المسافة: ${input.distanceKm} كم من موقعك`;
}

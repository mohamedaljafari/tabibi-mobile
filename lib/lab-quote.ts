export type LabSearchScope = "city" | "areas" | "distance";

export type LabQuoteValidationInput = {
  testsRequired: string;
  hasPrescription: boolean;
  hasTestPhoto: boolean;
  addressId?: string;
  scope: LabSearchScope;
  city: string;
  selectedAreas: string[];
  distanceKm: string;
};

export type LabQuoteValidation = {
  request?: string;
  address?: string;
  scope?: string;
};

export function validateLabQuote(input: LabQuoteValidationInput): LabQuoteValidation {
  const errors: LabQuoteValidation = {};
  const hasRequestDetails = input.testsRequired.trim().length > 0 || input.hasPrescription || input.hasTestPhoto;

  if (!hasRequestDetails) {
    errors.request = "أدخل اسم تحليل واحد على الأقل أو أرفق وصفة أو صورة تحليل.";
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

export function getLabScopeSummary(input: Pick<LabQuoteValidationInput, "scope" | "city" | "selectedAreas" | "distanceKm">) {
  if (input.scope === "city") return `المدينة كاملة: ${input.city}`;
  if (input.scope === "areas") return `المناطق: ${input.selectedAreas.join("، ")}`;
  return `المسافة: ${input.distanceKm} كم من موقعك`;
}

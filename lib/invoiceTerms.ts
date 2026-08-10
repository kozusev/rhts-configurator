/** Payment-term options offered when generating an invoice, per language. Index is passed in the URL. */
export const PAYMENT_TERMS: Record<string, string[]> = {
  en: [
    "100% upon order",
    "30% down-payment and 70% before shipping",
    "30% down-payment and 60% before shipping, 10% after installation",
  ],
  es: [
    "100% al realizar el pedido",
    "30% de anticipo y 70% antes del envío",
    "30% de anticipo, 60% antes del envío y 10% tras la instalación",
  ],
};

/** Resolve a payment-term option in the given language (falls back to English). */
export function paymentTerm(locale: string, idx: number): string {
  const arr = PAYMENT_TERMS[locale] || PAYMENT_TERMS.en;
  return arr[idx] || PAYMENT_TERMS.en[idx] || "";
}

export const DEFAULT_HS_CODE = "84.79.50.00";

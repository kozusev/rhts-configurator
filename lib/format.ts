import type { Locale } from "./i18n";

const localeMap: Record<string, string> = {
  en: "en-GB",
  es: "es-ES",
};

export function money(amount: number, currency = "EUR", locale: Locale = "en"): string {
  try {
    return new Intl.NumberFormat(localeMap[locale] || "en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  } catch {
    return `${Math.round(amount || 0)} ${currency}`;
  }
}

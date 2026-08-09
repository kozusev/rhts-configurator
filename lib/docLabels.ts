import { defaultLocale, type Locale } from "./i18n";

// Customer-facing strings for the PDF offer and the offer/discount emails, per active locale.
// (Internal admin emails stay in English.)
const D: Record<string, Record<string, string>> = {
  offer: { en: "OFFER", es: "OFERTA" },
  preparedFor: { en: "Prepared for", es: "Preparado para" },
  regVat: { en: "Reg./VAT", es: "Reg./IVA" },
  validity: { en: "Validity", es: "Validez" },
  validityBody: {
    en: "This offer is valid for {days} days from the date above.",
    es: "Esta oferta es válida durante {days} días desde la fecha indicada.",
  },
  configuration: { en: "Configuration", es: "Configuración" },
  delivery: { en: "Delivery", es: "Entrega" },
  millingPack: { en: "Milling pack", es: "Pack de fresado" },
  robot: { en: "Robot", es: "Robot" },
  subtotal: { en: "Subtotal", es: "Subtotal" },
  totalAfterDiscount: { en: "Total after discount", es: "Total con descuento" },
  estimatedTotal: { en: "Estimated total", es: "Total estimado" },
  customerNote: { en: "Customer note", es: "Nota del cliente" },
  // Emails
  dear: { en: "Dear", es: "Estimado/a" },
  offerIntro: {
    en: "Thank you for your interest. Please find your configuration and estimated offer below. The full offer is attached as a PDF (№ {n}).",
    es: "Gracias por su interés. A continuación encontrará su configuración y la oferta estimada. La oferta completa se adjunta en PDF (№ {n}).",
  },
  discountIntroBold: {
    en: "We're happy to inform you that we've applied a special discount to your offer!",
    es: "¡Nos complace informarle de que hemos aplicado un descuento especial a su oferta!",
  },
  discountIntroBody: {
    en: "Please find your updated configuration and revised total below — {label}: − {amount}. The full updated offer is attached as a PDF (№ {n}).",
    es: "A continuación encontrará su configuración actualizada y el total revisado — {label}: − {amount}. La oferta completa actualizada se adjunta en PDF (№ {n}).",
  },
  subjectOffer: { en: "Your RHTS offer {n}", es: "Su oferta RHTS {n}" },
  subjectDiscount: {
    en: "Good news — a discount on your RHTS offer {n}",
    es: "Buenas noticias — un descuento en su oferta RHTS {n}",
  },
};

/** Localized document label with optional {placeholder} substitution. Falls back to English. */
export function dl(key: keyof typeof D | string, locale: Locale, vars?: Record<string, string>): string {
  const entry = D[key as string];
  let s = entry ? entry[locale] || entry[defaultLocale] : String(key);
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(v);
  return s;
}

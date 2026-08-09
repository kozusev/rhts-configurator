import { LEAD_STATUSES, statusMeta } from "./leadStatus";

/**
 * Pure (no-DB) template metadata: action definitions, built-in default copy, placeholder
 * rendering and previews. Safe to import from client components (unlike lib/templates.ts,
 * which pulls in Prisma).
 */

export type TemplateActionKey = "offer" | "discount" | "admin_notify";
export type TemplateShape = { name: string; subject: string; body: string };

/** Offer-related actions (each email that carries the offer/PDF or notifies the admin). */
export const TEMPLATE_ACTIONS: { key: TemplateActionKey; label: string; hint: string }[] = [
  { key: "offer", label: "Standard offer", hint: "Default message when you resend an offer to the client." },
  { key: "discount", label: "Discount announcement", hint: "Pre-selected when the lead has a discount applied." },
  { key: "admin_notify", label: "Admin notification (internal)", hint: "Copy sent to the company/admin inbox — not the client." },
];

/** Lead statuses that get a customer-facing "order status" email template. */
export const STATUS_EMAIL_STATUSES = [
  "contacted",
  "production",
  "ready_for_shipping",
  "shipped",
  "delivered",
  "installation",
  "finished",
  "canceled",
] as const;

export const statusActionKey = (status: string) => `status:${status}`;
export const isStatusAction = (action: string) => action.startsWith("status:");
export const statusFromAction = (action: string) => (isStatusAction(action) ? action.slice("status:".length) : "");

/** Non-status, non-offer customer messages (e.g. payment receipt). */
export const OTHER_ACTIONS: { key: string; label: string }[] = [
  { key: "payment", label: "Payment received" },
];

export function actionLabel(action: string): string {
  if (!action) return "";
  if (isStatusAction(action)) return `${statusMeta(statusFromAction(action)).label} (status)`;
  const other = OTHER_ACTIONS.find((a) => a.key === action);
  if (other) return other.label;
  return TEMPLATE_ACTIONS.find((a) => a.key === action)?.label || "";
}

/** True if `action` is a valid, assignable action string. */
export function isValidTemplateAction(action: string): boolean {
  if (action === "" || action === "offer" || action === "discount" || action === "admin_notify") return true;
  if (OTHER_ACTIONS.some((a) => a.key === action)) return true;
  if (isStatusAction(action)) return (LEAD_STATUSES as readonly string[]).includes(statusFromAction(action));
  return false;
}

/** Grouped options for the "Use for action" <select> (rendered with <optgroup>). */
export const ACTION_OPTION_GROUPS: { label: string; options: { value: string; label: string }[] }[] = [
  { label: "Offer emails", options: TEMPLATE_ACTIONS.map((a) => ({ value: a.key, label: a.label })) },
  {
    label: "Order-status emails",
    options: STATUS_EMAIL_STATUSES.map((s) => ({ value: statusActionKey(s), label: statusMeta(s).label })),
  },
  { label: "Payments", options: OTHER_ACTIONS.map((a) => ({ value: a.key, label: a.label })) },
];

/** Placeholders the manager can drop into a subject/body. */
export const PLACEHOLDERS: { token: string; desc: string }[] = [
  { token: "{{firstName}}", desc: "Customer first name" },
  { token: "{{lastName}}", desc: "Customer last name" },
  { token: "{{fullName}}", desc: "Customer full name" },
  { token: "{{offerNumber}}", desc: "Offer number" },
  { token: "{{total}}", desc: "Offer total (formatted)" },
  { token: "{{subtotal}}", desc: "Total before discount" },
  { token: "{{discountLabel}}", desc: "Discount label (if any)" },
  { token: "{{discountAmount}}", desc: "Discount amount (if any)" },
  { token: "{{companyName}}", desc: "Your company name" },
  { token: "{{customerCompany}}", desc: "Customer's company" },
  { token: "{{phone}}", desc: "Customer phone" },
  { token: "{{email}}", desc: "Customer email" },
  { token: "{{validityDays}}", desc: "Offer validity (days)" },
  { token: "{{paid}}", desc: "Amount paid so far" },
  { token: "{{balance}}", desc: "Balance still due" },
];

/** Built-in offer templates — seeded to the DB and used as a fallback. */
export const DEFAULT_TEMPLATES: Record<TemplateActionKey, TemplateShape> = {
  offer: {
    name: "Standard offer",
    subject: "Your {{companyName}} offer {{offerNumber}}",
    body:
      "Dear {{fullName}},\n\n" +
      "Thank you for your interest. Please find your configuration and estimated offer below. " +
      "The full offer is attached as a PDF (№ {{offerNumber}}).\n\n" +
      "We will contact you shortly at {{phone}} or {{email}}.",
  },
  discount: {
    name: "Discount announcement",
    subject: "Good news — a discount on your {{companyName}} offer {{offerNumber}}",
    body:
      "Dear {{fullName}},\n\n" +
      "**We're happy to inform you that we've applied a special discount to your offer!**\n\n" +
      "Please find your updated configuration and revised total below — " +
      "**{{discountLabel}}: − {{discountAmount}}**. The full updated offer is attached as a PDF (№ {{offerNumber}}).",
  },
  admin_notify: {
    name: "Admin notification",
    subject: "New lead — {{fullName}} ({{offerNumber}})",
    body: "New offer request — {{offerNumber}}\n\n{{fullName}} — {{email}} · {{phone}}",
  },
};

/** Built-in order-status templates (one per customer-facing status). */
export const DEFAULT_STATUS_TEMPLATES: Record<string, TemplateShape> = {
  contacted: {
    name: "Enquiry received",
    subject: "We received your request — {{companyName}} offer {{offerNumber}}",
    body:
      "Dear {{fullName}},\n\n" +
      "Thank you for getting in touch. We've received your enquiry (offer № {{offerNumber}}) and our team is reviewing it. " +
      "We'll get back to you shortly.\n\n" +
      "If you have any questions in the meantime, just reply to this email.",
  },
  production: {
    name: "In production",
    subject: "Your order {{offerNumber}} is now in production",
    body:
      "Dear {{fullName}},\n\n" +
      "Great news — your order (№ {{offerNumber}}) has entered **production** and our team has started building your milling cell.\n\n" +
      "We'll let you know as soon as it's ready for shipping.",
  },
  ready_for_shipping: {
    name: "Ready for shipping",
    subject: "Your order {{offerNumber}} is ready for shipping",
    body:
      "Dear {{fullName}},\n\n" +
      "Your order (№ {{offerNumber}}) is now **ready for shipping**. We're preparing the dispatch and will share the details as soon as it's on its way.\n\n" +
      "Thank you for your patience.",
  },
  shipped: {
    name: "Order shipped",
    subject: "Your order {{offerNumber}} has shipped",
    body:
      "Dear {{fullName}},\n\n" +
      "Your order (№ {{offerNumber}}) has been **shipped** and is on its way to you.\n\n" +
      "We'll be in touch to arrange delivery and installation.",
  },
  delivered: {
    name: "Order delivered",
    subject: "Your order {{offerNumber}} has been delivered",
    body:
      "Dear {{fullName}},\n\n" +
      "We're pleased to confirm that your order (№ {{offerNumber}}) has been **delivered**.\n\n" +
      "Our team will contact you to schedule installation and commissioning.",
  },
  installation: {
    name: "Installation stage",
    subject: "Installation scheduled — order {{offerNumber}}",
    body:
      "Dear {{fullName}},\n\n" +
      "Your order (№ {{offerNumber}}) has reached the **installation** stage. Our engineers will set up and commission your milling cell on site.\n\n" +
      "We'll coordinate the exact date and time with you directly.",
  },
  finished: {
    name: "Order complete",
    subject: "Your order {{offerNumber}} is complete",
    body:
      "Dear {{fullName}},\n\n" +
      "Your order (№ {{offerNumber}}) is now **complete**. It's been a pleasure working with you.\n\n" +
      "If you ever need support or spare parts, we're always here to help. Thank you for choosing {{companyName}}.",
  },
  canceled: {
    name: "Order canceled",
    subject: "Your order {{offerNumber}} has been canceled",
    body:
      "Dear {{fullName}},\n\n" +
      "We're writing to confirm that your order (№ {{offerNumber}}) has been **canceled**.\n\n" +
      "If this was a mistake or you'd like to revisit the offer, just reply to this email and we'll be glad to help.",
  },
};

/** Built-in template for the "payment received" customer receipt. */
export const DEFAULT_PAYMENT_TEMPLATE: TemplateShape = {
  name: "Payment received",
  subject: "Payment received — order {{offerNumber}}",
  body:
    "Dear {{fullName}},\n\n" +
    "Thank you — we've received your payment for order № {{offerNumber}}.\n\n" +
    "**Paid so far: {{paid}}** · Balance due: {{balance}}.\n\n" +
    "We'll keep you updated as your order progresses.",
};

/** Replace every {{token}} in `text` with its value (unknown tokens become empty). */
export function renderTemplate(text: string, vars: Record<string, string>): string {
  return (text || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Turn a rendered plain-text body into email HTML:
 *   - blank line → new <p>
 *   - single newline → <br>
 *   - **bold** → <strong>
 */
export function bodyToHtml(text: string): string {
  const bold = (line: string) => escapeHtml(line).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return (text || "")
    .split(/\n{2,}/)
    .map((para) => `<p>${para.split(/\n/).map(bold).join("<br/>")}</p>`)
    .join("");
}

/** Sample values used to render a friendly preview of a template on the settings page. */
export const SAMPLE_VARS: Record<string, string> = {
  firstName: "John",
  lastName: "Smith",
  fullName: "John Smith",
  offerNumber: "RHTS-0001",
  total: "€120,000",
  subtotal: "€130,000",
  discountLabel: "Fair discount",
  discountAmount: "€10,000",
  companyName: "RHTS",
  customerCompany: "Acme Ltd",
  phone: "+1 555 0100",
  email: "john@acme.com",
  validityDays: "30",
  paid: "€40,000",
  balance: "€80,000",
};

/** One-line preview of a template body, with sample values filled in and markdown stripped. */
export function previewText(text: string, maxLen = 160): string {
  const filled = renderTemplate(text, SAMPLE_VARS)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return filled.length > maxLen ? filled.slice(0, maxLen - 1).trimEnd() + "…" : filled;
}

import { prisma } from "./db";
import { money } from "./format";
import type { OfferSnapshot } from "./offer";

/**
 * Email message templates.
 *
 * Each template has a `subject` + `body` written in plain text with {{placeholders}}
 * (see PLACEHOLDERS below). A template can be linked to an `action` so it is used
 * automatically for that outgoing email; at most one template holds a given action.
 *
 * The three actions map onto the emails the app can send:
 *   - "offer"        → the standard offer email to the customer
 *   - "discount"     → the "good news, here's a discount" email to the customer
 *   - "admin_notify" → the internal notification to the admin/company inbox
 */

export type TemplateActionKey = "offer" | "discount" | "admin_notify";

export const TEMPLATE_ACTIONS: { key: TemplateActionKey; label: string; hint: string }[] = [
  { key: "offer", label: "Standard offer", hint: "Default message when you resend an offer to the client." },
  { key: "discount", label: "Discount announcement", hint: "Pre-selected when the lead has a discount applied." },
  { key: "admin_notify", label: "Admin notification (internal)", hint: "Copy sent to the company/admin inbox — not the client." },
];

export function actionLabel(action: string): string {
  return TEMPLATE_ACTIONS.find((a) => a.key === action)?.label || "";
}

/** Placeholders the manager can drop into a subject/body. Shown as a hint in the UI. */
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
];

export type TemplateShape = { name: string; subject: string; body: string };

/** Built-in defaults — used to seed the DB on first visit and as a fallback if the table is empty. */
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

/** Build the {{placeholder}} → value map for a given offer snapshot. */
export function offerVars(s: OfferSnapshot): Record<string, string> {
  const cur = s.currency;
  const loc = s.locale;
  const hasDiscount = !!(s.discount && s.discount.amount > 0);
  return {
    firstName: s.customer.firstName || "",
    lastName: s.customer.lastName || "",
    fullName: `${s.customer.firstName || ""} ${s.customer.lastName || ""}`.trim(),
    offerNumber: s.offerNumber || "",
    total: money(s.total, cur, loc),
    subtotal: money(s.subtotal ?? s.total, cur, loc),
    discountLabel: hasDiscount ? s.discount!.label : "",
    discountAmount: hasDiscount ? money(s.discount!.amount, cur, loc) : "",
    companyName: s.company?.company_name || "RHTS",
    customerCompany: s.customer.company || "",
    phone: s.customer.phone || "",
    email: s.customer.email || "",
    validityDays: s.company?.offer_validity_days || "30",
  };
}

/** Replace every {{token}} in `text` with its value (unknown tokens become empty). */
export function renderTemplate(text: string, vars: Record<string, string>): string {
  return (text || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Turn a rendered plain-text body into email HTML:
 *   - blank line → new <p>
 *   - single newline → <br>
 *   - **bold** → <strong>
 */
export function bodyToHtml(text: string): string {
  const bold = (line: string) =>
    escapeHtml(line).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return (text || "")
    .split(/\n{2,}/)
    .map((para) => `<p>${para.split(/\n/).map(bold).join("<br/>")}</p>`)
    .join("");
}

/** A single "resolved" template ready to send: subject + body already rendered/known. */
export type ResolvedTemplate = { id: string | null; name: string; action: string; subject: string; body: string };

/**
 * Return the template assigned to an action, or the built-in default if none is assigned
 * (or the table doesn't exist yet, before `prisma db push`). Never throws.
 */
export async function getTemplateForAction(action: TemplateActionKey): Promise<TemplateShape> {
  try {
    const t = await prisma.messageTemplate.findFirst({ where: { action } });
    if (t) return { name: t.name, subject: t.subject, body: t.body };
  } catch {
    // table not migrated yet — fall back to defaults
  }
  return DEFAULT_TEMPLATES[action];
}

/**
 * List all templates for the manager to choose from. Falls back to the built-in defaults
 * when the table is empty or missing, so the resend popup always has something to offer.
 */
export async function listTemplatesSafe(): Promise<ResolvedTemplate[]> {
  try {
    const rows = await prisma.messageTemplate.findMany({ orderBy: { createdAt: "asc" } });
    if (rows.length) {
      return rows.map((t) => ({ id: t.id, name: t.name, action: t.action, subject: t.subject, body: t.body }));
    }
  } catch {
    // fall through to defaults
  }
  return (Object.keys(DEFAULT_TEMPLATES) as TemplateActionKey[]).map((k) => ({
    id: null,
    name: DEFAULT_TEMPLATES[k].name,
    action: k,
    subject: DEFAULT_TEMPLATES[k].subject,
    body: DEFAULT_TEMPLATES[k].body,
  }));
}

/**
 * Ensure the three built-in templates exist in the DB (called when the admin opens the
 * templates page). Returns the current list. If the table is missing, returns null so the
 * page can show a "run db push" notice instead of crashing.
 */
export async function ensureDefaultTemplates() {
  try {
    const count = await prisma.messageTemplate.count();
    if (count === 0) {
      for (const { key } of TEMPLATE_ACTIONS) {
        const d = DEFAULT_TEMPLATES[key];
        await prisma.messageTemplate.create({ data: { name: d.name, subject: d.subject, body: d.body, action: key } });
      }
    }
    return await prisma.messageTemplate.findMany({ orderBy: { createdAt: "asc" } });
  } catch {
    return null;
  }
}

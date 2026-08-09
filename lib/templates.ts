import { prisma } from "./db";
import { money } from "./format";
import type { OfferSnapshot } from "./offer";
import {
  TEMPLATE_ACTIONS,
  STATUS_EMAIL_STATUSES,
  DEFAULT_TEMPLATES,
  DEFAULT_STATUS_TEMPLATES,
  DEFAULT_PAYMENT_TEMPLATE,
  statusActionKey,
  type TemplateActionKey,
  type TemplateShape,
} from "./templateMeta";

// Re-export the pure metadata so existing imports of "@/lib/templates" keep working.
export * from "./templateMeta";

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

export type ResolvedTemplate = { id: string | null; name: string; action: string; subject: string; body: string };

/**
 * Return the offer template assigned to an action, or the built-in default if none is
 * assigned (or the table doesn't exist yet, before `prisma db push`). Never throws.
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

/** Return the status template assigned to `status` (DB override or built-in default). */
export async function getTemplateForStatus(status: string): Promise<TemplateShape | null> {
  try {
    const t = await prisma.messageTemplate.findFirst({ where: { action: statusActionKey(status) } });
    if (t) return { name: t.name, subject: t.subject, body: t.body };
  } catch {
    // fall through to defaults
  }
  return DEFAULT_STATUS_TEMPLATES[status] || null;
}

/**
 * List all offer templates for the resend popup. Falls back to the built-in defaults when
 * the table is empty or missing, so the popup always has something to offer.
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
 * The full set of status templates (one per customer-facing status), using the DB row when
 * present and the built-in default otherwise. Always returns the complete list so the
 * "Notify customer" popup works even before the status templates are seeded.
 */
export async function listStatusTemplatesMerged(): Promise<ResolvedTemplate[]> {
  let byAction = new Map<string, { id: string; name: string; subject: string; body: string }>();
  try {
    const rows = await prisma.messageTemplate.findMany();
    byAction = new Map(rows.map((r) => [r.action, r]));
  } catch {
    // no table yet — all defaults
  }
  return STATUS_EMAIL_STATUSES.map((st) => {
    const action = statusActionKey(st);
    const r = byAction.get(action);
    const d = DEFAULT_STATUS_TEMPLATES[st];
    return {
      id: r?.id ?? null,
      name: r?.name ?? d.name,
      action,
      subject: r?.subject ?? d.subject,
      body: r?.body ?? d.body,
    };
  });
}

/**
 * Templates offered in the "Notify customer" popup: one per order status plus the
 * payment-received receipt. DB rows override the built-in defaults; the full set is always
 * returned so the popup works even before the templates are seeded.
 */
export async function listNotifyTemplatesMerged(): Promise<ResolvedTemplate[]> {
  const status = await listStatusTemplatesMerged();
  let paymentRow: { id: string; name: string; subject: string; body: string } | undefined;
  try {
    paymentRow = (await prisma.messageTemplate.findFirst({ where: { action: "payment" } })) || undefined;
  } catch {
    // no table yet — use default
  }
  const payment: ResolvedTemplate = {
    id: paymentRow?.id ?? null,
    name: paymentRow?.name ?? DEFAULT_PAYMENT_TEMPLATE.name,
    action: "payment",
    subject: paymentRow?.subject ?? DEFAULT_PAYMENT_TEMPLATE.subject,
    body: paymentRow?.body ?? DEFAULT_PAYMENT_TEMPLATE.body,
  };
  return [...status, payment];
}

/**
 * Ensure the built-in templates (offer group + one per status) exist in the DB. Called when
 * the admin opens the templates page; only creates the ones that are missing, so it works on
 * both a fresh DB and one that already has the offer templates. Returns the current list, or
 * null if the table is missing (so the page can show a "run db push" notice).
 */
export async function ensureDefaultTemplates() {
  try {
    const existing = await prisma.messageTemplate.findMany();
    const haveAction = new Set(existing.map((t) => t.action).filter(Boolean));
    const toCreate: (TemplateShape & { action: string })[] = [];

    for (const { key } of TEMPLATE_ACTIONS) {
      if (!haveAction.has(key)) toCreate.push({ ...DEFAULT_TEMPLATES[key], action: key });
    }
    for (const st of STATUS_EMAIL_STATUSES) {
      const action = statusActionKey(st);
      if (!haveAction.has(action)) toCreate.push({ ...DEFAULT_STATUS_TEMPLATES[st], action });
    }
    if (!haveAction.has("payment")) toCreate.push({ ...DEFAULT_PAYMENT_TEMPLATE, action: "payment" });
    for (const data of toCreate) {
      await prisma.messageTemplate.create({ data: { name: data.name, subject: data.subject, body: data.body, action: data.action } });
    }
    return await prisma.messageTemplate.findMany({ orderBy: { createdAt: "asc" } });
  } catch {
    return null;
  }
}

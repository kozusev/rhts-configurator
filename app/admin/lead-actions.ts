"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { renderOfferPdf } from "@/lib/pdf";
import { sendOfferEmails, sendCustomerMessage } from "@/lib/mail";
import type { OfferSnapshot } from "@/lib/offer";
import { LEAD_STATUSES } from "@/lib/leadStatus";
import { offerVars, renderTemplate, bodyToHtml, getTemplateForAction, getTemplateForStatus, STATUS_EMAIL_STATUSES } from "@/lib/templates";
import { money } from "@/lib/format";

async function actor(): Promise<string> {
  const me = await getSessionUser();
  if (!me) redirect("/admin/login");
  return me.email;
}

/**
 * Load a lead and enforce access rules:
 *  - Agents may only act on the leads they created.
 *  - Agents cannot modify a CLOSED lead (only admin/manager can).
 *  - `managerOnly` actions (discounts, payments) are blocked for agents entirely.
 */
async function ownedLead(
  id: string,
  opts?: { managerOnly?: boolean }
): Promise<{ lead: NonNullable<Awaited<ReturnType<typeof prisma.lead.findUnique>>>; author: string }> {
  const me = await getSessionUser();
  if (!me) redirect("/admin/login");
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) redirect("/admin");
  if (me.role === "AGENT") {
    if (lead.createdBy !== me.email) redirect("/admin");
    if (opts?.managerOnly) redirect(`/admin/leads/${id}?error=manageronly`);
    if (lead.status === "closed") redirect(`/admin/leads/${id}?error=closedlocked`);
  }
  return { lead, author: me.email };
}

/** Permanently delete a lead — ADMIN only. Cascades its activity log. */
export async function deleteLead(formData: FormData) {
  const me = await getSessionUser();
  if (!me) redirect("/admin/login");
  const id = String(formData.get("id") || "");
  if (me.role !== "ADMIN") redirect(`/admin/leads/${id}?error=forbidden`);

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) redirect("/admin");

  await prisma.lead.delete({ where: { id } }); // LeadEvent rows cascade
  revalidatePath("/admin");
  redirect("/admin?ok=leaddeleted");
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function logEvent(leadId: string, type: string, message: string, author: string) {
  await prisma.leadEvent.create({ data: { leadId, type, message, author } });
}

export async function setLeadStatus(formData: FormData) {
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  if (!LEAD_STATUSES.includes(status as any)) redirect(`/admin/leads/${id}`);

  const { lead, author } = await ownedLead(id);
  const changed = lead.status !== status;
  if (changed) {
    await prisma.lead.update({ where: { id }, data: { status, assignedTo: author } });
    await logEvent(id, "status", `Status: ${lead.status} → ${status}`, author);
  }
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin");
  // Offer to email the customer, but only for customer-facing stages that have a template.
  const notify = changed && (STATUS_EMAIL_STATUSES as readonly string[]).includes(status) ? "&notify=status" : "";
  redirect(`/admin/leads/${id}?ok=status${notify}`);
}

export async function addLeadNote(formData: FormData) {
  const id = String(formData.get("id") || "");
  const message = String(formData.get("note") || "").trim();
  if (!message) redirect(`/admin/leads/${id}`);

  const { author } = await ownedLead(id);
  await prisma.lead.update({ where: { id }, data: { assignedTo: author } });
  await logEvent(id, "note", message, author);
  revalidatePath(`/admin/leads/${id}`);
  redirect(`/admin/leads/${id}?ok=note`);
}

export async function applyLeadDiscount(formData: FormData) {
  const id = String(formData.get("id") || "");
  const type = String(formData.get("discount_type") || "percent");
  const value = parseFloat(String(formData.get("discount_value") || "0")) || 0;
  const customLabel = String(formData.get("discount_label") || "").trim();

  const { lead, author } = await ownedLead(id, { managerOnly: true });

  let snap: OfferSnapshot;
  try {
    snap = JSON.parse(lead.snapshot);
  } catch {
    redirect(`/admin/leads/${id}?error=corrupt`);
  }

  // Subtotal = original sum (fallback to stored total for legacy snapshots).
  const subtotal = round2((snap as any).subtotal ?? snap.total);
  let amount = type === "percent" ? (subtotal * value) / 100 : value;
  amount = round2(Math.min(Math.max(amount, 0), subtotal));

  const label = customLabel || (type === "percent" ? `Discount ${value}%` : "Discount");

  snap.subtotal = subtotal;
  snap.discount = amount > 0 ? { label, amount } : null;
  snap.total = round2(subtotal - amount);

  await prisma.lead.update({
    where: { id },
    data: {
      snapshot: JSON.stringify(snap),
      subtotal,
      discount: amount,
      total: snap.total,
      assignedTo: author,
      status: amount > 0 ? "discounted" : lead.status,
    },
  });

  const msg =
    amount > 0
      ? `Applied ${label} (−${amount} ${snap.currency}). New total ${snap.total} ${snap.currency}. Not sent yet.`
      : `Discount removed. Total ${snap.total} ${snap.currency}.`;
  await logEvent(id, "discount", msg, author);

  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin");
  // When a discount is applied, offer to resend the updated offer to the customer.
  redirect(`/admin/leads/${id}?ok=discount${amount > 0 ? "&notify=discount" : ""}`);
}

export async function setLeadDeadline(formData: FormData) {
  const id = String(formData.get("id") || "");
  const raw = String(formData.get("deadline") || "").trim();

  const { author } = await ownedLead(id);

  const deadline = raw ? new Date(raw) : null;
  if (raw && Number.isNaN(deadline!.getTime())) redirect(`/admin/leads/${id}?error=baddate`);

  await prisma.lead.update({ where: { id }, data: { deadline, assignedTo: author } });
  await logEvent(id, "deadline", deadline ? `Deadline set to ${raw}.` : "Deadline cleared.", author);
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin");
  redirect(`/admin/leads/${id}?ok=deadline`);
}

/** Record a client payment (down-payment / instalment). Increments the paid amount. */
export async function recordPayment(formData: FormData) {
  const id = String(formData.get("id") || "");
  const amount = round2(parseFloat(String(formData.get("amount") || "0")) || 0);

  const { lead, author } = await ownedLead(id, { managerOnly: true });
  if (amount === 0) redirect(`/admin/leads/${id}?error=badamount`);

  const paid = round2(Math.max(0, lead.paid + amount));
  const balance = round2(Math.max(0, lead.total - paid));

  await prisma.lead.update({ where: { id }, data: { paid, assignedTo: author } });
  const label = amount > 0 ? `Payment recorded: ${amount} ${lead.currency}` : `Payment adjusted: ${amount} ${lead.currency}`;
  await logEvent(id, "payment", `${label}. Paid ${paid} of ${lead.total} ${lead.currency} (balance ${balance}).`, author);
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin");
  // Offer to email a receipt to the customer for actual payments (not negative corrections).
  redirect(`/admin/leads/${id}?ok=payment${amount > 0 ? "&notify=payment" : ""}`);
}

/**
 * Manager-triggered: regenerate the PDF from the current offer and email it to the client.
 * The manager chooses which message to send in the "Resend offer" popup — either a saved
 * template or a one-off custom subject/body. Both may contain {{placeholders}}, filled from
 * the lead here. If none is supplied (e.g. JS disabled), we fall back to the template
 * assigned to the discount/offer action.
 */
export async function resendOffer(formData: FormData) {
  const id = String(formData.get("id") || "");

  const { lead, author } = await ownedLead(id);

  let snap: OfferSnapshot;
  try {
    snap = JSON.parse(lead.snapshot);
  } catch {
    redirect(`/admin/leads/${id}?error=corrupt`);
  }

  // Refresh company info so placeholders + the admin copy reach the current settings.
  snap.company = await getSettings();

  const hasDiscount = !!(snap.discount && snap.discount.amount > 0);
  const vars = offerVars(snap);

  // The chosen message from the popup (may be empty when submitted without JS).
  let subjectRaw = String(formData.get("subject") || "").trim();
  let bodyRaw = String(formData.get("body") || "").trim();
  const templateName = String(formData.get("templateName") || "").trim();
  if (!subjectRaw || !bodyRaw) {
    const fallback = await getTemplateForAction(hasDiscount ? "discount" : "offer");
    subjectRaw = subjectRaw || fallback.subject;
    bodyRaw = bodyRaw || fallback.body;
  }

  const customer = {
    subject: renderTemplate(subjectRaw, vars),
    introHtml: bodyToHtml(renderTemplate(bodyRaw, vars)),
  };

  // The internal admin notification uses its own assigned template.
  const adminTpl = await getTemplateForAction("admin_notify");
  const admin = {
    subject: renderTemplate(adminTpl.subject, vars),
    introHtml: bodyToHtml(renderTemplate(adminTpl.body, vars)),
  };

  const pdf = await renderOfferPdf(snap);
  const mail = await sendOfferEmails(snap, pdf, { customer, admin });

  await prisma.lead.update({
    where: { id },
    data: { emailStatus: mail.mode, assignedTo: author, snapshot: JSON.stringify(snap) },
  });
  const via = templateName ? ` using “${templateName}”` : " with a custom message";
  await logEvent(
    id,
    "email",
    mail.ok
      ? `Offer re-sent to ${snap.customer.email} (${mail.mode})${via}.`
      : `Email send FAILED to ${snap.customer.email}: ${mail.detail || "unknown error"}`,
    author
  );

  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin");
  redirect(`/admin/leads/${id}?${mail.ok ? "ok=resent" : "error=emailfailed"}`);
}

/**
 * Manager-triggered: email the customer an order-status update (no PDF, no pricing table).
 * The message comes from the popup — a status template or a one-off custom message, both
 * supporting {{placeholders}}. Nothing is sent automatically; this only runs on the button.
 */
export async function notifyLeadStatus(formData: FormData) {
  const id = String(formData.get("id") || "");

  const { lead, author } = await ownedLead(id);

  let snap: OfferSnapshot;
  try {
    snap = JSON.parse(lead.snapshot);
  } catch {
    redirect(`/admin/leads/${id}?error=corrupt`);
  }

  snap.company = await getSettings();
  // Include payment figures so the payment-received template can use {{paid}} / {{balance}}.
  const paidBalance = {
    paid: money(lead.paid, lead.currency, snap.locale),
    balance: money(Math.max(0, lead.total - lead.paid), lead.currency, snap.locale),
  };
  const vars = { ...offerVars(snap), ...paidBalance };

  let subjectRaw = String(formData.get("subject") || "").trim();
  let bodyRaw = String(formData.get("body") || "").trim();
  const templateName = String(formData.get("templateName") || "").trim();
  if (!subjectRaw || !bodyRaw) {
    const fallback = await getTemplateForStatus(lead.status);
    if (fallback) {
      subjectRaw = subjectRaw || fallback.subject;
      bodyRaw = bodyRaw || fallback.body;
    }
  }
  if (!subjectRaw || !bodyRaw) redirect(`/admin/leads/${id}?error=nomessage`);

  const mail = await sendCustomerMessage(snap, {
    subject: renderTemplate(subjectRaw, vars),
    bodyHtml: bodyToHtml(renderTemplate(bodyRaw, vars)),
  });

  // Note: we do NOT touch `emailStatus` here — that field tracks the offer email, not this note.
  await prisma.lead.update({ where: { id }, data: { assignedTo: author } });
  const via = templateName ? ` (“${templateName}”)` : " (custom message)";
  await logEvent(
    id,
    "email",
    mail.ok
      ? `Update emailed to ${snap.customer.email} (${mail.mode})${via}.`
      : `Customer email FAILED to ${snap.customer.email}: ${mail.detail || "unknown error"}`,
    author
  );

  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin");
  redirect(`/admin/leads/${id}?${mail.ok ? "ok=notified" : "error=emailfailed"}`);
}

/** Edit the customer details of a lead (also updated inside the stored offer snapshot). */
export async function updateLeadCustomer(formData: FormData) {
  const id = String(formData.get("id") || "");
  const { lead, author } = await ownedLead(id);

  const v = (k: string) => String(formData.get(k) || "").trim();
  const customer = {
    firstName: v("firstName"),
    lastName: v("lastName"),
    email: v("email"),
    phone: v("phone"),
    company: v("company"),
    deliveryAddress: v("deliveryAddress"),
    regNumber: v("regNumber"),
    note: v("note"),
  };
  if (!customer.firstName || !customer.lastName || !customer.email) {
    redirect(`/admin/leads/${id}?error=custinvalid`);
  }

  // Keep the offer snapshot's customer block in sync so the PDF/email reflect the edit.
  let snap: any = {};
  try { snap = JSON.parse(lead.snapshot); } catch {}
  if (snap && typeof snap === "object") snap.customer = { ...(snap.customer || {}), ...customer };

  await prisma.lead.update({
    where: { id },
    data: {
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      company: customer.company,
      deliveryAddress: customer.deliveryAddress,
      regNumber: customer.regNumber,
      assignedTo: author,
      snapshot: JSON.stringify(snap),
    },
  });
  await logEvent(id, "modified", `Customer details updated.`, author);
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin");
  redirect(`/admin/leads/${id}?ok=customer`);
}

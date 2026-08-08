"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { renderOfferPdf } from "@/lib/pdf";
import { sendOfferEmails } from "@/lib/mail";
import type { OfferSnapshot } from "@/lib/offer";
import { LEAD_STATUSES } from "@/lib/leadStatus";

async function actor(): Promise<string> {
  const me = await getSessionUser();
  if (!me) redirect("/admin/login");
  return me.email;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function logEvent(leadId: string, type: string, message: string, author: string) {
  await prisma.leadEvent.create({ data: { leadId, type, message, author } });
}

export async function setLeadStatus(formData: FormData) {
  const author = await actor();
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  if (!LEAD_STATUSES.includes(status as any)) redirect(`/admin/leads/${id}`);

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) redirect("/admin");
  if (lead.status !== status) {
    await prisma.lead.update({ where: { id }, data: { status, assignedTo: author } });
    await logEvent(id, "status", `Status: ${lead.status} → ${status}`, author);
  }
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin");
  redirect(`/admin/leads/${id}?ok=status`);
}

export async function addLeadNote(formData: FormData) {
  const author = await actor();
  const id = String(formData.get("id") || "");
  const message = String(formData.get("note") || "").trim();
  if (!message) redirect(`/admin/leads/${id}`);

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) redirect("/admin");
  await prisma.lead.update({ where: { id }, data: { assignedTo: author } });
  await logEvent(id, "note", message, author);
  revalidatePath(`/admin/leads/${id}`);
  redirect(`/admin/leads/${id}?ok=note`);
}

export async function applyLeadDiscount(formData: FormData) {
  const author = await actor();
  const id = String(formData.get("id") || "");
  const type = String(formData.get("discount_type") || "percent");
  const value = parseFloat(String(formData.get("discount_value") || "0")) || 0;
  const customLabel = String(formData.get("discount_label") || "").trim();

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) redirect("/admin");

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
  redirect(`/admin/leads/${id}?ok=discount`);
}

export async function setLeadDeadline(formData: FormData) {
  const author = await actor();
  const id = String(formData.get("id") || "");
  const raw = String(formData.get("deadline") || "").trim();

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) redirect("/admin");

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
  const author = await actor();
  const id = String(formData.get("id") || "");
  const amount = round2(parseFloat(String(formData.get("amount") || "0")) || 0);

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) redirect("/admin");
  if (amount === 0) redirect(`/admin/leads/${id}?error=badamount`);

  const paid = round2(Math.max(0, lead.paid + amount));
  const balance = round2(Math.max(0, lead.total - paid));

  await prisma.lead.update({ where: { id }, data: { paid, assignedTo: author } });
  const label = amount > 0 ? `Payment recorded: ${amount} ${lead.currency}` : `Payment adjusted: ${amount} ${lead.currency}`;
  await logEvent(id, "payment", `${label}. Paid ${paid} of ${lead.total} ${lead.currency} (balance ${balance}).`, author);
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin");
  redirect(`/admin/leads/${id}?ok=payment`);
}

/** Manager-triggered: regenerate the PDF from the current offer and email it to the client. */
export async function resendOffer(formData: FormData) {
  const author = await actor();
  const id = String(formData.get("id") || "");

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) redirect("/admin");

  let snap: OfferSnapshot;
  try {
    snap = JSON.parse(lead.snapshot);
  } catch {
    redirect(`/admin/leads/${id}?error=corrupt`);
  }

  // Refresh company info so the admin copy reaches the current admin_email.
  snap.company = await getSettings();

  const pdf = await renderOfferPdf(snap);
  const mail = await sendOfferEmails(snap, pdf);

  await prisma.lead.update({
    where: { id },
    data: { emailStatus: mail.mode, assignedTo: author, snapshot: JSON.stringify(snap) },
  });
  await logEvent(id, "email", `Offer re-sent to ${snap.customer.email} (${mail.mode}).`, author);

  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin");
  redirect(`/admin/leads/${id}?ok=resent`);
}

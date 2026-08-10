"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { isAuthenticated, getSessionUser, canEditContent } from "@/lib/auth";
import { ml, locales } from "@/lib/i18n";
import { isValidTemplateAction } from "@/lib/templateMeta";
import { BOM_PRODUCT_TYPES, type BomProductType } from "@/lib/bom";

function assertAuth() {
  if (!isAuthenticated()) redirect("/admin/login");
}

/** Catalog/project edits require an ADMIN or MANAGER (agents are blocked). */
async function assertContentEditor() {
  const me = await getSessionUser();
  if (!me) redirect("/admin/login");
  if (!canEditContent(me.role)) redirect("/admin");
}

/** Read the three localized inputs (name_en, name_es, name_uk) into a JSON string. */
function mlFrom(fd: FormData, base: string): string {
  const parts: Record<string, string> = {};
  for (const loc of locales) parts[loc] = String(fd.get(`${base}_${loc}`) || "");
  return ml(parts);
}
function num(fd: FormData, key: string, def = 0): number {
  const v = parseFloat(String(fd.get(key) ?? ""));
  return Number.isFinite(v) ? v : def;
}
function str(fd: FormData, key: string, def = ""): string {
  return String(fd.get(key) ?? def);
}
function bool(fd: FormData, key: string): boolean {
  return fd.get(key) === "on" || fd.get(key) === "true";
}

/** Append " (copy)" to each language value of a translatable JSON field. */
function mlCopy(json: string): string {
  try {
    const o = JSON.parse(json);
    if (o && typeof o === "object") {
      const out: Record<string, string> = {};
      for (const k of Object.keys(o)) out[k] = o[k] ? `${o[k]} (copy)` : o[k];
      return JSON.stringify(out);
    }
  } catch {}
  return json;
}

// ---------------- Packages ----------------
export async function savePackage(fd: FormData) {
  await assertContentEditor();
  const id = str(fd, "id");
  const data = {
    slug: str(fd, "slug"),
    name: mlFrom(fd, "name"),
    tagline: mlFrom(fd, "tagline"),
    description: mlFrom(fd, "description"),
    spindle: str(fd, "spindle"),
    power: str(fd, "power"),
    toolHolder: str(fd, "toolHolder"),
    basePrice: num(fd, "basePrice"),
    currency: str(fd, "currency", "EUR"),
    image: str(fd, "image"),
    order: num(fd, "order"),
    published: bool(fd, "published"),
  };
  if (id) await prisma.package.update({ where: { id }, data });
  else await prisma.package.create({ data });
  revalidatePath("/admin/packages");
  redirect("/admin/packages");
}
export async function deletePackage(fd: FormData) {
  await assertContentEditor();
  await prisma.package.delete({ where: { id: str(fd, "id") } });
  revalidatePath("/admin/packages");
}
async function uniquePackageSlug(base: string): Promise<string> {
  let slug = `${base}-copy`;
  let i = 2;
  while (await prisma.package.findUnique({ where: { slug } })) slug = `${base}-copy-${i++}`;
  return slug;
}
export async function duplicatePackage(fd: FormData) {
  await assertContentEditor();
  const p = await prisma.package.findUnique({ where: { id: str(fd, "id") } });
  if (!p) return;
  await prisma.package.create({
    data: {
      slug: await uniquePackageSlug(p.slug),
      name: mlCopy(p.name),
      tagline: p.tagline,
      description: p.description,
      spindle: p.spindle,
      power: p.power,
      toolHolder: p.toolHolder,
      basePrice: p.basePrice,
      currency: p.currency,
      image: p.image,
      order: p.order + 1,
      published: p.published,
    },
  });
  revalidatePath("/admin/packages");
}

// ---------------- Robots ----------------
export async function saveRobot(fd: FormData) {
  await assertContentEditor();
  const id = str(fd, "id");
  const data = {
    brand: str(fd, "brand"),
    model: str(fd, "model"),
    condition: str(fd, "condition", "new") === "used" ? "used" : "new",
    year: Math.round(num(fd, "year")),
    armReach: Math.round(num(fd, "armReach")),
    payload: num(fd, "payload"),
    controller: str(fd, "controller"),
    price: num(fd, "price"),
    currency: str(fd, "currency", "EUR"),
    image: str(fd, "image"),
    description: mlFrom(fd, "description"),
    order: num(fd, "order"),
    published: bool(fd, "published"),
  };
  if (id) await prisma.robot.update({ where: { id }, data });
  else await prisma.robot.create({ data });
  revalidatePath("/admin/robots");
  redirect("/admin/robots");
}
export async function deleteRobot(fd: FormData) {
  await assertContentEditor();
  await prisma.robot.delete({ where: { id: str(fd, "id") } });
  revalidatePath("/admin/robots");
}
export async function duplicateRobot(fd: FormData) {
  await assertContentEditor();
  const r = await prisma.robot.findUnique({ where: { id: str(fd, "id") } });
  if (!r) return;
  await prisma.robot.create({
    data: {
      brand: r.brand,
      model: `${r.model} (copy)`,
      condition: r.condition,
      year: r.year,
      armReach: r.armReach,
      payload: r.payload,
      controller: r.controller,
      price: r.price,
      currency: r.currency,
      image: r.image,
      description: r.description,
      order: r.order + 1,
      published: r.published,
    },
  });
  revalidatePath("/admin/robots");
}

// ---------------- Bill of materials (internal cost lines) ----------------
/** Replace all BOM lines for a product (pack/robot/option) in one save. Admin/manager only. */
export async function saveBom(fd: FormData) {
  await assertContentEditor();
  const productType = str(fd, "productType");
  const productId = str(fd, "productId");
  const returnTo = str(fd, "returnTo", "/admin");
  if (!BOM_PRODUCT_TYPES.includes(productType as BomProductType) || !productId) return;

  let raw: unknown = [];
  try { raw = JSON.parse(str(fd, "lines", "[]")); } catch {}
  const lines = (Array.isArray(raw) ? raw : [])
    .map((l: any) => ({
      name: String(l?.name ?? "").trim(),
      qty: Number.isFinite(+l?.qty) ? +l.qty : 0,
      unitCost: Number.isFinite(+l?.unitCost) ? +l.unitCost : 0,
    }))
    .filter((l) => l.name !== "" || l.qty !== 0 || l.unitCost !== 0); // drop fully-empty rows

  // Replace-all: clear existing lines, then recreate from the submitted set.
  await prisma.$transaction([
    prisma.bomLine.deleteMany({ where: { productType, productId } }),
    ...(lines.length
      ? [prisma.bomLine.createMany({
          data: lines.map((l, i) => ({ productType, productId, name: l.name, qty: l.qty, unitCost: l.unitCost, order: i })),
        })]
      : []),
  ]);

  revalidatePath(returnTo);
}

// ---------------- Clients (CRM) ----------------
export async function saveClient(fd: FormData) {
  await assertContentEditor();
  const id = str(fd, "id");
  const data = {
    company: str(fd, "company"),
    country: str(fd, "country"),
    contactPerson: str(fd, "contactPerson"),
    email: str(fd, "email"),
    phone: str(fd, "phone"),
    locale: str(fd, "locale", "en"),
    hasVat: bool(fd, "hasVat"),
    vatNumber: str(fd, "vatNumber"),
    note: str(fd, "note"),
  };
  if (id) await prisma.client.update({ where: { id }, data });
  else await prisma.client.create({ data });
  revalidatePath("/admin/clients");
  redirect("/admin/clients");
}

export async function deleteClient(fd: FormData) {
  await assertContentEditor();
  const id = str(fd, "id");
  // Block deletion while the client still has linked leads.
  const count = await prisma.lead.count({ where: { clientId: id } });
  if (count > 0) redirect("/admin/clients?error=hasleads");
  await prisma.client.delete({ where: { id } });
  revalidatePath("/admin/clients");
  redirect("/admin/clients?ok=deleted");
}

/**
 * Merge several clients into one. The alphabetically-first selected client is kept; the
 * others' leads are re-pointed to it, its empty fields are filled from the others, and the
 * merged-away clients are deleted.
 */
export async function mergeClients(fd: FormData) {
  await assertContentEditor();
  const ids = fd.getAll("ids").map((v) => String(v)).filter(Boolean);
  if (ids.length < 2) redirect("/admin/clients?error=mergecount");

  const clients = await prisma.client.findMany({ where: { id: { in: ids } }, orderBy: { company: "asc" } });
  if (clients.length < 2) redirect("/admin/clients?error=mergecount");

  const primary = clients[0];
  const others = clients.slice(1);
  const otherIds = others.map((o) => o.id);

  // Fill any empty field on the primary from the others (first non-empty wins).
  const pick = (get: (c: (typeof clients)[number]) => string) =>
    get(primary) || others.map(get).find((v) => v) || "";
  const merged = {
    company: pick((c) => c.company),
    country: pick((c) => c.country),
    contactPerson: pick((c) => c.contactPerson),
    email: pick((c) => c.email),
    phone: pick((c) => c.phone),
    vatNumber: pick((c) => c.vatNumber),
    hasVat: clients.some((c) => c.hasVat),
    note: clients.map((c) => c.note).filter(Boolean).join("\n"),
  };

  await prisma.$transaction([
    prisma.lead.updateMany({ where: { clientId: { in: otherIds } }, data: { clientId: primary.id } }),
    prisma.client.update({ where: { id: primary.id }, data: merged }),
    prisma.client.deleteMany({ where: { id: { in: otherIds } } }),
  ]);

  revalidatePath("/admin/clients");
  revalidatePath("/admin");
  redirect("/admin/clients?ok=merged");
}

// ---------------- Option groups ----------------
export async function saveGroup(fd: FormData) {
  await assertContentEditor();
  const id = str(fd, "id");
  const data = {
    name: mlFrom(fd, "name"),
    description: mlFrom(fd, "description"),
    order: num(fd, "order"),
    published: bool(fd, "published"),
  };
  if (id) await prisma.optionGroup.update({ where: { id }, data });
  else await prisma.optionGroup.create({ data });
  revalidatePath("/admin/groups");
  redirect("/admin/groups");
}
export async function deleteGroup(fd: FormData) {
  await assertContentEditor();
  await prisma.optionGroup.delete({ where: { id: str(fd, "id") } });
  revalidatePath("/admin/groups");
}

// ---------------- Options ----------------
export async function saveOption(fd: FormData) {
  await assertContentEditor();
  const id = str(fd, "id");
  const groupId = str(fd, "groupId");
  const data = {
    groupId,
    name: mlFrom(fd, "name"),
    description: mlFrom(fd, "description"),
    price: num(fd, "price"),
    currency: str(fd, "currency", "EUR"),
    image: str(fd, "image"),
    order: num(fd, "order"),
    published: bool(fd, "published"),
  };
  if (id) await prisma.option.update({ where: { id }, data });
  else await prisma.option.create({ data });
  revalidatePath(`/admin/groups/${groupId}`);
  redirect(`/admin/groups/${groupId}`);
}
export async function deleteOption(fd: FormData) {
  await assertContentEditor();
  const groupId = str(fd, "groupId");
  await prisma.option.delete({ where: { id: str(fd, "id") } });
  revalidatePath(`/admin/groups/${groupId}`);
}
export async function duplicateOption(fd: FormData) {
  await assertContentEditor();
  const o = await prisma.option.findUnique({ where: { id: str(fd, "id") } });
  if (!o) return;
  await prisma.option.create({
    data: {
      groupId: o.groupId,
      name: mlCopy(o.name),
      description: o.description,
      price: o.price,
      currency: o.currency,
      image: o.image,
      order: o.order + 1,
      published: o.published,
    },
  });
  revalidatePath(`/admin/groups/${o.groupId}`);
}

// ---------------- Projects ----------------
export async function saveProject(fd: FormData) {
  await assertContentEditor();
  const id = str(fd, "id");
  const data = {
    title: mlFrom(fd, "title"),
    subtitle: mlFrom(fd, "subtitle"),
    image: str(fd, "image"),
    link: str(fd, "link"),
    order: num(fd, "order"),
    published: bool(fd, "published"),
  };
  if (id) await prisma.project.update({ where: { id }, data });
  else await prisma.project.create({ data });
  revalidatePath("/admin/projects");
  redirect("/admin/projects");
}
export async function deleteProject(fd: FormData) {
  await assertContentEditor();
  await prisma.project.delete({ where: { id: str(fd, "id") } });
  revalidatePath("/admin/projects");
}
export async function duplicateProject(fd: FormData) {
  await assertContentEditor();
  const p = await prisma.project.findUnique({ where: { id: str(fd, "id") } });
  if (!p) return;
  await prisma.project.create({
    data: {
      title: mlCopy(p.title),
      subtitle: p.subtitle,
      image: p.image,
      link: p.link,
      order: p.order + 1,
      published: p.published,
    },
  });
  revalidatePath("/admin/projects");
}

// ---------------- Settings ----------------
export async function saveSettings(fd: FormData) {
  const me = await getSessionUser();
  if (!me) redirect("/admin/login");
  if (me.role !== "ADMIN") redirect("/admin"); // settings are admin-only
  const keys = ["company_name", "admin_email", "company_email", "company_phone", "company_website", "offer_prefix", "offer_validity_days"];
  for (const k of keys) {
    const value = str(fd, k);
    await prisma.setting.upsert({ where: { key: k }, update: { value }, create: { key: k, value } });
  }
  // vat_note is multilingual
  const vat = mlFrom(fd, "vat_note");
  await prisma.setting.upsert({ where: { key: "vat_note" }, update: { value: vat }, create: { key: "vat_note", value: vat } });
  revalidatePath("/admin/settings");
  redirect("/admin/settings");
}

export async function saveInvoiceSettings(fd: FormData) {
  const me = await getSessionUser();
  if (!me) redirect("/admin/login");
  if (me.role !== "ADMIN") redirect("/admin"); // settings are admin-only
  // Invoice settings: two seller profiles (with-VAT / without-VAT), VAT rate, HS code, terms.
  const keys = [
    "inv_vat_rate", "inv_hs_code", "inv_terms",
    // With-VAT seller profile
    "inv_seller_company", "inv_seller_tax_id", "inv_seller_address", "inv_seller_phone", "inv_seller_email",
    "inv_bank_beneficiary", "inv_bank_iban", "inv_bank_swift", "inv_bank_intermediary_bic",
    "inv_bank_beneficiary_address", "inv_bank_name", "inv_bank_address",
    // Without-VAT seller profile
    "inv_novat_seller_company", "inv_novat_seller_tax_id", "inv_novat_seller_address", "inv_novat_seller_phone", "inv_novat_seller_email",
    "inv_novat_bank_beneficiary", "inv_novat_bank_iban", "inv_novat_bank_swift", "inv_novat_bank_intermediary_bic",
    "inv_novat_bank_beneficiary_address", "inv_novat_bank_name", "inv_novat_bank_address",
  ];
  for (const k of keys) {
    const value = str(fd, k);
    await prisma.setting.upsert({ where: { key: k }, update: { value }, create: { key: k, value } });
  }
  revalidatePath("/admin/settings/invoice");
  redirect("/admin/settings/invoice");
}

// ---------------- Message templates ----------------
async function assertAdmin() {
  const me = await getSessionUser();
  if (!me) redirect("/admin/login");
  if (me.role !== "ADMIN") redirect("/admin");
}

export async function saveMessageTemplate(fd: FormData) {
  await assertAdmin();
  const id = str(fd, "id");
  const action = isValidTemplateAction(str(fd, "action")) ? str(fd, "action") : "";
  const data = { name: str(fd, "name").trim() || "Untitled template", subject: str(fd, "subject"), body: str(fd, "body"), action };

  // At most one template per action: if this one claims an action, release it from any other.
  if (action) {
    await prisma.messageTemplate.updateMany({
      where: { action, ...(id ? { NOT: { id } } : {}) },
      data: { action: "" },
    });
  }

  if (id) await prisma.messageTemplate.update({ where: { id }, data });
  else await prisma.messageTemplate.create({ data });
  revalidatePath("/admin/settings/templates");
  redirect("/admin/settings/templates");
}

export async function deleteMessageTemplate(fd: FormData) {
  await assertAdmin();
  await prisma.messageTemplate.delete({ where: { id: str(fd, "id") } });
  revalidatePath("/admin/settings/templates");
  redirect("/admin/settings/templates");
}
// Note: lead status changes go through setLeadStatus() in lead-actions.ts, which records a
// "status" event in the activity log. There is intentionally no un-logged status updater here.

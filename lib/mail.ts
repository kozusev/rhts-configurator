import nodemailer from "nodemailer";
import { promises as fs } from "fs";
import path from "path";
import type { OfferSnapshot } from "./offer";
import { money } from "./format";
import { imageForDoc, logoDataUri } from "./images";

export type SendResult = { ok: boolean; mode: "sent" | "preview" | "failed"; detail?: string };

const RED = "#e4322b";
const DARK = "#17181b";

type EmailImages = { logo: string | null; pkg: string | null; robot: string | null; options: (string | null)[] };
type InlineAttachment = { cid: string; filename: string; content: Buffer; contentType: string };

/** Resolve the logo, pack, robot + every option image to data URIs (embeddable offline). */
async function resolveEmailImages(s: OfferSnapshot): Promise<EmailImages> {
  const [logo, pkg, robot, options] = await Promise.all([
    logoDataUri(),
    imageForDoc(s.package.image),
    s.robot ? imageForDoc(s.robot.image) : Promise.resolve(null),
    Promise.all(s.options.map((o) => imageForDoc(o.image))),
  ]);
  return { logo, pkg, robot, options };
}

function dataUriToAttachment(dataUri: string, cid: string): InlineAttachment | null {
  const m = dataUri.match(/^data:([^;]+);base64,([\s\S]*)$/);
  if (!m) return null;
  const ext = m[1].split("/")[1]?.split("+")[0] || "png";
  return { cid, filename: `${cid}.${ext}`, content: Buffer.from(m[2], "base64"), contentType: m[1] };
}

function thumb(src: string | null): string {
  if (!src) {
    return `<td width="60" style="padding:6px 10px 6px 0"><div style="width:48px;height:48px;border-radius:6px;background:#f1f5f9"></div></td>`;
  }
  return `<td width="60" style="padding:6px 10px 6px 0"><img src="${src}" width="48" height="48" alt="" style="width:48px;height:48px;border-radius:6px;object-fit:cover;border:1px solid #e2e8f0"/></td>`;
}

function lineRow(imgSrc: string | null, name: string, sub: string, price: string): string {
  return `<tr>
    ${thumb(imgSrc)}
    <td style="padding:6px 0;vertical-align:middle">
      <div style="font-weight:bold">${name}</div>
      ${sub ? `<div style="color:#64748b;font-size:12px;margin-top:2px">${sub}</div>` : ""}
    </td>
    <td align="right" style="padding:6px 0;vertical-align:middle;white-space:nowrap">${price}</td>
  </tr>`;
}

/** `img` maps a resolved data URI to the value used in the HTML (data URI or cid:). */
function offerEmailHtml(s: OfferSnapshot, imgs: EmailImages, img: (src: string | null) => string | null): string {
  const rows: string[] = [];
  rows.push(lineRow(img(imgs.pkg), `Milling pack — ${s.package.name}`, `${s.package.spindle} · ${s.package.toolHolder}`, money(s.package.price, s.currency, s.locale)));
  if (s.robot) rows.push(lineRow(img(imgs.robot), `Robot — ${s.robot.label}`, s.robot.specs, money(s.robot.price, s.currency, s.locale)));
  s.options.forEach((o, i) => {
    rows.push(lineRow(img(imgs.options[i]), o.label, o.sub || "", money(o.price, s.currency, s.locale)));
  });

  const hasDiscount = !!(s.discount && s.discount.amount > 0);
  const discountRows = hasDiscount
    ? `<tr><td></td><td align="right" style="color:#64748b;padding:6px 0">Subtotal</td><td align="right" style="color:#64748b;padding:6px 0">${money(s.subtotal, s.currency, s.locale)}</td></tr>
       <tr><td></td><td align="right" style="color:#15803d;font-weight:bold;padding:6px 0">${s.discount!.label}</td><td align="right" style="color:#15803d;font-weight:bold;padding:6px 0">− ${money(s.discount!.amount, s.currency, s.locale)}</td></tr>`
    : "";

  const logoSrc = img(imgs.logo);
  const header = logoSrc
    ? `<div style="background:${DARK};padding:16px 20px"><img src="${logoSrc}" alt="${s.company.company_name || "RHTS"}" style="height:34px"/></div>`
    : `<div style="background:${DARK};padding:16px 20px"><span style="color:#fff;font-size:18px;font-weight:bold">${s.company.company_name || "RHTS Milling Cells"}</span></div>`;

  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#1f2937">
    <div style="max-width:640px;margin:0 auto;background:#fff">
      ${header}
      <div style="height:4px;background:${RED}"></div>
      <div style="padding:24px">
        <p>Dear ${s.customer.firstName} ${s.customer.lastName},</p>
        <p>Thank you for your interest. Please find your configuration and estimated offer below. The full offer is attached as a PDF (№ <b>${s.offerNumber}</b>).</p>
        <table style="width:100%;border-collapse:collapse" cellpadding="0">
          <tbody>${rows.join("")}${discountRows}</tbody>
          <tfoot><tr style="border-top:2px solid ${RED}">
            <td></td>
            <td style="font-weight:bold;padding-top:10px">${hasDiscount ? "Total after discount" : "Estimated total"}</td>
            <td align="right" style="font-weight:bold;color:${RED};padding-top:10px">${money(s.total, s.currency, s.locale)}</td>
          </tr></tfoot>
        </table>
        <p style="color:#64748b;font-size:12px">${s.vatNote || ""}</p>
        <p>We will contact you shortly at ${s.customer.phone} or ${s.customer.email}.</p>
        <p style="color:#94a3b8;font-size:12px">${s.company.company_name || "RHTS"} · ${s.company.company_email || ""} · ${s.company.company_phone || ""}</p>
      </div>
    </div>
  </body></html>`;
}

function adminNotifyHtml(s: OfferSnapshot, imgs: EmailImages, img: (src: string | null) => string | null): string {
  const rows = [
    lineRow(img(imgs.pkg), `Milling pack — ${s.package.name}`, `${s.package.spindle} · ${s.package.toolHolder}`, money(s.package.price, s.currency, s.locale)),
    ...(s.robot ? [lineRow(img(imgs.robot), `Robot — ${s.robot.label}`, s.robot.specs, money(s.robot.price, s.currency, s.locale))] : []),
    ...s.options.map((o, i) => lineRow(img(imgs.options[i]), o.label, o.sub || "", money(o.price, s.currency, s.locale))),
  ].join("");

  const hasDiscount = !!(s.discount && s.discount.amount > 0);
  const discountLine = hasDiscount
    ? `<p style="color:#15803d">${s.discount!.label}: − ${money(s.discount!.amount, s.currency, s.locale)} (subtotal ${money(s.subtotal, s.currency, s.locale)})</p>`
    : "";

  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#1f2937">
    <h3 style="color:${RED}">New offer request — ${s.offerNumber}</h3>
    <p><b>${s.customer.firstName} ${s.customer.lastName}</b> ${s.customer.company ? "(" + s.customer.company + ")" : ""}<br/>
    ${s.customer.email} · ${s.customer.phone}</p>
    <table style="width:100%;max-width:600px;border-collapse:collapse"><tbody>${rows}</tbody></table>
    ${discountLine}
    <p style="margin-top:12px">Total: <b>${money(s.total, s.currency, s.locale)}</b></p>
    ${s.customer.note ? `<p>Note: ${s.customer.note}</p>` : ""}
  </body></html>`;
}

/** Build cid: attachments for every embeddable image and a mapper data-URI → cid:ref. */
function buildInlineAttachments(imgs: EmailImages) {
  const attachments: InlineAttachment[] = [];
  const map = new Map<string, string>();
  const add = (dataUri: string | null, key: string) => {
    if (!dataUri) return;
    if (map.has(dataUri)) return;
    const att = dataUriToAttachment(dataUri, key);
    if (att) {
      attachments.push(att);
      map.set(dataUri, `cid:${att.cid}`);
    }
  };
  add(imgs.logo, "logo");
  add(imgs.pkg, "pkg");
  add(imgs.robot, "robot");
  imgs.options.forEach((o, i) => add(o, `opt${i}`));
  const toCid = (src: string | null) => (src ? map.get(src) || null : null);
  return { attachments, toCid };
}

export async function sendOfferEmails(s: OfferSnapshot, pdf: Buffer): Promise<SendResult> {
  const adminEmail = s.company.admin_email || "";
  const from = process.env.SMTP_FROM || s.company.company_email || "no-reply@rhts.local";
  const host = process.env.SMTP_HOST;

  const imgs = await resolveEmailImages(s);
  const pdfAttachment = { filename: `Offer-${s.offerNumber}.pdf`, content: pdf };

  // Preview mode: no SMTP configured yet — save artifacts (data URIs inline so images render).
  if (!host) {
    const asData = (src: string | null) => src; // already a data URI
    try {
      const dir = path.join(process.cwd(), ".mail-preview");
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, `${s.offerNumber}.pdf`), pdf);
      await fs.writeFile(
        path.join(dir, `${s.offerNumber}.html`),
        `<h1>To customer: ${s.customer.email}</h1>${offerEmailHtml(s, imgs, asData)}<hr/><h1>To admin: ${adminEmail}</h1>${adminNotifyHtml(s, imgs, asData)}`
      );
      console.log(`[mail:preview] Offer ${s.offerNumber} → ${s.customer.email} (admin copy → ${adminEmail}). Saved to .mail-preview/`);
    } catch (e) {
      console.error("[mail:preview] failed to write preview", e);
    }
    return { ok: true, mode: "preview" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });

    // Inline images via CID so they render in Gmail/Outlook (data URIs are stripped there).
    const { attachments: inline, toCid } = buildInlineAttachments(imgs);
    const inlineAttachments = inline.map((a) => ({ ...a, cid: a.cid }));

    // Customer email (admin in BCC to receive a copy)
    await transporter.sendMail({
      from,
      to: s.customer.email,
      bcc: adminEmail || undefined,
      subject: `Your RHTS offer ${s.offerNumber}`,
      html: offerEmailHtml(s, imgs, toCid),
      attachments: [pdfAttachment, ...inlineAttachments],
    });

    // Separate admin notification with lead details
    if (adminEmail) {
      await transporter.sendMail({
        from,
        to: adminEmail,
        subject: `New lead — ${s.customer.firstName} ${s.customer.lastName} (${s.offerNumber})`,
        html: adminNotifyHtml(s, imgs, toCid),
        attachments: [pdfAttachment, ...inlineAttachments],
      });
    }

    return { ok: true, mode: "sent" };
  } catch (e) {
    console.error("[mail] send failed", e);
    return { ok: false, mode: "failed", detail: e instanceof Error ? e.message : String(e) };
  }
}

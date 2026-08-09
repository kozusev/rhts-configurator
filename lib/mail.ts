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
    s.package ? imageForDoc(s.package.image) : Promise.resolve(null),
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
function offerEmailHtml(
  s: OfferSnapshot,
  imgs: EmailImages,
  img: (src: string | null) => string | null,
  opts?: { discountIntro?: boolean; introHtml?: string }
): string {
  const rows: string[] = [];
  if (s.package) rows.push(lineRow(img(imgs.pkg), `Milling pack — ${s.package.name}`, `${s.package.spindle} · ${s.package.toolHolder}`, money(s.package.price, s.currency, s.locale)));
  if (s.robot) rows.push(lineRow(img(imgs.robot), `Robot — ${s.robot.label}`, s.robot.specs, money(s.robot.price, s.currency, s.locale)));
  s.options.forEach((o, i) => {
    const name = o.qty > 1 ? `${o.label} × ${o.qty}` : o.label;
    const sub = o.qty > 1 ? [o.sub, `${o.qty} × ${money(o.unitPrice, s.currency, s.locale)}`].filter(Boolean).join(" · ") : o.sub || "";
    rows.push(lineRow(img(imgs.options[i]), name, sub, money(o.price, s.currency, s.locale)));
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
        ${opts?.introHtml
          ? opts.introHtml
          : `<p>Dear ${s.customer.firstName} ${s.customer.lastName},</p>
             ${opts?.discountIntro && hasDiscount
               ? `<p><b>We're happy to inform you that we've applied a special discount to your offer!</b></p>
                  <p>Please find your updated configuration and revised total below — <b>${s.discount!.label}: − ${money(s.discount!.amount, s.currency, s.locale)}</b>. The full updated offer is attached as a PDF (№ <b>${s.offerNumber}</b>).</p>`
               : `<p>Thank you for your interest. Please find your configuration and estimated offer below. The full offer is attached as a PDF (№ <b>${s.offerNumber}</b>).</p>`}`}
        <table style="width:100%;border-collapse:collapse" cellpadding="0">
          <tbody>${rows.join("")}${discountRows}</tbody>
          <tfoot><tr style="border-top:2px solid ${RED}">
            <td></td>
            <td style="font-weight:bold;padding-top:10px">${hasDiscount ? "Total after discount" : "Estimated total"}</td>
            <td align="right" style="font-weight:bold;color:${RED};padding-top:10px">${money(s.total, s.currency, s.locale)}</td>
          </tr></tfoot>
        </table>
        <p style="color:#64748b;font-size:12px">${s.vatNote || ""}</p>
        <p style="color:#94a3b8;font-size:12px">${s.company.company_name || "RHTS"} · ${s.company.company_email || ""} · ${s.company.company_phone || ""}</p>
      </div>
    </div>
  </body></html>`;
}

function adminNotifyHtml(s: OfferSnapshot, imgs: EmailImages, img: (src: string | null) => string | null, introHtml?: string): string {
  const rows = [
    ...(s.package ? [lineRow(img(imgs.pkg), `Milling pack — ${s.package.name}`, `${s.package.spindle} · ${s.package.toolHolder}`, money(s.package.price, s.currency, s.locale))] : []),
    ...(s.robot ? [lineRow(img(imgs.robot), `Robot — ${s.robot.label}`, s.robot.specs, money(s.robot.price, s.currency, s.locale))] : []),
    ...s.options.map((o, i) => lineRow(img(imgs.options[i]), o.qty > 1 ? `${o.label} × ${o.qty}` : o.label, o.sub || "", money(o.price, s.currency, s.locale))),
  ].join("");

  const hasDiscount = !!(s.discount && s.discount.amount > 0);
  const discountLine = hasDiscount
    ? `<p style="color:#15803d">${s.discount!.label}: − ${money(s.discount!.amount, s.currency, s.locale)} (subtotal ${money(s.subtotal, s.currency, s.locale)})</p>`
    : "";

  const head = introHtml
    ? introHtml
    : `<h3 style="color:${RED}">New offer request — ${s.offerNumber}</h3>
       <p><b>${s.customer.firstName} ${s.customer.lastName}</b> ${s.customer.company ? "(" + s.customer.company + ")" : ""}<br/>
       ${s.customer.email} · ${s.customer.phone}</p>`;

  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#1f2937">
    ${head}
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

/** Convert an inline image attachment to Resend's shape. `content_id` makes Resend render
 *  it inline (referenced via cid: in the HTML) instead of embedding a data URI, which
 *  Gmail and most webmail clients strip. */
function resendInlineAttachment(a: InlineAttachment) {
  return {
    filename: a.filename,
    content: a.content.toString("base64"),
    content_type: a.contentType,
    content_id: a.cid,
  };
}

/** Send one email via Resend's HTTPS API (port 443 — not blocked by cloud hosts), with a hard timeout. */
async function resendSend(apiKey: string, payload: Record<string, unknown>): Promise<void> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Resend API ${res.status}: ${txt.slice(0, 300)}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

export async function sendOfferEmails(
  s: OfferSnapshot,
  pdf: Buffer,
  opts?: {
    discountAnnouncement?: boolean;
    /** Override the customer email's subject + intro (rendered from a message template). */
    customer?: { subject: string; introHtml: string };
    /** Override the admin notification's subject + intro (rendered from a message template). */
    admin?: { subject: string; introHtml: string };
  }
): Promise<SendResult> {
  const discountIntro = !!opts?.discountAnnouncement && !!(s.discount && s.discount.amount > 0);
  const customerSubject =
    opts?.customer?.subject ||
    (discountIntro ? `Good news — a discount on your RHTS offer ${s.offerNumber}` : `Your RHTS offer ${s.offerNumber}`);
  const customerIntro = opts?.customer?.introHtml;
  const adminSubjectDefault = `New lead — ${s.customer.firstName} ${s.customer.lastName} (${s.offerNumber})`;
  const adminSubject = opts?.admin?.subject || adminSubjectDefault;
  const adminIntro = opts?.admin?.introHtml;
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
        `<h1>To customer: ${s.customer.email}</h1>${offerEmailHtml(s, imgs, asData, { discountIntro, introHtml: customerIntro })}<hr/><h1>To admin: ${adminEmail}</h1>${adminNotifyHtml(s, imgs, asData, adminIntro)}`
      );
      console.log(`[mail:preview] Offer ${s.offerNumber} → ${s.customer.email} (admin copy → ${adminEmail}). Saved to .mail-preview/`);
    } catch (e) {
      console.error("[mail:preview] failed to write preview", e);
    }
    return { ok: true, mode: "preview" };
  }

  const pdfB64 = pdf.toString("base64");

  // Preferred path: Resend HTTPS API (works on cloud hosts that block SMTP ports).
  const resendKey =
    process.env.RESEND_API_KEY || (/resend\.com$/i.test(host) ? process.env.SMTP_PASS || "" : "");
  if (resendKey) {
    try {
      // Inline images via CID (content_id) so Gmail/Outlook render them — data URIs are
      // stripped by most webmail clients. The attached PDF also carries everything.
      const { attachments: inline, toCid } = buildInlineAttachments(imgs);
      const attachments = [
        { filename: pdfAttachment.filename, content: pdfB64 },
        ...inline.map(resendInlineAttachment),
      ];
      await resendSend(resendKey, {
        from,
        to: [s.customer.email],
        bcc: adminEmail ? [adminEmail] : undefined,
        subject: customerSubject,
        html: offerEmailHtml(s, imgs, toCid, { discountIntro, introHtml: customerIntro }),
        attachments,
      });
      if (adminEmail) {
        await resendSend(resendKey, {
          from,
          to: [adminEmail],
          subject: adminSubject,
          html: adminNotifyHtml(s, imgs, toCid, adminIntro),
          attachments,
        });
      }
      return { ok: true, mode: "sent" };
    } catch (e) {
      console.error("[mail:resend] send failed", e);
      return { ok: false, mode: "failed", detail: e instanceof Error ? e.message : String(e) };
    }
  }

  // Fallback: SMTP via nodemailer, with timeouts so a stalled connection fails fast (never hangs the request).
  try {
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });

    // Inline images via CID so they render in Gmail/Outlook (data URIs are stripped there).
    const { attachments: inline, toCid } = buildInlineAttachments(imgs);
    const inlineAttachments = inline.map((a) => ({ ...a, cid: a.cid }));

    await transporter.sendMail({
      from,
      to: s.customer.email,
      bcc: adminEmail || undefined,
      subject: customerSubject,
      html: offerEmailHtml(s, imgs, toCid, { discountIntro, introHtml: customerIntro }),
      attachments: [pdfAttachment, ...inlineAttachments],
    });

    if (adminEmail) {
      await transporter.sendMail({
        from,
        to: adminEmail,
        subject: adminSubject,
        html: adminNotifyHtml(s, imgs, toCid, adminIntro),
        attachments: [pdfAttachment, ...inlineAttachments],
      });
    }

    return { ok: true, mode: "sent" };
  } catch (e) {
    console.error("[mail] send failed", e);
    return { ok: false, mode: "failed", detail: e instanceof Error ? e.message : String(e) };
  }
}

/** Branded wrapper for a plain message email (status updates) — no config table, no PDF. */
function simpleEmailHtml(s: OfferSnapshot, bodyHtml: string, logoSrc: string | null): string {
  const header = logoSrc
    ? `<div style="background:${DARK};padding:16px 20px"><img src="${logoSrc}" alt="${s.company.company_name || "RHTS"}" style="height:34px"/></div>`
    : `<div style="background:${DARK};padding:16px 20px"><span style="color:#fff;font-size:18px;font-weight:bold">${s.company.company_name || "RHTS Milling Cells"}</span></div>`;
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#1f2937">
    <div style="max-width:640px;margin:0 auto;background:#fff">
      ${header}
      <div style="height:4px;background:${RED}"></div>
      <div style="padding:24px">
        ${bodyHtml}
        <p style="color:#94a3b8;font-size:12px;margin-top:24px">${s.company.company_name || "RHTS"} · ${s.company.company_email || ""} · ${s.company.company_phone || ""}</p>
      </div>
    </div>
  </body></html>`;
}

/**
 * Send a simple, PDF-less message to the customer (used for order-status notifications).
 * Manager-triggered only. A copy is BCC'd to the admin inbox so there's an internal record.
 * Reuses the same preview / Resend / SMTP delivery paths as the offer email.
 */
export async function sendCustomerMessage(
  s: OfferSnapshot,
  msg: { subject: string; bodyHtml: string }
): Promise<SendResult> {
  const adminEmail = s.company.admin_email || "";
  const from = process.env.SMTP_FROM || s.company.company_email || "no-reply@rhts.local";
  const host = process.env.SMTP_HOST;
  const logo = await logoDataUri();

  // Preview mode: no SMTP configured — save the rendered message to disk.
  if (!host) {
    try {
      const dir = path.join(process.cwd(), ".mail-preview");
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(
        path.join(dir, `${s.offerNumber}-message-${Date.now()}.html`),
        `<h1>To customer: ${s.customer.email} — ${msg.subject}</h1>${simpleEmailHtml(s, msg.bodyHtml, logo)}`
      );
      console.log(`[mail:preview] Message to ${s.customer.email} saved to .mail-preview/`);
    } catch (e) {
      console.error("[mail:preview] failed to write preview", e);
    }
    return { ok: true, mode: "preview" };
  }

  // Preferred path: Resend HTTPS API.
  const resendKey = process.env.RESEND_API_KEY || (/resend\.com$/i.test(host) ? process.env.SMTP_PASS || "" : "");
  if (resendKey) {
    try {
      // Inline the logo via CID — data URIs are stripped by Gmail/Outlook.
      const logoAtt = logo ? dataUriToAttachment(logo, "logo") : null;
      await resendSend(resendKey, {
        from,
        to: [s.customer.email],
        bcc: adminEmail ? [adminEmail] : undefined,
        subject: msg.subject,
        html: simpleEmailHtml(s, msg.bodyHtml, logoAtt ? "cid:logo" : null),
        attachments: logoAtt ? [resendInlineAttachment(logoAtt)] : undefined,
      });
      return { ok: true, mode: "sent" };
    } catch (e) {
      console.error("[mail:resend] message send failed", e);
      return { ok: false, mode: "failed", detail: e instanceof Error ? e.message : String(e) };
    }
  }

  // Fallback: SMTP via nodemailer, inlining the logo via CID.
  try {
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });

    const logoAtt = logo ? dataUriToAttachment(logo, "logo") : null;
    const html = simpleEmailHtml(s, msg.bodyHtml, logoAtt ? "cid:logo" : null);

    await transporter.sendMail({
      from,
      to: s.customer.email,
      bcc: adminEmail || undefined,
      subject: msg.subject,
      html,
      attachments: logoAtt ? [logoAtt] : [],
    });
    return { ok: true, mode: "sent" };
  } catch (e) {
    console.error("[mail] message send failed", e);
    return { ok: false, mode: "failed", detail: e instanceof Error ? e.message : String(e) };
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isLocale } from "@/lib/i18n";
import { buildOfferSnapshot, nextOfferNumber, type OfferInput } from "@/lib/offer";
import { renderOfferPdf } from "@/lib/pdf";
import { sendOfferEmails } from "@/lib/mail";
import { getSetting } from "@/lib/settings";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

const schema = z.object({
  locale: z.string().refine(isLocale, "invalid locale"),
  packageId: z.string().min(1),
  robotId: z.string().min(1, "no robot"),
  optionIds: z.array(z.string()).default([]),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(3),
  company: z.string().optional().default(""),
  note: z.string().optional().default(""),
  deliveryAddress: z.string().optional().default(""),
  regNumber: z.string().optional().default(""),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }

  const input = parsed.data as OfferInput;
  // Authenticated submissions (from the admin "New lead" flow) record the creator;
  // anonymous submissions come from the public website (createdBy stays "").
  const me = await getSessionUser();
  const createdBy = me?.email || "";

  try {
    const prefix = await getSetting("offer_prefix", "RHTS");
    const offerNumber = await nextOfferNumber(prefix);
    const snapshot = await buildOfferSnapshot(input, offerNumber);
    const pdf = await renderOfferPdf(snapshot);

    // Save the lead FIRST so it's never lost, even if email delivery stalls or fails.
    const lead = await prisma.lead.create({
      data: {
        offerNumber,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        company: input.company || "",
        deliveryAddress: input.deliveryAddress || "",
        regNumber: input.regNumber || "",
        createdBy,
        locale: input.locale,
        packageId: input.packageId,
        robotId: input.robotId,
        optionIds: JSON.stringify(input.optionIds),
        snapshot: JSON.stringify(snapshot),
        subtotal: snapshot.subtotal,
        discount: 0,
        total: snapshot.total,
        currency: snapshot.currency,
        emailStatus: "pending",
      },
    });

    // Attempt delivery — failures/timeouts must not break the offer response.
    let emailStatus = "pending";
    try {
      const mail = await sendOfferEmails(snapshot, pdf);
      emailStatus = mail.mode;
    } catch (e) {
      console.error("[api/offer] email error", e);
      emailStatus = "failed";
    }
    await prisma.lead.update({ where: { id: lead.id }, data: { emailStatus } });

    return NextResponse.json({ offerNumber, pdfUrl: `/api/offer/${offerNumber}/pdf`, emailStatus, leadUrl: `/admin/leads/${lead.id}` });
  } catch (e) {
    console.error("[api/offer] error", e);
    return NextResponse.json({ error: "Could not generate offer" }, { status: 500 });
  }
}

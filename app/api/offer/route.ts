import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isLocale } from "@/lib/i18n";
import { buildOfferSnapshot, nextOfferNumber, type OfferInput } from "@/lib/offer";
import { getSetting } from "@/lib/settings";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

const schema = z.object({
  locale: z.string().refine(isLocale, "invalid locale"),
  packageId: z.string().min(1),
  robotId: z.string().min(1, "no robot"),
  optionIds: z.array(z.string()).default([]),
  optionQuantities: z.record(z.string(), z.number()).optional().default({}),
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
    let offerNumber = await nextOfferNumber(prefix);
    const snapshot = await buildOfferSnapshot(input, offerNumber);

    // Save the lead FIRST so it's never lost. No offer is emailed automatically — neither
    // admin-created leads nor public website leads. Every offer is sent manually from the
    // lead page via "Resend offer", so a manager reviews it before the client hears from us.
    // Retry on the rare race where two submissions pick the same offer number (P2002).
    let lead;
    for (let attempt = 0; ; attempt++) {
      try {
        lead = await prisma.lead.create({
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
            assignedTo: createdBy, // manager/agent-created leads stay assigned to their creator
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
        break;
      } catch (e: any) {
        if (e?.code === "P2002" && attempt < 5) {
          offerNumber = await nextOfferNumber(prefix);
          snapshot.offerNumber = offerNumber;
          continue;
        }
        throw e;
      }
    }

    // Nothing is emailed here. The lead stays "pending" until a manager reviews it and
    // clicks "Resend offer" on the lead page. The customer can still download their PDF
    // immediately from the success screen (pdfUrl below) — they just aren't emailed yet.
    return NextResponse.json({ offerNumber, pdfUrl: `/api/offer/${offerNumber}/pdf`, emailStatus: "pending", leadUrl: `/admin/leads/${lead.id}` });
  } catch (e) {
    console.error("[api/offer] error", e);
    return NextResponse.json({ error: "Could not generate offer" }, { status: 500 });
  }
}

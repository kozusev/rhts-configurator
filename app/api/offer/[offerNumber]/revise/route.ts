import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isLocale } from "@/lib/i18n";
import { getSessionUser } from "@/lib/auth";
import { buildOfferSnapshot, type OfferInput } from "@/lib/offer";

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
});

export async function POST(req: NextRequest, { params }: { params: { offerNumber: string } }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lead = await prisma.lead.findUnique({ where: { offerNumber: params.offerNumber } });
  if (!lead) return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  // Agents may only revise their own leads, and not once a lead is closed.
  if (me.role === "AGENT") {
    if (lead.createdBy !== me.email) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (lead.status === "closed") return NextResponse.json({ error: "This lead is closed — only a manager or admin can modify it." }, { status: 403 });
  }

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

  try {
    // Rebuild the snapshot from the DB, keeping the same offer number. Discount resets;
    // the admin can re-apply it on the lead page afterwards. The offer is NOT emailed here —
    // the manager decides when to resend via the "Resend offer" button.
    const snapshot = await buildOfferSnapshot(input, lead.offerNumber);

    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        company: input.company || "",
        locale: input.locale,
        packageId: input.packageId,
        robotId: input.robotId,
        optionIds: JSON.stringify(input.optionIds),
        snapshot: JSON.stringify(snapshot),
        subtotal: snapshot.subtotal,
        discount: 0,
        total: snapshot.total,
        currency: snapshot.currency,
        assignedTo: me.email,
        status: "updated",
      },
    });

    await prisma.leadEvent.create({
      data: {
        leadId: lead.id,
        type: "modified",
        message: `Offer reconfigured — pack ${snapshot.package.name}, robot ${snapshot.robot?.label || "—"}, ${input.optionIds.length} options. New total ${snapshot.total} ${snapshot.currency}. Not sent yet.`,
        author: me.email,
      },
    });

    return NextResponse.json({ offerNumber: lead.offerNumber, pdfUrl: `/api/offer/${lead.offerNumber}/pdf` });
  } catch (e) {
    console.error("[api/offer/revise] error", e);
    return NextResponse.json({ error: "Could not update offer" }, { status: 500 });
  }
}

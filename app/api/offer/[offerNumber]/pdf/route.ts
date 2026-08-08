import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { renderOfferPdf } from "@/lib/pdf";
import type { OfferSnapshot } from "@/lib/offer";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { offerNumber: string } }) {
  const lead = await prisma.lead.findUnique({ where: { offerNumber: params.offerNumber } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let snapshot: OfferSnapshot;
  try {
    snapshot = JSON.parse(lead.snapshot);
  } catch {
    return NextResponse.json({ error: "Corrupt offer" }, { status: 500 });
  }

  const pdf = await renderOfferPdf(snapshot);
  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Offer-${lead.offerNumber}.pdf"`,
    },
  });
}

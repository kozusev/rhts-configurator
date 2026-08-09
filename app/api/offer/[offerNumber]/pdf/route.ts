import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { renderOfferPdf } from "@/lib/pdf";
import type { OfferSnapshot } from "@/lib/offer";

export const runtime = "nodejs";
// Always regenerate the PDF from the lead's current snapshot. Without this the GET
// handler's response gets cached (Next.js Full Route Cache is never revalidated for this
// URL, and browsers cache the stable URL too), so "Open PDF" would keep serving the offer
// as it looked the first time it was opened — even after a discount / modify / customer edit.
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
      // Never let a browser/proxy hold on to a previous render of this offer.
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}

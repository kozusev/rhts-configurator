import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { renderInvoicePdf } from "@/lib/invoicePdf";
import { paymentTerm } from "@/lib/invoiceTerms";
import type { OfferSnapshot } from "@/lib/offer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Generate an invoice PDF for a lead. Authenticated; agents only for their own leads. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getSessionUser();
  if (!me) return new NextResponse("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const hsCode = url.searchParams.get("hs") || undefined;
  const termsIdx = parseInt(url.searchParams.get("terms") || "", 10);
  const withVat = url.searchParams.get("vat") !== "0"; // default with-VAT unless explicitly 0

  const lead = await prisma.lead.findUnique({ where: { id: params.id } });
  if (!lead) return new NextResponse("Not found", { status: 404 });
  if (me.role === "AGENT" && lead.createdBy !== me.email) return new NextResponse("Forbidden", { status: 403 });

  let snapshot: OfferSnapshot;
  try {
    snapshot = JSON.parse(lead.snapshot);
  } catch {
    return new NextResponse("Corrupt offer", { status: 500 });
  }

  // Resolve the chosen payment term in the client's language.
  const paymentTerms = Number.isInteger(termsIdx) ? paymentTerm(snapshot.locale, termsIdx) : "";

  const settings = await getSettings();
  const pdf = await renderInvoicePdf(snapshot, settings, { hsCode, paymentTerms, withVat });
  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Invoice-${lead.offerNumber}.pdf"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}

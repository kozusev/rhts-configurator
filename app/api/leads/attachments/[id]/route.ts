import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/** Download a lead attachment. Authenticated; agents may only fetch their own leads' files. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getSessionUser();
  if (!me) return new NextResponse("Unauthorized", { status: 401 });

  const att = await prisma.leadAttachment.findUnique({
    where: { id: params.id },
    include: { lead: { select: { createdBy: true } } },
  });
  if (!att) return new NextResponse("Not found", { status: 404 });
  if (me.role === "AGENT" && att.lead.createdBy !== me.email) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Sanitize the filename for the Content-Disposition header.
  const safe = (att.filename || "attachment").replace(/[^\w.\-]+/g, "_");
  return new NextResponse(Buffer.from(att.data), {
    status: 200,
    headers: {
      "Content-Type": att.mime || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${safe}"`,
      "Content-Length": String(att.size || att.data.length),
      "Cache-Control": "private, no-store",
    },
  });
}

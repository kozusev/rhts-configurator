import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const MAX_BYTES = (Number(process.env.MAX_ATTACHMENT_MB) || 50) * 1024 * 1024;
const KINDS = ["document", "backup"];

/** Attach a file (scanned document or software backup) to a lead. */
export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const leadId = String(form.get("leadId") || "");
  const kind = String(form.get("kind") || "document");
  const name = String(form.get("name") || "").trim();
  const file = form.get("file");

  if (!KINDS.includes(kind)) return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ error: "Empty file" }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `File too large (max ${Math.round(MAX_BYTES / 1024 / 1024)} MB)` }, { status: 413 });
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true, createdBy: true } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  // Agents may only attach to leads they created.
  if (me.role === "AGENT" && lead.createdBy !== me.email) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const att = await prisma.leadAttachment.create({
    data: {
      leadId,
      kind,
      name: name || file.name,
      filename: file.name,
      mime: file.type || "application/octet-stream",
      size: file.size,
      data: bytes,
      uploadedBy: me.email,
    },
    select: { id: true, kind: true, name: true, filename: true, size: true, uploadedBy: true, createdAt: true },
  });

  await prisma.leadEvent.create({
    data: {
      leadId,
      type: "modified",
      message: `${kind === "backup" ? "Software backup" : "Document"} attached: ${att.name} (${att.filename}).`,
      author: me.email,
    },
  }).catch(() => {});

  return NextResponse.json({ attachment: att });
}

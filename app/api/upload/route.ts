import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/svg+xml": "svg",
};

export async function POST(req: NextRequest) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED[file.type]) {
    return NextResponse.json({ error: "Unsupported file type (use JPG, PNG, WEBP, GIF, AVIF or SVG)" }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 8 MB)" }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // Store in Postgres, not on disk: Railway's filesystem is ephemeral, so files written
  // to /public/uploads disappear on the next redeploy. DB-backed media survives deploys.
  const media = await prisma.media.create({ data: { mime: file.type, data: bytes } });

  return NextResponse.json({ url: `/api/media/${media.id}` });
}

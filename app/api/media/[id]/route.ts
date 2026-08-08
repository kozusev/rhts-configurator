import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/** Serve a DB-stored uploaded image. Content is immutable (id-addressed) so it caches hard. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const media = await prisma.media.findUnique({ where: { id: params.id } });
  if (!media) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(Buffer.from(media.data), {
    status: 200,
    headers: {
      "Content-Type": media.mime || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

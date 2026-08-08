import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};

/** Load the raw bytes of an image reference (data URI, http(s) URL, or /public path). */
async function loadImageBytes(ref: string): Promise<Buffer | null> {
  const src = ref.trim();
  if (!src) return null;
  try {
    if (src.startsWith("data:")) {
      const m = src.match(/^data:[^;]+;base64,([\s\S]*)$/);
      return m ? Buffer.from(m[1], "base64") : null;
    }
    if (src.startsWith("http://") || src.startsWith("https://")) {
      const res = await fetch(src);
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    }
    const rel = src.startsWith("/") ? src.slice(1) : src;
    return await fs.readFile(path.join(process.cwd(), "public", rel));
  } catch {
    return null;
  }
}

/**
 * Resolve an image reference to a base64 data URI (no transcoding, original format).
 * Kept for callers that need the raw bytes preserved.
 */
export async function imageToDataUri(ref: string | null | undefined): Promise<string | null> {
  if (!ref) return null;
  const src = ref.trim();
  if (!src) return null;
  if (src.startsWith("data:")) return src;
  const buf = await loadImageBytes(src);
  if (!buf) return null;
  const ext = src.startsWith("http") ? "" : path.extname(src).toLowerCase();
  const mime = MIME_BY_EXT[ext] || "image/png";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

/**
 * Resolve an image for embedding in a PDF or email: always transcoded to PNG and
 * downscaled. This is required because @react-pdf/renderer only supports JPEG/PNG
 * (WebP/AVIF/SVG/GIF are silently dropped), and it keeps the file size small.
 * `box` is the max width/height in px.
 */
export async function imageForDoc(ref: string | null | undefined, box = 320): Promise<string | null> {
  if (!ref) return null;
  const buf = await loadImageBytes(ref.trim());
  if (!buf) return null;
  try {
    const png = await sharp(buf)
      .resize(box, box, { fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" }) // drop alpha for opaque thumbnails (photos)
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Brand logo for documents — keep transparency so it sits on the dark header band. */
export async function logoForDoc(box = 480): Promise<string | null> {
  const buf = await loadImageBytes("/logo.png");
  if (!buf) return null;
  try {
    const png = await sharp(buf)
      .resize(box, box, { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Back-compat alias used by the PDF/email templates. */
export function logoDataUri(): Promise<string | null> {
  return logoForDoc();
}

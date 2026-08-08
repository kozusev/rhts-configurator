"use client";

import { useRef, useState } from "react";

export default function ImageUpload({
  name = "image",
  label = "Image",
  value = "",
}: {
  name?: string;
  label?: string;
  value?: string;
}) {
  const [url, setUrl] = useState(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <label className="label">{label}</label>
      {/* This is the value the form submits */}
      <input type="hidden" name={name} value={url} />

      <div className="flex items-start gap-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-ink-900">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="preview" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-xs text-slate-500">No image</div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="btn-ghost !px-3 !py-1.5 text-xs"
            >
              {busy ? "Uploading…" : url ? "Replace image" : "Upload image"}
            </button>
            {url && (
              <button type="button" onClick={() => setUrl("")} className="btn-ghost !px-3 !py-1.5 text-xs text-red-400">
                Remove
              </button>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={onFile}
            className="hidden"
          />
          {/* Optional: paste a URL instead of uploading */}
          <input
            type="text"
            inputMode="url"
            placeholder="…or paste an image URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="field text-xs"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <p className="text-[11px] text-slate-500">JPG, PNG, WEBP, GIF, AVIF or SVG · up to 8 MB. Stored in /public/uploads.</p>
        </div>
      </div>
    </div>
  );
}

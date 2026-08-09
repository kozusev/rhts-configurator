"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteLeadAttachment } from "@/app/admin/lead-actions";
import ConfirmDeleteButton from "@/components/admin/ConfirmDeleteButton";

export type AttachmentRow = {
  id: string;
  name: string;
  filename: string;
  size: number;
  uploadedBy: string;
  createdAt: string | Date;
};

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function LeadAttachments({
  leadId,
  kind,
  title,
  description,
  attachments,
  canEdit,
}: {
  leadId: string;
  kind: "document" | "backup";
  title: string;
  description: string;
  attachments: AttachmentRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("leadId", leadId);
      fd.append("kind", kind);
      fd.append("name", name);
      fd.append("file", file);
      const res = await fetch("/api/leads/attachments", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setName("");
      setFileName("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="font-bold">{title}</h2>
      <p className="mb-3 text-xs text-slate-500">{description}</p>

      {attachments.length === 0 ? (
        <p className="text-sm text-slate-500">No files yet.</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <a
                  href={`/api/leads/attachments/${a.id}`}
                  className="truncate font-medium text-brand-300 hover:text-brand-200"
                >
                  {a.name || a.filename}
                </a>
                <div className="truncate text-xs text-slate-500">
                  {a.filename} · {humanSize(a.size)}
                  {a.uploadedBy ? ` · ${a.uploadedBy.split("@")[0]}` : ""}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a href={`/api/leads/attachments/${a.id}`} className="btn-ghost !px-3 !py-1.5 text-xs">
                  Download
                </a>
                {canEdit && (
                  <ConfirmDeleteButton
                    action={deleteLeadAttachment}
                    fields={{ id: a.id }}
                    message={`Delete "${a.name || a.filename}"?\n\nThis cannot be undone.`}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name / label (optional)"
            className="field !py-1.5 text-sm"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="btn-ghost !px-3 !py-1.5 text-xs">
              {fileName ? "Change file" : "Choose file"}
            </button>
            {fileName && <span className="truncate text-xs text-slate-400">{fileName}</span>}
            <input
              ref={fileRef}
              type="file"
              onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
              className="hidden"
            />
            <button type="button" onClick={upload} disabled={busy} className="btn-primary !px-3 !py-1.5 text-xs">
              {busy ? "Uploading…" : "Upload"}
            </button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}

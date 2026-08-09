"use client";

import { useState } from "react";
import { notifyLeadStatus } from "@/app/admin/lead-actions";
import { statusFromAction } from "@/lib/templateMeta";

export type NotifyTemplate = { id: string | null; name: string; action: string; subject: string; body: string };

export default function NotifyCustomerModal({
  leadId,
  recipient,
  templates,
  currentStatus,
}: {
  leadId: string;
  recipient: string;
  templates: NotifyTemplate[];
  currentStatus: string;
}) {
  const [open, setOpen] = useState(false);

  const preferred = Math.max(
    0,
    templates.findIndex((t) => statusFromAction(t.action) === currentStatus)
  );

  const [sel, setSel] = useState<number | "custom">(templates.length ? preferred : "custom");
  const start = templates[typeof sel === "number" ? sel : 0];
  const [subject, setSubject] = useState(start?.subject || "");
  const [body, setBody] = useState(start?.body || "");

  function pick(value: string) {
    if (value === "custom") {
      setSel("custom");
      return;
    }
    const idx = Number(value);
    setSel(idx);
    const t = templates[idx];
    if (t) {
      setSubject(t.subject);
      setBody(t.body);
    }
  }

  const templateName = sel === "custom" ? "" : templates[sel]?.name || "";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost w-full !py-1.5 text-sm">
        ✉️ Notify customer
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div className="card mt-8 w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-lg font-bold">Notify customer</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-xl text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
            <p className="mb-4 text-xs text-slate-400">
              Sends a short status update to <b className="text-slate-200">{recipient}</b>. No PDF is attached.
            </p>

            {/* On submit the server action redirects, which closes this modal and refreshes the page. */}
            <form action={notifyLeadStatus} className="space-y-3">
              <input type="hidden" name="id" value={leadId} />
              <input type="hidden" name="templateName" value={templateName} />

              <div>
                <label className="label">Status message</label>
                <select value={String(sel)} onChange={(e) => pick(e.target.value)} className="field">
                  {templates.map((t, i) => (
                    <option key={t.action || i} value={i}>{t.name}</option>
                  ))}
                  <option value="custom">✍️ Custom message…</option>
                </select>
              </div>

              <div>
                <label className="label">Subject</label>
                <input name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="field" required />
              </div>

              <div>
                <label className="label">Message</label>
                <textarea name="body" value={body} onChange={(e) => setBody(e.target.value)} rows={8} className="field text-sm" required />
              </div>

              <p className="text-xs text-slate-500">
                Placeholders like <code className="text-brand-300">{"{{fullName}}"}</code> and{" "}
                <code className="text-brand-300">{"{{offerNumber}}"}</code> are filled in automatically.
              </p>

              <div className="mt-1 flex gap-2">
                <button className="btn-primary">Send update</button>
                <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { resendOffer } from "@/app/admin/lead-actions";

export type ResendTemplate = { id: string | null; name: string; action: string; subject: string; body: string };

const ACTION_BADGE: Record<string, string> = {
  offer: "Standard offer",
  discount: "Discount announcement",
  admin_notify: "Admin (internal)",
};

export default function ResendOfferModal({
  leadId,
  recipient,
  templates,
  defaultAction,
  autoOpen = false,
  prompt,
}: {
  leadId: string;
  recipient: string;
  templates: ResendTemplate[];
  defaultAction: "offer" | "discount";
  autoOpen?: boolean;
  prompt?: string;
}) {
  const [open, setOpen] = useState(autoOpen);
  const router = useRouter();
  const pathname = usePathname();

  // When opened automatically from a ?notify= hint, clear the hint on dismiss so it doesn't
  // reopen on refresh. (Sending redirects away on its own.)
  function close() {
    setOpen(false);
    if (autoOpen) router.replace(pathname);
  }

  // Offer messages only — exclude the internal admin notice and the order-status templates.
  const choices = templates.filter((t) => t.action !== "admin_notify" && !t.action.startsWith("status:"));
  const preferred =
    choices.findIndex((t) => t.action === defaultAction) >= 0
      ? choices.findIndex((t) => t.action === defaultAction)
      : 0;

  const [sel, setSel] = useState<number | "custom">(choices.length ? preferred : "custom");
  const first = choices[typeof sel === "number" ? sel : 0];
  const [subject, setSubject] = useState(first?.subject || "");
  const [body, setBody] = useState(first?.body || "");

  function pick(value: string) {
    if (value === "custom") {
      setSel("custom");
      return;
    }
    const idx = Number(value);
    setSel(idx);
    const t = choices[idx];
    if (t) {
      setSubject(t.subject);
      setBody(t.body);
    }
  }

  const templateName = sel === "custom" ? "" : choices[sel]?.name || "";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost !px-3 !py-1.5 text-sm">
        ✉️ Resend offer
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <div className="card mt-8 w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-lg font-bold">Resend offer</h3>
              <button type="button" onClick={close} aria-label="Close" className="text-xl text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
            {prompt && (
              <p className="mb-3 rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-2 text-sm text-brand-200">{prompt}</p>
            )}
            <p className="mb-4 text-xs text-slate-400">
              The current PDF is regenerated and emailed to <b className="text-slate-200">{recipient}</b>.
            </p>

            {/* On submit the server action redirects, which closes this modal and refreshes the page. */}
            <form action={resendOffer} className="space-y-3">
              <input type="hidden" name="id" value={leadId} />
              <input type="hidden" name="templateName" value={templateName} />

              <div>
                <label className="label">Message template</label>
                <select value={String(sel)} onChange={(e) => pick(e.target.value)} className="field">
                  {choices.map((t, i) => (
                    <option key={t.id ?? i} value={i}>
                      {t.name}
                      {t.action && ACTION_BADGE[t.action] ? ` — ${ACTION_BADGE[t.action]}` : ""}
                    </option>
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
                Placeholders like <code className="text-brand-300">{"{{fullName}}"}</code>,{" "}
                <code className="text-brand-300">{"{{offerNumber}}"}</code>,{" "}
                <code className="text-brand-300">{"{{total}}"}</code> are filled in automatically. The pricing
                table and PDF are added below your message.
              </p>

              <div className="mt-1 flex gap-2">
                <button className="btn-primary">Send offer</button>
                <button type="button" onClick={close} className="btn-ghost">{autoOpen ? "Don’t send" : "Cancel"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

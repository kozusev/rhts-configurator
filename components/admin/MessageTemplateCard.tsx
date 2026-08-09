"use client";

import { useState } from "react";
import { saveMessageTemplate, deleteMessageTemplate } from "@/app/admin/actions";
import { ACTION_OPTION_GROUPS, actionLabel, previewText } from "@/lib/templateMeta";

export type CardTemplate = { id: string; name: string; action: string; subject: string; body: string };

export default function MessageTemplateCard({ template: t }: { template: CardTemplate }) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{t.name || "Untitled template"}</h3>
            {t.action ? (
              <span className="chip border-brand-500/40 text-brand-300">{actionLabel(t.action)}</span>
            ) : (
              <span className="chip text-slate-400">Unassigned</span>
            )}
          </div>
          {!editing && (
            <>
              <div className="mt-1 truncate text-xs font-medium text-slate-300">{t.subject}</div>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500">{previewText(t.body)}</p>
            </>
          )}
        </div>
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className="btn-ghost shrink-0 !px-3 !py-1.5 text-sm">
            ✎ Edit
          </button>
        )}
      </div>

      {editing && (
        <div className="mt-4 space-y-3">
          <form action={saveMessageTemplate} className="space-y-3">
            <input type="hidden" name="id" value={t.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Template name</label>
                <input name="name" defaultValue={t.name} className="field" />
              </div>
              <div>
                <label className="label">Use for action</label>
                <select name="action" defaultValue={t.action} className="field">
                  <option value="">— Unassigned —</option>
                  {ACTION_OPTION_GROUPS.map((g) => (
                    <optgroup key={g.label} label={g.label}>
                      {g.options.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Subject</label>
              <input name="subject" defaultValue={t.subject} className="field" />
            </div>
            <div>
              <label className="label">Message body</label>
              <textarea name="body" rows={8} defaultValue={t.body} className="field text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <button className="btn-primary !py-1.5 text-sm">Save</button>
              <button type="button" onClick={() => setEditing(false)} className="btn-ghost !py-1.5 text-sm">Cancel</button>
            </div>
          </form>
          {/* Separate form — HTML forms can't nest. */}
          <form action={deleteMessageTemplate} className="border-t border-white/10 pt-3">
            <input type="hidden" name="id" value={t.id} />
            <button className="text-xs text-red-400 hover:text-red-300">Delete this template</button>
          </form>
        </div>
      )}
    </div>
  );
}

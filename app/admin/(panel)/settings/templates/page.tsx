import { saveMessageTemplate, deleteMessageTemplate } from "../../../actions";
import { ensureDefaultTemplates, TEMPLATE_ACTIONS, PLACEHOLDERS, actionLabel } from "@/lib/templates";

export const dynamic = "force-dynamic";

export default async function MessageTemplatesPage() {
  const templates = await ensureDefaultTemplates();

  if (templates === null) {
    return (
      <div className="card border-amber-400/40 bg-amber-400/10 p-5 text-sm text-amber-200">
        <p className="font-semibold">Message templates aren’t ready yet.</p>
        <p className="mt-1">
          The database table for templates hasn’t been created. Run <code className="rounded bg-black/30 px-1">npm run db:push</code>{" "}
          against the production database once, then reload this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card p-5 text-sm text-slate-300">
        <p>
          These are the automatic email messages the app sends. Edit the wording, add your own variants, and
          assign one template to each <b>action</b> so it’s used by default. When you press <b>Resend offer</b>{" "}
          on a lead you can pick any template here or type a one-off message.
        </p>
        <div className="mt-3">
          <div className="mb-1 font-semibold text-slate-200">Placeholders you can use:</div>
          <div className="flex flex-wrap gap-1.5">
            {PLACEHOLDERS.map((p) => (
              <code key={p.token} title={p.desc} className="rounded bg-white/5 px-1.5 py-0.5 text-xs text-brand-300">
                {p.token}
              </code>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            You can also use <code className="text-slate-400">**bold**</code>. A blank line starts a new paragraph.
          </p>
        </div>
      </div>

      {templates.map((t) => (
        <div key={t.id} className="card p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-bold">{t.name || "Untitled template"}</h2>
            {t.action ? (
              <span className="chip border-brand-500/40 text-brand-300">Assigned: {actionLabel(t.action)}</span>
            ) : (
              <span className="chip text-slate-400">Unassigned</span>
            )}
          </div>
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
                  {TEMPLATE_ACTIONS.map((a) => (
                    <option key={a.key} value={a.key}>{a.label}</option>
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
              <textarea name="body" rows={7} defaultValue={t.body} className="field text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <button className="btn-primary !py-1.5 text-sm">Save template</button>
            </div>
          </form>
          {/* Separate form — HTML forms can't nest. */}
          <form action={deleteMessageTemplate} className="mt-2 border-t border-white/10 pt-3">
            <input type="hidden" name="id" value={t.id} />
            <button className="text-xs text-red-400 hover:text-red-300">Delete this template</button>
          </form>
        </div>
      ))}

      <div className="card border-brand-500/20 p-5">
        <h2 className="mb-3 font-bold">+ Add a new template</h2>
        <form action={saveMessageTemplate} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Template name</label>
              <input name="name" placeholder="e.g. Friendly follow-up" className="field" />
            </div>
            <div>
              <label className="label">Use for action</label>
              <select name="action" defaultValue="" className="field">
                <option value="">— Unassigned —</option>
                {TEMPLATE_ACTIONS.map((a) => (
                  <option key={a.key} value={a.key}>{a.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Subject</label>
            <input name="subject" placeholder="Your {{companyName}} offer {{offerNumber}}" className="field" />
          </div>
          <div>
            <label className="label">Message body</label>
            <textarea name="body" rows={6} placeholder={"Dear {{fullName}},\n\n…"} className="field text-sm" />
          </div>
          <button className="btn-primary !py-1.5 text-sm">Create template</button>
        </form>
      </div>
    </div>
  );
}

import { saveMessageTemplate } from "../../../actions";
import { ensureDefaultTemplates } from "@/lib/templates";
import { PLACEHOLDERS, ACTION_OPTION_GROUPS, isStatusAction } from "@/lib/templateMeta";
import MessageTemplateCard from "@/components/admin/MessageTemplateCard";

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

  const offerTemplates = templates.filter((t) => !isStatusAction(t.action));
  const statusTemplates = templates.filter((t) => isStatusAction(t.action));

  return (
    <div className="space-y-6">
      <div className="card p-5 text-sm text-slate-300">
        <p>
          These are the automatic email messages the app can send. Edit the wording, add your own variants, and
          assign one template to each <b>action</b> so it’s used by default. Order-status messages are sent from a
          lead’s <b>Notify customer</b> button; offer messages from <b>Resend offer</b>. Nothing is sent automatically.
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

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Offer emails</h2>
        <div className="space-y-3">
          {offerTemplates.map((t) => (
            <MessageTemplateCard key={t.id} template={t} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-400">Order-status emails</h2>
        <p className="mb-3 text-xs text-slate-500">One message per stage of the order — sent to keep the customer informed.</p>
        <div className="space-y-3">
          {statusTemplates.map((t) => (
            <MessageTemplateCard key={t.id} template={t} />
          ))}
        </div>
      </section>

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

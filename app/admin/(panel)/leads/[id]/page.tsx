import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { money } from "@/lib/format";
import { LEAD_STATUSES } from "@/lib/leadStatus";
import StatusBadge from "@/components/StatusBadge";
import DeleteLeadButton from "@/components/DeleteLeadButton";
import { setLeadStatus, addLeadNote, applyLeadDiscount, resendOffer, setLeadDeadline, recordPayment, updateLeadCustomer } from "../../../lead-actions";

export const dynamic = "force-dynamic";

const FLASH: Record<string, string> = {
  status: "Status updated.",
  note: "Note added.",
  discount: "Discount applied. Use “Resend offer” to email it to the client.",
  modified: "Offer reconfigured. Use “Resend offer” to email it to the client.",
  resent: "Offer re-sent to the client.",
  created: "Lead created.",
  customer: "Customer details updated.",
  custinvalid: "First name, last name and email are required.",
  emailfailed: "Email could NOT be sent — check your SMTP settings. The offer is saved; see the activity log for the exact error.",
  deadline: "Deadline updated.",
  payment: "Payment recorded.",
  baddate: "Please enter a valid date.",
  badamount: "Please enter a non-zero amount.",
  forbidden: "Only admins can delete leads.",
  corrupt: "This offer's data is corrupt and could not be read.",
};

function fmt(d: Date | string) {
  const iso = typeof d === "string" ? d : d.toISOString();
  return iso.slice(0, 16).replace("T", " ");
}

const EVENT_ICON: Record<string, string> = {
  note: "📝", status: "🔁", discount: "％", email: "✉️", created: "＋", modified: "✎", deadline: "⏰", payment: "💶",
};

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { ok?: string; error?: string };
}) {
  const me = await getSessionUser();
  if (!me) redirect("/admin/login");

  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: { events: { orderBy: { createdAt: "desc" } } },
  });
  if (!lead) redirect("/admin");
  // Agents may only open leads they created.
  if (me.role === "AGENT" && lead.createdBy !== me.email) redirect("/admin");

  let snap: any = {};
  try { snap = JSON.parse(lead.snapshot); } catch {}
  const options: any[] = snap?.options || [];
  const hasDiscount = snap?.discount && snap.discount.amount > 0;
  const flash = FLASH[searchParams.ok || ""] || FLASH[searchParams.error || ""];
  const flashOk = !!FLASH[searchParams.ok || ""];

  const paid = lead.paid;
  const balance = Math.max(0, lead.total - paid);
  const deadlineISO = lead.deadline ? new Date(lead.deadline).toISOString().slice(0, 10) : "";
  const deadlineOverdue = lead.deadline ? new Date(lead.deadline).getTime() < Date.now() : false;

  return (
    <div className="max-w-5xl">
      <Link href="/admin" className="text-sm text-slate-400 hover:text-white">← Dashboard</Link>

      <div className="mb-6 mt-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-bold text-brand-300">{lead.offerNumber}</h1>
          <StatusBadge status={lead.status} />
          <span className="chip">{lead.emailStatus}</span>
          <span className="chip">{lead.assignedTo ? `👤 ${lead.assignedTo}` : "Unassigned"}</span>
          {lead.discount > 0 && <span className="chip border-emerald-500/40 text-emerald-300">− {money(lead.discount, lead.currency)}</span>}
          {lead.deadline && <span className={`chip ${deadlineOverdue ? "border-red-500/40 text-red-300" : "border-sky-500/40 text-sky-300"}`}>⏰ {deadlineISO}</span>}
          {paid > 0 && <span className="chip border-teal-500/40 text-teal-300">💶 {money(paid, lead.currency)} paid{balance > 0 ? ` · ${money(balance, lead.currency)} due` : " · paid in full"}</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/offer/${lead.offerNumber}/pdf`} target="_blank" rel="noopener noreferrer" className="btn-ghost !px-3 !py-1.5 text-sm">Open PDF</a>
          <form action={resendOffer}>
            <input type="hidden" name="id" value={lead.id} />
            <button className="btn-ghost !px-3 !py-1.5 text-sm">✉️ Resend offer</button>
          </form>
          <Link href={`/admin/leads/${lead.id}/edit`} className="btn-primary !px-3 !py-1.5 text-sm">Modify offer →</Link>
        </div>
      </div>

      {flash && (
        <div className={`mb-6 rounded-lg border px-4 py-2 text-sm ${flashOk ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-red-500/40 bg-red-500/10 text-red-300"}`}>
          {flash}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: offer summary */}
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold">Customer</h2>
              <span className="text-xs text-slate-500">
                {lead.createdBy ? <>👤 Created by {lead.createdBy.split("@")[0]}</> : <>🌐 From website</>} · {fmt(lead.createdAt)} · {lead.locale.toUpperCase()}
              </span>
            </div>
            <form action={updateLeadCustomer} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={lead.id} />
              <div><label className="label">First name *</label><input name="firstName" defaultValue={lead.firstName} className="field" /></div>
              <div><label className="label">Last name *</label><input name="lastName" defaultValue={lead.lastName} className="field" /></div>
              <div><label className="label">Email *</label><input name="email" type="email" defaultValue={lead.email} className="field" /></div>
              <div><label className="label">Phone</label><input name="phone" defaultValue={lead.phone} className="field" /></div>
              <div><label className="label">Company</label><input name="company" defaultValue={lead.company} className="field" /></div>
              <div><label className="label">Reg. / VAT number</label><input name="regNumber" defaultValue={lead.regNumber} className="field" /></div>
              <div className="sm:col-span-2"><label className="label">Delivery address</label><input name="deliveryAddress" defaultValue={lead.deliveryAddress} className="field" /></div>
              <div className="sm:col-span-2"><label className="label">Note</label><textarea name="note" rows={2} defaultValue={snap?.customer?.note || ""} className="field text-sm" /></div>
              <div className="sm:col-span-2"><button className="btn-ghost !py-1.5 text-sm">Save customer details</button></div>
            </form>
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-bold">Configuration</h2>
            <div className="divide-y divide-white/5 text-sm">
              <Row label={`Milling pack — ${snap?.package?.name || "—"}`} sub={`${snap?.package?.spindle || ""} ${snap?.package?.toolHolder ? "· " + snap.package.toolHolder : ""}`} price={money(snap?.package?.price || 0, lead.currency)} />
              {snap?.robot && <Row label={`Robot — ${snap.robot.label}`} sub={snap.robot.specs} price={money(snap.robot.price, lead.currency)} />}
              {options.map((o, i) => <Row key={i} label={o.label} sub={o.sub} price={money(o.price, lead.currency)} />)}
            </div>

            <div className="mt-4 space-y-1 border-t border-white/10 pt-4 text-sm">
              {hasDiscount && (
                <>
                  <div className="flex justify-between text-slate-400"><span>Subtotal</span><span>{money(snap.subtotal, lead.currency)}</span></div>
                  <div className="flex justify-between text-emerald-400"><span>{snap.discount.label}</span><span>− {money(snap.discount.amount, lead.currency)}</span></div>
                </>
              )}
              <div className="flex justify-between text-lg font-bold">
                <span>{hasDiscount ? "Total after discount" : "Estimated total"}</span>
                <span className="text-brand-300">{money(lead.total, lead.currency)}</span>
              </div>
            </div>
          </div>

          {/* Activity log */}
          <div className="card p-5">
            <h2 className="mb-3 font-bold">Activity log</h2>
            {lead.events.length === 0 ? (
              <p className="text-sm text-slate-500">No activity yet.</p>
            ) : (
              <ul className="space-y-3">
                {lead.events.map((e) => (
                  <li key={e.id} className="flex gap-3 text-sm">
                    <span className="mt-0.5 shrink-0">{EVENT_ICON[e.type] || "•"}</span>
                    <div>
                      <div className={e.type === "note" ? "text-slate-100" : "text-slate-300"}>{e.message}</div>
                      <div className="text-xs text-slate-500">{fmt(e.createdAt)} · {e.author || "system"}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="mb-3 font-bold">Status</h2>
            <form action={setLeadStatus} className="flex gap-2">
              <input type="hidden" name="id" value={lead.id} />
              <select name="status" defaultValue={lead.status} className="field !py-1.5 text-sm">
                {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button className="btn-ghost !px-3 !py-1.5 text-sm">Save</button>
            </form>
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-bold">Deadline</h2>
            <form action={setLeadDeadline} className="flex gap-2">
              <input type="hidden" name="id" value={lead.id} />
              <input name="deadline" type="date" defaultValue={deadlineISO} className="field !py-1.5 text-sm" />
              <button className="btn-ghost !px-3 !py-1.5 text-sm">Save</button>
            </form>
            {lead.deadline && deadlineOverdue && <p className="mt-2 text-xs text-red-400">Overdue.</p>}
          </div>

          <div className="card p-5">
            <h2 className="mb-1 font-bold">Payments</h2>
            <div className="mb-3 space-y-1 text-sm">
              <div className="flex justify-between text-slate-400"><span>Offer total</span><span>{money(lead.total, lead.currency)}</span></div>
              <div className="flex justify-between text-teal-300"><span>Paid</span><span>{money(paid, lead.currency)}</span></div>
              <div className="flex justify-between font-semibold"><span>Balance due</span><span className={balance > 0 ? "text-brand-300" : "text-emerald-400"}>{money(balance, lead.currency)}</span></div>
            </div>
            <form action={recordPayment} className="flex gap-2">
              <input type="hidden" name="id" value={lead.id} />
              <input name="amount" type="number" step="0.01" placeholder={`Add payment (${lead.currency})`} className="field !py-1.5 text-sm" />
              <button className="btn-primary !px-3 !py-1.5 text-sm">Add</button>
            </form>
            <p className="mt-2 text-xs text-slate-500">Records a down-payment / instalment. Use a negative amount to correct.</p>
          </div>

          <div className="card p-5">
            <h2 className="mb-1 font-bold">Discount</h2>
            <p className="mb-3 text-xs text-slate-500">Updates the offer total. Use <b>Resend offer</b> above to email it to the client.</p>
            <form action={applyLeadDiscount} className="space-y-3">
              <input type="hidden" name="id" value={lead.id} />
              <div className="flex gap-2">
                <input name="discount_value" type="number" step="0.01" min="0" placeholder="0" className="field !py-1.5 text-sm" />
                <select name="discount_type" defaultValue="percent" className="field !w-auto !py-1.5 text-sm">
                  <option value="percent">%</option>
                  <option value="fixed">{lead.currency}</option>
                </select>
              </div>
              <input name="discount_label" placeholder="Label (optional, e.g. Fair discount)" className="field !py-1.5 text-sm" />
              <button className="btn-primary w-full !py-1.5 text-sm">Apply discount</button>
            </form>
            {hasDiscount && <p className="mt-2 text-xs text-emerald-400">Current: {snap.discount.label} (− {money(snap.discount.amount, lead.currency)}). Set 0 to remove.</p>}
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-bold">Add note</h2>
            <form action={addLeadNote} className="space-y-3">
              <input type="hidden" name="id" value={lead.id} />
              <textarea name="note" rows={3} required placeholder="Call summary, next steps…" className="field text-sm" />
              <button className="btn-ghost w-full !py-1.5 text-sm">Add note</button>
            </form>
          </div>

          {me.role === "ADMIN" && (
            <div className="card border-red-500/20 p-5">
              <h2 className="mb-1 font-bold text-red-300">Danger zone</h2>
              <p className="mb-3 text-xs text-slate-500">Permanently delete this lead and its history. Admins only.</p>
              <DeleteLeadButton leadId={lead.id} offerNumber={lead.offerNumber} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, sub, price }: { label: string; sub?: string; price: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div>
        <div className="font-medium">{label}</div>
        {sub && <div className="whitespace-pre-line text-xs text-slate-400">{sub}</div>}
      </div>
      <div className="whitespace-nowrap font-semibold">{price}</div>
    </div>
  );
}

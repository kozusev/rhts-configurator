import Link from "next/link";
import { money } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";

export type LeadRow = {
  id: string;
  offerNumber: string;
  status: string;
  emailStatus: string;
  assignedTo: string;
  discount: number;
  paid: number;
  total: number;
  currency: string;
  deadline: Date | null;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone: string;
  createdBy: string;
  snapshot: string;
  createdAt: Date;
};

export default function LeadCard({ lead: l }: { lead: LeadRow }) {
  let snap: any = {};
  try { snap = JSON.parse(l.snapshot); } catch {}
  const options: any[] = snap?.options || [];

  // Group options by their option-group (preserving order); fall back for old snapshots.
  const byGroup = new Map<string, any[]>();
  for (const o of options) {
    const g = o.group || "Options";
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push(o);
  }
  const groupEntries = Array.from(byGroup.entries());

  const hasDiscount = l.discount > 0;
  const overdue = l.deadline ? new Date(l.deadline).getTime() < Date.now() : false;
  const balance = Math.max(0, l.total - l.paid);

  return (
    <div className="card p-5">
      {/* Header: id + status + chips, and total/owner on the right */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/admin/leads/${l.id}`} className="font-mono text-brand-300 hover:text-brand-200">{l.offerNumber}</Link>
          <StatusBadge status={l.status} />
          {l.deadline && (
            <span className={`chip ${overdue ? "border-red-500/40 text-red-300" : "border-sky-500/40 text-sky-300"}`}>
              ⏰ {new Date(l.deadline).toISOString().slice(0, 10)}
            </span>
          )}
          {l.paid > 0 && <span className="chip border-teal-500/40 text-teal-300">💶 {money(l.paid, l.currency)}{balance > 0 ? ` · ${money(balance, l.currency)} due` : " · paid"}</span>}
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-brand-300">{money(l.total, l.currency)}</div>
          {hasDiscount && <div className="text-xs font-medium text-emerald-400">− {money(l.discount, l.currency)} discount</div>}
          <div className="text-xs text-slate-400">{l.assignedTo ? `👤 ${l.assignedTo.split("@")[0]}` : "Unassigned"} · {new Date(l.createdAt).toISOString().slice(0, 10)}</div>
          <div className="text-xs text-slate-500">{l.createdBy ? `by ${l.createdBy.split("@")[0]}` : "🌐 website"}</div>
        </div>
      </div>

      {/* Customer */}
      <div className="mt-2">
        <div className="font-bold">{l.firstName} {l.lastName}{l.company && <span className="text-sm font-normal text-slate-400"> · {l.company}</span>}</div>
        <div className="text-xs text-slate-500">{l.email}{l.phone ? ` · ${l.phone}` : ""}</div>
      </div>

      {/* Pack + robot */}
      <div className="mt-3 divide-y divide-white/5 border-t border-white/10 pt-3 text-sm">
        <div className="flex items-start justify-between gap-3 py-1.5">
          <div><span className="font-medium">Milling pack — {snap?.package?.name || "—"}</span>
            {(snap?.package?.spindle || snap?.package?.toolHolder) && <div className="text-xs text-slate-400">{snap?.package?.spindle} {snap?.package?.toolHolder ? "· " + snap.package.toolHolder : ""}</div>}
          </div>
          <div className="whitespace-nowrap font-semibold">{money(snap?.package?.price || 0, l.currency)}</div>
        </div>
        {snap?.robot && (
          <div className="flex items-start justify-between gap-3 py-1.5">
            <div><span className="font-medium">Robot — {snap.robot.label}</span><div className="text-xs text-slate-400">{snap.robot.specs}</div></div>
            <div className="whitespace-nowrap font-semibold">{money(snap.robot.price, l.currency)}</div>
          </div>
        )}
      </div>

      {/* Options as a text list: "Group name: Option1, Option2  — group total" */}
      {groupEntries.length > 0 && (
        <div className="mt-3 space-y-1 text-sm">
          {groupEntries.map(([groupName, items]) => {
            const groupTotal = items.reduce((s, o) => s + (o.price || 0), 0);
            return (
              <div key={groupName} className="flex items-start justify-between gap-3">
                <div>
                  <span className="font-semibold text-brand-300">{groupName}:</span>{" "}
                  <span className="text-slate-300">{items.map((o) => o.label).join(", ")}</span>
                </div>
                <span className="whitespace-nowrap font-semibold text-slate-300">{money(groupTotal, l.currency)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Open lead */}
      <div className="mt-3 border-t border-white/10 pt-3">
        <Link href={`/admin/leads/${l.id}`} className="btn-ghost !px-3 !py-1.5 text-xs">Open lead →</Link>
      </div>
    </div>
  );
}

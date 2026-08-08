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

  // Short config summary: pack + robot + spindle + rotating table + linear axis (when present).
  const findOpt = (pred: (g: string) => boolean) =>
    (options.find((o) => pred(String(o.group || "").toLowerCase()))?.label as string | undefined) || undefined;
  const spindle = findOpt((g) => g.includes("spindle") && !g.includes("mount"));
  const rotating = findOpt((g) => g.includes("rotating"));
  const linear = findOpt((g) => g.includes("linear"));
  const summaryParts = [snap?.package?.name, snap?.robot?.label, spindle, rotating, linear].filter(Boolean) as string[];

  const hasDiscount = l.discount > 0;
  const overdue = l.deadline ? new Date(l.deadline).getTime() < Date.now() : false;
  const balance = Math.max(0, l.total - l.paid);

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        {/* Left: id + chips, then customer (shifted up) */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/admin/leads/${l.id}`} className="font-mono text-base font-bold text-brand-300 hover:text-brand-200">{l.offerNumber}</Link>
            <StatusBadge status={l.status} />
            {l.deadline && (
              <span className={`chip ${overdue ? "border-red-500/40 text-red-300" : "border-sky-500/40 text-sky-300"}`}>⏰ {new Date(l.deadline).toISOString().slice(0, 10)}</span>
            )}
            {l.paid > 0 && <span className="chip border-teal-500/40 text-teal-300">💶 {money(l.paid, l.currency)}{balance > 0 ? ` · ${money(balance, l.currency)} due` : " · paid"}</span>}
          </div>
          <div className="mt-1.5">
            <div className="truncate font-bold leading-tight">{l.firstName} {l.lastName}</div>
            {l.company && <div className="truncate text-sm text-slate-400">{l.company}</div>}
            <div className="truncate text-xs text-slate-500">{l.email}{l.phone ? ` · ${l.phone}` : ""}</div>
          </div>
        </div>
        {/* Right: total + owner */}
        <div className="shrink-0 text-right">
          <div className="text-lg font-bold text-brand-300 sm:text-xl">{money(l.total, l.currency)}</div>
          {hasDiscount && <div className="text-xs font-medium text-emerald-400">− {money(l.discount, l.currency)}</div>}
          <div className="text-xs text-slate-400">{l.assignedTo ? `👤 ${l.assignedTo.split("@")[0]}` : "Unassigned"}</div>
          <div className="text-[11px] text-slate-500">{new Date(l.createdAt).toISOString().slice(0, 10)} · {l.createdBy ? `by ${l.createdBy.split("@")[0]}` : "website"}</div>
        </div>
      </div>

      {/* Compact config summary */}
      {summaryParts.length > 0 && (
        <div className="mt-2 border-t border-white/10 pt-2 text-sm leading-snug text-slate-300">
          {summaryParts.map((p, i) => (
            <span key={i}>
              {i > 0 && <span className="text-slate-500"> + </span>}
              {p}
            </span>
          ))}
        </div>
      )}

      <div className="mt-2">
        <Link href={`/admin/leads/${l.id}`} className="text-xs font-medium text-brand-300 hover:text-brand-200">Open lead →</Link>
      </div>
    </div>
  );
}

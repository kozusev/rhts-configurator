import Link from "next/link";
import { prisma } from "@/lib/db";
import { money } from "@/lib/format";
import LeadCard from "@/components/LeadCard";
import { IDLE_STATUSES } from "@/lib/leadStatus";

export const dynamic = "force-dynamic";

type Lead = Awaited<ReturnType<typeof prisma.lead.findMany>>[number];

const GROUP_ORDER = ["This week", "This month", "This year", "Older"] as const;
type GroupName = (typeof GROUP_ORDER)[number];

function bucketOf(created: Date, now: Date): GroupName {
  const ms = now.getTime() - created.getTime();
  if (ms <= 7 * 24 * 60 * 60 * 1000) return "This week";
  if (created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth()) return "This month";
  if (created.getFullYear() === now.getFullYear()) return "This year";
  return "Older";
}

export default async function Dashboard() {
  const [totalAgg, byStatus, recent] = await Promise.all([
    prisma.lead.aggregate({ _count: { _all: true }, _sum: { total: true } }),
    prisma.lead.groupBy({ by: ["status"], _count: { _all: true }, _sum: { total: true } }),
    prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
  ]);

  const bucket = (pred: (status: string) => boolean) =>
    byStatus
      .filter((r) => pred(r.status))
      .reduce((a, r) => ({ count: a.count + r._count._all, sum: a.sum + (r._sum.total || 0) }), { count: 0, sum: 0 });

  const totals = { count: totalAgg._count._all, sum: totalAgg._sum.total || 0 };
  const closed = bucket((s) => s === "closed");
  const canceled = bucket((s) => s === "canceled");
  const idle = bucket((s) => IDLE_STATUSES.includes(s));

  const leadStats = [
    { label: "Total leads", count: totals.count, sum: totals.sum, accent: "text-brand-300" },
    { label: "Closed", count: closed.count, sum: closed.sum, accent: "text-amber-300" },
    { label: "Idle (in progress)", count: idle.count, sum: idle.sum, accent: "text-emerald-300" },
    { label: "Canceled", count: canceled.count, sum: canceled.sum, accent: "text-red-300" },
  ];

  const now = new Date();
  const grouped: Record<GroupName, Lead[]> = { "This week": [], "This month": [], "This year": [], Older: [] };
  for (const l of recent) grouped[bucketOf(l.createdAt, now)].push(l);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {leadStats.map((s) => (
          <Link key={s.label} href="/admin" className="card p-5 transition hover:border-brand-400/60">
            <div className={`text-3xl font-bold ${s.accent}`}>{s.count}</div>
            <div className="mt-1 text-sm text-slate-400">{s.label}</div>
            <div className="mt-2 text-sm font-semibold text-slate-200">{money(s.sum, "EUR")}</div>
          </Link>
        ))}
      </div>

      <h2 className="mb-3 mt-10 text-lg font-bold">Leads / Offers</h2>

      {recent.length === 0 ? (
        <div className="card p-6 text-center text-slate-500">No leads yet.</div>
      ) : (
        <div className="space-y-3">
          {GROUP_ORDER.map((name, gi) => {
            const rows = grouped[name];
            if (rows.length === 0) return null;
            const total = rows.reduce((s, l) => s + l.total, 0);
            const currency = rows[0]?.currency || "EUR";
            return (
              <details key={name} open={gi < 2} className="group card overflow-hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between p-4 hover:bg-white/[0.03]">
                  <span className="flex items-center gap-2 font-semibold">
                    <span className="text-slate-400 transition group-open:rotate-90">▸</span>
                    {name}
                    <span className="chip">{rows.length}</span>
                  </span>
                  <span className="text-sm text-slate-400">{money(total, currency)}</span>
                </summary>
                <div className="space-y-3 border-t border-white/10 p-4">
                  {rows.map((l) => (
                    <LeadCard key={l.id} lead={l} />
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}

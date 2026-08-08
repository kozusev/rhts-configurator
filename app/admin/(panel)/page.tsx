import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { money } from "@/lib/format";
import LeadCard from "@/components/LeadCard";
import { IDLE_STATUSES } from "@/lib/leadStatus";

export const dynamic = "force-dynamic";

const PERIODS = [
  { key: "all", label: "All" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
] as const;

export default async function Dashboard({ searchParams }: { searchParams: { period?: string } }) {
  const me = await getSessionUser();
  if (!me) redirect("/admin/login");

  const period = (PERIODS.find((p) => p.key === searchParams.period)?.key || "all") as string;

  const now = new Date();
  let since: Date | null = null;
  if (period === "week") since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  else if (period === "month") since = new Date(now.getFullYear(), now.getMonth(), 1);
  else if (period === "year") since = new Date(now.getFullYear(), 0, 1);

  const where: any = {};
  if (since) where.createdAt = { gte: since };
  if (me.role === "AGENT") where.createdBy = me.email; // agents see only their own leads

  const leads = await prisma.lead.findMany({ where, orderBy: { createdAt: "desc" }, take: 500 });

  const sum = (arr: typeof leads) => arr.reduce((a, l) => a + l.total, 0);
  const closed = leads.filter((l) => l.status === "closed");
  const canceled = leads.filter((l) => l.status === "canceled");
  const idle = leads.filter((l) => IDLE_STATUSES.includes(l.status));

  const stats = [
    { label: "Total leads", count: leads.length, sum: sum(leads), accent: "text-brand-300" },
    { label: "Closed", count: closed.length, sum: sum(closed), accent: "text-amber-300" },
    { label: "In progress", count: idle.length, sum: sum(idle), accent: "text-emerald-300" },
    { label: "Canceled", count: canceled.length, sum: sum(canceled), accent: "text-red-300" },
  ];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link href="/admin/leads/new" className="btn-primary !px-4 !py-2 text-sm">+ New lead</Link>
      </div>

      {/* Period filter */}
      <div className="mb-4 inline-flex rounded-full border border-white/10 bg-ink-800 p-1">
        {PERIODS.map((p) => {
          const active = p.key === period;
          return (
            <Link
              key={p.key}
              href={p.key === "all" ? "/admin" : `/admin?period=${p.key}`}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                active ? "bg-brand-500 font-semibold text-white" : "text-slate-300 hover:text-white"
              }`}
            >
              {p.label}
            </Link>
          );
        })}
      </div>

      {/* Stat cards — 2x2 on mobile, 4 across on desktop */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4 sm:p-5">
            <div className="text-xs text-slate-400 sm:text-sm">{s.label}</div>
            <div className={`mt-1 text-2xl font-bold sm:text-3xl ${s.accent}`}>{s.count}</div>
            <div className="mt-1 text-sm font-semibold text-slate-200">{money(s.sum, leads[0]?.currency || "EUR")}</div>
          </div>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold">
        {me.role === "AGENT" ? "My leads" : "Leads / Offers"}
        <span className="ml-2 text-sm font-normal text-slate-500">{PERIODS.find((p) => p.key === period)?.label}</span>
      </h2>

      {leads.length === 0 ? (
        <div className="card p-6 text-center text-slate-500">No leads in this period.</div>
      ) : (
        <div className="space-y-3">
          {leads.map((l) => (
            <LeadCard key={l.id} lead={l} />
          ))}
        </div>
      )}
    </div>
  );
}

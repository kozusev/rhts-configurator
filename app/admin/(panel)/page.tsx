import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { money } from "@/lib/format";
import { getLeadCosts } from "@/lib/bom";
import LeadCard from "@/components/LeadCard";
import NewLeadButton from "@/components/NewLeadButton";

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

  // Internal cost/margin per lead — ADMIN/MANAGER only; agents never receive cost data.
  const isManager = me.role === "ADMIN" || me.role === "MANAGER";
  const leadCosts = isManager ? await getLeadCosts(leads) : null;

  const sum = (arr: typeof leads) => arr.reduce((a, l) => a + l.total, 0);
  const inBucket = (statuses: readonly string[]) => leads.filter((l) => statuses.includes(l.status));

  const stats = [
    { label: "Total", set: leads, accent: "text-brand-300" },
    { label: "New", set: inBucket(["new"]), accent: "text-emerald-300" },
    { label: "Idle", set: inBucket(["contacted", "updated", "discounted"]), accent: "text-yellow-300" },
    { label: "Closed", set: inBucket(["closed"]), accent: "text-amber-300" },
    { label: "Production", set: inBucket(["production"]), accent: "text-violet-300" },
    { label: "Ready to ship", set: inBucket(["ready_for_shipping"]), accent: "text-orange-300" },
    { label: "Shipped / Delivered", set: inBucket(["shipped", "delivered"]), accent: "text-cyan-300" },
    { label: "Installation", set: inBucket(["installation"]), accent: "text-indigo-300" },
    { label: "Finished", set: inBucket(["finished", "terminated"]), accent: "text-slate-300" },
    { label: "Canceled", set: inBucket(["canceled"]), accent: "text-red-300" },
  ].map((s) => ({ label: s.label, accent: s.accent, count: s.set.length, sum: sum(s.set) }));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <NewLeadButton />
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

      {/* Stat cards — compact: 3 across on mobile, all on one row on desktop */}
      <div className="grid grid-cols-3 gap-2 lg:grid-cols-10">
        {stats.map((s) => (
          <div key={s.label} className="card p-2 text-center lg:p-2.5">
            <div className="truncate text-[10px] leading-tight text-slate-400 sm:text-[11px]">{s.label}</div>
            <div className={`text-lg font-bold sm:text-xl ${s.accent}`}>{s.count}</div>
            <div className="truncate text-[10px] font-semibold text-slate-300 sm:text-[11px]">{money(s.sum, leads[0]?.currency || "EUR")}</div>
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
            <LeadCard key={l.id} lead={l} cost={leadCosts?.get(l.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { isLocale, type Locale } from "@/lib/i18n";
import { getAdminConfiguratorData } from "@/lib/configurator-data";
import Configurator, { type ConfiguratorInitial, type PackageVM } from "@/components/Configurator";

export const dynamic = "force-dynamic";

export default async function EditOfferPage({ params }: { params: { id: string } }) {
  const me = await getSessionUser();
  if (!me) redirect("/admin/login");

  const lead = await prisma.lead.findUnique({ where: { id: params.id } });
  if (!lead) redirect("/admin");

  const locale: Locale = isLocale(lead.locale) ? (lead.locale as Locale) : "en";
  const data = await getAdminConfiguratorData(locale);
  const currentPkg: PackageVM | undefined = data.packageVMs.find((p) => p.id === lead.packageId) || data.packageVMs[0];
  if (!currentPkg) {
    return (
      <div className="max-w-3xl">
        <p className="text-slate-400">No published milling packs exist, so this offer can't be reconfigured.</p>
        <Link href={`/admin/leads/${lead.id}`} className="btn-ghost mt-4">← Back to lead</Link>
      </div>
    );
  }

  const optionIds: string[] = (() => { try { return JSON.parse(lead.optionIds); } catch { return []; } })();
  let snap: any = {};
  try { snap = JSON.parse(lead.snapshot); } catch {}

  // Restore per-option quantities saved in the snapshot (older offers default to 1).
  const optionQuantities: Record<string, number> = {};
  for (const o of (snap?.options || [])) {
    if (o?.id) optionQuantities[o.id] = Math.max(1, Math.round(o.qty || 1));
  }

  const initial: ConfiguratorInitial = {
    robotId: lead.robotId || "",
    optionIds,
    optionQuantities,
    customer: {
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      note: snap?.customer?.note || "",
    },
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/admin/leads/${lead.id}`} className="text-sm text-slate-400 hover:text-white">← Back to lead</Link>
          <h1 className="mt-1 text-2xl font-bold">Modify offer <span className="font-mono text-brand-300">{lead.offerNumber}</span></h1>
          <p className="text-sm text-slate-400">
            Change the milling pack, robot and options, then save. The offer is regenerated but
            <b> not</b> sent — use “Resend offer” on the lead page when you’re ready to email the client.
            Any existing discount is reset — re-apply it on the lead page afterwards.
          </p>
        </div>
      </div>

      <Configurator
        locale={locale}
        pkg={currentPkg}
        packages={data.packageVMs}
        robots={data.robotVMs}
        groups={data.groupVMs}
        labels={data.labels}
        initial={initial}
        endpoint={`/api/offer/${lead.offerNumber}/revise`}
        adminMode
        submitLabel="Save modification"
        returnTo={`/admin/leads/${lead.id}`}
      />
    </div>
  );
}

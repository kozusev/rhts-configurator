import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getAdminConfiguratorData } from "@/lib/configurator-data";
import { defaultLocale } from "@/lib/i18n";
import Configurator from "@/components/Configurator";

export const dynamic = "force-dynamic";

export default async function NewLeadPage() {
  const me = await getSessionUser();
  if (!me) redirect("/admin/login");

  const data = await getAdminConfiguratorData(defaultLocale);
  const currentPkg = data.packageVMs[0];
  if (!currentPkg) {
    return (
      <div className="max-w-3xl">
        <p className="text-slate-400">No published milling packs exist yet, so a lead can't be created.</p>
        <Link href="/admin" className="btn-ghost mt-4">← Dashboard</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-slate-400 hover:text-white">← Dashboard</Link>
        <h1 className="mt-1 text-2xl font-bold">New lead</h1>
        <p className="text-sm text-slate-400">
          Configure a milling cell and enter the customer's details, then create the offer. It's recorded under your name.
        </p>
      </div>

      <Configurator
        locale={defaultLocale}
        pkg={currentPkg}
        packages={data.packageVMs}
        robots={data.robotVMs}
        groups={data.groupVMs}
        labels={data.labels}
        adminMode
        showCustomerForm
        submitLabel="Create lead"
      />
    </div>
  );
}

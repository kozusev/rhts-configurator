import Link from "next/link";
import { requireContentEditor } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n";
import { money } from "@/lib/format";
import { getBomTotalsMap } from "@/lib/bom";
import BomCostLine from "@/components/admin/BomCostLine";
import ConfirmDeleteButton from "@/components/admin/ConfirmDeleteButton";
import { deletePackage, duplicatePackage } from "../../actions";

export const dynamic = "force-dynamic";

export default async function Packageslist() {
  await requireContentEditor();
  const packages = await prisma.package.findMany({ orderBy: { order: "asc" } });
  const costs = await getBomTotalsMap("package", packages.map((p) => p.id));
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Milling packs</h1>
        <Link href="/admin/packages/new" className="btn-primary">+ New pack</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {packages.map((p) => (
          <div key={p.id} className="card overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.image && <img src={p.image} alt="" className="h-32 w-full object-cover" />}
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{t(p.name, "en")}</h3>
                {!p.published && <span className="chip">hidden</span>}
              </div>
              <div className="text-xs text-slate-400">/{p.slug} · {p.power} · {money(p.basePrice, p.currency)}</div>
              <BomCostLine cost={costs.get(p.id) || 0} salePrice={p.basePrice} currency={p.currency} />
              <div className="mt-3 flex gap-2">
                <Link href={`/admin/packages/${p.id}`} className="btn-ghost !px-3 !py-1.5 text-xs">Edit</Link>
                <form action={duplicatePackage}><input type="hidden" name="id" value={p.id} /><button className="btn-ghost !px-3 !py-1.5 text-xs">Copy</button></form>
                <ConfirmDeleteButton action={deletePackage} fields={{ id: p.id }} message={`Delete pack "${t(p.name, "en")}"?\n\nThis cannot be undone.`} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

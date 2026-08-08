import Link from "next/link";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n";
import { deleteGroup } from "../../actions";

export const dynamic = "force-dynamic";

export default async function GroupsList() {
  const groups = await prisma.optionGroup.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { options: true } } },
  });
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Option groups</h1>
        <Link href="/admin/groups/new" className="btn-primary">+ New group</Link>
      </div>
      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g.id} className="card flex items-center justify-between p-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold">{t(g.name, "en")}</h3>
                {!g.published && <span className="chip">hidden</span>}
              </div>
              <div className="text-xs text-slate-400">{g._count.options} options · order {g.order}</div>
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/groups/${g.id}`} className="btn-ghost !px-3 !py-1.5 text-xs">Manage</Link>
              <form action={deleteGroup}><input type="hidden" name="id" value={g.id} /><button className="btn-ghost !px-3 !py-1.5 text-xs text-red-400">Delete</button></form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

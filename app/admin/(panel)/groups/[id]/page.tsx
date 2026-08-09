import Link from "next/link";
import { requireContentEditor } from "@/lib/auth";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n";
import { money } from "@/lib/format";
import { getBomTotalsMap } from "@/lib/bom";
import { saveGroup, deleteOption, duplicateOption } from "../../../actions";
import MultiLangField from "@/components/admin/MultiLangField";
import BomCostLine from "@/components/admin/BomCostLine";
import ConfirmDeleteButton from "@/components/admin/ConfirmDeleteButton";

export const dynamic = "force-dynamic";

export default async function GroupDetail({ params }: { params: { id: string } }) {
  await requireContentEditor();
  const isNew = params.id === "new";
  const group = isNew
    ? null
    : await prisma.optionGroup.findUnique({
        where: { id: params.id },
        include: { options: { orderBy: { order: "asc" } } },
      });
  if (!isNew && !group) notFound();
  const optionCosts = group ? await getBomTotalsMap("option", group.options.map((o) => o.id)) : new Map<string, number>();

  return (
    <div className="max-w-3xl">
      <Link href="/admin/groups" className="text-sm text-slate-400 hover:text-white">← Back</Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold">{isNew ? "New group" : "Manage group"}</h1>

      <form action={saveGroup} className="card space-y-5 p-6">
        {group && <input type="hidden" name="id" value={group.id} />}
        <MultiLangField base="name" label="Group name" value={group?.name} />
        <MultiLangField base="description" label="Group description" value={group?.description} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Order</label><input name="order" type="number" defaultValue={group?.order ?? 0} className="field" /></div>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="published" defaultChecked={group?.published ?? true} /> Published</label>
        </div>
        <button className="btn-primary">Save group</button>
      </form>

      {group && (
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Options in this group</h2>
            <Link href={`/admin/groups/${group.id}/option/new`} className="btn-primary !px-3 !py-1.5 text-xs">+ Add option</Link>
          </div>
          <div className="space-y-2">
            {group.options.length === 0 && <div className="card p-4 text-sm text-slate-500">No options yet.</div>}
            {group.options.map((o) => (
              <div key={o.id} className="card flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {o.image && <img src={o.image} alt="" className="h-10 w-10 rounded object-cover" />}
                  <div>
                    <div className="font-medium">{t(o.name, "en")} {!o.published && <span className="chip ml-1">hidden</span>}</div>
                    <div className="text-xs text-brand-300">+{money(o.price, o.currency)}</div>
                    <BomCostLine cost={optionCosts.get(o.id) || 0} salePrice={o.price} currency={o.currency} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/admin/groups/${group.id}/option/${o.id}`} className="btn-ghost !px-3 !py-1.5 text-xs">Edit</Link>
                  <form action={duplicateOption}>
                    <input type="hidden" name="id" value={o.id} />
                    <button className="btn-ghost !px-3 !py-1.5 text-xs">Copy</button>
                  </form>
                  <ConfirmDeleteButton
                    action={deleteOption}
                    fields={{ id: o.id, groupId: group.id }}
                    message={`Delete option "${t(o.name, "en")}"?\n\nThis cannot be undone.`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

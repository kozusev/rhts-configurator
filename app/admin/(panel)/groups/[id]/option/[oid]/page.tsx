import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { saveOption } from "../../../../../actions";
import MultiLangField from "@/components/admin/MultiLangField";
import ImageUpload from "@/components/admin/ImageUpload";

export const dynamic = "force-dynamic";

export default async function EditOption({ params }: { params: { id: string; oid: string } }) {
  const isNew = params.oid === "new";
  const group = await prisma.optionGroup.findUnique({ where: { id: params.id } });
  if (!group) notFound();
  const o = isNew ? null : await prisma.option.findUnique({ where: { id: params.oid } });
  if (!isNew && !o) notFound();

  return (
    <div className="max-w-3xl">
      <Link href={`/admin/groups/${group.id}`} className="text-sm text-slate-400 hover:text-white">← Back to group</Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold">{isNew ? "New option" : "Edit option"}</h1>
      <form action={saveOption} className="card space-y-5 p-6">
        {o && <input type="hidden" name="id" value={o.id} />}
        <input type="hidden" name="groupId" value={group.id} />
        <MultiLangField base="name" label="Option name" value={o?.name} />
        <MultiLangField base="description" label="Description" value={o?.description} textarea />
        <div className="grid gap-4 sm:grid-cols-4">
          <div><label className="label">Price</label><input name="price" type="number" defaultValue={o?.price ?? 0} className="field" /></div>
          <div><label className="label">Currency</label><input name="currency" defaultValue={o?.currency || "EUR"} className="field" /></div>
        </div>
        <ImageUpload name="image" label="Image" value={o?.image || ""} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Order</label><input name="order" type="number" defaultValue={o?.order ?? 0} className="field" /></div>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="published" defaultChecked={o?.published ?? true} /> Published</label>
        </div>
        <button className="btn-primary">Save option</button>
      </form>
    </div>
  );
}

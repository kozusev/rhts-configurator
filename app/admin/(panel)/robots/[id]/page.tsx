import Link from "next/link";
import { requireContentEditor } from "@/lib/auth";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { saveRobot } from "../../../actions";
import MultiLangField from "@/components/admin/MultiLangField";
import ImageUpload from "@/components/admin/ImageUpload";

export const dynamic = "force-dynamic";

export default async function EditRobot({ params }: { params: { id: string } }) {
  await requireContentEditor();
  const isNew = params.id === "new";
  const r = isNew ? null : await prisma.robot.findUnique({ where: { id: params.id } });
  if (!isNew && !r) notFound();

  return (
    <div className="max-w-3xl">
      <Link href="/admin/robots" className="text-sm text-slate-400 hover:text-white">← Back</Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold">{isNew ? "New robot" : "Edit robot"}</h1>
      <form action={saveRobot} className="card space-y-5 p-6">
        {r && <input type="hidden" name="id" value={r.id} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Brand</label><input name="brand" defaultValue={r?.brand || ""} className="field" required /></div>
          <div><label className="label">Model</label><input name="model" defaultValue={r?.model || ""} className="field" required /></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <div><label className="label">Year</label><input name="year" type="number" defaultValue={r?.year ?? 2024} className="field" /></div>
          <div><label className="label">Arm reach (mm)</label><input name="armReach" type="number" defaultValue={r?.armReach ?? 0} className="field" /></div>
          <div><label className="label">Payload (kg)</label><input name="payload" type="number" step="0.1" defaultValue={r?.payload ?? 0} className="field" /></div>
          <div><label className="label">Controller</label><input name="controller" defaultValue={r?.controller || ""} className="field" /></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <div><label className="label">Price</label><input name="price" type="number" defaultValue={r?.price ?? 0} className="field" /></div>
          <div><label className="label">Currency</label><input name="currency" defaultValue={r?.currency || "EUR"} className="field" /></div>
        </div>
        <ImageUpload name="image" label="Image" value={r?.image || ""} />
        <MultiLangField base="description" label="Description" value={r?.description} textarea />
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Order</label><input name="order" type="number" defaultValue={r?.order ?? 0} className="field" /></div>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="published" defaultChecked={r?.published ?? true} /> Published</label>
        </div>
        <button className="btn-primary">Save robot</button>
      </form>
    </div>
  );
}

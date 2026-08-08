import Link from "next/link";
import { requireContentEditor } from "@/lib/auth";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { savePackage } from "../../../actions";
import MultiLangField from "@/components/admin/MultiLangField";
import ImageUpload from "@/components/admin/ImageUpload";

export const dynamic = "force-dynamic";

export default async function EditPackage({ params }: { params: { id: string } }) {
  await requireContentEditor();
  const isNew = params.id === "new";
  const pkg = isNew ? null : await prisma.package.findUnique({ where: { id: params.id } });
  if (!isNew && !pkg) notFound();

  return (
    <div className="max-w-3xl">
      <Link href="/admin/packages" className="text-sm text-slate-400 hover:text-white">← Back</Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold">{isNew ? "New pack" : "Edit pack"}</h1>
      <form action={savePackage} className="card space-y-5 p-6">
        {pkg && <input type="hidden" name="id" value={pkg.id} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Slug (URL)</label><input name="slug" defaultValue={pkg?.slug || ""} className="field" required /></div>
        </div>
        <ImageUpload name="image" label="Image" value={pkg?.image || ""} />
        <MultiLangField base="name" label="Name" value={pkg?.name} />
        <MultiLangField base="tagline" label="Tagline (card line)" value={pkg?.tagline} />
        <MultiLangField base="description" label="Description (admin-editable)" value={pkg?.description} textarea />
        <div className="grid gap-4 sm:grid-cols-3">
          <div><label className="label">Spindle</label><input name="spindle" defaultValue={pkg?.spindle || ""} className="field" /></div>
          <div><label className="label">Power</label><input name="power" defaultValue={pkg?.power || ""} className="field" /></div>
          <div><label className="label">Tool holder</label><input name="toolHolder" defaultValue={pkg?.toolHolder || ""} className="field" /></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><label className="label">Base price</label><input name="basePrice" type="number" step="1" defaultValue={pkg?.basePrice ?? 0} className="field" /></div>
          <div><label className="label">Currency</label><input name="currency" defaultValue={pkg?.currency || "EUR"} className="field" /></div>
          <div><label className="label">Order</label><input name="order" type="number" defaultValue={pkg?.order ?? 0} className="field" /></div>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={pkg?.published ?? true} /> Published</label>
        <button className="btn-primary">Save pack</button>
      </form>
    </div>
  );
}

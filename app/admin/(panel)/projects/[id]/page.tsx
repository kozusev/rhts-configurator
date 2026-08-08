import Link from "next/link";
import { requireContentEditor } from "@/lib/auth";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { saveProject } from "../../../actions";
import MultiLangField from "@/components/admin/MultiLangField";
import ImageUpload from "@/components/admin/ImageUpload";

export const dynamic = "force-dynamic";

export default async function EditProject({ params }: { params: { id: string } }) {
  await requireContentEditor();
  const isNew = params.id === "new";
  const p = isNew ? null : await prisma.project.findUnique({ where: { id: params.id } });
  if (!isNew && !p) notFound();

  return (
    <div className="max-w-3xl">
      <Link href="/admin/projects" className="text-sm text-slate-400 hover:text-white">← Back</Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold">{isNew ? "New slide" : "Edit slide"}</h1>
      <form action={saveProject} className="card space-y-5 p-6">
        {p && <input type="hidden" name="id" value={p.id} />}
        <MultiLangField base="title" label="Title" value={p?.title} />
        <MultiLangField base="subtitle" label="Subtitle" value={p?.subtitle} />
        <ImageUpload name="image" label="Image" value={p?.image || ""} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Link (optional)</label><input name="link" defaultValue={p?.link || ""} className="field" /></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Order</label><input name="order" type="number" defaultValue={p?.order ?? 0} className="field" /></div>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="published" defaultChecked={p?.published ?? true} /> Published</label>
        </div>
        <button className="btn-primary">Save slide</button>
      </form>
    </div>
  );
}

import Link from "next/link";
import { requireContentEditor } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n";
import { deleteProject, duplicateProject } from "../../actions";
import ConfirmDeleteButton from "@/components/admin/ConfirmDeleteButton";

export const dynamic = "force-dynamic";

export default async function ProjectsList() {
  await requireContentEditor();
  const projects = await prisma.project.findMany({ orderBy: { order: "asc" } });
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Carousel projects</h1>
        <Link href="/admin/projects/new" className="btn-primary">+ New slide</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <div key={p.id} className="card overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.image && <img src={p.image} alt="" className="h-32 w-full object-cover" />}
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{t(p.title, "en")}</h3>
                {!p.published && <span className="chip">hidden</span>}
              </div>
              <div className="text-xs text-slate-400">order {p.order}</div>
              <div className="mt-3 flex gap-2">
                <Link href={`/admin/projects/${p.id}`} className="btn-ghost !px-3 !py-1.5 text-xs">Edit</Link>
                <form action={duplicateProject}><input type="hidden" name="id" value={p.id} /><button className="btn-ghost !px-3 !py-1.5 text-xs">Copy</button></form>
                <ConfirmDeleteButton action={deleteProject} fields={{ id: p.id }} message={`Delete slide "${t(p.title, "en")}"?\n\nThis cannot be undone.`} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

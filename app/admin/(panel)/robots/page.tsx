import Link from "next/link";
import { prisma } from "@/lib/db";
import { money } from "@/lib/format";
import { deleteRobot, duplicateRobot } from "../../actions";

export const dynamic = "force-dynamic";

export default async function RobotsList() {
  const robots = await prisma.robot.findMany({ orderBy: { order: "asc" } });
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Robots</h1>
        <Link href="/admin/robots/new" className="btn-primary">+ New robot</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {robots.map((r) => (
          <div key={r.id} className="card overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {r.image && <img src={r.image} alt="" className="h-32 w-full object-cover" />}
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{r.brand} {r.model}</h3>
                {!r.published && <span className="chip">hidden</span>}
              </div>
              <div className="text-xs text-slate-400">{r.year} · {r.armReach} mm · {r.payload} kg · {r.controller}</div>
              <div className="mt-1 text-sm font-semibold text-brand-300">{money(r.price, r.currency)}</div>
              <div className="mt-3 flex gap-2">
                <Link href={`/admin/robots/${r.id}`} className="btn-ghost !px-3 !py-1.5 text-xs">Edit</Link>
                <form action={duplicateRobot}><input type="hidden" name="id" value={r.id} /><button className="btn-ghost !px-3 !py-1.5 text-xs">Copy</button></form>
                <form action={deleteRobot}><input type="hidden" name="id" value={r.id} /><button className="btn-ghost !px-3 !py-1.5 text-xs text-red-400">Delete</button></form>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

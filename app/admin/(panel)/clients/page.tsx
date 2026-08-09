import Link from "next/link";
import { requireContentEditor } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { localeNames, isLocale } from "@/lib/i18n";
import ConfirmDeleteButton from "@/components/admin/ConfirmDeleteButton";
import { deleteClient } from "../../actions";

export const dynamic = "force-dynamic";

const FLASH: Record<string, { text: string; ok: boolean }> = {
  deleted: { text: "Client deleted.", ok: true },
  hasleads: { text: "This client has linked leads and can't be deleted. Unlink or delete those leads first.", ok: false },
};

export default async function ClientsList({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  await requireContentEditor();
  const clients = await prisma.client.findMany({
    orderBy: { company: "asc" },
    include: { _count: { select: { leads: true } } },
  });

  const flash = FLASH[searchParams.ok || ""] || FLASH[searchParams.error || ""];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clients</h1>
        <Link href="/admin/clients/new" className="btn-primary">+ New client</Link>
      </div>

      {flash && (
        <div className={`mb-4 rounded-lg border px-4 py-2 text-sm ${flash.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-red-500/40 bg-red-500/10 text-red-300"}`}>
          {flash.text}
        </div>
      )}

      {clients.length === 0 ? (
        <div className="card p-6 text-center text-slate-500">No clients yet.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="p-3 font-medium">Company</th>
                <th className="p-3 font-medium">Country</th>
                <th className="p-3 font-medium">Contact person</th>
                <th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium">Phone</th>
                <th className="p-3 font-medium">Language</th>
                <th className="p-3 font-medium">VAT</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-b border-white/5 align-middle">
                  <td className="p-3 font-medium">{c.company || "—"}</td>
                  <td className="p-3 text-slate-300">{c.country || "—"}</td>
                  <td className="p-3 text-slate-300">{c.contactPerson || "—"}</td>
                  <td className="p-3 text-slate-300">{c.email || "—"}</td>
                  <td className="p-3 text-slate-300">{c.phone || "—"}</td>
                  <td className="p-3 text-slate-300">{isLocale(c.locale) ? localeNames[c.locale] : c.locale.toUpperCase()}</td>
                  <td className="p-3">
                    {c.hasVat ? (
                      <span className="chip border-emerald-500/40 text-emerald-300">VAT{c.vatNumber ? ` · ${c.vatNumber}` : ""}</span>
                    ) : (
                      <span className="chip text-slate-400">No VAT</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/clients/${c.id}`} className="btn-ghost !px-3 !py-1.5 text-xs">Edit</Link>
                      <ConfirmDeleteButton
                        action={deleteClient}
                        fields={{ id: c.id }}
                        message={
                          c._count.leads > 0
                            ? `"${c.company || "This client"}" has ${c._count.leads} linked lead(s) and can't be deleted.`
                            : `Delete client "${c.company || "Untitled"}"?\n\nThis cannot be undone.`
                        }
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

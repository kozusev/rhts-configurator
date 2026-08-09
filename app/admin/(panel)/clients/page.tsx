import Link from "next/link";
import { requireContentEditor } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ClientsTable, { type ClientRow } from "@/components/admin/ClientsTable";

export const dynamic = "force-dynamic";

const FLASH: Record<string, { text: string; ok: boolean }> = {
  deleted: { text: "Client deleted.", ok: true },
  merged: { text: "Clients merged.", ok: true },
  hasleads: { text: "This client has linked leads and can't be deleted. Unlink or delete those leads first.", ok: false },
  mergecount: { text: "Select at least two clients to merge.", ok: false },
};

export default async function ClientsList({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  await requireContentEditor();
  const clients = await prisma.client.findMany({
    orderBy: { company: "asc" },
    include: { _count: { select: { leads: true } } },
  });

  const rows: ClientRow[] = clients.map((c) => ({
    id: c.id,
    company: c.company,
    country: c.country,
    contactPerson: c.contactPerson,
    email: c.email,
    phone: c.phone,
    locale: c.locale,
    hasVat: c.hasVat,
    vatNumber: c.vatNumber,
    leadCount: c._count.leads,
  }));

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

      {rows.length === 0 ? (
        <div className="card p-6 text-center text-slate-500">No clients yet.</div>
      ) : (
        <ClientsTable clients={rows} />
      )}
    </div>
  );
}

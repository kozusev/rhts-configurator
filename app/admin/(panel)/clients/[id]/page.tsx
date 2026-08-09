import Link from "next/link";
import { requireContentEditor } from "@/lib/auth";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { locales, localeNames } from "@/lib/i18n";
import { saveClient } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function EditClient({ params }: { params: { id: string } }) {
  await requireContentEditor();
  const isNew = params.id === "new";
  const c = isNew ? null : await prisma.client.findUnique({ where: { id: params.id } });
  if (!isNew && !c) notFound();

  return (
    <div className="max-w-3xl">
      <Link href="/admin/clients" className="text-sm text-slate-400 hover:text-white">← Back to clients</Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold">{isNew ? "New client" : "Edit client"}</h1>

      <form action={saveClient} className="card space-y-5 p-6">
        {c && <input type="hidden" name="id" value={c.id} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Company name</label><input name="company" defaultValue={c?.company || ""} className="field" required /></div>
          <div><label className="label">Country</label><input name="country" defaultValue={c?.country || ""} className="field" /></div>
          <div><label className="label">Contact person</label><input name="contactPerson" defaultValue={c?.contactPerson || ""} className="field" /></div>
          <div>
            <label className="label">Communication language</label>
            <select name="locale" defaultValue={c?.locale || "en"} className="field">
              {locales.map((l) => <option key={l} value={l}>{localeNames[l]}</option>)}
            </select>
          </div>
          <div><label className="label">Email</label><input name="email" type="email" defaultValue={c?.email || ""} className="field" /></div>
          <div><label className="label">Phone</label><input name="phone" defaultValue={c?.phone || ""} className="field" /></div>
        </div>

        <div className="rounded-lg border border-white/10 p-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="hasVat" defaultChecked={c?.hasVat ?? false} /> This client works with VAT
          </label>
          <div className="mt-3">
            <label className="label">VAT number (if any)</label>
            <input name="vatNumber" defaultValue={c?.vatNumber || ""} className="field sm:max-w-xs" />
          </div>
        </div>

        <div>
          <label className="label">Note</label>
          <textarea name="note" rows={3} defaultValue={c?.note || ""} className="field text-sm" />
        </div>

        <button className="btn-primary">Save client</button>
      </form>
    </div>
  );
}

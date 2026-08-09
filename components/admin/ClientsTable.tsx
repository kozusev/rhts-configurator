"use client";

import { useState } from "react";
import Link from "next/link";
import { localeNames, isLocale, type Locale } from "@/lib/i18n";
import ConfirmDeleteButton from "@/components/admin/ConfirmDeleteButton";
import { deleteClient, mergeClients } from "@/app/admin/actions";

export type ClientRow = {
  id: string;
  company: string;
  country: string;
  contactPerson: string;
  email: string;
  phone: string;
  locale: string;
  hasVat: boolean;
  vatNumber: string;
  leadCount: number;
};

export default function ClientsTable({ clients }: { clients: ClientRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  // clients arrive sorted by company; the first selected in that order is the one kept.
  const selectedList = clients.filter((c) => selected.has(c.id));
  const primaryLabel = selectedList[0]?.company || selectedList[0]?.id || "";
  const langName = (l: string) => (isLocale(l) ? localeNames[l as Locale] : l.toUpperCase());

  return (
    <>
      <form
        action={mergeClients}
        onSubmit={(e) => {
          if (
            selected.size < 2 ||
            !confirm(`Merge ${selected.size} clients into "${primaryLabel}"?\n\nTheir leads move to it and the other clients are deleted.`)
          ) {
            e.preventDefault();
          }
        }}
        className="mb-3 flex flex-wrap items-center gap-3"
      >
        {[...selected].map((id) => (
          <input key={id} type="hidden" name="ids" value={id} />
        ))}
        <button disabled={selected.size < 2} className="btn-ghost !px-3 !py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40">
          Merge {selected.size >= 2 ? selected.size : ""} selected
        </button>
        {selected.size >= 2 && (
          <span className="text-xs text-slate-400">
            Kept: <b className="text-slate-200">{primaryLabel}</b> (first alphabetically) — the others merge into it.
          </span>
        )}
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="w-8 p-3" />
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
              <tr key={c.id} className={`border-b border-white/5 align-middle ${selected.has(c.id) ? "bg-brand-500/5" : ""}`}>
                <td className="p-3">
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} aria-label={`Select ${c.company}`} />
                </td>
                <td className="p-3 font-medium">{c.company || "—"}</td>
                <td className="p-3 text-slate-300">{c.country || "—"}</td>
                <td className="p-3 text-slate-300">{c.contactPerson || "—"}</td>
                <td className="p-3 text-slate-300">{c.email || "—"}</td>
                <td className="p-3 text-slate-300">{c.phone || "—"}</td>
                <td className="p-3 text-slate-300">{langName(c.locale)}</td>
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
                        c.leadCount > 0
                          ? `"${c.company || "This client"}" has ${c.leadCount} linked lead(s) and can't be deleted.`
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
    </>
  );
}

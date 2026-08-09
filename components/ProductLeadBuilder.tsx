"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { createProductLead, updateProductLead } from "@/app/admin/lead-actions";
import { money } from "@/lib/format";
import { locales, localeNames } from "@/lib/i18n";

type Line = { name: string; description: string; qty: number; unitPrice: number; unitCost: number };

const emptyLine = (): Line => ({ name: "", description: "", qty: 1, unitPrice: 0, unitCost: 0 });

export default function ProductLeadBuilder({
  mode = "create",
  leadId,
  defaultCurrency = "EUR",
  defaultLocale = "en",
  initialLines,
}: {
  mode?: "create" | "edit";
  leadId?: string;
  defaultCurrency?: string;
  defaultLocale?: string;
  initialLines?: Line[];
}) {
  const [lines, setLines] = useState<Line[]>(initialLines && initialLines.length ? initialLines : [emptyLine()]);
  const [currency, setCurrency] = useState(defaultCurrency);
  const [locale, setLocale] = useState(defaultLocale);

  const total = lines.reduce((s, l) => s + (l.qty || 0) * (l.unitPrice || 0), 0);
  const totalCost = lines.reduce((s, l) => s + (l.qty || 0) * (l.unitCost || 0), 0);
  const margin = total - totalCost;
  const marginPct = total > 0 ? (margin / total) * 100 : 0;
  const marginAccent = margin >= 0 ? "text-emerald-300" : "text-red-300";

  const update = (i: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (i: number) => setLines((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));

  return (
    <form action={mode === "edit" ? updateProductLead : createProductLead} className="space-y-8">
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
      <input type="hidden" name="currency" value={currency} />
      {mode === "create" && <input type="hidden" name="locale" value={locale} />}
      {mode === "edit" && leadId && <input type="hidden" name="id" value={leadId} />}

      {/* Line items */}
      <section className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Items</h2>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">Currency</span>
            <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} className="field !w-20 !py-1.5 text-center text-sm" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2 pr-2 font-medium">Product / service</th>
                <th className="w-16 px-2 pb-2 text-right font-medium">Qty</th>
                <th className="w-28 px-2 pb-2 text-right font-medium">Unit price</th>
                <th className="w-28 px-2 pb-2 text-right font-medium">Unit cost</th>
                <th className="w-28 px-2 pb-2 text-right font-medium">Line total</th>
                <th className="w-8 pb-2 pl-2" />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="border-t border-white/5 align-top">
                  <td className="py-2 pr-2">
                    <input
                      value={l.name}
                      onChange={(e) => update(i, { name: e.target.value })}
                      placeholder="e.g. Spare spindle / Installation service / ENCY licence"
                      className="field !py-1.5"
                    />
                    <input
                      value={l.description}
                      onChange={(e) => update(i, { description: e.target.value })}
                      placeholder="Description (optional)"
                      className="field mt-1 !py-1.5 text-xs"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input type="number" step="any" value={l.qty} onChange={(e) => update(i, { qty: parseFloat(e.target.value) || 0 })} className="field !py-1.5 text-right" />
                  </td>
                  <td className="px-2 py-2">
                    <input type="number" step="any" value={l.unitPrice} onChange={(e) => update(i, { unitPrice: parseFloat(e.target.value) || 0 })} className="field !py-1.5 text-right" />
                  </td>
                  <td className="px-2 py-2">
                    <input type="number" step="any" value={l.unitCost} onChange={(e) => update(i, { unitCost: parseFloat(e.target.value) || 0 })} className="field !py-1.5 text-right" />
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right text-slate-300">
                    {money((l.qty || 0) * (l.unitPrice || 0), currency)}
                  </td>
                  <td className="py-2 pl-2 text-right">
                    <button type="button" onClick={() => removeLine(i)} aria-label="Remove line" className="text-slate-400 hover:text-red-400">
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button type="button" onClick={addLine} className="mt-4 btn-ghost !px-3 !py-1.5 text-xs">
          + Add item
        </button>

        {/* Totals: sale, cost, margin — cost columns are internal */}
        <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-4">
          <Stat label="Sale total" value={money(total, currency)} accent="text-brand-300" />
          <Stat label="Total cost" value={money(totalCost, currency)} accent="text-amber-300" />
          <Stat label="Margin" value={money(margin, currency)} accent={marginAccent} />
          <Stat label="Margin %" value={`${marginPct.toFixed(1)}%`} accent={marginAccent} />
        </div>
      </section>

      {/* Customer (create mode only — on an existing lead use the Edit customer button) */}
      {mode === "create" && (
        <section className="card p-6">
          <h2 className="mb-1 text-lg font-bold">Customer</h2>
          <p className="mb-4 text-xs text-slate-500">Optional — you can fill these in later on the lead page.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Communication language</label>
              <select value={locale} onChange={(e) => setLocale(e.target.value)} className="field">
                {locales.map((l) => <option key={l} value={l}>{localeNames[l]}</option>)}
              </select>
            </div>
            <div className="hidden sm:block" />
            <div><label className="label">First name</label><input name="firstName" className="field" /></div>
            <div><label className="label">Last name</label><input name="lastName" className="field" /></div>
            <div><label className="label">Email</label><input name="email" type="email" className="field" /></div>
            <div><label className="label">Phone</label><input name="phone" className="field" /></div>
            <div><label className="label">Company</label><input name="company" className="field" /></div>
            <div><label className="label">Reg. / VAT number</label><input name="regNumber" className="field" /></div>
            <div className="sm:col-span-2"><label className="label">Delivery address</label><input name="deliveryAddress" className="field" /></div>
            <div className="sm:col-span-2"><label className="label">Note</label><textarea name="note" rows={2} className="field text-sm" /></div>
          </div>
        </section>
      )}

      <SaveButton mode={mode} />
    </form>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-ink-900/40 p-3 text-center">
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`text-lg font-bold ${accent}`}>{value}</div>
    </div>
  );
}

function SaveButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary" disabled={pending}>
      {pending ? "Saving…" : mode === "edit" ? "Save changes" : "Create lead"}
    </button>
  );
}

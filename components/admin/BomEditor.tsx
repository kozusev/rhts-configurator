"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { saveBom } from "@/app/admin/actions";
import { money } from "@/lib/format";

type Line = { name: string; qty: number; unitCost: number };

export default function BomEditor({
  productType,
  productId,
  returnTo,
  salePrice,
  currency,
  initialLines,
}: {
  productType: "package" | "robot" | "option";
  productId: string;
  returnTo: string;
  salePrice: number;
  currency: string;
  initialLines: Line[];
}) {
  const [lines, setLines] = useState<Line[]>(initialLines);

  const totalCost = lines.reduce((s, l) => s + (l.qty || 0) * (l.unitCost || 0), 0);
  const margin = salePrice - totalCost;
  const marginPct = salePrice > 0 ? (margin / salePrice) * 100 : 0;
  const marginAccent = margin >= 0 ? "text-emerald-300" : "text-red-300";

  const update = (i: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, { name: "", qty: 1, unitCost: 0 }]);
  const removeLine = (i: number) => setLines((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <form action={saveBom} className="card space-y-4 p-6">
      <div>
        <h2 className="text-lg font-bold">
          Bill of materials <span className="text-xs font-normal text-slate-500">— internal, never shown to customers</span>
        </h2>
        <p className="text-sm text-slate-400">List the components that make up this product to work out its cost and margin.</p>
      </div>

      <input type="hidden" name="productType" value={productType} />
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="pb-2 pr-2 font-medium">Component</th>
              <th className="w-20 px-2 pb-2 text-right font-medium">Qty</th>
              <th className="w-32 px-2 pb-2 text-right font-medium">Unit cost</th>
              <th className="w-32 px-2 pb-2 text-right font-medium">Line total</th>
              <th className="w-8 pb-2 pl-2" />
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 && (
              <tr>
                <td colSpan={5} className="py-3 text-slate-500">No components yet — add the first one below.</td>
              </tr>
            )}
            {lines.map((l, i) => (
              <tr key={i} className="border-t border-white/5">
                <td className="py-2 pr-2">
                  <input
                    value={l.name}
                    onChange={(e) => update(i, { name: e.target.value })}
                    placeholder="e.g. Servo motor"
                    className="field !py-1.5"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    step="any"
                    value={l.qty}
                    onChange={(e) => update(i, { qty: parseFloat(e.target.value) || 0 })}
                    className="field !py-1.5 text-right"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    step="any"
                    value={l.unitCost}
                    onChange={(e) => update(i, { unitCost: parseFloat(e.target.value) || 0 })}
                    className="field !py-1.5 text-right"
                  />
                </td>
                <td className="whitespace-nowrap px-2 py-2 text-right text-slate-300">
                  {money((l.qty || 0) * (l.unitCost || 0), currency)}
                </td>
                <td className="py-2 pl-2 text-right">
                  <button type="button" onClick={() => removeLine(i)} aria-label="Remove component" className="text-slate-400 hover:text-red-400">
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button type="button" onClick={addLine} className="btn-ghost !px-3 !py-1.5 text-xs">
        + Add component
      </button>

      <div className="grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-4">
        <Stat label="Sale price" value={money(salePrice, currency)} accent="text-brand-300" />
        <Stat label="Total cost" value={money(totalCost, currency)} accent="text-amber-300" />
        <Stat label="Margin" value={money(margin, currency)} accent={marginAccent} />
        <Stat label="Margin %" value={`${marginPct.toFixed(1)}%`} accent={marginAccent} />
      </div>

      <SaveButton />
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

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary" disabled={pending}>
      {pending ? "Saving…" : "Save bill of materials"}
    </button>
  );
}

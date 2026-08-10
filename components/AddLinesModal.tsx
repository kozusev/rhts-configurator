"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useFormStatus } from "react-dom";
import { addLeadLines } from "@/app/admin/lead-actions";
import { money } from "@/lib/format";

type Line = { name: string; description: string; qty: number; unitPrice: number; unitCost: number };

const emptyLine = (): Line => ({ name: "", description: "", qty: 1, unitPrice: 0, unitCost: 0 });

export default function AddLinesModal({
  leadId,
  currency = "EUR",
  canSeeCost = true,
}: {
  leadId: string;
  currency?: string;
  canSeeCost?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  useEffect(() => setMounted(true), []);

  const update = (i: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (i: number) => setLines((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));

  const cleaned = lines.filter((l) => l.name.trim() !== "" || l.unitPrice !== 0);
  const addTotal = cleaned.reduce((s, l) => s + (l.qty || 0) * (l.unitPrice || 0), 0);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost !px-3 !py-1.5 text-sm">
        + Add line items
      </button>

      {mounted && open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-8" onClick={() => setOpen(false)}>
            <div className="card w-full max-w-3xl p-6" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Add line items</h2>
                  <p className="text-xs text-slate-500">Extra goods or services added to this offer — the configured cell is left unchanged.</p>
                </div>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-slate-400 hover:text-white">✕</button>
              </div>

              <form action={addLeadLines}>
                <input type="hidden" name="id" value={leadId} />
                <input type="hidden" name="currency" value={currency} />
                <input type="hidden" name="lines" value={JSON.stringify(cleaned)} />

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                        <th className="pb-2 pr-2 font-medium">Product / service</th>
                        <th className="w-16 px-2 pb-2 text-right font-medium">Qty</th>
                        <th className="w-28 px-2 pb-2 text-right font-medium">Unit price</th>
                        {canSeeCost && <th className="w-28 px-2 pb-2 text-right font-medium">Unit cost</th>}
                        <th className="w-28 px-2 pb-2 text-right font-medium">Line total</th>
                        <th className="w-8 pb-2 pl-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l, i) => (
                        <tr key={i} className="border-t border-white/5 align-top">
                          <td className="py-2 pr-2">
                            <input value={l.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="e.g. Spare spindle / Installation service" className="field !py-1.5" />
                            <input value={l.description} onChange={(e) => update(i, { description: e.target.value })} placeholder="Description (optional)" className="field mt-1 !py-1.5 text-xs" />
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" step="any" value={l.qty} onChange={(e) => update(i, { qty: parseFloat(e.target.value) || 0 })} className="field !py-1.5 text-right" />
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" step="any" value={l.unitPrice} onChange={(e) => update(i, { unitPrice: parseFloat(e.target.value) || 0 })} className="field !py-1.5 text-right" />
                          </td>
                          {canSeeCost && (
                            <td className="px-2 py-2">
                              <input type="number" step="any" value={l.unitCost} onChange={(e) => update(i, { unitCost: parseFloat(e.target.value) || 0 })} className="field !py-1.5 text-right" />
                            </td>
                          )}
                          <td className="whitespace-nowrap px-2 py-2 text-right text-slate-300">{money((l.qty || 0) * (l.unitPrice || 0), currency)}</td>
                          <td className="py-2 pl-2 text-right">
                            <button type="button" onClick={() => removeLine(i)} aria-label="Remove line" className="text-slate-400 hover:text-red-400">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button type="button" onClick={addLine} className="mt-3 btn-ghost !px-3 !py-1.5 text-xs">+ Add another</button>

                <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                  <div className="text-sm text-slate-400">
                    Adding <span className="font-semibold text-slate-200">{money(addTotal, currency)}</span> to the offer.
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setOpen(false)} className="btn-ghost !px-4 !py-2 text-sm">Cancel</button>
                    <Submit disabled={cleaned.length === 0} />
                  </div>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary !px-4 !py-2 text-sm" disabled={disabled || pending}>
      {pending ? "Adding…" : "Add to offer"}
    </button>
  );
}

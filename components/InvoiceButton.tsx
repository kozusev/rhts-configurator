"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PAYMENT_TERMS, DEFAULT_HS_CODE } from "@/lib/invoiceTerms";

export default function InvoiceButton({ leadId, defaultHsCode }: { leadId: string; defaultHsCode?: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hsCode, setHsCode] = useState(defaultHsCode || DEFAULT_HS_CODE);
  const [termsIdx, setTermsIdx] = useState(0);
  useEffect(() => setMounted(true), []);

  function generate() {
    const url = `/api/leads/${leadId}/invoice?hs=${encodeURIComponent(hsCode)}&terms=${termsIdx}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost !px-3 !py-1.5 text-sm">
        Invoice PDF
      </button>

      {open && mounted && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div className="card my-8 w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">Generate invoice</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-xl text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">HS code</label>
                <input value={hsCode} onChange={(e) => setHsCode(e.target.value)} className="field sm:max-w-xs" />
              </div>

              <div>
                <label className="label">Payment terms</label>
                <div className="space-y-2">
                  {PAYMENT_TERMS.map((term, i) => (
                    <label key={i} className="flex items-start gap-2 text-sm">
                      <input type="radio" name="terms" checked={termsIdx === i} onChange={() => setTermsIdx(i)} className="mt-0.5" />
                      <span>{term}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button type="button" onClick={generate} className="btn-primary">Generate invoice</button>
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

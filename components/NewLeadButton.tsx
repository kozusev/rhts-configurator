"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

export default function NewLeadButton({ className = "btn-primary !px-4 !py-2 text-sm" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        + New lead
      </button>

      {open && mounted && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div className="card my-8 w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-lg font-bold">Create a new lead</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-xl text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
            <p className="mb-4 text-sm text-slate-400">What kind of offer is this?</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href="/admin/leads/new" className="card p-5 text-left transition hover:border-brand-400">
                <div className="text-2xl">🛠️</div>
                <div className="mt-2 font-bold">Config Milling Cell</div>
                <div className="mt-1 text-xs text-slate-400">Configure a pack, robot and options with the full configurator.</div>
              </Link>
              <Link href="/admin/leads/new/product" className="card p-5 text-left transition hover:border-brand-400">
                <div className="text-2xl">📦</div>
                <div className="mt-2 font-bold">Product / Service</div>
                <div className="mt-1 text-xs text-slate-400">Build a quote from free-form line items — products, services or software.</div>
              </Link>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

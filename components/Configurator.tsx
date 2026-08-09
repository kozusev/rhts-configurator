"use client";

import { useMemo, useState } from "react";
import { money } from "@/lib/format";
import { type Locale } from "@/lib/i18n";
import CardCarousel from "./CardCarousel";

export type RobotVM = {
  id: string;
  brand: string;
  model: string;
  condition: string; // "new" | "used"
  year: number;
  armReach: number;
  payload: number;
  controller: string;
  price: number;
  currency: string;
  image: string;
};

export type OptionVM = { id: string; name: string; description: string; price: number; currency: string; image: string };
export type GroupVM = { id: string; name: string; description: string; options: OptionVM[] };

export type PackageVM = { id: string; slug: string; name: string; basePrice: number; currency: string };
export type AdminPackageVM = PackageVM & { linkedGroupIds: string[] };

type Labels = Record<string, string>;

export type ConfiguratorInitial = {
  robotId?: string;
  optionIds?: string[];
  optionQuantities?: Record<string, number>;
  customer?: Partial<{ firstName: string; lastName: string; email: string; phone: string; company: string; note: string; deliveryAddress: string; regNumber: string }>;
};

export default function Configurator({
  locale,
  pkg,
  robots,
  groups,
  labels,
  initial,
  endpoint = "/api/offer",
  adminMode = false,
  submitLabel,
  returnTo,
  packages,
  showCustomerForm,
}: {
  locale: Locale;
  pkg: PackageVM;
  robots: RobotVM[];
  groups: GroupVM[];
  labels: Labels;
  initial?: ConfiguratorInitial;
  endpoint?: string;
  adminMode?: boolean;
  submitLabel?: string;
  returnTo?: string;
  packages?: AdminPackageVM[];
  showCustomerForm?: boolean;
}) {
  // Customer form shows on the public site and in admin "create lead" mode; hidden in "modify offer" mode.
  const customerVisible = showCustomerForm ?? !adminMode;
  // On the public site the customer must provide contact details. A manager creating a
  // lead in the admin panel can leave them blank and fill them in later.
  const customerRequired = !adminMode;
  const [robotId, setRobotId] = useState<string>(initial?.robotId || "");
  // Quantity per option id. An option is "selected" when its quantity is >= 1.
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const q: Record<string, number> = {};
    for (const id of initial?.optionIds || []) q[id] = Math.max(1, Math.round(initial?.optionQuantities?.[id] || 1));
    return q;
  });
  const [form, setForm] = useState({
    firstName: initial?.customer?.firstName || "",
    lastName: initial?.customer?.lastName || "",
    email: initial?.customer?.email || "",
    phone: initial?.customer?.phone || "",
    company: initial?.customer?.company || "",
    note: initial?.customer?.note || "",
    deliveryAddress: initial?.customer?.deliveryAddress || "",
    regNumber: initial?.customer?.regNumber || "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<{ offerNumber: string; pdfUrl: string } | null>(null);
  const [pkgId, setPkgId] = useState<string>(pkg.id);

  // When a package list is provided (admin modify mode), the pack can be switched;
  // otherwise the single fixed `pkg` is used.
  const activePkg: PackageVM = packages?.find((p) => p.id === pkgId) || pkg;
  const linkedGroupIds = packages?.find((p) => p.id === pkgId)?.linkedGroupIds || [];
  const visibleGroups = useMemo(
    () => (packages ? groups.filter((g) => linkedGroupIds.length === 0 || linkedGroupIds.includes(g.id)) : groups),
    [packages, groups, linkedGroupIds]
  );

  const currency = activePkg.currency || "EUR";
  const robot = robots.find((r) => r.id === robotId) || null;

  const qtyOf = (id: string) => quantities[id] || 0;
  const optionList = useMemo(
    () => visibleGroups.flatMap((g) => g.options).filter((o) => qtyOf(o.id) > 0),
    [visibleGroups, quantities]
  );

  const total = useMemo(() => {
    const opt = optionList.reduce((s, o) => s + o.price * (quantities[o.id] || 1), 0);
    return activePkg.basePrice + (robot?.price || 0) + opt;
  }, [activePkg.basePrice, robot, optionList, quantities]);

  function toggleOption(id: string) {
    setQuantities((prev) => {
      const next = { ...prev };
      if (next[id] > 0) delete next[id];
      else next[id] = 1;
      return next;
    });
  }

  function setOptionQty(id: string, qty: number) {
    setQuantities((prev) => {
      const next = { ...prev };
      const n = Math.max(0, Math.round(qty));
      if (n <= 0) delete next[id];
      else next[id] = n;
      return next;
    });
  }

  function changePack(id: string) {
    setPkgId(id);
    // Drop any selected options that don't belong to the new pack's groups.
    const link = packages?.find((p) => p.id === id)?.linkedGroupIds || [];
    const allowed = new Set(
      groups.filter((g) => link.length === 0 || link.includes(g.id)).flatMap((g) => g.options.map((o) => o.id))
    );
    setQuantities((prev) => Object.fromEntries(Object.entries(prev).filter(([oid]) => allowed.has(oid))));
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setErrorMsg("");
    if (!robotId) {
      setErrorMsg(labels.no_robot);
      return;
    }
    if (customerRequired && (!form.firstName || !form.lastName || !form.email || !form.phone)) {
      setErrorMsg(labels.required);
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          packageId: activePkg.id,
          robotId,
          optionIds: optionList.map((o) => o.id),
          optionQuantities: Object.fromEntries(optionList.map((o) => [o.id, quantities[o.id] || 1])),
          ...form,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const data = await res.json();
      if (adminMode) {
        // Modify mode → back to the lead (offer to email the updated offer); create mode → the new lead.
        const dest = returnTo ? `${returnTo}?ok=modified&notify=offer` : data.leadUrl ? `${data.leadUrl}?ok=created` : "/admin";
        window.location.href = dest;
        return;
      }
      setResult({ offerNumber: data.offerNumber, pdfUrl: data.pdfUrl });
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Error");
    }
  }

  if (status === "done" && result) {
    return (
      <div className="card p-8 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-emerald-500/20 text-2xl text-emerald-400">✓</div>
        <h3 className="text-2xl font-bold">{adminMode ? "Offer updated" : labels.thanks_title}</h3>
        <p className="mx-auto mt-2 max-w-md text-slate-300">
          {adminMode ? "The offer was regenerated. It was NOT emailed — use “Resend offer” on the lead page when you’re ready to send it to the client." : labels.thanks_body}
        </p>
        <p className="mt-4 text-sm text-slate-400">Offer № <span className="font-mono text-brand-300">{result.offerNumber}</span></p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <a href={result.pdfUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
            {labels.download_pdf}
          </a>
          {adminMode && (
            <a href="/admin" className="btn-ghost">← Back to dashboard</a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="space-y-12 pb-8">
        {/* Milling pack (admin modify mode only) */}
        {packages && packages.length > 0 && (
          <section>
            <h2 className="mb-4 text-xl font-bold">Milling pack</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {packages.map((p) => {
                const active = p.id === pkgId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => changePack(p.id)}
                    className={`card p-4 text-left transition ${active ? "border-brand-400 ring-2 ring-brand-400/50" : "hover:border-white/20"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{p.name}</span>
                      {active && <span className="chip bg-brand-500 text-white">{labels.selected}</span>}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-brand-300">{money(p.basePrice, p.currency, locale)}</div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Robots */}
        <section>
          <h2 className="mb-4 text-xl font-bold">{labels.step_robot}</h2>
          <CardCarousel>
            {robots.map((r) => {
              const active = r.id === robotId;
              return (
                <button
                  key={r.id}
                  onClick={() => setRobotId(r.id)}
                  className={`card flex h-full w-full flex-col overflow-hidden p-4 text-left transition ${active ? "border-brand-400 ring-2 ring-brand-400/50" : "hover:border-white/20"}`}
                >
                  <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.image} alt={r.model} className="absolute inset-0 h-full w-full object-cover" />
                    <div className={`absolute left-2 top-2 rounded-md px-2 py-0.5 text-xs font-medium text-white shadow ring-1 ring-black/20 ${r.condition === "used" ? "bg-amber-500" : "bg-emerald-500"}`}>
                      {r.condition === "used" ? labels.cond_used : labels.cond_new}
                    </div>
                    {active && <div className="absolute right-2 top-2 chip bg-brand-500 text-white">{labels.selected}</div>}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <h3 className="font-bold leading-tight">{r.brand} {r.model}</h3>
                    <dl className="mt-3 space-y-1 text-xs text-slate-400">
                      <div className="flex justify-between"><dt>{labels.robot_year}</dt><dd className="text-slate-200">{r.year}</dd></div>
                      <div className="flex justify-between"><dt>{labels.robot_payload}</dt><dd className="text-slate-200">{r.payload} kg</dd></div>
                      <div className="flex justify-between"><dt>{labels.robot_reach}</dt><dd className="text-slate-200">{r.armReach} mm</dd></div>
                      <div className="flex justify-between"><dt>{labels.robot_controller}</dt><dd className="text-slate-200">{r.controller}</dd></div>
                    </dl>
                    <div className="mt-3 flex items-center justify-between pt-2">
                      <span className="text-sm font-bold text-brand-300">{money(r.price, r.currency, locale)}</span>
                      <span className={`btn ${active ? "btn-primary" : "btn-ghost"} !px-3 !py-1.5 text-xs`}>{active ? labels.selected : labels.select}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </CardCarousel>
        </section>

        {/* Options */}
        {visibleGroups.length > 0 && (
          <section>
            <h2 className="mb-4 text-xl font-bold">{labels.step_options}</h2>
            <div className="space-y-10">
              {visibleGroups.map((g) => (
                <div key={g.id}>
                  <div className="mb-3">
                    <h3 className="text-lg font-semibold">{g.name}</h3>
                    {g.description && <p className="text-sm text-slate-400">{g.description}</p>}
                  </div>
                  <CardCarousel>
                    {g.options.map((o) => {
                      const qty = qtyOf(o.id);
                      const active = qty > 0;
                      return (
                        <div key={o.id} className={`card flex h-full flex-col overflow-hidden p-4 transition ${active ? "border-brand-400/70 ring-2 ring-brand-400/40" : ""}`}>
                          {o.image && (
                            <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-lg">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={o.image} alt={o.name} className="absolute inset-0 h-full w-full object-cover" />
                            </div>
                          )}
                          <div className="flex flex-1 flex-col">
                            <h4 className="font-semibold leading-tight">{o.name}</h4>
                            {o.description && <p className="mt-1 text-xs text-slate-400">{o.description}</p>}
                            <div className="mt-3 flex items-center justify-between pt-2">
                              <span className="whitespace-nowrap text-sm font-bold text-brand-300">
                                +{money(o.price, o.currency, locale)}
                                {active && qty > 1 && (
                                  <span className="ml-1 text-slate-400">× {qty} = {money(o.price * qty, o.currency, locale)}</span>
                                )}
                              </span>
                              {active ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    aria-label="Decrease quantity"
                                    onClick={() => setOptionQty(o.id, qty - 1)}
                                    className="btn btn-ghost !h-7 !w-7 !px-0 !py-0 text-base leading-none"
                                  >
                                    −
                                  </button>
                                  <input
                                    type="number"
                                    min={0}
                                    value={qty}
                                    onChange={(e) => setOptionQty(o.id, parseInt(e.target.value || "0", 10))}
                                    className="field !w-12 !px-1 !py-1 text-center text-sm"
                                  />
                                  <button
                                    type="button"
                                    aria-label="Increase quantity"
                                    onClick={() => setOptionQty(o.id, qty + 1)}
                                    className="btn btn-primary !h-7 !w-7 !px-0 !py-0 text-base leading-none"
                                  >
                                    +
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => toggleOption(o.id)}
                                  className="btn btn-ghost !px-3 !py-1.5 text-xs"
                                >
                                  + {labels.add}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardCarousel>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Contact form — hidden only in admin "modify offer" mode */}
        {customerVisible && (
        <section id="contact-form">
          <h2 className="mb-4 text-xl font-bold">{labels.step_contact}</h2>
          <form onSubmit={submit} className="card space-y-4 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">{labels.first_name}{customerRequired ? " *" : ""}</label>
                <input className="field" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div>
                <label className="label">{labels.last_name}{customerRequired ? " *" : ""}</label>
                <input className="field" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
              <div>
                <label className="label">{labels.email}{customerRequired ? " *" : ""}</label>
                <input type="email" className="field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="label">{labels.phone}{customerRequired ? " *" : ""}</label>
                <input className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="label">{labels.company}</label>
                <input className="field" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>
              <div>
                <label className="label">{labels.reg_number}</label>
                <input className="field" value={form.regNumber} onChange={(e) => setForm({ ...form, regNumber: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">{labels.delivery_address}</label>
                <input className="field" value={form.deliveryAddress} onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">{labels.optional_note}</label>
                <textarea className="field min-h-[80px]" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>
            </div>
            {errorMsg && <p className="text-sm text-red-400">{errorMsg}</p>}
            <button type="submit" disabled={status === "sending"} className="btn-primary w-full sm:w-auto">
              {status === "sending" ? labels.sending : submitLabel || labels.get_offer}
            </button>
          </form>
        </section>
        )}
      </div>

      {/* Sticky cost footer — transparent card that stays pinned while scrolling */}
      <div className="sticky bottom-4 z-30 mt-2">
        <div className="rounded-2xl border border-white/15 bg-ink-900/55 px-4 py-3 shadow-2xl shadow-black/50 backdrop-blur-md sm:px-6 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
              <span className="text-slate-300">
                <span className="text-slate-500">{labels.base_pack}:</span> <b className="text-white">{activePkg.name}</b>
              </span>
              <span className="text-slate-300">
                <span className="text-slate-500">{labels.robot}:</span>{" "}
                <b className="text-white">{robot ? `${robot.brand} ${robot.model}` : "—"}</b>
              </span>
              <span className="text-slate-300">
                <span className="text-slate-500">{labels.options}:</span> <b className="text-white">{optionList.length}</b>
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 sm:justify-end">
              <div className="text-right leading-tight">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">{labels.total}</div>
                <div className="text-2xl font-bold text-brand-300">{money(total, currency, locale)}</div>
              </div>
              {adminMode ? (
                <div className="flex flex-col items-end gap-1">
                  {errorMsg && <span className="text-xs text-red-400">{errorMsg}</span>}
                  <button
                    type="button"
                    onClick={() => submit()}
                    disabled={status === "sending"}
                    className="btn-primary whitespace-nowrap"
                  >
                    {status === "sending" ? labels.sending : submitLabel || "Save modification"}
                  </button>
                </div>
              ) : (
                <a href="#contact-form" className="btn-primary whitespace-nowrap">{labels.get_offer}</a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

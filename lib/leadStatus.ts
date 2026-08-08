export const LEAD_STATUSES = [
  "new", "contacted", "updated", "discounted",
  "production", "shipped", "delivered", "installation",
  "closed", "canceled", "terminated",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Statuses that count as a live/active lead (not won, lost or dead). */
export const IDLE_STATUSES: readonly string[] = [
  "new", "contacted", "updated", "discounted", "production", "shipped", "delivered", "installation",
];

export type StatusMeta = { label: string; badge: string; dot: string; star: boolean };

/** Badge styling per status. Closed is gold with stars. */
export function statusMeta(status: string): StatusMeta {
  switch (status) {
    case "new":
      return { label: "New", badge: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300", dot: "bg-emerald-400", star: false };
    case "contacted":
      return { label: "Contacted", badge: "border-yellow-500/40 bg-yellow-500/15 text-yellow-300", dot: "bg-yellow-400", star: false };
    case "updated":
      return { label: "Update Offer", badge: "border-sky-500/40 bg-sky-500/15 text-sky-300", dot: "bg-sky-400", star: false };
    case "discounted":
      return { label: "Discount Applied", badge: "border-teal-500/40 bg-teal-500/15 text-teal-300", dot: "bg-teal-400", star: false };
    case "production":
      return { label: "Production", badge: "border-violet-500/40 bg-violet-500/15 text-violet-300", dot: "bg-violet-400", star: false };
    case "shipped":
      return { label: "Shipped", badge: "border-cyan-500/40 bg-cyan-500/15 text-cyan-300", dot: "bg-cyan-400", star: false };
    case "delivered":
      return { label: "Delivered", badge: "border-lime-500/40 bg-lime-500/15 text-lime-300", dot: "bg-lime-400", star: false };
    case "installation":
      return { label: "Installation", badge: "border-indigo-500/40 bg-indigo-500/15 text-indigo-300", dot: "bg-indigo-400", star: false };
    case "closed":
      return { label: "Closed", badge: "border-amber-400/50 bg-amber-400/20 text-amber-200", dot: "bg-amber-300", star: true };
    case "canceled":
      return { label: "Canceled", badge: "border-red-500/40 bg-red-500/15 text-red-300", dot: "bg-red-400", star: false };
    case "terminated":
      return { label: "Terminated", badge: "border-slate-500/50 bg-slate-600/30 text-slate-300", dot: "bg-slate-400", star: false };
    default:
      return { label: status || "—", badge: "border-white/10 bg-white/5 text-slate-300", dot: "bg-slate-400", star: false };
  }
}

/** Convenience string for a status pill including stars for "closed". */
export function statusLabel(status: string): string {
  const m = statusMeta(status);
  return m.star ? `★ ${m.label} ★` : m.label;
}

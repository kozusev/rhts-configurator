import { statusMeta } from "@/lib/leadStatus";

export default function StatusBadge({ status }: { status: string }) {
  const m = statusMeta(status);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${m.badge}`}>
      {m.star && <span aria-hidden>★</span>}
      {m.label}
      {m.star && <span aria-hidden>★</span>}
    </span>
  );
}

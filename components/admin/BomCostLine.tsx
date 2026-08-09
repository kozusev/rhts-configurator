import { money } from "@/lib/format";

/** Internal cost + margin line shown on admin catalog cards. ADMIN/MANAGER-only pages. */
export default function BomCostLine({ cost, salePrice, currency }: { cost: number; salePrice: number; currency: string }) {
  if (cost <= 0) {
    return <div className="mt-0.5 text-xs text-slate-500">Cost not set</div>;
  }
  const margin = salePrice - cost;
  const pct = salePrice > 0 ? (margin / salePrice) * 100 : 0;
  return (
    <div className="mt-0.5 text-xs text-slate-400">
      Cost {money(cost, currency)} ·{" "}
      <span className={margin >= 0 ? "text-emerald-300" : "text-red-300"}>
        margin {money(margin, currency)} ({pct.toFixed(0)}%)
      </span>
    </div>
  );
}

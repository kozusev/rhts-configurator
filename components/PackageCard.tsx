import Link from "next/link";
import { t, ui, type Locale } from "@/lib/i18n";
import { money } from "@/lib/format";

type Pkg = {
  slug: string;
  name: string;
  tagline: string;
  spindle: string;
  power: string;
  toolHolder: string;
  basePrice: number;
  currency: string;
  image: string;
};

export default function PackageCard({ pkg, locale }: { pkg: Pkg; locale: Locale }) {
  return (
    <Link
      href={`/${locale}/package/${pkg.slug}`}
      className="card group flex flex-col overflow-hidden transition hover:border-brand-400/60 hover:shadow-2xl hover:shadow-brand-900/40"
    >
      <div className="relative aspect-square w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pkg.image} alt={t(pkg.name, locale)} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        <div className="absolute right-3 top-3 chip bg-ink-900/80 font-semibold text-white">{pkg.power}</div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-xl font-bold">{t(pkg.name, locale)}</h3>
        <p className="mt-1 text-sm text-slate-400">{t(pkg.tagline, locale)}</p>
        <dl className="mt-4 space-y-1.5 text-sm">
          <div className="flex justify-between"><dt className="text-slate-400">{ui("spindle", locale)}</dt><dd className="font-medium">{pkg.spindle}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-400">{ui("tool_holder", locale)}</dt><dd className="font-medium">{pkg.toolHolder}</dd></div>
        </dl>
        <div className="mt-5 flex items-end justify-between pt-4">
          <div>
            <div className="text-xs text-slate-400">{ui("from", locale)}</div>
            <div className="text-lg font-bold text-brand-300">{money(pkg.basePrice, pkg.currency, locale)}</div>
          </div>
          <span className="btn-primary">{ui("view_pack", locale)}</span>
        </div>
      </div>
    </Link>
  );
}

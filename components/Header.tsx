import Link from "next/link";
import { ui, type Locale } from "@/lib/i18n";
import LocaleSwitcher from "./LocaleSwitcher";

export default function Header({ locale }: { locale: Locale }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-900/80 backdrop-blur">
      <div className="container-page flex h-20 items-center justify-between">
        <Link href={`/${locale}`} className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt={ui("brand", locale)} className="h-14 w-auto sm:h-16" />
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
          <Link href={`/${locale}`} className="hover:text-white">{ui("nav_home", locale)}</Link>
          <Link href={`/${locale}#packs`} className="hover:text-white">{ui("nav_packages", locale)}</Link>
          <Link href={`/${locale}#contact`} className="hover:text-white">{ui("nav_contact", locale)}</Link>
        </nav>
        <LocaleSwitcher current={locale} />
      </div>
    </header>
  );
}

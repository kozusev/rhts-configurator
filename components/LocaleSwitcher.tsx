"use client";

import { usePathname, useRouter } from "next/navigation";
import { locales, localeNames, type Locale } from "@/lib/i18n";

export default function LocaleSwitcher({ current }: { current: Locale }) {
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(loc: Locale) {
    const parts = pathname.split("/");
    parts[1] = loc; // replace the locale segment
    router.push(parts.join("/") || `/${loc}`);
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-0.5">
      {locales.map((loc) => (
        <button
          key={loc}
          onClick={() => switchTo(loc)}
          className={`rounded-md px-2 py-1 text-xs font-semibold uppercase transition ${
            loc === current ? "bg-brand-500 text-white" : "text-slate-300 hover:text-white"
          }`}
          title={localeNames[loc]}
        >
          {loc}
        </button>
      ))}
    </div>
  );
}

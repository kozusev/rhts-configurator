"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/settings", label: "Company" },
  { href: "/admin/settings/invoice", label: "Invoice" },
  { href: "/admin/settings/templates", label: "Message templates" },
];

export default function SettingsTabs() {
  const pathname = usePathname();
  return (
    <div className="mb-6 flex gap-1 border-b border-white/10">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
              active
                ? "border-brand-400 text-white"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

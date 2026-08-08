"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };
type User = { name: string; email: string; role: string };

export default function AdminMobileNav({
  items,
  user,
  logoutAction,
}: {
  items: NavItem[];
  user: User;
  logoutAction: (formData: FormData) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the menu whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="sticky top-0 z-40 border-b border-white/10 bg-ink-900/90 backdrop-blur md:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/admin" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="RHTS" className="h-7 w-auto" />
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={open}
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-1.5 text-sm text-slate-200"
        >
          <span aria-hidden>{open ? "✕" : "☰"}</span>
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 px-4 pb-4 pt-3">
          <nav className="grid grid-cols-2 gap-2">
            {items.map((n) => {
              const active = pathname === n.href;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`rounded-lg px-3 py-2.5 text-sm ${
                    active ? "bg-brand-500 text-white" : "bg-white/5 text-slate-200 hover:bg-white/10"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-3 border-t border-white/10 pt-3">
            <div className="px-1 text-sm font-medium text-slate-200">{user.name || user.email}</div>
            <div className="mb-2 px-1 text-xs text-slate-500">{user.email} · {user.role}</div>
            <Link href="/" className="block rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white">
              ← View site
            </Link>
            <form action={logoutAction}>
              <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-400 hover:bg-white/5 hover:text-white">
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

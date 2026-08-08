import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { logoutAction } from "../auth-actions";
import AdminMobileNav from "@/components/AdminMobileNav";

const nav: { href: string; label: string; roles?: string[] }[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/leads/new", label: "+ New lead" },
  { href: "/admin/packages", label: "Milling packs", roles: ["ADMIN", "MANAGER"] },
  { href: "/admin/robots", label: "Robots", roles: ["ADMIN", "MANAGER"] },
  { href: "/admin/groups", label: "Option groups", roles: ["ADMIN", "MANAGER"] },
  { href: "/admin/projects", label: "Carousel projects", roles: ["ADMIN", "MANAGER"] },
  { href: "/admin/settings", label: "Settings", roles: ["ADMIN"] },
  { href: "/admin/users", label: "Users", roles: ["ADMIN"] },
  { href: "/admin/account", label: "My account" },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  const items = nav.filter((n) => !n.roles || n.roles.includes(user.role));

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-white/10 bg-ink-800 p-4 md:flex">
        <Link href="/admin" className="mb-6 flex flex-col gap-1 px-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="RHTS" className="h-8 w-auto self-start" />
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin panel</span>
        </Link>
        <nav className="flex-1 space-y-1">
          {items.map((n) => (
            <Link key={n.href} href={n.href} className="block rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white">
              {n.label}
            </Link>
          ))}
        </nav>
        <Link href="/" className="mb-2 block rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white">← View site</Link>
        <div className="mb-2 border-t border-white/10 px-3 pt-3">
          <div className="truncate text-sm font-medium text-slate-200">{user.name || user.email}</div>
          <div className="text-xs text-slate-500">{user.email} · {user.role}</div>
        </div>
        <form action={logoutAction}>
          <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-400 hover:bg-white/5 hover:text-white">Sign out</button>
        </form>
      </aside>
      <div className="min-w-0 flex-1">
        <AdminMobileNav items={items} user={{ name: user.name, email: user.email, role: user.role }} logoutAction={logoutAction} />
        <main className="p-4 sm:p-6 md:p-10">{children}</main>
      </div>
    </div>
  );
}

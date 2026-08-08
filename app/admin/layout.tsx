import "../globals.css";

export const metadata = { title: "RHTS Admin" };

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-ink-900 text-slate-100">{children}</div>;
}

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import SettingsTabs from "@/components/admin/SettingsTabs";

export const dynamic = "force-dynamic";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const me = await getSessionUser();
  if (!me) redirect("/admin/login");
  if (me.role !== "ADMIN") redirect("/admin"); // settings are admin-only

  return (
    <div className="max-w-3xl">
      <h1 className="mb-4 text-2xl font-bold">Settings</h1>
      <SettingsTabs />
      {children}
    </div>
  );
}

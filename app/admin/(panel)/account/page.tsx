import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { changeOwnPassword } from "../../users-actions";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, { text: string; ok: boolean }> = {
  changed: { text: "Your password has been changed.", ok: true },
  invalid: { text: "New password must be at least 6 characters.", ok: false },
  mismatch: { text: "New password and confirmation do not match.", ok: false },
  current: { text: "Your current password is incorrect.", ok: false },
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: { ok?: string; error?: string };
}) {
  const me = await getSessionUser();
  if (!me) redirect("/admin/login");

  const flash = MESSAGES[searchParams.ok || ""] || MESSAGES[searchParams.error || ""];

  return (
    <div className="max-w-md">
      <h1 className="mb-2 text-2xl font-bold">My account</h1>
      <p className="mb-6 text-sm text-slate-400">
        {me.name ? `${me.name} · ` : ""}{me.email} · {me.role}
      </p>

      {flash && (
        <div
          className={`mb-6 rounded-lg border px-4 py-2 text-sm ${
            flash.ok
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/40 bg-red-500/10 text-red-300"
          }`}
        >
          {flash.text}
        </div>
      )}

      <div className="card p-5">
        <h2 className="mb-4 font-bold">Change password</h2>
        <form action={changeOwnPassword} className="space-y-4">
          <div>
            <label className="label">Current password</label>
            <input name="current" type="password" required autoComplete="current-password" className="field" />
          </div>
          <div>
            <label className="label">New password</label>
            <input name="password" type="password" required minLength={6} autoComplete="new-password" className="field" placeholder="min 6 characters" />
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input name="confirm" type="password" required minLength={6} autoComplete="new-password" className="field" />
          </div>
          <button className="btn-primary">Update password</button>
        </form>
      </div>
    </div>
  );
}

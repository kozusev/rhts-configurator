import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { createUser, deleteUser, updateUserRole, resetUserPassword } from "../../users-actions";
import ConfirmDeleteButton from "@/components/admin/ConfirmDeleteButton";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, { text: string; ok: boolean }> = {
  created: { text: "User created.", ok: true },
  deleted: { text: "User deleted.", ok: true },
  updated: { text: "Role updated.", ok: true },
  password: { text: "Password reset.", ok: true },
  invalid: { text: "Enter a valid email and a password of at least 6 characters.", ok: false },
  exists: { text: "A user with that email already exists.", ok: false },
  self: { text: "You can't delete your own account.", ok: false },
  lastadmin: { text: "You can't remove the last remaining admin.", ok: false },
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: { ok?: string; error?: string };
}) {
  const me = await getSessionUser();
  if (!me) redirect("/admin/login");
  if (me.role !== "ADMIN") redirect("/admin");

  const users = await prisma.user.findMany({ orderBy: [{ role: "asc" }, { createdAt: "asc" }] });
  const flash = MESSAGES[searchParams.ok || ""] || MESSAGES[searchParams.error || ""];

  return (
    <div className="max-w-4xl">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold">User management</h1>
        <span className="chip bg-brand-500/20 text-brand-200">You: {me.email} · {me.role}</span>
      </div>
      <p className="mb-6 text-sm text-slate-400">
        Admins manage users and site content. Managers can edit site content but cannot manage users
        or remove admins.
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

      {/* Add user */}
      <div className="card mb-8 p-5">
        <h2 className="mb-4 font-bold">Add a user</h2>
        <form action={createUser} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Name</label>
            <input name="name" className="field" placeholder="Jane Manager" />
          </div>
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" required className="field" placeholder="jane@company.com" />
          </div>
          <div>
            <label className="label">Password</label>
            <input name="password" type="password" required minLength={6} className="field" placeholder="min 6 characters" />
          </div>
          <div>
            <label className="label">Role</label>
            <select name="role" className="field" defaultValue="MANAGER">
              <option value="AGENT">Agent — only their own leads</option>
              <option value="MANAGER">Manager — edit site content + all leads</option>
              <option value="ADMIN">Admin — full access</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <button className="btn-primary">+ Create user</button>
          </div>
        </form>
      </div>

      {/* Users list */}
      <div className="space-y-3">
        {users.map((u) => {
          const isMe = u.id === me.id;
          return (
            <div key={u.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{u.name || "—"}</span>
                  <span
                    className={`chip ${u.role === "ADMIN" ? "bg-brand-500/20 text-brand-200" : "bg-white/10 text-slate-300"}`}
                  >
                    {u.role}
                  </span>
                  {isMe && <span className="chip bg-white/10 text-slate-400">you</span>}
                </div>
                <div className="truncate text-sm text-slate-400">{u.email}</div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Change role */}
                <form action={updateUserRole} className="flex items-center gap-1">
                  <input type="hidden" name="id" value={u.id} />
                  <select name="role" defaultValue={u.role} className="field !w-auto !py-1.5 text-xs">
                    <option value="AGENT">Agent</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <button className="btn-ghost !px-3 !py-1.5 text-xs">Save</button>
                </form>

                {/* Reset password */}
                <form action={resetUserPassword} className="flex items-center gap-1">
                  <input type="hidden" name="id" value={u.id} />
                  <input
                    name="password"
                    type="password"
                    minLength={6}
                    placeholder="new password"
                    className="field !w-36 !py-1.5 text-xs"
                  />
                  <button className="btn-ghost !px-3 !py-1.5 text-xs">Reset</button>
                </form>

                {/* Delete */}
                {!isMe && (
                  <ConfirmDeleteButton
                    action={deleteUser}
                    fields={{ id: u.id }}
                    message={`Delete user ${u.email}?\n\nThis cannot be undone.`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

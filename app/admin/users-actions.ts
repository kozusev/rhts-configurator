"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser, hashPassword, verifyPassword, type Role } from "@/lib/auth";

/** Only an ADMIN may manage users. Returns the acting admin. */
async function requireAdmin() {
  const me = await getSessionUser();
  if (!me) redirect("/admin/login");
  if (me.role !== "ADMIN") redirect("/admin");
  return me;
}

function cleanRole(v: FormDataEntryValue | null): Role {
  if (v === "ADMIN") return "ADMIN";
  if (v === "AGENT") return "AGENT";
  return "MANAGER";
}

export async function createUser(formData: FormData) {
  await requireAdmin();

  const email = String(formData.get("email") || "").toLowerCase().trim();
  const name = String(formData.get("name") || "").trim();
  const password = String(formData.get("password") || "");
  const role = cleanRole(formData.get("role"));

  if (!email || !email.includes("@") || password.length < 6) {
    redirect("/admin/users?error=invalid");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect("/admin/users?error=exists");
  }

  await prisma.user.create({
    data: { email, name, passwordHash: hashPassword(password), role },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?ok=created");
}

export async function deleteUser(formData: FormData) {
  const me = await requireAdmin();
  const id = String(formData.get("id") || "");

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) redirect("/admin/users");

  // Never delete yourself, and never remove the last remaining admin.
  if (target.id === me.id) {
    redirect("/admin/users?error=self");
  }
  if (target.role === "ADMIN") {
    const admins = await prisma.user.count({ where: { role: "ADMIN" } });
    if (admins <= 1) redirect("/admin/users?error=lastadmin");
  }

  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/users");
  redirect("/admin/users?ok=deleted");
}

export async function updateUserRole(formData: FormData) {
  const me = await requireAdmin();
  const id = String(formData.get("id") || "");
  const role = cleanRole(formData.get("role"));

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) redirect("/admin/users");

  // Don't allow demoting the last admin (which could include yourself).
  if (target.role === "ADMIN" && role !== "ADMIN") {
    const admins = await prisma.user.count({ where: { role: "ADMIN" } });
    if (admins <= 1) redirect("/admin/users?error=lastadmin");
  }

  await prisma.user.update({ where: { id }, data: { role } });
  revalidatePath("/admin/users");
  redirect("/admin/users?ok=updated");
}

/** Any logged-in user changes their OWN password (requires current password). */
export async function changeOwnPassword(formData: FormData) {
  const me = await getSessionUser();
  if (!me) redirect("/admin/login");

  const current = String(formData.get("current") || "");
  const next = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");

  if (next.length < 6) redirect("/admin/account?error=invalid");
  if (next !== confirm) redirect("/admin/account?error=mismatch");

  const user = await prisma.user.findUnique({ where: { id: me.id } });
  if (!user || !verifyPassword(current, user.passwordHash)) {
    redirect("/admin/account?error=current");
  }

  await prisma.user.update({ where: { id: me.id }, data: { passwordHash: hashPassword(next) } });
  redirect("/admin/account?ok=changed");
}

export async function resetUserPassword(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const password = String(formData.get("password") || "");

  if (password.length < 6) redirect("/admin/users?error=invalid");

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) redirect("/admin/users");

  await prisma.user.update({ where: { id }, data: { passwordHash: hashPassword(password) } });
  revalidatePath("/admin/users");
  redirect("/admin/users?ok=password");
}

"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession, destroySession, ensureBootstrapAdmin } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  await ensureBootstrapAdmin();

  const email = String(formData.get("email") || "").toLowerCase().trim();
  const password = String(formData.get("password") || "");

  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (!user || !verifyPassword(password, user.passwordHash)) {
    redirect("/admin/login?error=1");
  }

  createSession(user.id);
  redirect("/admin");
}

export async function logoutAction() {
  destroySession();
  redirect("/admin/login");
}

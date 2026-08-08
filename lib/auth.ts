import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual, randomBytes, scryptSync } from "crypto";
import { prisma } from "@/lib/db";

const COOKIE = "rhts_admin";

export type Role = "ADMIN" | "MANAGER" | "AGENT";
export type SessionUser = { id: string; email: string; name: string; role: Role };

/** Admin + Manager can edit the catalog (packs/robots/options), projects and see all leads. Agents cannot. */
export function canEditContent(role: Role): boolean {
  return role === "ADMIN" || role === "MANAGER";
}
/** Agents only see leads they created; everyone else sees all leads. */
export function canSeeAllLeads(role: Role): boolean {
  return role === "ADMIN" || role === "MANAGER";
}

/** Page guard: redirect agents (and logged-out users) away from catalog/project pages. */
export async function requireContentEditor(): Promise<SessionUser> {
  const me = await getSessionUser();
  if (!me) redirect("/admin/login");
  if (!canEditContent(me.role)) redirect("/admin");
  return me;
}

function secret(): string {
  return process.env.AUTH_SECRET || "dev-secret";
}

// ---- Password hashing (scrypt, no external dependency) ----

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 64);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

// ---- Session cookie: "<userId>.<hmac(userId)>" ----

function sign(userId: string): string {
  return createHmac("sha256", secret()).update(userId).digest("hex");
}

function verifyCookie(value: string): string | null {
  const idx = value.lastIndexOf(".");
  if (idx <= 0) return null;
  const userId = value.slice(0, idx);
  const sig = value.slice(idx + 1);
  const expected = sign(userId);
  if (sig.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return userId;
}

export function createSession(userId: string) {
  cookies().set(COOKIE, `${userId}.${sign(userId)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function destroySession() {
  cookies().delete(COOKIE);
}

/** Fast, DB-free check that a validly-signed session cookie is present. */
export function isAuthenticated(): boolean {
  const c = cookies().get(COOKIE)?.value;
  return !!c && verifyCookie(c) !== null;
}

/** Load the signed-in user from the database, or null if none/invalid. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const c = cookies().get(COOKIE)?.value;
  if (!c) return null;
  const userId = verifyCookie(c);
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role as Role };
}

/**
 * Ensure at least one admin exists. On first run (empty user table) an admin is
 * created from ADMIN_EMAIL / ADMIN_PASSWORD so the panel is never locked out.
 * Returns the number of users after seeding.
 */
export async function ensureBootstrapAdmin(): Promise<void> {
  const count = await prisma.user.count();
  if (count > 0) return;
  const email = (process.env.ADMIN_EMAIL || "admin@rhts.local").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || "changeme-admin";
  await prisma.user.create({
    data: { email, name: "Administrator", passwordHash: hashPassword(password), role: "ADMIN" },
  });
}

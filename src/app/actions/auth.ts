"use server";

import { redirect } from "next/navigation";
import {
  createSession,
  clearSession,
  verifyCredentials,
  getSession,
  hashPassword,
  createPendingMfaSession,
  getPendingMfaUserId,
  clearPendingMfaSession,
} from "@/lib/auth";
import { verifyTotp } from "@/lib/totp";
import { db } from "@/lib/db";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const user = await verifyCredentials(email, password);
  if (!user) redirect("/login?error=1");

  if (user.totpEnabled) {
    await createPendingMfaSession(user.id);
    redirect("/login/verify");
  }

  await createSession({
    userId: user.id,
    role: user.role as "LANDLORD" | "TENANT",
    name: user.name,
    email: user.email,
  });
  redirect(user.role === "LANDLORD" ? "/dashboard" : "/portal");
}

export async function verifyMfaCode(formData: FormData) {
  const userId = await getPendingMfaUserId();
  if (!userId) redirect("/login?error=1");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || !user.totpEnabled || !user.totpSecret) redirect("/login?error=1");

  const code = String(formData.get("code") ?? "");
  if (!verifyTotp(user.email, user.totpSecret, code)) {
    redirect("/login/verify?error=1");
  }

  await clearPendingMfaSession();
  await createSession({
    userId: user.id,
    role: user.role as "LANDLORD" | "TENANT",
    name: user.name,
    email: user.email,
  });
  redirect(user.role === "LANDLORD" ? "/dashboard" : "/portal");
}

export async function logout() {
  await clearSession();
  redirect("/login");
}

export async function changePassword(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const base = session.role === "LANDLORD" ? "/settings" : "/portal/settings";
  if (next.length < 8) redirect(`${base}?error=short`);
  const user = await verifyCredentials(session.email, current);
  if (!user) redirect(`${base}?error=wrong`);
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(next) },
  });
  redirect(`${base}?saved=1`);
}

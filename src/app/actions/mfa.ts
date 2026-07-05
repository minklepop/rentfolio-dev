"use server";

import { redirect } from "next/navigation";
import { getSession, verifyCredentials } from "@/lib/auth";
import { generateTotpSecret, verifyTotp } from "@/lib/totp";
import { db } from "@/lib/db";

function settingsPath(role: string): string {
  return role === "LANDLORD" ? "/settings" : "/portal/settings";
}

export async function startMfaEnrollment() {
  const session = await getSession();
  if (!session) redirect("/login");
  await db.user.update({
    where: { id: session.userId },
    data: { totpSecret: generateTotpSecret(), totpEnabled: false },
  });
  redirect(settingsPath(session.role));
}

export async function confirmMfaEnrollment(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await db.user.findUniqueOrThrow({ where: { id: session.userId } });
  const code = String(formData.get("code") ?? "");
  if (!user.totpSecret || !verifyTotp(user.email, user.totpSecret, code)) {
    redirect(`${settingsPath(session.role)}?mfaError=1`);
  }
  await db.user.update({ where: { id: session.userId }, data: { totpEnabled: true } });
  redirect(`${settingsPath(session.role)}?mfaEnabled=1`);
}

export async function cancelMfaEnrollment() {
  const session = await getSession();
  if (!session) redirect("/login");
  await db.user.update({
    where: { id: session.userId },
    data: { totpSecret: null, totpEnabled: false },
  });
  redirect(settingsPath(session.role));
}

export async function disableMfa(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const password = String(formData.get("password") ?? "");
  const user = await verifyCredentials(session.email, password);
  if (!user) redirect(`${settingsPath(session.role)}?mfaWrongPassword=1`);
  await db.user.update({
    where: { id: session.userId },
    data: { totpSecret: null, totpEnabled: false },
  });
  redirect(`${settingsPath(session.role)}?mfaDisabled=1`);
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function sendMessage(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const leaseId = String(formData.get("leaseId"));
  const body = String(formData.get("body") ?? "").trim();
  const returnTo = String(formData.get("returnTo") ?? "/portal/messages");

  if (!body) {
    revalidatePath("/", "layout");
    redirect(returnTo);
  }

  if (session.role === "TENANT") {
    // Tenants may only message on leases they're part of.
    const onLease = await db.leaseTenant.findFirst({
      where: { userId: session.userId, leaseId },
    });
    if (!onLease) redirect("/portal/messages");
  }

  await db.message.create({
    data: { leaseId, authorId: session.userId, body },
  });
  revalidatePath("/", "layout");
  redirect(returnTo);
}

export async function deleteMessage(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "LANDLORD") redirect("/login");

  await db.message.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/", "layout");
  redirect(String(formData.get("returnTo") ?? "/leases"));
}

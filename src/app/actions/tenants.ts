"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireLandlord, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";

export async function createTenant(formData: FormData) {
  await requireLandlord();
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) redirect("/tenants/new?error=short");
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) redirect("/tenants/new?error=email");

  const tenant = await db.user.create({
    data: {
      email,
      name: String(formData.get("name") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim() || null,
      role: "TENANT",
      passwordHash: await hashPassword(password),
    },
  });

  // Optionally attach to a lease right away.
  const leaseId = String(formData.get("leaseId") ?? "");
  if (leaseId) {
    await db.leaseTenant.create({ data: { leaseId, userId: tenant.id } });
  }
  revalidatePath("/", "layout");
  redirect(leaseId ? `/leases/${leaseId}` : `/tenants/${tenant.id}`);
}

export async function updateTenant(formData: FormData) {
  await requireLandlord();
  const id = String(formData.get("id"));
  await db.user.update({
    where: { id },
    data: {
      name: String(formData.get("name") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim() || null,
    },
  });
  revalidatePath("/", "layout");
  redirect(`/tenants/${id}`);
}

export async function resetTenantPassword(formData: FormData) {
  await requireLandlord();
  const id = String(formData.get("id"));
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) redirect(`/tenants/${id}?error=short`);
  await db.user.update({
    where: { id },
    data: { passwordHash: await hashPassword(password) },
  });
  redirect(`/tenants/${id}?saved=1`);
}

export async function deleteTenant(formData: FormData) {
  await requireLandlord();
  const id = String(formData.get("id"));
  const user = await db.user.findUnique({ where: { id } });
  if (user && user.role === "TENANT") {
    await db.user.delete({ where: { id } });
  }
  revalidatePath("/", "layout");
  redirect("/tenants");
}

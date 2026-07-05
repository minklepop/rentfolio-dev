"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseMoney } from "@/lib/money";
import { parseDateInput, todayUTC } from "@/lib/format";

export async function createLease(formData: FormData) {
  await requireLandlord();
  const startDate = parseDateInput(formData.get("startDate"));
  if (!startDate) redirect("/leases/new?error=date");
  const depositCents = parseMoney(formData.get("deposit"));
  const tenantIds = formData.getAll("tenantIds").map(String).filter(Boolean);

  const lease = await db.lease.create({
    data: {
      unitId: String(formData.get("unitId")),
      startDate,
      endDate: parseDateInput(formData.get("endDate")),
      rentCents: parseMoney(formData.get("rent")),
      depositCents,
      rentDueDay: Math.min(28, Math.max(1, Number(formData.get("rentDueDay")) || 1)),
      graceDays: Math.max(0, Number(formData.get("graceDays")) || 0),
      lateFeeCents: parseMoney(formData.get("lateFee")),
      notes: String(formData.get("notes") ?? "").trim() || null,
      tenants: { create: tenantIds.map((userId) => ({ userId })) },
      // Bill the security deposit up front, due at move-in.
      charges:
        depositCents > 0
          ? {
              create: {
                type: "DEPOSIT",
                description: "Security deposit",
                amountCents: depositCents,
                dueDate: startDate,
              },
            }
          : undefined,
    },
  });
  revalidatePath("/", "layout");
  redirect(`/leases/${lease.id}`);
}

export async function updateLease(formData: FormData) {
  await requireLandlord();
  const id = String(formData.get("id"));
  const startDate = parseDateInput(formData.get("startDate"));
  if (!startDate) redirect(`/leases/${id}?error=date`);
  await db.lease.update({
    where: { id },
    data: {
      startDate,
      endDate: parseDateInput(formData.get("endDate")),
      rentCents: parseMoney(formData.get("rent")),
      depositCents: parseMoney(formData.get("deposit")),
      rentDueDay: Math.min(28, Math.max(1, Number(formData.get("rentDueDay")) || 1)),
      graceDays: Math.max(0, Number(formData.get("graceDays")) || 0),
      lateFeeCents: parseMoney(formData.get("lateFee")),
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });
  revalidatePath("/", "layout");
  redirect(`/leases/${id}`);
}

export async function endLease(formData: FormData) {
  await requireLandlord();
  const id = String(formData.get("id"));
  await db.lease.update({
    where: { id },
    data: { status: "ENDED", endDate: todayUTC() },
  });
  revalidatePath("/", "layout");
  redirect(`/leases/${id}`);
}

export async function deleteLease(formData: FormData) {
  await requireLandlord();
  await db.lease.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/", "layout");
  redirect("/leases");
}

export async function addTenantToLease(formData: FormData) {
  await requireLandlord();
  const leaseId = String(formData.get("leaseId"));
  const userId = String(formData.get("userId"));
  if (userId) {
    await db.leaseTenant.upsert({
      where: { leaseId_userId: { leaseId, userId } },
      create: { leaseId, userId },
      update: {},
    });
  }
  revalidatePath("/", "layout");
  redirect(`/leases/${leaseId}`);
}

export async function removeTenantFromLease(formData: FormData) {
  await requireLandlord();
  const leaseId = String(formData.get("leaseId"));
  const userId = String(formData.get("userId"));
  await db.leaseTenant.delete({
    where: { leaseId_userId: { leaseId, userId } },
  });
  revalidatePath("/", "layout");
  redirect(`/leases/${leaseId}`);
}

export async function addCharge(formData: FormData) {
  await requireLandlord();
  const leaseId = String(formData.get("leaseId"));
  const dueDate = parseDateInput(formData.get("dueDate"));
  if (!dueDate) redirect(`/leases/${leaseId}?error=date`);
  await db.charge.create({
    data: {
      leaseId,
      type: String(formData.get("type") ?? "OTHER"),
      description: String(formData.get("description") ?? "").trim() || null,
      amountCents: parseMoney(formData.get("amount")),
      dueDate,
    },
  });
  revalidatePath("/", "layout");
  redirect(`/leases/${leaseId}`);
}

export async function deleteCharge(formData: FormData) {
  await requireLandlord();
  const charge = await db.charge.delete({
    where: { id: String(formData.get("id")) },
  });
  revalidatePath("/", "layout");
  redirect(`/leases/${charge.leaseId}`);
}

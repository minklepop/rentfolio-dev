"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtMoney, parseMoney } from "@/lib/money";
import { parseDateInput, todayUTC } from "@/lib/format";
import { paidCents } from "@/lib/rent";

/**
 * Records one lump payment against a lease and automatically splits it into
 * one Payment row per outstanding charge, oldest due date first, so a single
 * transaction (e.g. one $2,000 Zelle transfer covering two unpaid months)
 * still resolves to individually-tracked, per-charge payment records instead
 * of being a free-floating amount with no link to what it actually paid for.
 * Any amount left over after every outstanding charge is covered is recorded
 * as an unapplied credit (chargeId left null) rather than silently dropped.
 */
export async function recordLeasePayment(formData: FormData) {
  await requireLandlord();
  const leaseId = String(formData.get("leaseId"));
  const returnTo = String(formData.get("returnTo") ?? `/leases/${leaseId}`);
  const totalCents = parseMoney(formData.get("amount"));
  if (totalCents <= 0) redirect(`${returnTo}?payError=1`);

  const paidDate = parseDateInput(formData.get("paidDate")) ?? todayUTC();
  const method = String(formData.get("method") ?? "OTHER");
  const note = String(formData.get("note") ?? "").trim();
  const totalLabel = fmtMoney(totalCents);

  const charges = await db.charge.findMany({
    where: { leaseId },
    include: { payments: true },
    orderBy: { dueDate: "asc" },
  });
  const outstanding = charges
    .map((c) => ({ id: c.id, remaining: c.amountCents - paidCents(c) }))
    .filter((c) => c.remaining > 0);

  let remaining = totalCents;
  const allocations: { chargeId: string | null; amountCents: number; note: string }[] = [];
  for (const charge of outstanding) {
    if (remaining <= 0) break;
    const applied = Math.min(charge.remaining, remaining);
    allocations.push({
      chargeId: charge.id,
      amountCents: applied,
      note: [note, `(part of ${totalLabel} payment, auto-allocated)`].filter(Boolean).join(" "),
    });
    remaining -= applied;
  }
  if (remaining > 0) {
    allocations.push({
      chargeId: null,
      amountCents: remaining,
      note: [note, `(unapplied credit from ${totalLabel} payment, exceeds balance owed)`]
        .filter(Boolean)
        .join(" "),
    });
  }

  await db.payment.createMany({
    data: allocations.map((a) => ({
      leaseId,
      chargeId: a.chargeId,
      amountCents: a.amountCents,
      paidDate,
      method,
      note: a.note,
    })),
  });

  revalidatePath("/", "layout");
  redirect(returnTo);
}

export async function recordPayment(formData: FormData) {
  await requireLandlord();
  const chargeId = String(formData.get("chargeId") ?? "") || null;
  let leaseId = String(formData.get("leaseId") ?? "");
  if (chargeId && !leaseId) {
    const charge = await db.charge.findUniqueOrThrow({ where: { id: chargeId } });
    leaseId = charge.leaseId;
  }
  await db.payment.create({
    data: {
      leaseId,
      chargeId,
      amountCents: parseMoney(formData.get("amount")),
      paidDate: parseDateInput(formData.get("paidDate")) ?? todayUTC(),
      method: String(formData.get("method") ?? "OTHER"),
      note: String(formData.get("note") ?? "").trim() || null,
    },
  });
  revalidatePath("/", "layout");
  redirect(String(formData.get("returnTo") ?? "/payments"));
}

export async function deletePayment(formData: FormData) {
  await requireLandlord();
  await db.payment.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/", "layout");
  redirect(String(formData.get("returnTo") ?? "/payments"));
}

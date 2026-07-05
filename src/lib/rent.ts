import { db } from "./db";
import { todayUTC } from "./format";

export type ChargeStatus = "PAID" | "PARTIAL" | "OVERDUE" | "DUE";

export function paidCents(charge: { payments: { amountCents: number }[] }): number {
  return charge.payments.reduce((sum, p) => sum + p.amountCents, 0);
}

export function chargeStatus(charge: {
  amountCents: number;
  dueDate: Date;
  payments: { amountCents: number }[];
}): ChargeStatus {
  const paid = paidCents(charge);
  if (paid >= charge.amountCents) return "PAID";
  const overdue = charge.dueDate < todayUTC();
  if (paid > 0) return "PARTIAL";
  return overdue ? "OVERDUE" : "DUE";
}

function monthDueDate(year: number, month: number, dueDay: number): Date {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(dueDay, lastDay)));
}

/**
 * Lazily generate monthly RENT charges for all active leases up through the
 * current month, then apply late fees where configured. Called from the
 * dashboard and payments pages so no cron job is needed.
 */
export async function ensureRentCharges(): Promise<void> {
  const today = todayUTC();
  const leases = await db.lease.findMany({ where: { status: "ACTIVE" } });

  for (const lease of leases) {
    // First month to bill: month after chargesThrough, or the lease start month.
    let year: number, month: number;
    if (lease.chargesThrough) {
      year = lease.chargesThrough.getUTCFullYear();
      month = lease.chargesThrough.getUTCMonth() + 1;
    } else {
      year = lease.startDate.getUTCFullYear();
      month = lease.startDate.getUTCMonth();
    }

    const charges: { dueDate: Date }[] = [];
    while (
      year < today.getUTCFullYear() ||
      (year === today.getUTCFullYear() && month <= today.getUTCMonth())
    ) {
      const monthStart = new Date(Date.UTC(year, month, 1));
      const monthEnd = new Date(Date.UTC(year, month + 1, 0));
      // Skip months entirely before the lease starts or after it ends.
      const started = lease.startDate <= monthEnd;
      const ended = lease.endDate != null && lease.endDate < monthStart;
      if (started && !ended) {
        charges.push({ dueDate: monthDueDate(year, month, lease.rentDueDay) });
      }
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
    }

    if (charges.length > 0) {
      await db.charge.createMany({
        data: charges.map((c) => ({
          leaseId: lease.id,
          type: "RENT",
          description: "Monthly rent",
          amountCents: lease.rentCents,
          dueDate: c.dueDate,
        })),
      });
    }

    // Mark generated through the current month (even if every month was skipped,
    // so we don't rescan old months next time).
    const through = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    if (!lease.chargesThrough || lease.chargesThrough < through) {
      await db.lease.update({
        where: { id: lease.id },
        data: { chargesThrough: through },
      });
    }
  }

  await applyLateFees();
}

/** Create LATE_FEE charges for overdue, unpaid rent past the lease grace period. */
async function applyLateFees(): Promise<void> {
  const today = todayUTC();
  const candidates = await db.charge.findMany({
    where: {
      type: "RENT",
      dueDate: { lt: today },
      lease: { status: "ACTIVE", lateFeeCents: { gt: 0 } },
    },
    include: { payments: true, lease: true },
  });

  for (const charge of candidates) {
    if (paidCents(charge) >= charge.amountCents) continue;
    const graceEnd = new Date(charge.dueDate);
    graceEnd.setUTCDate(graceEnd.getUTCDate() + charge.lease.graceDays);
    if (today <= graceEnd) continue;

    const existing = await db.charge.findUnique({
      where: { linkedChargeId: charge.id },
    });
    if (existing) continue;

    await db.charge.create({
      data: {
        leaseId: charge.leaseId,
        type: "LATE_FEE",
        description: `Late fee for rent due ${charge.dueDate.toISOString().slice(0, 10)}`,
        amountCents: charge.lease.lateFeeCents,
        dueDate: today,
        linkedChargeId: charge.id,
      },
    });
  }
}

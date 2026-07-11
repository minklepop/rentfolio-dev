import { db } from "./db";
import { paidCents } from "./rent";
import { fmtMoney } from "./money";
import { todayUTC } from "./format";

export async function allocatePayment({
  leaseId,
  amountCents,
  method = "OTHER",
  note = "",
  paidDate,
}: {
  leaseId: string;
  amountCents: number;
  method?: string;
  note?: string;
  paidDate?: Date;
}) {
  const date = paidDate ?? todayUTC();
  const totalLabel = fmtMoney(amountCents);

  const charges = await db.charge.findMany({
    where: { leaseId },
    include: { payments: true },
    orderBy: { dueDate: "asc" },
  });
  const outstanding = charges
    .map((c) => ({ id: c.id, remaining: c.amountCents - paidCents(c) }))
    .filter((c) => c.remaining > 0);

  let remaining = amountCents;
  const rows: { chargeId: string | null; amountCents: number; note: string }[] = [];

  for (const charge of outstanding) {
    if (remaining <= 0) break;
    const applied = Math.min(charge.remaining, remaining);
    rows.push({
      chargeId: charge.id,
      amountCents: applied,
      note: [note, `(part of ${totalLabel} payment, auto-allocated)`].filter(Boolean).join(" "),
    });
    remaining -= applied;
  }

  if (remaining > 0) {
    rows.push({
      chargeId: null,
      amountCents: remaining,
      note: [note, `(unapplied credit from ${totalLabel} payment, exceeds balance owed)`]
        .filter(Boolean)
        .join(" "),
    });
  }

  await db.payment.createMany({
    data: rows.map((r) => ({ leaseId, chargeId: r.chargeId, amountCents: r.amountCents, paidDate: date, method, note: r.note })),
  });
}

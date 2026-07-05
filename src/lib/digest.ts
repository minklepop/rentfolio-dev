import { db } from "./db";
import { fmtMoney } from "./money";
import { fmtDate, todayUTC } from "./format";
import { paidCents } from "./rent";
import { unitName, tenantNames } from "./names";

export type DigestData = {
  overdue: { unitLabel: string; tenants: string; amount: string; daysLate: number }[];
  endingSoon: { unitLabel: string; tenants: string; endDate: string }[];
  openMaintenance: { title: string; unitLabel: string; priority: string }[];
};

/** Who to follow up with this week: overdue rent, leases ending soon, open maintenance. */
export async function buildWeeklyDigest(): Promise<DigestData> {
  const today = todayUTC();
  const in30 = new Date(today);
  in30.setUTCDate(in30.getUTCDate() + 30);

  const charges = await db.charge.findMany({
    where: { type: "RENT", dueDate: { lt: today }, lease: { status: "ACTIVE" } },
    include: {
      payments: true,
      lease: { include: { unit: { include: { property: true } }, tenants: { include: { user: true } } } },
    },
  });
  const overdue = charges
    .filter((c) => paidCents(c) < c.amountCents)
    .map((c) => ({
      unitLabel: unitName(c.lease.unit),
      tenants: tenantNames(c.lease.tenants),
      amount: fmtMoney(c.amountCents - paidCents(c)),
      daysLate: Math.floor((today.getTime() - c.dueDate.getTime()) / 86_400_000),
    }))
    .sort((a, b) => b.daysLate - a.daysLate);

  const endingLeases = await db.lease.findMany({
    where: { status: "ACTIVE", endDate: { gte: today, lte: in30 } },
    include: { unit: { include: { property: true } }, tenants: { include: { user: true } } },
  });
  const endingSoon = endingLeases.map((l) => ({
    unitLabel: unitName(l.unit),
    tenants: tenantNames(l.tenants),
    endDate: fmtDate(l.endDate),
  }));

  const maintenance = await db.maintenanceRequest.findMany({
    where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
    include: { unit: { include: { property: true } } },
  });
  const openMaintenance = maintenance.map((m) => ({
    title: m.title,
    unitLabel: unitName(m.unit),
    priority: m.priority,
  }));

  return { overdue, endingSoon, openMaintenance };
}

export function digestToText(data: DigestData): string {
  const lines: string[] = ["Rentfolio weekly follow-up digest", ""];
  lines.push(`Overdue rent (${data.overdue.length}):`);
  lines.push(
    ...(data.overdue.length
      ? data.overdue.map((o) => `  - ${o.unitLabel} (${o.tenants}): ${o.amount} owed, ${o.daysLate} days late`)
      : ["  None - nice."])
  );
  lines.push("", `Leases ending within 30 days (${data.endingSoon.length}):`);
  lines.push(
    ...(data.endingSoon.length
      ? data.endingSoon.map((e) => `  - ${e.unitLabel} (${e.tenants}): ends ${e.endDate}`)
      : ["  None."])
  );
  lines.push("", `Open maintenance requests (${data.openMaintenance.length}):`);
  lines.push(
    ...(data.openMaintenance.length
      ? data.openMaintenance.map((m) => `  - [${m.priority}] ${m.title} (${m.unitLabel})`)
      : ["  None."])
  );
  return lines.join("\n");
}

export function digestToHtml(data: DigestData): string {
  const section = (title: string, rows: string[]) => `
    <h3 style="margin:16px 0 4px;font-size:14px;">${title}</h3>
    ${rows.length ? `<ul style="margin:0;padding-left:20px;font-size:13px;">${rows.map((r) => `<li>${r}</li>`).join("")}</ul>` : `<p style="margin:0;font-size:13px;color:#64748b;">None.</p>`}
  `;
  return `
    <div style="font-family:sans-serif;color:#0f172a;max-width:480px;">
      <h2 style="font-size:18px;">Rentfolio weekly follow-up digest</h2>
      ${section(
        `Overdue rent (${data.overdue.length})`,
        data.overdue.map((o) => `${o.unitLabel} (${o.tenants}): <b>${o.amount}</b> owed, ${o.daysLate} days late`)
      )}
      ${section(
        `Leases ending within 30 days (${data.endingSoon.length})`,
        data.endingSoon.map((e) => `${e.unitLabel} (${e.tenants}): ends ${e.endDate}`)
      )}
      ${section(
        `Open maintenance requests (${data.openMaintenance.length})`,
        data.openMaintenance.map((m) => `[${m.priority}] ${m.title} (${m.unitLabel})`)
      )}
    </div>
  `;
}

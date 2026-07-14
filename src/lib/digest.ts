import { db } from "./db";
import { fmtMoney } from "./money";
import { fmtDate, todayUTC } from "./format";
import { paidCents } from "./rent";
import { unitName, tenantNames } from "./names";
import { geminiText } from "./gemini";
import { logAiDecision } from "./aiDecisions";

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

/** Call Gemini to write a short plain-English summary of the digest data. Returns empty string on failure so callers degrade gracefully. */
export async function buildAiSummary(data: DigestData, aiContextDigest?: string | null, userId?: string | null): Promise<string> {
  if (!process.env.GEMINI_API_KEY) return "";
  const lines: string[] = [];
  if (data.overdue.length)
    lines.push(`Overdue rent: ${data.overdue.map((o) => `${o.unitLabel} owes ${o.amount} (${o.daysLate}d late)`).join("; ")}.`);
  if (data.endingSoon.length)
    lines.push(`Leases ending soon: ${data.endingSoon.map((e) => `${e.unitLabel} ends ${e.endDate}`).join("; ")}.`);
  if (data.openMaintenance.length)
    lines.push(`Open maintenance: ${data.openMaintenance.map((m) => `[${m.priority}] ${m.title} at ${m.unitLabel}`).join("; ")}.`);
  if (!lines.length) return "Everything is on track, no overdue rent, no expiring leases, and no open maintenance issues right now.";

  const extraContext = aiContextDigest ? `\nLandlord context: ${aiContextDigest}` : "";
  const prompt = `You are a property-management assistant. Write a 2-3 sentence plain-English summary for a landlord's weekly digest. Be direct and actionable. Do not use markdown or bullet points.${extraContext}

Data:
${lines.join("\n")}`;

  try {
    const summary = await geminiText(prompt, 200);
    await logAiDecision({ userId, feature: "DIGEST", input: data, output: summary });
    return summary;
  } catch {
    return "";
  }
}

export function digestToText(data: DigestData, aiSummary?: string): string {
  const lines: string[] = ["Rentfolio weekly follow-up digest", ""];
  if (aiSummary) { lines.push(aiSummary, ""); }
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

export function digestToHtml(data: DigestData, aiSummary?: string): string {
  const section = (title: string, rows: string[]) => `
    <h3 style="margin:16px 0 4px;font-size:14px;">${title}</h3>
    ${rows.length ? `<ul style="margin:0;padding-left:20px;font-size:13px;">${rows.map((r) => `<li>${r}</li>`).join("")}</ul>` : `<p style="margin:0;font-size:13px;color:#64748b;">None.</p>`}
  `;
  return `
    <div style="font-family:sans-serif;color:#0f172a;max-width:480px;">
      <h2 style="font-size:18px;">Rentfolio weekly follow-up digest</h2>
      ${aiSummary ? `<p style="margin:0 0 12px;font-size:14px;background:#eef2ff;border-radius:6px;padding:12px;">${aiSummary}</p>` : ""}
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

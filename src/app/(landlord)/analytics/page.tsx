import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtMoney } from "@/lib/money";
import { Card, PageHeader, StatTile, Table, tdCls } from "@/components/ui";

const monthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
const monthLabel = (d: Date) => d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

export default async function AnalyticsPage() {
  await requireLandlord();
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
  const months = Array.from({ length: 6 }, (_, i) => new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1)));
  const [units, leases, charges, payments, maintenance, decisions] = await Promise.all([
    db.unit.count(),
    db.lease.findMany({ include: { tenants: { include: { user: true } } } }),
    db.charge.findMany({ where: { type: "RENT", dueDate: { gte: start } }, include: { payments: true } }),
    db.payment.findMany({ where: { paidDate: { gte: start }, charge: { type: "RENT" } } }),
    db.maintenanceRequest.findMany({ where: { createdAt: { gte: start } } }),
    db.aiDecision.findMany(),
  ]);
  const rows = months.map((month) => {
    const next = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1));
    const expected = charges.filter((c) => c.dueDate >= month && c.dueDate < next).reduce((s, c) => s + c.amountCents, 0);
    const collected = payments.filter((p) => p.paidDate >= month && p.paidDate < next).reduce((s, p) => s + p.amountCents, 0);
    const occupied = new Set(leases.filter((l) => l.startDate < next && (!l.endDate || l.endDate >= month)).map((l) => l.unitId)).size;
    return { month, expected, collected, rate: expected ? Math.round(collected / expected * 100) : 0, occupancy: units ? Math.round(occupied / units * 100) : 0 };
  });
  const current = rows.at(-1)!;
  const completed = maintenance.filter((m) => m.status === "COMPLETED");
  const avgResolutionDays = completed.length ? completed.reduce((s, m) => s + Math.max(0, (m.updatedAt.getTime() - m.createdAt.getTime()) / 86_400_000), 0) / completed.length : 0;
  const reviewed = decisions.filter((d) => d.accepted !== null);
  const aiRate = reviewed.length ? Math.round(reviewed.filter((d) => d.accepted).length / reviewed.length * 100) : 0;
  const tenantLate = new Map<string, { name: string; total: number; unpaid: number }>();
  for (const lease of leases) for (const lt of lease.tenants) tenantLate.set(lt.userId, { name: lt.user.name, total: 0, unpaid: 0 });
  for (const charge of charges) {
    const lease = leases.find((l) => l.id === charge.leaseId);
    const paid = charge.payments.reduce((s, p) => s + p.amountCents, 0);
    for (const lt of lease?.tenants ?? []) { const t = tenantLate.get(lt.userId)!; t.total++; if (paid < charge.amountCents) t.unpaid++; }
  }
  return <div>
    <PageHeader title="Portfolio analytics" subtitle="Six months of collection, occupancy, maintenance, and AI feedback trends." />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile label="Collection this month" value={`${current.rate}%`} hint={`${fmtMoney(current.collected)} of ${fmtMoney(current.expected)}`} />
      <StatTile label="Occupancy this month" value={`${current.occupancy}%`} hint={`${units} total units`} />
      <StatTile label="Maintenance resolution" value={`${avgResolutionDays.toFixed(1)} days`} hint={`${completed.length} completed requests`} />
      <StatTile label="AI acceptance" value={`${aiRate}%`} hint={`${reviewed.length} reviewed suggestions`} href="/ai-history" />
    </div>
    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <Card title="Rent and occupancy by month"><Table headers={["Month", "Expected", "Collected", "Rate", "Occupied"]}>{rows.map((r) => <tr key={monthKey(r.month)}><td className={tdCls}>{monthLabel(r.month)}</td><td className={tdCls}>{fmtMoney(r.expected)}</td><td className={tdCls}>{fmtMoney(r.collected)}</td><td className={tdCls}>{r.rate}%</td><td className={tdCls}>{r.occupancy}%</td></tr>)}</Table></Card>
      <Card title="Tenant payment patterns"><Table headers={["Tenant", "Rent charges", "Currently unpaid", "Paid rate"]}>{[...tenantLate.values()].map((t) => <tr key={t.name}><td className={tdCls}>{t.name}</td><td className={tdCls}>{t.total}</td><td className={tdCls}>{t.unpaid}</td><td className={tdCls}>{t.total ? Math.round((t.total - t.unpaid) / t.total * 100) : 0}%</td></tr>)}</Table></Card>
    </div>
  </div>;
}

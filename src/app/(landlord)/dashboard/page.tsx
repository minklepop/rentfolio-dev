import Link from "next/link";
import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureRentCharges, chargeStatus, paidCents } from "@/lib/rent";
import { fmtMoney } from "@/lib/money";
import { fmtDate, todayUTC } from "@/lib/format";
import { unitName, tenantNames } from "@/lib/names";
import { Card, PageHeader, StatTile, StatusBadge, EmptyState, Table, tdCls } from "@/components/ui";

export default async function DashboardPage() {
  const session = await requireLandlord();
  await ensureRentCharges();

  const today = todayUTC();
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const nextMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));

  const [propertyCount, unitCount, activeLeases, openMaintenance, newApplications, charges, monthPayments] =
    await Promise.all([
      db.property.count(),
      db.unit.count(),
      db.lease.findMany({ where: { status: "ACTIVE" }, select: { unitId: true } }),
      db.maintenanceRequest.findMany({
        where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
        include: { unit: { include: { property: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      db.application.findMany({
        where: { status: "NEW" },
        include: { listing: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      db.charge.findMany({
        include: {
          payments: true,
          lease: {
            include: {
              unit: { include: { property: true } },
              tenants: { include: { user: true } },
            },
          },
        },
      }),
      db.payment.aggregate({
        _sum: { amountCents: true },
        where: { paidDate: { gte: monthStart, lt: nextMonth } },
      }),
    ]);

  const occupiedUnits = new Set(activeLeases.map((l) => l.unitId)).size;
  const openMaintenanceCount = await db.maintenanceRequest.count({
    where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
  });

  const overdue = charges
    .filter((c) => ["OVERDUE", "PARTIAL"].includes(chargeStatus(c)) && c.dueDate < today)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  const overdueTotal = overdue.reduce((sum, c) => sum + c.amountCents - paidCents(c), 0);

  const dueThisMonth = charges.filter(
    (c) => c.dueDate >= monthStart && c.dueDate < nextMonth
  );
  const billedThisMonth = dueThisMonth.reduce((s, c) => s + c.amountCents, 0);

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${session.name.split(" ")[0]}`}
        subtitle="Here's what's happening across your portfolio."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Properties"
          value={String(propertyCount)}
          hint={`${unitCount} units, ${occupiedUnits} occupied`}
          href="/properties"
        />
        <StatTile
          label="Collected this month"
          value={fmtMoney(monthPayments._sum.amountCents ?? 0)}
          hint={`of ${fmtMoney(billedThisMonth)} billed`}
          href="/payments"
        />
        <StatTile
          label="Outstanding (overdue)"
          value={fmtMoney(overdueTotal)}
          hint={`${overdue.length} overdue charge${overdue.length === 1 ? "" : "s"}`}
          href="/payments?filter=overdue"
        />
        <StatTile
          label="Open maintenance"
          value={String(openMaintenanceCount)}
          href="/maintenance"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Overdue rent">
          {overdue.length === 0 ? (
            <EmptyState message="Nothing overdue. Nice." />
          ) : (
            <Table headers={["Unit", "Tenant", "Due", "Owed", "Status"]}>
              {overdue.slice(0, 8).map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className={tdCls}>
                    <Link href={`/leases/${c.leaseId}`} className="font-medium text-indigo-600 hover:underline">
                      {unitName(c.lease.unit)}
                    </Link>
                  </td>
                  <td className={tdCls}>{tenantNames(c.lease.tenants)}</td>
                  <td className={tdCls}>{fmtDate(c.dueDate)}</td>
                  <td className={tdCls}>{fmtMoney(c.amountCents - paidCents(c))}</td>
                  <td className={tdCls}>
                    <StatusBadge status={chargeStatus(c)} />
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <div className="space-y-6">
          <Card
            title="New applications"
            action={
              <Link href="/applications" className="text-sm font-medium text-indigo-600 hover:underline">
                View all
              </Link>
            }
          >
            {newApplications.length === 0 ? (
              <EmptyState message="No new applications." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {newApplications.map((a) => (
                  <li key={a.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <Link href={`/applications/${a.id}`} className="text-sm font-medium text-indigo-600 hover:underline">
                        {a.fullName}
                      </Link>
                      <p className="text-xs text-slate-500">{a.listing.title}</p>
                    </div>
                    <span className="text-xs text-slate-400">{fmtDate(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            title="Open maintenance"
            action={
              <Link href="/maintenance" className="text-sm font-medium text-indigo-600 hover:underline">
                View all
              </Link>
            }
          >
            {openMaintenance.length === 0 ? (
              <EmptyState message="No open requests." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {openMaintenance.map((m) => (
                  <li key={m.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <Link href={`/maintenance/${m.id}`} className="text-sm font-medium text-indigo-600 hover:underline">
                        {m.title}
                      </Link>
                      <p className="text-xs text-slate-500">{unitName(m.unit)}</p>
                    </div>
                    <StatusBadge status={m.priority} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtMoney } from "@/lib/money";
import { fmtDate, todayUTC } from "@/lib/format";
import { unitName, tenantNames } from "@/lib/names";
import { paidCents } from "@/lib/rent";
import { emailReport } from "@/app/actions/reports";
import { PageHeader, Card, Table, tdCls, EmptyState, btnSecondary } from "@/components/ui";

export default async function RentRosterPage({
  searchParams,
}: {
  searchParams: Promise<{ reportEmailed?: string; reportError?: string }>;
}) {
  await requireLandlord();
  const { reportEmailed, reportError } = await searchParams;
  const leases = await db.lease.findMany({
    where: { status: "ACTIVE" },
    include: {
      unit: { include: { property: true } },
      tenants: { include: { user: true } },
      charges: { include: { payments: true } },
    },
    orderBy: { unit: { property: { name: "asc" } } },
  });

  const today = todayUTC();
  const rows = leases.map((l) => {
    const balance = l.charges.reduce((sum, c) => sum + c.amountCents - paidCents(c), 0);
    const overdue = l.charges.some(
      (c) => c.dueDate < today && paidCents(c) < c.amountCents
    );
    return { lease: l, balance, overdue };
  });
  const totalRent = rows.reduce((s, r) => s + r.lease.rentCents, 0);
  const totalOwed = rows.reduce((s, r) => s + Math.max(0, r.balance), 0);

  return (
    <div>
      <PageHeader
        title="Rent roster"
        subtitle={`As of ${fmtDate(today)}, every active lease, rent, and current balance. Export to CSV for a court filing or lender request.`}
        action={
          <div className="flex gap-2">
            <a href="/rent-roster/export" className={btnSecondary}>
              Export CSV
            </a>
            <a href="/rent-roster/export?format=pdf" className={btnSecondary}>
              Export PDF
            </a>
            <form action={emailReport}>
              <input type="hidden" name="type" value="rent-roll" />
              <input type="hidden" name="returnTo" value="/rent-roster" />
              <button type="submit" className={btnSecondary}>
                Email report to me
              </button>
            </form>
          </div>
        }
      />
      {reportEmailed && (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          &ldquo;{reportEmailed}&rdquo; emailed to you.
        </p>
      )}
      {reportError && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{reportError}</p>
      )}
      <Card>
        {rows.length === 0 ? (
          <EmptyState message="No active leases yet." />
        ) : (
          <Table headers={["Property / Unit", "Tenant(s)", "Lease start", "Monthly rent", "Deposit held", "Balance owed"]}>
            {rows.map(({ lease, balance, overdue }) => (
              <tr key={lease.id} className={overdue ? "bg-red-50/40" : "hover:bg-slate-50"}>
                <td className={tdCls}>
                  <Link href={`/leases/${lease.id}`} className="font-medium text-indigo-600 hover:underline">
                    {unitName(lease.unit)}
                  </Link>
                </td>
                <td className={tdCls}>{tenantNames(lease.tenants)}</td>
                <td className={tdCls}>{fmtDate(lease.startDate)}</td>
                <td className={tdCls}>{fmtMoney(lease.rentCents)}</td>
                <td className={tdCls}>{fmtMoney(lease.depositCents)}</td>
                <td className={tdCls}>
                  <span className={balance > 0 ? "font-semibold text-red-600" : "text-slate-500"}>
                    {fmtMoney(balance)}
                  </span>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {rows.length > 0 && (
        <div className="mt-4 flex gap-6 text-sm text-slate-600">
          <p>
            Total monthly rent roll: <span className="font-semibold text-slate-900">{fmtMoney(totalRent)}</span>
          </p>
          <p>
            Total currently owed: <span className="font-semibold text-slate-900">{fmtMoney(totalOwed)}</span>
          </p>
        </div>
      )}
    </div>
  );
}

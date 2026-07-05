import Link from "next/link";
import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtMoney } from "@/lib/money";
import { fmtDate } from "@/lib/format";
import { unitName, tenantNames } from "@/lib/names";
import { paidCents } from "@/lib/rent";
import { PageHeader, Card, Table, tdCls, EmptyState, StatusBadge, btnPrimary } from "@/components/ui";

export default async function LeasesPage() {
  await requireLandlord();
  const leases = await db.lease.findMany({
    include: {
      unit: { include: { property: true } },
      tenants: { include: { user: true } },
      charges: { include: { payments: true } },
    },
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
  });

  return (
    <div>
      <PageHeader
        title="Leases"
        action={
          <Link href="/leases/new" className={btnPrimary}>
            + New lease
          </Link>
        }
      />
      <Card>
        {leases.length === 0 ? (
          <EmptyState
            message="No leases yet."
            action={
              <Link href="/leases/new" className={btnPrimary}>
                + New lease
              </Link>
            }
          />
        ) : (
          <Table headers={["Unit", "Tenants", "Rent", "Term", "Balance", "Status"]}>
            {leases.map((l) => {
              const balance = l.charges.reduce(
                (sum, c) => sum + c.amountCents - paidCents(c),
                0
              );
              return (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className={tdCls}>
                    <Link href={`/leases/${l.id}`} className="font-medium text-indigo-600 hover:underline">
                      {unitName(l.unit)}
                    </Link>
                  </td>
                  <td className={tdCls}>{tenantNames(l.tenants)}</td>
                  <td className={tdCls}>{fmtMoney(l.rentCents)}/mo</td>
                  <td className={tdCls}>
                    {fmtDate(l.startDate)} – {l.endDate ? fmtDate(l.endDate) : "Month-to-month"}
                  </td>
                  <td className={tdCls}>
                    <span className={balance > 0 ? "font-medium text-red-600" : "text-slate-500"}>
                      {fmtMoney(balance)}
                    </span>
                  </td>
                  <td className={tdCls}>
                    <StatusBadge status={l.status} />
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
    </div>
  );
}

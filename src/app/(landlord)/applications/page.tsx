import Link from "next/link";
import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtMoney } from "@/lib/money";
import { fmtDate } from "@/lib/format";
import { PageHeader, Card, Table, tdCls, EmptyState, StatusBadge } from "@/components/ui";

export default async function ApplicationsPage() {
  await requireLandlord();
  const applications = await db.application.findMany({
    include: { listing: { include: { unit: { include: { property: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Applications"
        subtitle="Applications submitted through your public listing links."
      />
      <Card>
        {applications.length === 0 ? (
          <EmptyState message="No applications yet. Publish a listing and share its apply link." />
        ) : (
          <Table headers={["Applicant", "Listing", "Income / mo", "Move-in", "Applied", "Status"]}>
            {applications.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className={tdCls}>
                  <Link href={`/applications/${a.id}`} className="font-medium text-indigo-600 hover:underline">
                    {a.fullName}
                  </Link>
                  <p className="text-xs text-slate-500">{a.email}</p>
                </td>
                <td className={tdCls}>{a.listing.title}</td>
                <td className={tdCls}>
                  {a.monthlyIncomeCents != null ? fmtMoney(a.monthlyIncomeCents) : ","}
                </td>
                <td className={tdCls}>{a.moveInDate ? fmtDate(a.moveInDate) : ","}</td>
                <td className={tdCls}>{fmtDate(a.createdAt)}</td>
                <td className={tdCls}>
                  <StatusBadge status={a.status} />
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}

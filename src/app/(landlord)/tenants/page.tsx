import Link from "next/link";
import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { unitName } from "@/lib/names";
import { PageHeader, Card, Table, tdCls, EmptyState, btnPrimary } from "@/components/ui";

export default async function TenantsPage() {
  await requireLandlord();
  const tenants = await db.user.findMany({
    where: { role: "TENANT" },
    include: {
      leases: {
        include: { lease: { include: { unit: { include: { property: true } } } } },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Tenants"
        subtitle="Tenant accounts can sign in to the tenant portal to see their balance and file maintenance requests."
        action={
          <Link href="/tenants/new" className={btnPrimary}>
            + Add tenant
          </Link>
        }
      />
      <Card>
        {tenants.length === 0 ? (
          <EmptyState
            message="No tenants yet."
            action={
              <Link href="/tenants/new" className={btnPrimary}>
                + Add tenant
              </Link>
            }
          />
        ) : (
          <Table headers={["Name", "Contact", "Leases"]}>
            {tenants.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className={tdCls}>
                  <Link href={`/tenants/${t.id}`} className="font-medium text-indigo-600 hover:underline">
                    {t.name}
                  </Link>
                </td>
                <td className={tdCls}>
                  {t.email}
                  {t.phone ? ` · ${t.phone}` : ""}
                </td>
                <td className={tdCls}>
                  {t.leases.length === 0 ? (
                    <span className="text-slate-400">None</span>
                  ) : (
                    t.leases.map((lt, i) => (
                      <span key={lt.leaseId}>
                        {i > 0 && ", "}
                        <Link href={`/leases/${lt.leaseId}`} className="text-indigo-600 hover:underline">
                          {unitName(lt.lease.unit)}
                        </Link>
                        {lt.lease.status === "ENDED" && (
                          <span className="text-xs text-slate-400"> (ended)</span>
                        )}
                      </span>
                    ))
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}

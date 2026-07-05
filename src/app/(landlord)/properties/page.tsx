import Link from "next/link";
import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtMoney } from "@/lib/money";
import { labelFor, PROPERTY_TYPES } from "@/lib/constants";
import { PageHeader, Card, Table, tdCls, EmptyState, btnPrimary } from "@/components/ui";

export default async function PropertiesPage() {
  await requireLandlord();
  const properties = await db.property.findMany({
    include: {
      units: { include: { leases: { where: { status: "ACTIVE" } } } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Properties"
        subtitle={`${properties.length} propert${properties.length === 1 ? "y" : "ies"} in your portfolio`}
        action={
          <Link href="/properties/new" className={btnPrimary}>
            + Add property
          </Link>
        }
      />
      <Card>
        {properties.length === 0 ? (
          <EmptyState
            message="No properties yet. Add your first one to get started."
            action={
              <Link href="/properties/new" className={btnPrimary}>
                + Add property
              </Link>
            }
          />
        ) : (
          <Table headers={["Property", "Type", "Units", "Occupied", "Monthly rent (active)"]}>
            {properties.map((p) => {
              const occupied = p.units.filter((u) => u.leases.length > 0).length;
              const rent = p.units.reduce(
                (sum, u) => sum + u.leases.reduce((s, l) => s + l.rentCents, 0),
                0
              );
              return (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className={tdCls}>
                    <Link href={`/properties/${p.id}`} className="font-medium text-indigo-600 hover:underline">
                      {p.name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {p.address1}, {p.city}, {p.state} {p.zip}
                    </p>
                  </td>
                  <td className={tdCls}>{labelFor(PROPERTY_TYPES, p.type)}</td>
                  <td className={tdCls}>{p.units.length}</td>
                  <td className={tdCls}>
                    {occupied}/{p.units.length}
                  </td>
                  <td className={tdCls}>{fmtMoney(rent)}</td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
    </div>
  );
}

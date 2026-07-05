import Link from "next/link";
import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtMoney } from "@/lib/money";
import { fmtDate } from "@/lib/format";
import { unitName } from "@/lib/names";
import { PageHeader, Card, Table, tdCls, EmptyState, StatusBadge, btnPrimary } from "@/components/ui";

export default async function ListingsPage() {
  await requireLandlord();
  const listings = await db.listing.findMany({
    include: {
      unit: { include: { property: true } },
      applications: true,
      photos: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Listings"
        subtitle="Publish a listing to get a shareable page and application link."
        action={
          <Link href="/listings/new" className={btnPrimary}>
            + New listing
          </Link>
        }
      />
      <Card>
        {listings.length === 0 ? (
          <EmptyState
            message="No listings yet. Create one to advertise a vacant unit."
            action={
              <Link href="/listings/new" className={btnPrimary}>
                + New listing
              </Link>
            }
          />
        ) : (
          <Table headers={["Listing", "Unit", "Rent", "Available", "Applications", "Status"]}>
            {listings.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className={tdCls}>
                  <Link href={`/listings/${l.id}`} className="font-medium text-indigo-600 hover:underline">
                    {l.title}
                  </Link>
                </td>
                <td className={tdCls}>{unitName(l.unit)}</td>
                <td className={tdCls}>{fmtMoney(l.rentCents)}/mo</td>
                <td className={tdCls}>{l.availableDate ? fmtDate(l.availableDate) : "Now"}</td>
                <td className={tdCls}>{l.applications.length}</td>
                <td className={tdCls}>
                  <StatusBadge status={l.status} />
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}

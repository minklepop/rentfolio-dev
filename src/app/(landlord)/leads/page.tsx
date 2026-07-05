import Link from "next/link";
import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { PageHeader, Card, Table, tdCls, EmptyState, StatusBadge } from "@/components/ui";

export default async function LeadsPage() {
  await requireLandlord();
  const leads = await db.lead.findMany({
    include: { listing: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle="Lighter-weight than a full application, people who reached out before applying."
      />
      <Card>
        {leads.length === 0 ? (
          <EmptyState message="No leads yet. They show up here when someone fills out the quick-contact form on a published listing." />
        ) : (
          <Table headers={["Name", "Contact", "Listing", "Source", "Received", "Status"]}>
            {leads.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className={tdCls}>
                  <Link href={`/leads/${l.id}`} className="font-medium text-indigo-600 hover:underline">
                    {l.name}
                  </Link>
                </td>
                <td className={tdCls}>
                  {l.phone ?? ","}
                  {l.email ? ` · ${l.email}` : ""}
                </td>
                <td className={tdCls}>{l.listing?.title ?? ","}</td>
                <td className={tdCls}>{l.source ?? ","}</td>
                <td className={tdCls}>{fmtDate(l.createdAt)}</td>
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

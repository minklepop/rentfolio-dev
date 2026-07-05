import Link from "next/link";
import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { unitName } from "@/lib/names";
import { PageHeader, Card, Table, tdCls, EmptyState, StatusBadge, btnPrimary } from "@/components/ui";

const FILTERS = [
  ["open", "Open"],
  ["all", "All"],
  ["completed", "Completed"],
] as const;

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await requireLandlord();
  const { filter = "open" } = await searchParams;

  const requests = await db.maintenanceRequest.findMany({
    where:
      filter === "open"
        ? { status: { in: ["OPEN", "IN_PROGRESS"] } }
        : filter === "completed"
          ? { status: "COMPLETED" }
          : undefined,
    include: {
      unit: { include: { property: true } },
      createdBy: true,
      comments: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Maintenance"
        action={
          <Link href="/maintenance/new" className={btnPrimary}>
            + New request
          </Link>
        }
      />
      <div className="mb-4 flex gap-2">
        {FILTERS.map(([value, label]) => (
          <Link
            key={value}
            href={`/maintenance?filter=${value}`}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              filter === value
                ? "bg-indigo-600 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
      <Card>
        {requests.length === 0 ? (
          <EmptyState message="No maintenance requests here." />
        ) : (
          <Table headers={["Request", "Unit", "Reported by", "Opened", "Priority", "Status"]}>
            {requests.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className={tdCls}>
                  <Link href={`/maintenance/${r.id}`} className="font-medium text-indigo-600 hover:underline">
                    {r.title}
                  </Link>
                  {r.comments.length > 0 && (
                    <span className="ml-2 text-xs text-slate-400">
                      {r.comments.length} comment{r.comments.length === 1 ? "" : "s"}
                    </span>
                  )}
                </td>
                <td className={tdCls}>{unitName(r.unit)}</td>
                <td className={tdCls}>{r.createdBy?.name ?? ","}</td>
                <td className={tdCls}>{fmtDate(r.createdAt)}</td>
                <td className={tdCls}>
                  <StatusBadge status={r.priority} />
                </td>
                <td className={tdCls}>
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}

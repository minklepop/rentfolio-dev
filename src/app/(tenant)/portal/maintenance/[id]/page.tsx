import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { unitName } from "@/lib/names";
import { addComment } from "@/app/actions/maintenance";
import {
  PageHeader,
  Card,
  Field,
  EmptyState,
  StatusBadge,
  inputCls,
  btnPrimary,
} from "@/components/ui";

export default async function TenantMaintenanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireTenant();
  const { id } = await params;

  const request = await db.maintenanceRequest.findUnique({
    where: { id },
    include: {
      unit: { include: { property: true } },
      comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!request) notFound();

  // Only show requests for units this tenant leases.
  const onLease = await db.leaseTenant.findFirst({
    where: { userId: session.userId, lease: { unitId: request.unitId } },
  });
  if (!onLease) notFound();

  return (
    <div>
      <PageHeader
        title={request.title}
        subtitle={`${unitName(request.unit)} · opened ${fmtDate(request.createdAt)}`}
        action={<StatusBadge status={request.status} />}
      />
      <div className="space-y-6">
        <Card title="Details">
          <p className="whitespace-pre-wrap text-sm text-slate-700">{request.description}</p>
        </Card>
        <Card title="Updates">
          {request.comments.length === 0 ? (
            <EmptyState message="No updates yet." />
          ) : (
            <ul className="space-y-3">
              {request.comments.map((c) => (
                <li key={c.id} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-sm text-slate-700">{c.body}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {c.author?.name ?? "Unknown"} · {fmtDateTime(c.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <form action={addComment} className="mt-4 flex items-end gap-3">
            <input type="hidden" name="requestId" value={request.id} />
            <Field label="Add a comment" className="flex-1">
              <input name="body" required className={inputCls} />
            </Field>
            <button type="submit" className={btnPrimary}>
              Post
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}

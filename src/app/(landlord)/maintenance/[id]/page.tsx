import { notFound } from "next/navigation";
import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtMoney } from "@/lib/money";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { unitName } from "@/lib/names";
import { PRIORITIES, MAINTENANCE_STATUSES } from "@/lib/constants";
import { updateRequest, deleteRequest, addComment } from "@/app/actions/maintenance";
import DeleteButton from "@/components/DeleteButton";
import {
  PageHeader,
  Card,
  Field,
  EmptyState,
  StatusBadge,
  inputCls,
  btnPrimary,
} from "@/components/ui";

export default async function MaintenanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireLandlord();
  const { id } = await params;
  const request = await db.maintenanceRequest.findUnique({
    where: { id },
    include: {
      unit: { include: { property: true } },
      createdBy: true,
      comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!request) notFound();

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={request.title}
        subtitle={`${unitName(request.unit)} · opened ${fmtDate(request.createdAt)}${
          request.createdBy ? ` by ${request.createdBy.name}` : ""
        }`}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge status={request.priority} />
            <StatusBadge status={request.status} />
          </div>
        }
      />

      <div className="space-y-6">
        <Card title="Details">
          <p className="whitespace-pre-wrap text-sm text-slate-700">{request.description}</p>
          {request.costCents != null && (
            <p className="mt-3 text-sm text-slate-500">
              Cost: <span className="font-medium text-slate-900">{fmtMoney(request.costCents)}</span>
            </p>
          )}
        </Card>

        <Card title="Update">
          <form action={updateRequest} className="grid items-end gap-3 sm:grid-cols-4">
            <input type="hidden" name="id" value={request.id} />
            <Field label="Status">
              <select name="status" defaultValue={request.status} className={inputCls}>
                {MAINTENANCE_STATUSES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select name="priority" defaultValue={request.priority} className={inputCls}>
                {PRIORITIES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Cost (optional)">
              <input
                name="cost"
                defaultValue={request.costCents != null ? (request.costCents / 100).toFixed(2) : ""}
                className={inputCls}
                placeholder="$150"
              />
            </Field>
            <button type="submit" className={btnPrimary}>
              Save
            </button>
          </form>
          <p className="mt-2 text-xs text-slate-500">
            Tip: when the work is done, also record the cost as an expense under Accounting so it
            shows up in your year-end reports.
          </p>
        </Card>

        <Card title="Comments">
          {request.comments.length === 0 ? (
            <EmptyState message="No comments yet." />
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
            <Field label="Add comment" className="flex-1">
              <input name="body" required className={inputCls} placeholder="Plumber scheduled for Friday" />
            </Field>
            <button type="submit" className={btnPrimary}>
              Post
            </button>
          </form>
        </Card>

        <form action={deleteRequest}>
          <input type="hidden" name="id" value={request.id} />
          <DeleteButton label="Delete request" confirmText="Delete this request and its comments?" />
        </form>
      </div>
    </div>
  );
}

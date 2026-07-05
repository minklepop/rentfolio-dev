import Link from "next/link";
import { requireTenant } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { unitName } from "@/lib/names";
import { PRIORITIES } from "@/lib/constants";
import { tenantCreateRequest } from "@/app/actions/maintenance";
import {
  PageHeader,
  Card,
  Field,
  EmptyState,
  StatusBadge,
  inputCls,
  btnPrimary,
} from "@/components/ui";

export default async function TenantMaintenancePage() {
  const session = await requireTenant();

  const memberships = await db.leaseTenant.findMany({
    where: { userId: session.userId },
    include: { lease: { include: { unit: { include: { property: true } } } } },
  });
  const units = Array.from(
    new Map(memberships.map((m) => [m.lease.unit.id, m.lease.unit])).values()
  );
  const unitIds = units.map((u) => u.id);

  const requests = await db.maintenanceRequest.findMany({
    where: { unitId: { in: unitIds } },
    include: { unit: { include: { property: true } }, comments: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader title="Maintenance" subtitle="Report issues and track their progress." />

      <div className="space-y-6">
        {units.length > 0 && (
          <Card title="Report a new issue">
            <form action={tenantCreateRequest} className="space-y-4">
              <Field label="Unit">
                <select name="unitId" required className={inputCls}>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {unitName(u)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="What's the issue?">
                <input name="title" required className={inputCls} placeholder="Leaking kitchen faucet" />
              </Field>
              <Field label="Details">
                <textarea
                  name="description"
                  rows={4}
                  required
                  className={inputCls}
                  placeholder="When did it start? Where exactly? Anything you've tried?"
                />
              </Field>
              <Field label="How urgent is it?">
                <select name="priority" defaultValue="NORMAL" className={inputCls}>
                  {PRIORITIES.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              <button type="submit" className={btnPrimary}>
                Submit request
              </button>
            </form>
          </Card>
        )}

        <Card title="Your requests">
          {requests.length === 0 ? (
            <EmptyState message="No maintenance requests yet." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {requests.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link
                      href={`/portal/maintenance/${r.id}`}
                      className="text-sm font-medium text-indigo-600 hover:underline"
                    >
                      {r.title}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {unitName(r.unit)} · opened {fmtDate(r.createdAt)} ·{" "}
                      {r.comments.length} comment{r.comments.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

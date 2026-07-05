import Link from "next/link";
import { notFound } from "next/navigation";
import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtMoney } from "@/lib/money";
import { fmtDate } from "@/lib/format";
import { unitName } from "@/lib/names";
import { updateTenant, resetTenantPassword, deleteTenant } from "@/app/actions/tenants";
import DeleteButton from "@/components/DeleteButton";
import {
  PageHeader,
  Card,
  Field,
  EmptyState,
  StatusBadge,
  inputCls,
  btnPrimary,
  btnSecondary,
} from "@/components/ui";

export default async function TenantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireLandlord();
  const { id } = await params;
  const { error, saved } = await searchParams;
  const tenant = await db.user.findUnique({
    where: { id },
    include: {
      leases: {
        include: { lease: { include: { unit: { include: { property: true } } } } },
      },
    },
  });
  if (!tenant || tenant.role !== "TENANT") notFound();

  return (
    <div className="max-w-2xl">
      <PageHeader title={tenant.name} subtitle={tenant.email} />

      <div className="space-y-6">
        <Card title="Leases">
          {tenant.leases.length === 0 ? (
            <EmptyState message="Not on any lease yet. Add them from a lease page." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {tenant.leases.map((lt) => (
                <li key={lt.leaseId} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <Link href={`/leases/${lt.leaseId}`} className="font-medium text-indigo-600 hover:underline">
                      {unitName(lt.lease.unit)}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {fmtMoney(lt.lease.rentCents)}/mo · started {fmtDate(lt.lease.startDate)}
                    </p>
                  </div>
                  <StatusBadge status={lt.lease.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Contact info">
          <form action={updateTenant} className="space-y-4">
            <input type="hidden" name="id" value={tenant.id} />
            <Field label="Full name">
              <input name="name" required defaultValue={tenant.name} className={inputCls} />
            </Field>
            <Field label="Phone">
              <input name="phone" defaultValue={tenant.phone ?? ""} className={inputCls} />
            </Field>
            <button type="submit" className={btnPrimary}>
              Save
            </button>
          </form>
        </Card>

        <Card title="Reset portal password">
          {saved && (
            <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Password updated. Share the new password with the tenant.
            </p>
          )}
          {error === "short" && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              Password must be at least 8 characters.
            </p>
          )}
          <form action={resetTenantPassword} className="flex items-end gap-3">
            <input type="hidden" name="id" value={tenant.id} />
            <Field label="New password (min 8 characters)" className="flex-1">
              <input name="password" required minLength={8} className={inputCls} />
            </Field>
            <button type="submit" className={btnSecondary}>
              Reset password
            </button>
          </form>
        </Card>

        <form action={deleteTenant}>
          <input type="hidden" name="id" value={tenant.id} />
          <DeleteButton
            label="Delete tenant account"
            confirmText="Delete this tenant account? They will be removed from leases, but charge and payment history stays."
          />
        </form>
      </div>
    </div>
  );
}

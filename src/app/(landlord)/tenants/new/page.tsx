import { requireLandlord } from "@/lib/auth";
import { createTenant } from "@/app/actions/tenants";
import { PageHeader, Card, Field, inputCls, btnPrimary } from "@/components/ui";

export default async function NewTenantPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; leaseId?: string }>;
}) {
  await requireLandlord();
  const { error, leaseId } = await searchParams;

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Add tenant"
        subtitle="Creates a login the tenant can use for the tenant portal. Share the email and password with them."
      />
      <Card>
        <form action={createTenant} className="space-y-4">
          {leaseId && <input type="hidden" name="leaseId" value={leaseId} />}
          {error === "email" && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              An account with that email already exists.
            </p>
          )}
          {error === "short" && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              Password must be at least 8 characters.
            </p>
          )}
          <Field label="Full name">
            <input name="name" required className={inputCls} />
          </Field>
          <Field label="Email">
            <input name="email" type="email" required className={inputCls} />
          </Field>
          <Field label="Phone (optional)">
            <input name="phone" className={inputCls} />
          </Field>
          <Field label="Temporary password (min 8 characters)">
            <input name="password" required minLength={8} className={inputCls} />
          </Field>
          {leaseId && (
            <p className="text-xs text-slate-500">
              This tenant will be added to the lease you came from.
            </p>
          )}
          <button type="submit" className={btnPrimary}>
            Create tenant
          </button>
        </form>
      </Card>
    </div>
  );
}

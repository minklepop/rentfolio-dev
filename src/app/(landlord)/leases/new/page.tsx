import Link from "next/link";
import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { createLease } from "@/app/actions/leases";
import { unitName } from "@/lib/names";
import { PageHeader, Card, Field, inputCls, btnPrimary } from "@/components/ui";

export default async function NewLeasePage() {
  await requireLandlord();
  const [units, tenants] = await Promise.all([
    db.unit.findMany({
      include: { property: true },
      orderBy: { property: { name: "asc" } },
    }),
    db.user.findMany({ where: { role: "TENANT" }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-2xl">
      <PageHeader title="New lease" />
      <Card>
        <form action={createLease} className="space-y-4">
          <Field label="Unit">
            <select name="unitId" required className={inputCls}>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {unitName(u)}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date">
              <input name="startDate" type="date" required className={inputCls} />
            </Field>
            <Field label="End date (blank = month-to-month)">
              <input name="endDate" type="date" className={inputCls} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Monthly rent">
              <input name="rent" required className={inputCls} placeholder="$1,200" />
            </Field>
            <Field label="Security deposit">
              <input name="deposit" className={inputCls} placeholder="$1,200" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Rent due day (1–28)">
              <input name="rentDueDay" type="number" min={1} max={28} defaultValue={1} className={inputCls} />
            </Field>
            <Field label="Grace period (days)">
              <input name="graceDays" type="number" min={0} defaultValue={5} className={inputCls} />
            </Field>
            <Field label="Late fee ($0 = none)">
              <input name="lateFee" className={inputCls} placeholder="$50" />
            </Field>
          </div>
          <Field label="Tenants on lease">
            {tenants.length === 0 ? (
              <p className="text-sm text-slate-500">
                No tenant accounts yet,{" "}
                <Link href="/tenants/new" className="text-indigo-600 hover:underline">
                  create one
                </Link>{" "}
                first, or add tenants to the lease later.
              </p>
            ) : (
              <div className="space-y-1.5 rounded-lg border border-slate-200 p-3">
                {tenants.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" name="tenantIds" value={t.id} className="rounded" />
                    {t.name} <span className="text-xs text-slate-400">({t.email})</span>
                  </label>
                ))}
              </div>
            )}
          </Field>
          <Field label="Notes (optional)">
            <textarea name="notes" rows={3} className={inputCls} />
          </Field>
          <p className="text-xs text-slate-500">
            Monthly rent charges are generated automatically from the start date. If a security
            deposit is set, a deposit charge due at move-in is created too.
          </p>
          <button type="submit" className={btnPrimary}>
            Create lease
          </button>
        </form>
      </Card>
    </div>
  );
}

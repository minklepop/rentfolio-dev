import Link from "next/link";
import { notFound } from "next/navigation";
import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtMoney } from "@/lib/money";
import { fmtDate } from "@/lib/format";
import { tenantNames } from "@/lib/names";
import { labelFor, PROPERTY_TYPES, EXPENSE_CATEGORIES } from "@/lib/constants";
import { createUnit, deleteProperty } from "@/app/actions/properties";
import { uploadDocument, deleteDocument } from "@/app/actions/documents";
import DeleteButton from "@/components/DeleteButton";
import {
  PageHeader,
  Card,
  Field,
  Table,
  tdCls,
  EmptyState,
  inputCls,
  btnPrimary,
  btnSecondary,
} from "@/components/ui";

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireLandlord();
  const { id } = await params;
  const property = await db.property.findUnique({
    where: { id },
    include: {
      units: {
        include: {
          leases: {
            where: { status: "ACTIVE" },
            include: { tenants: { include: { user: true } } },
          },
        },
        orderBy: { label: "asc" },
      },
      expenses: { orderBy: { date: "desc" }, take: 5 },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!property) notFound();

  return (
    <div>
      <PageHeader
        title={property.name}
        subtitle={`${property.address1}${property.address2 ? ", " + property.address2 : ""}, ${property.city}, ${property.state} ${property.zip} · ${labelFor(PROPERTY_TYPES, property.type)}`}
        action={
          <div className="flex gap-2">
            <Link href={`/properties/${property.id}/edit`} className={btnSecondary}>
              Edit
            </Link>
            <form action={deleteProperty}>
              <input type="hidden" name="id" value={property.id} />
              <DeleteButton
                label="Delete property"
                confirmText="Delete this property and ALL of its units, leases, charges, and payment history? This cannot be undone."
              />
            </form>
          </div>
        }
      />

      {property.notes && (
        <p className="mb-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {property.notes}
        </p>
      )}

      <div className="space-y-6">
        <Card title="Units">
          {property.units.length === 0 ? (
            <EmptyState message="No units yet." />
          ) : (
            <Table headers={["Unit", "Beds / Baths", "Sq ft", "Market rent", "Current lease", ""]}>
              {property.units.map((u) => {
                const lease = u.leases[0];
                return (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className={tdCls}>
                      <span className="font-medium">{u.label}</span>
                    </td>
                    <td className={tdCls}>
                      {u.beds} bd / {u.baths} ba
                    </td>
                    <td className={tdCls}>{u.sqft ?? ","}</td>
                    <td className={tdCls}>{u.marketRentCents ? fmtMoney(u.marketRentCents) : ","}</td>
                    <td className={tdCls}>
                      {lease ? (
                        <Link href={`/leases/${lease.id}`} className="text-indigo-600 hover:underline">
                          {tenantNames(lease.tenants, "View lease")} · {fmtMoney(lease.rentCents)}/mo
                        </Link>
                      ) : (
                        <span className="text-slate-400">Vacant</span>
                      )}
                    </td>
                    <td className={tdCls}>
                      <Link
                        href={`/units/${u.id}/edit`}
                        className="text-xs font-medium text-indigo-600 hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </Table>
          )}

          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-indigo-600">
              + Add unit
            </summary>
            <form action={createUnit} className="mt-3 grid gap-3 sm:grid-cols-5">
              <input type="hidden" name="propertyId" value={property.id} />
              <Field label="Label">
                <input name="label" required className={inputCls} placeholder="Unit B" />
              </Field>
              <Field label="Beds">
                <input name="beds" type="number" min={0} defaultValue={1} className={inputCls} />
              </Field>
              <Field label="Baths">
                <input name="baths" type="number" min={0} step={0.5} defaultValue={1} className={inputCls} />
              </Field>
              <Field label="Sq ft">
                <input name="sqft" type="number" min={0} className={inputCls} />
              </Field>
              <Field label="Market rent">
                <input name="marketRent" className={inputCls} placeholder="$1,200" />
              </Field>
              <div className="sm:col-span-5">
                <button type="submit" className={btnPrimary}>
                  Add unit
                </button>
              </div>
            </form>
          </details>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card
            title="Recent expenses"
            action={
              <Link
                href={`/accounting?propertyId=${property.id}`}
                className="text-sm font-medium text-indigo-600 hover:underline"
              >
                View all
              </Link>
            }
          >
            {property.expenses.length === 0 ? (
              <EmptyState message="No expenses recorded for this property." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {property.expenses.map((e) => (
                  <li key={e.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <p className="font-medium text-slate-900">
                        {labelFor(EXPENSE_CATEGORIES, e.category)}
                        {e.vendor ? ` · ${e.vendor}` : ""}
                      </p>
                      <p className="text-xs text-slate-500">{fmtDate(e.date)}</p>
                    </div>
                    <span className="font-medium">{fmtMoney(e.amountCents)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Documents">
            {property.documents.length === 0 ? (
              <EmptyState message="No documents uploaded." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {property.documents.map((d) => (
                  <li key={d.id} className="flex items-center justify-between py-2.5 text-sm">
                    <a
                      href={`/files/${d.filename}`}
                      target="_blank"
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      {d.name}
                    </a>
                    <form action={deleteDocument}>
                      <input type="hidden" name="id" value={d.id} />
                      <input type="hidden" name="returnTo" value={`/properties/${property.id}`} />
                      <DeleteButton label="Remove" confirmText="Delete this document?" />
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <form action={uploadDocument} className="mt-4 flex flex-wrap items-end gap-3">
              <input type="hidden" name="propertyId" value={property.id} />
              <input type="hidden" name="returnTo" value={`/properties/${property.id}`} />
              <Field label="Name (optional)" className="flex-1">
                <input name="name" className={inputCls} placeholder="Insurance policy" />
              </Field>
              <Field label="File" className="flex-1">
                <input name="file" type="file" required className={inputCls} />
              </Field>
              <button type="submit" className={btnSecondary}>
                Upload
              </button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

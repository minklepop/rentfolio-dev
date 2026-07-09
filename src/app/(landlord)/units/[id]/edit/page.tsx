import { notFound } from "next/navigation";
import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { fmtMoney } from "@/lib/money";
import { updateUnit, deleteUnit } from "@/app/actions/properties";
import { uploadDocument, deleteDocument } from "@/app/actions/documents";
import DeleteButton from "@/components/DeleteButton";
import { PageHeader, Card, Field, EmptyState, inputCls, btnPrimary, btnSecondary } from "@/components/ui";
import MarketRentSuggestion from "@/components/MarketRentSuggestion";

export default async function EditUnitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireLandlord();
  const { id } = await params;
  const unit = await db.unit.findUnique({
    where: { id },
    include: {
      property: true,
      documents: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!unit) notFound();

  const returnTo = `/units/${unit.id}/edit`;

  return (
    <div className="max-w-xl space-y-6">
      <PageHeader title={`Edit unit · ${unit.property.name}`} />

      <Card>
        <form action={updateUnit} className="space-y-4">
          <input type="hidden" name="id" value={unit.id} />
          <Field label="Label">
            <input name="label" required defaultValue={unit.label} className={inputCls} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Beds">
              <input name="beds" type="number" min={0} defaultValue={unit.beds} className={inputCls} />
            </Field>
            <Field label="Baths">
              <input name="baths" type="number" min={0} step={0.5} defaultValue={unit.baths} className={inputCls} />
            </Field>
            <Field label="Sq ft">
              <input name="sqft" type="number" min={0} defaultValue={unit.sqft ?? ""} className={inputCls} />
            </Field>
          </div>
          <Field label="Market rent">
            <input
              name="marketRent"
              defaultValue={unit.marketRentCents ? (unit.marketRentCents / 100).toFixed(2) : ""}
              className={inputCls}
              placeholder="$1,200"
            />
          </Field>
          <p className="text-xs text-slate-500">
            Current market rent: {unit.marketRentCents ? fmtMoney(unit.marketRentCents) : "not set"}
          </p>
          <button type="submit" className={btnPrimary}>
            Save changes
          </button>
        </form>
      </Card>

      <Card title="AI rent suggestion">
        <p className="mb-3 text-xs text-slate-500">
          Get an AI estimate of what this unit could rent for based on its specs.
        </p>
        <MarketRentSuggestion unitId={unit.id} />
      </Card>

      <Card title="Unit documents">
        <p className="mb-3 text-xs text-slate-500">
          Store move-in checklists, inspection reports, and any other files tied to this unit (not a specific lease).
        </p>
        {unit.documents.length === 0 ? (
          <EmptyState message="No documents yet." />
        ) : (
          <ul className="mb-4 divide-y divide-slate-100">
            {unit.documents.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <a
                    href={`/files/${d.filename}`}
                    target="_blank"
                    className="font-medium text-indigo-600 hover:underline"
                  >
                    {d.name}
                  </a>
                  <p className="text-xs text-slate-400">{fmtDate(d.createdAt)}</p>
                </div>
                <form action={deleteDocument}>
                  <input type="hidden" name="id" value={d.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <DeleteButton label="Remove" confirmText="Delete this document?" />
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={uploadDocument} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="unitId" value={unit.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <Field label="Name" className="flex-1">
            <input name="name" className={inputCls} placeholder="Move-in checklist" />
          </Field>
          <Field label="File" className="flex-1">
            <input name="file" type="file" required className={inputCls} />
          </Field>
          <button type="submit" className={btnSecondary}>
            Upload
          </button>
        </form>
      </Card>

      <form action={deleteUnit}>
        <input type="hidden" name="id" value={unit.id} />
        <DeleteButton
          label="Delete unit"
          confirmText="Delete this unit and all of its leases, charges, and history?"
        />
      </form>
    </div>
  );
}

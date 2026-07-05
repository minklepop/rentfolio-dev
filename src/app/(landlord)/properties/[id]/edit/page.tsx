import { notFound } from "next/navigation";
import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateProperty } from "@/app/actions/properties";
import { PROPERTY_TYPES } from "@/lib/constants";
import { PageHeader, Card, Field, inputCls, btnPrimary } from "@/components/ui";

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireLandlord();
  const { id } = await params;
  const property = await db.property.findUnique({ where: { id } });
  if (!property) notFound();

  return (
    <div className="max-w-2xl">
      <PageHeader title={`Edit ${property.name}`} />
      <Card>
        <form action={updateProperty} className="space-y-4">
          <input type="hidden" name="id" value={property.id} />
          <Field label="Property name">
            <input name="name" required defaultValue={property.name} className={inputCls} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Street address">
              <input name="address1" required defaultValue={property.address1} className={inputCls} />
            </Field>
            <Field label="Address line 2 (optional)">
              <input name="address2" defaultValue={property.address2 ?? ""} className={inputCls} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="City">
              <input name="city" required defaultValue={property.city} className={inputCls} />
            </Field>
            <Field label="State">
              <input name="state" required defaultValue={property.state} maxLength={2} className={inputCls} />
            </Field>
            <Field label="ZIP">
              <input name="zip" required defaultValue={property.zip} className={inputCls} />
            </Field>
          </div>
          <Field label="Property type">
            <select name="type" defaultValue={property.type} className={inputCls}>
              {PROPERTY_TYPES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Notes (optional)">
            <textarea name="notes" rows={3} defaultValue={property.notes ?? ""} className={inputCls} />
          </Field>
          <button type="submit" className={btnPrimary}>
            Save changes
          </button>
        </form>
      </Card>
    </div>
  );
}

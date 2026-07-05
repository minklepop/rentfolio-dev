import { requireLandlord } from "@/lib/auth";
import { createProperty } from "@/app/actions/properties";
import { PROPERTY_TYPES } from "@/lib/constants";
import { PageHeader, Card, Field, inputCls, btnPrimary } from "@/components/ui";

export default async function NewPropertyPage() {
  await requireLandlord();
  return (
    <div className="max-w-2xl">
      <PageHeader title="Add property" />
      <Card>
        <form action={createProperty} className="space-y-4">
          <Field label="Property name">
            <input name="name" required className={inputCls} placeholder="e.g. 12 Oak Street" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Street address">
              <input name="address1" required className={inputCls} />
            </Field>
            <Field label="Address line 2 (optional)">
              <input name="address2" className={inputCls} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="City">
              <input name="city" required className={inputCls} />
            </Field>
            <Field label="State">
              <input name="state" required className={inputCls} maxLength={2} placeholder="IL" />
            </Field>
            <Field label="ZIP">
              <input name="zip" required className={inputCls} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Property type">
              <select name="type" className={inputCls}>
                {PROPERTY_TYPES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="First unit label">
              <input
                name="unitLabel"
                className={inputCls}
                defaultValue="Main"
                placeholder='Use "Main" for single-family'
              />
            </Field>
          </div>
          <Field label="Notes (optional)">
            <textarea name="notes" rows={3} className={inputCls} />
          </Field>
          <button type="submit" className={btnPrimary}>
            Create property
          </button>
        </form>
      </Card>
    </div>
  );
}

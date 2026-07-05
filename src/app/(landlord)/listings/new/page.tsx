import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { createListing } from "@/app/actions/listings";
import { unitName } from "@/lib/names";
import { PageHeader, Card, Field, inputCls, btnPrimary } from "@/components/ui";

export default async function NewListingPage() {
  await requireLandlord();
  const units = await db.unit.findMany({
    include: { property: true },
    orderBy: { property: { name: "asc" } },
  });

  return (
    <div className="max-w-2xl">
      <PageHeader title="New listing" />
      <Card>
        <form action={createListing} className="space-y-4">
          <Field label="Unit">
            <select name="unitId" required className={inputCls}>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {unitName(u)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Listing title">
            <input
              name="title"
              required
              className={inputCls}
              placeholder="Sunny 2BR near downtown with parking"
            />
          </Field>
          <Field label="Description">
            <textarea name="description" rows={6} required className={inputCls} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Monthly rent">
              <input name="rent" required className={inputCls} placeholder="$1,200" />
            </Field>
            <Field label="Security deposit">
              <input name="deposit" className={inputCls} placeholder="$1,200" />
            </Field>
            <Field label="Available from">
              <input name="availableDate" type="date" className={inputCls} />
            </Field>
          </div>
          <Field label="Amenities (comma separated)">
            <input
              name="amenities"
              className={inputCls}
              placeholder="In-unit laundry, Dishwasher, Off-street parking"
            />
          </Field>
          <p className="text-xs text-slate-500">
            The listing starts as a draft. Publish it from the listing page to make the public
            page and application form live.
          </p>
          <button type="submit" className={btnPrimary}>
            Create listing
          </button>
        </form>
      </Card>
    </div>
  );
}

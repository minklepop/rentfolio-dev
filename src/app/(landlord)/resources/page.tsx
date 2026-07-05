import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { RESOURCE_CATEGORIES } from "@/lib/constants";
import { createResource, deleteResource } from "@/app/actions/resources";
import DeleteButton from "@/components/DeleteButton";
import { PageHeader, Card, Field, EmptyState, inputCls, btnPrimary } from "@/components/ui";

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireLandlord();
  const { error } = await searchParams;
  const resources = await db.resource.findMany({ orderBy: { category: "asc" } });
  const byCategory = RESOURCE_CATEGORIES.map(([value, label]) => ({
    value,
    label,
    items: resources.filter((r) => r.category === value),
  }));

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Resources"
        subtitle="Links you actually use, court case lookups, screening services, listing sites. Add your own as you find them (web-crawling is illegal as per ToS)."
      />

      <div className="space-y-6">
        {byCategory.map(
          (group) =>
            group.items.length > 0 && (
              <Card key={group.value} title={group.label}>
                <ul className="divide-y divide-slate-100">
                  {group.items.map((r) => (
                    <li key={r.id} className="flex items-center justify-between py-2.5 text-sm">
                      <div>
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-indigo-600 hover:underline"
                        >
                          {r.label}
                        </a>
                        {r.notes && <p className="text-xs text-slate-500">{r.notes}</p>}
                      </div>
                      <form action={deleteResource}>
                        <input type="hidden" name="id" value={r.id} />
                        <DeleteButton label="Remove" confirmText="Remove this link?" />
                      </form>
                    </li>
                  ))}
                </ul>
              </Card>
            )
        )}

        <Card title="Add a link">
          {error && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              Label and URL are required.
            </p>
          )}
          <form action={createResource} className="grid gap-3 sm:grid-cols-2">
            <Field label="Label">
              <input name="label" required className={inputCls} placeholder="Indiana court case lookup" />
            </Field>
            <Field label="URL">
              <input name="url" type="url" required className={inputCls} placeholder="https://..." />
            </Field>
            <Field label="Category">
              <select name="category" className={inputCls}>
                {RESOURCE_CATEGORIES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Notes (optional)">
              <input name="notes" className={inputCls} placeholder="Free, ~45 states have one of these" />
            </Field>
            <div className="sm:col-span-2">
              <button type="submit" className={btnPrimary}>
                Add
              </button>
            </div>
          </form>
        </Card>

        {resources.length === 0 && (
          <EmptyState message="No links saved yet, add the ones you use for screening, eviction lookups, or advertising." />
        )}
      </div>
    </div>
  );
}

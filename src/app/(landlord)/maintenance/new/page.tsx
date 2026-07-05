import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { createRequest } from "@/app/actions/maintenance";
import { unitName } from "@/lib/names";
import { PRIORITIES } from "@/lib/constants";
import { PageHeader, Card, Field, inputCls, btnPrimary } from "@/components/ui";

export default async function NewMaintenancePage() {
  await requireLandlord();
  const units = await db.unit.findMany({
    include: { property: true },
    orderBy: { property: { name: "asc" } },
  });

  return (
    <div className="max-w-2xl">
      <PageHeader title="New maintenance request" />
      <Card>
        <form action={createRequest} className="space-y-4">
          <Field label="Unit">
            <select name="unitId" required className={inputCls}>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {unitName(u)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Title">
            <input name="title" required className={inputCls} placeholder="Leaking kitchen faucet" />
          </Field>
          <Field label="Description">
            <textarea name="description" rows={4} required className={inputCls} />
          </Field>
          <Field label="Priority">
            <select name="priority" defaultValue="NORMAL" className={inputCls}>
              {PRIORITIES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <button type="submit" className={btnPrimary}>
            Create request
          </button>
        </form>
      </Card>
    </div>
  );
}

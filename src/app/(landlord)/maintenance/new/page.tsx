import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { createRequest } from "@/app/actions/maintenance";
import MaintenanceForm from "@/components/MaintenanceForm";
import { PageHeader, Card } from "@/components/ui";

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
        <MaintenanceForm
          units={units}
          action={createRequest}
          submitLabel="Create request"
          isLandlord
        />
      </Card>
    </div>
  );
}

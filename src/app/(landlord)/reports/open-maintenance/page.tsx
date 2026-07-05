import { requireLandlord } from "@/lib/auth";
import { getOpenMaintenanceReport, monthOptions } from "@/lib/reports";
import ReportView from "@/components/ReportView";
import { PageHeader } from "@/components/ui";

export default async function OpenMaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ reportEmailed?: string; reportError?: string; month?: string }>;
}) {
  await requireLandlord();
  const { reportEmailed, reportError, month } = await searchParams;
  const report = await getOpenMaintenanceReport(month);
  return (
    <div>
      <PageHeader title="Open maintenance" subtitle="Currently open maintenance requests across your properties." />
      <ReportView
        report={report}
        type="open-maintenance"
        basePath="/reports/open-maintenance"
        month={month}
        monthOptions={monthOptions(12, 0)}
        emailed={reportEmailed}
        error={reportError}
      />
    </div>
  );
}

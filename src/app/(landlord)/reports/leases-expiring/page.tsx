import { requireLandlord } from "@/lib/auth";
import { getLeasesExpiring, monthOptions } from "@/lib/reports";
import ReportView from "@/components/ReportView";
import { PageHeader } from "@/components/ui";

export default async function LeasesExpiringPage({
  searchParams,
}: {
  searchParams: Promise<{ reportEmailed?: string; reportError?: string; month?: string }>;
}) {
  await requireLandlord();
  const { reportEmailed, reportError, month } = await searchParams;
  const report = await getLeasesExpiring(month);
  return (
    <div>
      <PageHeader
        title="Leases expiring"
        subtitle="Every active lease with an end date, by default. Pick a month to narrow it down."
      />
      <ReportView
        report={report}
        type="leases-expiring"
        basePath="/reports/leases-expiring"
        month={month}
        monthOptions={monthOptions(0, 12)}
        emailed={reportEmailed}
        error={reportError}
      />
    </div>
  );
}

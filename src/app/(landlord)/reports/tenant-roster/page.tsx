import { requireLandlord } from "@/lib/auth";
import { getTenantRoster } from "@/lib/reports";
import ReportView from "@/components/ReportView";
import { PageHeader } from "@/components/ui";

export default async function TenantRosterPage({
  searchParams,
}: {
  searchParams: Promise<{ reportEmailed?: string; reportError?: string }>;
}) {
  await requireLandlord();
  const { reportEmailed, reportError } = await searchParams;
  const report = await getTenantRoster();
  return (
    <div>
      <PageHeader title="Tenant roster" subtitle="Names and contact information for each of your current tenants." />
      <ReportView
        report={report}
        type="tenant-roster"
        basePath="/reports/tenant-roster"
        emailed={reportEmailed}
        error={reportError}
      />
    </div>
  );
}

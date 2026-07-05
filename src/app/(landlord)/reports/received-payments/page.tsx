import { requireLandlord } from "@/lib/auth";
import { getReceivedPayments, monthOptions } from "@/lib/reports";
import ReportView from "@/components/ReportView";
import { PageHeader } from "@/components/ui";

export default async function ReceivedPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ reportEmailed?: string; reportError?: string; month?: string }>;
}) {
  await requireLandlord();
  const { reportEmailed, reportError, month } = await searchParams;
  const report = await getReceivedPayments(month);
  return (
    <div>
      <PageHeader title="Received payments" subtitle="List of every payment that has been recorded." />
      <ReportView
        report={report}
        type="received-payments"
        basePath="/reports/received-payments"
        month={month}
        monthOptions={monthOptions(12, 0)}
        emailed={reportEmailed}
        error={reportError}
      />
    </div>
  );
}

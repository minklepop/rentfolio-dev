import { requireLandlord } from "@/lib/auth";
import { getLatePayments, monthOptions } from "@/lib/reports";
import ReportView from "@/components/ReportView";
import { PageHeader } from "@/components/ui";

export default async function LatePaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ reportEmailed?: string; reportError?: string; month?: string }>;
}) {
  await requireLandlord();
  const { reportEmailed, reportError, month } = await searchParams;
  const report = await getLatePayments(month);
  return (
    <div>
      <PageHeader title="Late payments" subtitle="List of overdue payments across your properties." />
      <ReportView
        report={report}
        type="late-payments"
        basePath="/reports/late-payments"
        month={month}
        monthOptions={monthOptions(12, 0)}
        emailed={reportEmailed}
        error={reportError}
      />
    </div>
  );
}

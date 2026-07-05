import Link from "next/link";
import { requireLandlord } from "@/lib/auth";
import { PageHeader, Card } from "@/components/ui";

const ACTIVITY_REPORTS = [
  { href: "/listings", title: "All Listings", desc: "View all your listings across all your properties." },
  { href: "/applications", title: "All Applications", desc: "View all your rental applications across all your properties." },
  { href: "/leases", title: "All Leases", desc: "View all your signed and pending leases across all your properties." },
  { href: "/payments", title: "All Payments", desc: "View all your charged, received, and overdue payments across all your properties." },
  { href: "/maintenance", title: "All Maintenance", desc: "View all open and closed maintenance requests across all your properties." },
];

const EMAILABLE_REPORTS = [
  { href: "/rent-roster", title: "Rent Roll Report", desc: "Snapshot of your properties, their current leases and tenants." },
  { href: "/reports/tenant-roster", title: "Tenant Roster", desc: "Names and contact information for each of your current tenants." },
  { href: "/reports/late-payments", title: "Late Payments", desc: "List of overdue payments across your properties." },
  { href: "/reports/received-payments", title: "Received Payments", desc: "List of every payment that has been recorded." },
  { href: "/reports/leases-expiring", title: "Leases Expiring", desc: "List of leases that expire in the next 90 days." },
  { href: "/reports/open-maintenance", title: "Open Maintenance", desc: "Currently open maintenance requests across your properties." },
];

function ReportCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Card className="h-full">
      <div className="flex h-full flex-col justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{desc}</p>
        </div>
        <Link
          href={href}
          className="mt-4 inline-flex items-center justify-center rounded-lg border border-indigo-600 px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
        >
          View report
        </Link>
      </div>
    </Card>
  );
}

export default async function ReportsPage() {
  await requireLandlord();
  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Every report viewable on screen, exportable to CSV, or emailed to you directly."
      />

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Activity reports</h2>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ACTIVITY_REPORTS.map((r) => (
          <ReportCard key={r.href} {...r} />
        ))}
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Snapshot reports, viewable, exportable, and emailable
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {EMAILABLE_REPORTS.map((r) => (
          <ReportCard key={r.href} {...r} />
        ))}
      </div>
    </div>
  );
}

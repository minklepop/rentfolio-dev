import { notFound } from "next/navigation";
import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtMoney } from "@/lib/money";
import { fmtDate } from "@/lib/format";
import { unitName } from "@/lib/names";
import { APPLICATION_STATUSES } from "@/lib/constants";
import {
  setApplicationStatus,
  saveApplicationNotes,
  deleteApplication,
} from "@/app/actions/applications";
import DeleteButton from "@/components/DeleteButton";
import {
  PageHeader,
  Card,
  Field,
  StatusBadge,
  inputCls,
  btnPrimary,
} from "@/components/ui";

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{value}</dd>
    </div>
  );
}

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireLandlord();
  const { id } = await params;
  const app = await db.application.findUnique({
    where: { id },
    include: { listing: { include: { unit: { include: { property: true } } } } },
  });
  if (!app) notFound();

  const incomeToRent =
    app.monthlyIncomeCents != null && app.listing.rentCents > 0
      ? (app.monthlyIncomeCents / app.listing.rentCents).toFixed(1)
      : null;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={app.fullName}
        subtitle={`Applied ${fmtDate(app.createdAt)} for "${app.listing.title}" (${unitName(app.listing.unit)})`}
        action={<StatusBadge status={app.status} />}
      />

      <div className="space-y-6">
        <Card title="Set status">
          <div className="flex flex-wrap gap-2">
            {APPLICATION_STATUSES.map(([value, label]) => (
              <form key={value} action={setApplicationStatus}>
                <input type="hidden" name="id" value={app.id} />
                <input type="hidden" name="status" value={value} />
                <button
                  type="submit"
                  className={`rounded-full px-3 py-1.5 text-sm font-medium cursor-pointer ${
                    app.status === value
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              </form>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            For credit and background checks, use a screening service such as TransUnion
            SmartMove or RentSpree directly, paste the result summary in the notes below.
          </p>
        </Card>

        <Card title="Application details">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <Item label="Email" value={app.email} />
            <Item label="Phone" value={app.phone} />
            <Item label="Current address" value={app.currentAddress ?? ","} />
            <Item label="Employer" value={app.employer ?? ","} />
            <Item label="Job title" value={app.jobTitle ?? ","} />
            <Item
              label="Monthly income"
              value={
                app.monthlyIncomeCents != null
                  ? `${fmtMoney(app.monthlyIncomeCents)}${incomeToRent ? ` (${incomeToRent}× rent)` : ""}`
                  : ","
              }
            />
            <Item label="Desired move-in" value={app.moveInDate ? fmtDate(app.moveInDate) : ","} />
            <Item label="Occupants" value={String(app.occupants)} />
            <Item label="Pets" value={app.pets ?? "None listed"} />
            <Item label="Vehicles" value={app.vehicles ?? "None listed"} />
            <Item
              label="Reference"
              value={
                app.refName
                  ? `${app.refName}${app.refRelation ? ` (${app.refRelation})` : ""}${app.refPhone ? ` · ${app.refPhone}` : ""}`
                  : ","
              }
            />
          </dl>
          {app.extraInfo && (
            <div className="mt-4 rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Additional info
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{app.extraInfo}</p>
            </div>
          )}
        </Card>

        <Card title="Internal notes (applicant never sees these)">
          <form action={saveApplicationNotes} className="space-y-3">
            <input type="hidden" name="id" value={app.id} />
            <Field label="Notes">
              <textarea
                name="internalNotes"
                rows={4}
                defaultValue={app.internalNotes ?? ""}
                className={inputCls}
                placeholder="Screening results, call notes, impressions..."
              />
            </Field>
            <button type="submit" className={btnPrimary}>
              Save notes
            </button>
          </form>
        </Card>

        <form action={deleteApplication}>
          <input type="hidden" name="id" value={app.id} />
          <DeleteButton label="Delete application" confirmText="Delete this application?" />
        </form>
      </div>
    </div>
  );
}

import { notFound } from "next/navigation";
import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { LEAD_STATUSES } from "@/lib/constants";
import { setLeadStatus, saveLeadNotes, deleteLead } from "@/app/actions/leads";
import DeleteButton from "@/components/DeleteButton";
import { PageHeader, Card, Field, StatusBadge, inputCls, btnPrimary } from "@/components/ui";

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{value}</dd>
    </div>
  );
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireLandlord();
  const { id } = await params;
  const lead = await db.lead.findUnique({ where: { id }, include: { listing: true } });
  if (!lead) notFound();

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={lead.name}
        subtitle={`Reached out ${fmtDate(lead.createdAt)}${lead.listing ? ` about "${lead.listing.title}"` : ""}`}
        action={<StatusBadge status={lead.status} />}
      />

      <div className="space-y-6">
        <Card title="Set status">
          <div className="flex flex-wrap gap-2">
            {LEAD_STATUSES.map(([value, label]) => (
              <form key={value} action={setLeadStatus}>
                <input type="hidden" name="id" value={lead.id} />
                <input type="hidden" name="status" value={value} />
                <button
                  type="submit"
                  className={`rounded-full px-3 py-1.5 text-sm font-medium cursor-pointer ${
                    lead.status === value
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              </form>
            ))}
          </div>
        </Card>

        <Card title="Details">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <Item label="Phone" value={lead.phone ?? ","} />
            <Item label="Email" value={lead.email ?? ","} />
            <Item label="Source" value={lead.source ?? ","} />
          </dl>
          {lead.message && (
            <div className="mt-4 rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Message</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{lead.message}</p>
            </div>
          )}
        </Card>

        <Card title="Internal notes">
          <form action={saveLeadNotes} className="space-y-3">
            <input type="hidden" name="id" value={lead.id} />
            <Field label="Notes">
              <textarea
                name="internalNotes"
                rows={4}
                defaultValue={lead.internalNotes ?? ""}
                className={inputCls}
                placeholder="Call notes, follow-up plan..."
              />
            </Field>
            <button type="submit" className={btnPrimary}>
              Save notes
            </button>
          </form>
        </Card>

        <form action={deleteLead}>
          <input type="hidden" name="id" value={lead.id} />
          <DeleteButton label="Delete lead" confirmText="Delete this lead?" />
        </form>
      </div>
    </div>
  );
}

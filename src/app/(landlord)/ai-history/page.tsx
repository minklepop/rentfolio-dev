import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { reviewAiDecision } from "@/app/actions/aiDecisions";

const LABELS: Record<string, string> = { MAINTENANCE: "Maintenance triage", SCREENING: "Application screening", DIGEST: "Weekly digest", RENT_SUGGESTION: "Rent suggestion", RENEWAL: "Lease renewal" };

export default async function AiHistoryPage() {
  await requireLandlord();
  const decisions = await db.aiDecision.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  const reviewed = decisions.filter((d) => d.accepted !== null);
  const accepted = reviewed.filter((d) => d.accepted).length;
  return <div>
    <PageHeader title="AI history" subtitle="Review recommendations, corrections, and how often the suggestions are useful." />
    <div className="mb-6 grid gap-4 sm:grid-cols-3">
      <Card><p className="text-sm text-slate-500">Recommendations</p><p className="mt-1 text-2xl font-bold">{decisions.length}</p></Card>
      <Card><p className="text-sm text-slate-500">Reviewed</p><p className="mt-1 text-2xl font-bold">{reviewed.length}</p></Card>
      <Card><p className="text-sm text-slate-500">Accepted</p><p className="mt-1 text-2xl font-bold">{reviewed.length ? Math.round(accepted / reviewed.length * 100) : 0}%</p></Card>
    </div>
    {decisions.length === 0 ? <Card><EmptyState message="AI recommendations will appear here after you use an AI feature." /></Card> : <div className="space-y-4">{decisions.map((d) =>
      <Card key={d.id} title={LABELS[d.feature] ?? d.feature} action={<span className="text-xs text-slate-400">{fmtDate(d.createdAt)} · {d.model}</span>}>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{d.outputText}</p>
        {d.accepted !== null ? <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
          <StatusBadge status={d.accepted ? "APPROVED" : "DENIED"} label={d.accepted ? "Used" : "Not helpful"} />
          {d.overrideValue && <p className="text-sm"><span className="font-medium">Landlord correction:</span> {d.overrideValue}</p>}
          {d.feedbackNote && <p className="text-sm text-slate-500">{d.feedbackNote}</p>}
        </div> : <form action={reviewAiDecision} className="mt-4 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-[auto_auto_1fr]">
          <input type="hidden" name="decisionId" value={d.id} />
          <button name="verdict" value="accepted" className="rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50">Use recommendation</button>
          <button name="verdict" value="rejected" className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50">Not helpful</button>
          <input name="overrideValue" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Optional correction" />
        </form>}
      </Card>)}</div>}
  </div>;
}

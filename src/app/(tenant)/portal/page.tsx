import { requireTenant } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureRentCharges, chargeStatus, paidCents } from "@/lib/rent";
import { fmtMoney } from "@/lib/money";
import { fmtDate } from "@/lib/format";
import { unitName } from "@/lib/names";
import { CHARGE_TYPES, PAYMENT_METHODS, labelFor } from "@/lib/constants";
import { signDocument } from "@/app/actions/documents";
import TenantPayForm from "@/components/TenantPayForm";
import { Card, Field, PageHeader, StatusBadge, EmptyState, Table, tdCls, inputCls, btnPrimary } from "@/components/ui";

export default async function TenantHomePage({
  searchParams,
}: {
  searchParams: Promise<{ signError?: string }>;
}) {
  const session = await requireTenant();
  const { signError } = await searchParams;
  await ensureRentCharges();

  const memberships = await db.leaseTenant.findMany({
    where: { userId: session.userId },
    include: {
      lease: {
        include: {
          unit: { include: { property: true } },
          charges: { include: { payments: true }, orderBy: { dueDate: "desc" } },
          payments: { orderBy: { paidDate: "desc" }, take: 10 },
          documents: { where: { requiresSignature: true, signedAt: null } },
        },
      },
    },
  });
  const leases = memberships
    .map((m) => m.lease)
    .sort((a, b) => (a.status === "ACTIVE" ? -1 : 1) - (b.status === "ACTIVE" ? -1 : 1));
  const pendingSignatures = leases.flatMap((l) => l.documents.map((d) => ({ ...d, leaseUnit: l.unit })));

  if (leases.length === 0) {
    return (
      <div>
        <PageHeader title={`Hi, ${session.name.split(" ")[0]}`} />
        <Card>
          <EmptyState message="You're not on a lease yet. Contact your landlord if this seems wrong." />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={`Hi, ${session.name.split(" ")[0]}`} />

      {pendingSignatures.length > 0 && (
        <Card title="Documents awaiting your signature" className="mb-6">
          {signError && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              Enter your full name and check the box to sign.
            </p>
          )}
          <ul className="space-y-4">
            {pendingSignatures.map((d) => (
              <li key={d.id} className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="mb-2 text-sm font-medium text-slate-900">
                  {d.name}, {unitName(d.leaseUnit)}{" "}
                  <a href={`/files/${d.filename}`} target="_blank" className="text-indigo-600 hover:underline">
                    (view document)
                  </a>
                </p>
                <form action={signDocument} className="space-y-2">
                  <input type="hidden" name="id" value={d.id} />
                  <input type="hidden" name="returnTo" value="/portal" />
                  <Field label="Type your full legal name to sign">
                    <input name="typedName" required className={inputCls} placeholder={session.name} />
                  </Field>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" name="agree" required className="rounded" />
                    I agree this typed name constitutes my electronic signature on this document.
                  </label>
                  <button type="submit" className={btnPrimary}>
                    Sign document
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="space-y-8">
        {leases.map((lease) => {
          const balance = lease.charges.reduce(
            (sum, c) => sum + c.amountCents - paidCents(c),
            0
          );
          return (
            <div key={lease.id} className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{unitName(lease.unit)}</h2>
                    <p className="text-sm text-slate-500">
                      {fmtMoney(lease.rentCents)}/mo · due on the {lease.rentDueDay}
                      {lease.rentDueDay === 1 ? "st" : lease.rentDueDay === 2 ? "nd" : lease.rentDueDay === 3 ? "rd" : "th"} ·{" "}
                      {fmtDate(lease.startDate)} – {lease.endDate ? fmtDate(lease.endDate) : "month-to-month"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Current balance</p>
                    <p className={`text-2xl font-bold ${balance > 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {fmtMoney(balance)}
                    </p>
                  </div>
                </div>
                {balance > 0 && (
                  process.env.NEXT_PUBLIC_SQUARE_ENABLED === "true" ? (
                    <TenantPayForm leaseId={lease.id} balanceCents={balance} />
                  ) : (
                    <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800">
                      To pay, use the payment method you've arranged with your landlord (Zelle,
                      check, etc.). Payments show up here once your landlord records them.
                    </p>
                  )
                )}
              </div>

              <Card title="Charges">
                {lease.charges.length === 0 ? (
                  <EmptyState message="No charges yet." />
                ) : (
                  <Table headers={["Due", "Type", "Description", "Amount", "Paid", "Status"]}>
                    {lease.charges.slice(0, 12).map((c) => (
                        <tr key={c.id}>
                          <td className={tdCls}>{fmtDate(c.dueDate)}</td>
                          <td className={tdCls}>{labelFor(CHARGE_TYPES, c.type)}</td>
                          <td className={tdCls}>{c.description ?? ","}</td>
                          <td className={tdCls}>{fmtMoney(c.amountCents)}</td>
                          <td className={tdCls}>{fmtMoney(paidCents(c))}</td>
                          <td className={tdCls}>
                            <StatusBadge status={chargeStatus(c)} />
                          </td>
                        </tr>
                    ))}
                  </Table>
                )}
              </Card>

              <Card title="Payment history">
                {lease.payments.length === 0 ? (
                  <EmptyState message="No payments recorded yet." />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {lease.payments.map((p) => (
                      <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                        <span className="text-slate-700">
                          {fmtDate(p.paidDate)} · {labelFor(PAYMENT_METHODS, p.method)}
                        </span>
                        <span className="font-medium text-slate-900">{fmtMoney(p.amountCents)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}

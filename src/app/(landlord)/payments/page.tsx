import Link from "next/link";
import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureRentCharges, chargeStatus, paidCents } from "@/lib/rent";
import { fmtMoney } from "@/lib/money";
import { fmtDate, toDateInput, todayUTC } from "@/lib/format";
import { unitName, tenantNames } from "@/lib/names";
import { CHARGE_TYPES, PAYMENT_METHODS, labelFor } from "@/lib/constants";
import { recordPayment, deletePayment } from "@/app/actions/payments";
import DeleteButton from "@/components/DeleteButton";
import {
  PageHeader,
  Card,
  Field,
  Table,
  tdCls,
  EmptyState,
  StatusBadge,
  inputCls,
  btnPrimary,
} from "@/components/ui";

const FILTERS = [
  ["all", "All charges"],
  ["overdue", "Overdue"],
  ["unpaid", "Unpaid"],
  ["paid", "Paid"],
] as const;

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await requireLandlord();
  await ensureRentCharges();
  const { filter = "unpaid" } = await searchParams;

  const [charges, recentPayments] = await Promise.all([
    db.charge.findMany({
      include: {
        payments: true,
        lease: {
          include: {
            unit: { include: { property: true } },
            tenants: { include: { user: true } },
          },
        },
      },
      orderBy: { dueDate: "desc" },
    }),
    db.payment.findMany({
      include: { lease: { include: { unit: { include: { property: true } } } } },
      orderBy: { paidDate: "desc" },
      take: 10,
    }),
  ]);

  const filtered = charges.filter((c) => {
    const status = chargeStatus(c);
    if (filter === "overdue") return status === "OVERDUE" || status === "PARTIAL";
    if (filter === "unpaid") return status !== "PAID";
    if (filter === "paid") return status === "PAID";
    return true;
  });

  const outstanding = charges
    .filter((c) => chargeStatus(c) !== "PAID")
    .reduce((sum, c) => sum + c.amountCents - paidCents(c), 0);

  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle={`Total outstanding across all leases: ${fmtMoney(outstanding)}`}
      />

      <div className="mb-4 flex gap-2">
        {FILTERS.map(([value, label]) => (
          <Link
            key={value}
            href={`/payments?filter=${value}`}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              filter === value
                ? "bg-indigo-600 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState message="No charges match this filter." />
        ) : (
          <Table headers={["Due", "Unit", "Tenant", "Type", "Amount", "Owed", "Status", ""]}>
            {filtered.slice(0, 50).map((c) => {
              const status = chargeStatus(c);
              const remaining = c.amountCents - paidCents(c);
              return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className={tdCls}>{fmtDate(c.dueDate)}</td>
                  <td className={tdCls}>
                    <Link href={`/leases/${c.leaseId}`} className="font-medium text-indigo-600 hover:underline">
                      {unitName(c.lease.unit)}
                    </Link>
                  </td>
                  <td className={tdCls}>{tenantNames(c.lease.tenants)}</td>
                  <td className={tdCls}>{labelFor(CHARGE_TYPES, c.type)}</td>
                  <td className={tdCls}>{fmtMoney(c.amountCents)}</td>
                  <td className={tdCls}>{fmtMoney(remaining)}</td>
                  <td className={tdCls}>
                    <StatusBadge status={status} />
                  </td>
                  <td className={`${tdCls} whitespace-nowrap`}>
                    {status !== "PAID" && (
                      <details className="inline-block">
                        <summary className="cursor-pointer text-xs font-medium text-indigo-600 hover:underline">
                          Record payment
                        </summary>
                        <form
                          action={recordPayment}
                          className="absolute z-10 mt-1 w-72 space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
                        >
                          <input type="hidden" name="chargeId" value={c.id} />
                          <input type="hidden" name="leaseId" value={c.leaseId} />
                          <input type="hidden" name="returnTo" value={`/payments?filter=${filter}`} />
                          <Field label="Amount">
                            <input
                              name="amount"
                              required
                              defaultValue={(remaining / 100).toFixed(2)}
                              className={inputCls}
                            />
                          </Field>
                          <Field label="Date received">
                            <input
                              name="paidDate"
                              type="date"
                              defaultValue={toDateInput(todayUTC())}
                              className={inputCls}
                            />
                          </Field>
                          <Field label="Method">
                            <select name="method" className={inputCls}>
                              {PAYMENT_METHODS.map(([v, l]) => (
                                <option key={v} value={v}>
                                  {l}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Note (optional)">
                            <input name="note" className={inputCls} />
                          </Field>
                          <button type="submit" className={`${btnPrimary} w-full`}>
                            Save payment
                          </button>
                        </form>
                      </details>
                    )}
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      <div className="mt-6">
        <Card title="Recently recorded payments">
          {recentPayments.length === 0 ? (
            <EmptyState message="No payments yet." />
          ) : (
            <Table headers={["Date", "Unit", "Amount", "Method", "Note", ""]}>
              {recentPayments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className={tdCls}>{fmtDate(p.paidDate)}</td>
                  <td className={tdCls}>
                    <Link href={`/leases/${p.leaseId}`} className="font-medium text-indigo-600 hover:underline">
                      {unitName(p.lease.unit)}
                    </Link>
                  </td>
                  <td className={tdCls}>{fmtMoney(p.amountCents)}</td>
                  <td className={tdCls}>{labelFor(PAYMENT_METHODS, p.method)}</td>
                  <td className={tdCls}>{p.note ?? ","}</td>
                  <td className={tdCls}>
                    <form action={deletePayment}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="returnTo" value="/payments" />
                      <DeleteButton label="✕" confirmText="Delete this payment record?" />
                    </form>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}

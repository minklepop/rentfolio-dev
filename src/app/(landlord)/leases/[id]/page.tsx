import Link from "next/link";
import { notFound } from "next/navigation";
import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtMoney } from "@/lib/money";
import { fmtDate, fmtDateTime, toDateInput, todayUTC } from "@/lib/format";
import { unitName } from "@/lib/names";
import { chargeStatus, paidCents } from "@/lib/rent";
import { CHARGE_TYPES, PAYMENT_METHODS, labelFor } from "@/lib/constants";
import {
  updateLease,
  endLease,
  deleteLease,
  addTenantToLease,
  removeTenantFromLease,
  addCharge,
  deleteCharge,
} from "@/app/actions/leases";
import { recordPayment, recordLeasePayment, deletePayment } from "@/app/actions/payments";
import { uploadDocument, deleteDocument } from "@/app/actions/documents";
import { sendMessage, deleteMessage } from "@/app/actions/messages";
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
  btnSecondary,
} from "@/components/ui";

export default async function LeasePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payError?: string }>;
}) {
  await requireLandlord();
  const { id } = await params;
  const { payError } = await searchParams;
  const lease = await db.lease.findUnique({
    where: { id },
    include: {
      unit: { include: { property: true } },
      tenants: { include: { user: true } },
      charges: { include: { payments: true }, orderBy: { dueDate: "desc" } },
      payments: { orderBy: { paidDate: "desc" }, include: { charge: true } },
      documents: { orderBy: { createdAt: "desc" } },
      messages: { include: { author: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!lease) notFound();

  const otherTenants = await db.user.findMany({
    where: { role: "TENANT", leases: { none: { leaseId: lease.id } } },
    orderBy: { name: "asc" },
  });

  const balance = lease.charges.reduce((sum, c) => sum + c.amountCents - paidCents(c), 0);
  const outstandingCount = lease.charges.filter((c) => c.amountCents - paidCents(c) > 0).length;
  const returnTo = `/leases/${lease.id}`;

  return (
    <div>
      <PageHeader
        title={unitName(lease.unit)}
        subtitle={`${fmtMoney(lease.rentCents)}/mo · ${fmtDate(lease.startDate)} – ${
          lease.endDate ? fmtDate(lease.endDate) : "Month-to-month"
        }`}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge status={lease.status} />
            {lease.status === "ACTIVE" && (
              <form action={endLease}>
                <input type="hidden" name="id" value={lease.id} />
                <DeleteButton
                  label="End lease"
                  confirmText="End this lease today? Future rent charges will stop generating."
                  className={btnSecondary}
                />
              </form>
            )}
            <form action={deleteLease}>
              <input type="hidden" name="id" value={lease.id} />
              <DeleteButton
                label="Delete"
                confirmText="Delete this lease and its entire charge/payment history?"
              />
            </form>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Outstanding balance</p>
          <p className={`text-xl font-bold ${balance > 0 ? "text-red-600" : "text-emerald-600"}`}>
            {fmtMoney(balance)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Security deposit</p>
          <p className="text-xl font-bold text-slate-900">{fmtMoney(lease.depositCents)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Rent due day</p>
          <p className="text-xl font-bold text-slate-900">{lease.rentDueDay}<span className="text-sm font-normal text-slate-400"> of each month</span></p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Late fee</p>
          <p className="text-xl font-bold text-slate-900">
            {lease.lateFeeCents ? `${fmtMoney(lease.lateFeeCents)}` : "None"}
            <span className="text-sm font-normal text-slate-400"> after {lease.graceDays} days</span>
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {balance > 0 && (
          <Card title="Pay lease balance">
            {payError && (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                Enter an amount greater than $0.
              </p>
            )}
            <p className="mb-3 text-sm text-slate-600">
              Got one payment covering multiple months? Enter the full amount here and it
              auto-allocates across the {outstandingCount} outstanding charge
              {outstandingCount === 1 ? "" : "s"} (oldest due date first), no manual splitting.
              Anything left over after the balance is fully covered is recorded as an unapplied
              credit, never dropped.
            </p>
            <form action={recordLeasePayment} className="grid gap-3 sm:grid-cols-4">
              <input type="hidden" name="leaseId" value={lease.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <Field label="Amount received">
                <input
                  name="amount"
                  required
                  defaultValue={(balance / 100).toFixed(2)}
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
                <input name="note" className={inputCls} placeholder="Zelle transfer" />
              </Field>
              <div className="sm:col-span-4">
                <button type="submit" className={btnPrimary}>
                  Apply payment
                </button>
              </div>
            </form>
          </Card>
        )}

        <Card title="Ledger">
          {lease.charges.length === 0 ? (
            <EmptyState message="No charges yet. Rent charges generate automatically each month." />
          ) : (
            <Table headers={["Due", "Type", "Description", "Amount", "Paid", "Status", ""]}>
              {lease.charges.map((c) => {
                const paid = paidCents(c);
                const status = chargeStatus(c);
                const remaining = c.amountCents - paid;
                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className={tdCls}>{fmtDate(c.dueDate)}</td>
                    <td className={tdCls}>{labelFor(CHARGE_TYPES, c.type)}</td>
                    <td className={tdCls}>{c.description ?? ","}</td>
                    <td className={tdCls}>{fmtMoney(c.amountCents)}</td>
                    <td className={tdCls}>{fmtMoney(paid)}</td>
                    <td className={tdCls}>
                      <StatusBadge status={status} />
                    </td>
                    <td className={`${tdCls} space-x-2 whitespace-nowrap`}>
                      {status !== "PAID" && (
                        <details className="inline-block align-middle">
                          <summary className="cursor-pointer text-xs font-medium text-indigo-600 hover:underline">
                            Record payment
                          </summary>
                          <form
                            action={recordPayment}
                            className="absolute z-10 mt-1 w-72 space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
                          >
                            <input type="hidden" name="chargeId" value={c.id} />
                            <input type="hidden" name="leaseId" value={lease.id} />
                            <input type="hidden" name="returnTo" value={returnTo} />
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
                      <form action={deleteCharge} className="inline-block align-middle">
                        <input type="hidden" name="id" value={c.id} />
                        <DeleteButton label="✕" confirmText="Delete this charge and detach its payments?" />
                      </form>
                    </td>
                  </tr>
                );
              })}
            </Table>
          )}

          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-indigo-600">
              + Add one-time charge
            </summary>
            <form action={addCharge} className="mt-3 grid gap-3 sm:grid-cols-4">
              <input type="hidden" name="leaseId" value={lease.id} />
              <Field label="Type">
                <select name="type" className={inputCls}>
                  {CHARGE_TYPES.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Amount">
                <input name="amount" required className={inputCls} placeholder="$75" />
              </Field>
              <Field label="Due date">
                <input name="dueDate" type="date" required className={inputCls} />
              </Field>
              <Field label="Description">
                <input name="description" className={inputCls} placeholder="Water bill" />
              </Field>
              <div className="sm:col-span-4">
                <button type="submit" className={btnPrimary}>
                  Add charge
                </button>
              </div>
            </form>
          </details>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card title="Tenants">
            {lease.tenants.length === 0 ? (
              <EmptyState message="No tenants on this lease yet." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {lease.tenants.map((t) => (
                  <li key={t.userId} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <Link href={`/tenants/${t.userId}`} className="font-medium text-indigo-600 hover:underline">
                        {t.user.name}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {t.user.email}
                        {t.user.phone ? ` · ${t.user.phone}` : ""}
                      </p>
                    </div>
                    <form action={removeTenantFromLease}>
                      <input type="hidden" name="leaseId" value={lease.id} />
                      <input type="hidden" name="userId" value={t.userId} />
                      <DeleteButton label="Remove" confirmText="Remove this tenant from the lease?" />
                    </form>
                  </li>
                ))}
              </ul>
            )}
            {otherTenants.length > 0 && (
              <form action={addTenantToLease} className="mt-4 flex items-end gap-3">
                <input type="hidden" name="leaseId" value={lease.id} />
                <Field label="Add tenant" className="flex-1">
                  <select name="userId" className={inputCls}>
                    {otherTenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.email})
                      </option>
                    ))}
                  </select>
                </Field>
                <button type="submit" className={btnSecondary}>
                  Add
                </button>
              </form>
            )}
            <p className="mt-3 text-xs text-slate-500">
              Need a new tenant account?{" "}
              <Link href={`/tenants/new?leaseId=${lease.id}`} className="text-indigo-600 hover:underline">
                Create one
              </Link>
            </p>
          </Card>

          <Card title="Payments received">
            {lease.payments.length === 0 ? (
              <EmptyState message="No payments recorded yet." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {lease.payments.slice(0, 12).map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <p className="font-medium text-slate-900">
                        {fmtMoney(p.amountCents)}{" "}
                        <span className="font-normal text-slate-500">
                          · {labelFor(PAYMENT_METHODS, p.method)}
                        </span>
                      </p>
                      <p className="text-xs text-slate-500">
                        {fmtDate(p.paidDate)}
                        {p.note ? ` · ${p.note}` : ""}
                      </p>
                    </div>
                    <form action={deletePayment}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <DeleteButton label="✕" confirmText="Delete this payment record?" />
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card title="Messages">
          <p className="mb-3 text-xs text-slate-500">
            A shared log of communications with the tenant, both sides see the same thread.
          </p>
          {lease.messages.length === 0 ? (
            <EmptyState message="No messages yet." />
          ) : (
            <ul className="mb-4 space-y-2">
              {lease.messages.map((m) => {
                const isLandlord = m.author?.role === "LANDLORD" || !m.author;
                return (
                  <li
                    key={m.id}
                    className={`flex gap-3 rounded-lg p-3 ${isLandlord ? "bg-indigo-50" : "bg-slate-50"}`}
                  >
                    <div className="flex-1">
                      <p className="text-sm text-slate-800">{m.body}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {m.author?.name ?? "Unknown"} · {fmtDateTime(m.createdAt)}
                      </p>
                    </div>
                    <form action={deleteMessage}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <DeleteButton label="✕" confirmText="Delete this message?" />
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
          <form action={sendMessage} className="flex items-end gap-3">
            <input type="hidden" name="leaseId" value={lease.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <Field label="New message" className="flex-1">
              <input name="body" required className={inputCls} placeholder="Reminder: rent is due on the 1st" />
            </Field>
            <button type="submit" className={btnPrimary}>
              Send
            </button>
          </form>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card title="Lease terms">
            <form action={updateLease} className="space-y-4">
              <input type="hidden" name="id" value={lease.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Start date">
                  <input
                    name="startDate"
                    type="date"
                    required
                    defaultValue={toDateInput(lease.startDate)}
                    className={inputCls}
                  />
                </Field>
                <Field label="End date">
                  <input
                    name="endDate"
                    type="date"
                    defaultValue={toDateInput(lease.endDate)}
                    className={inputCls}
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Monthly rent">
                  <input
                    name="rent"
                    required
                    defaultValue={(lease.rentCents / 100).toFixed(2)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Security deposit">
                  <input
                    name="deposit"
                    defaultValue={(lease.depositCents / 100).toFixed(2)}
                    className={inputCls}
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Rent due day">
                  <input
                    name="rentDueDay"
                    type="number"
                    min={1}
                    max={28}
                    defaultValue={lease.rentDueDay}
                    className={inputCls}
                  />
                </Field>
                <Field label="Grace days">
                  <input
                    name="graceDays"
                    type="number"
                    min={0}
                    defaultValue={lease.graceDays}
                    className={inputCls}
                  />
                </Field>
                <Field label="Late fee">
                  <input
                    name="lateFee"
                    defaultValue={lease.lateFeeCents ? (lease.lateFeeCents / 100).toFixed(2) : ""}
                    className={inputCls}
                  />
                </Field>
              </div>
              <Field label="Notes">
                <textarea name="notes" rows={2} defaultValue={lease.notes ?? ""} className={inputCls} />
              </Field>
              <p className="text-xs text-slate-500">
                Rent changes apply to future auto-generated charges only; edit existing charges in the ledger.
              </p>
              <button type="submit" className={btnPrimary}>
                Save terms
              </button>
            </form>
          </Card>

          <Card title="Documents">
            {lease.documents.length === 0 ? (
              <EmptyState message="No documents. Upload the lease here, mark it for signature to collect a tenant e-signature." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {lease.documents.map((d) => (
                  <li key={d.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <a
                        href={`/files/${d.filename}`}
                        target="_blank"
                        className="font-medium text-indigo-600 hover:underline"
                      >
                        {d.name}
                      </a>
                      {d.requiresSignature && (
                        <p className="mt-0.5 text-xs text-slate-500">
                          {d.signedAt ? (
                            <span className="text-emerald-600">
                              Signed by {d.signedByName} on {fmtDate(d.signedAt)} (IP {d.signedIp})
                            </span>
                          ) : (
                            <span className="text-amber-600">Awaiting tenant signature</span>
                          )}
                        </p>
                      )}
                    </div>
                    <form action={deleteDocument}>
                      <input type="hidden" name="id" value={d.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <DeleteButton label="Remove" confirmText="Delete this document?" />
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <form action={uploadDocument} className="mt-4 flex flex-wrap items-end gap-3">
              <input type="hidden" name="leaseId" value={lease.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <Field label="Name (optional)" className="flex-1">
                <input name="name" className={inputCls} placeholder="Signed lease" />
              </Field>
              <Field label="File" className="flex-1">
                <input name="file" type="file" required className={inputCls} />
              </Field>
              <label className="flex items-center gap-2 pb-2 text-sm text-slate-600">
                <input type="checkbox" name="requiresSignature" className="rounded" />
                Requires tenant signature
              </label>
              <button type="submit" className={btnSecondary}>
                Upload
              </button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

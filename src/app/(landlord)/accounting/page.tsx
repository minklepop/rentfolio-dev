import Link from "next/link";
import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtMoney } from "@/lib/money";
import { fmtDate, toDateInput, todayUTC } from "@/lib/format";
import { EXPENSE_CATEGORIES, labelFor } from "@/lib/constants";
import { createExpense, deleteExpense } from "@/app/actions/expenses";
import DeleteButton from "@/components/DeleteButton";
import {
  PageHeader,
  Card,
  Field,
  Table,
  tdCls,
  EmptyState,
  StatTile,
  inputCls,
  btnPrimary,
  btnSecondary,
} from "@/components/ui";

export default async function AccountingPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; propertyId?: string }>;
}) {
  await requireLandlord();
  const sp = await searchParams;
  const currentYear = new Date().getFullYear();
  const year = Number(sp.year) || currentYear;
  const propertyId = sp.propertyId || "";

  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year + 1, 0, 1));

  const [properties, payments, expenses] = await Promise.all([
    db.property.findMany({ orderBy: { name: "asc" } }),
    db.payment.findMany({
      where: {
        paidDate: { gte: yearStart, lt: yearEnd },
        ...(propertyId ? { lease: { unit: { propertyId } } } : {}),
      },
      include: { lease: { include: { unit: { include: { property: true } } } } },
    }),
    db.expense.findMany({
      where: {
        date: { gte: yearStart, lt: yearEnd },
        ...(propertyId ? { propertyId } : {}),
      },
      include: { property: true },
      orderBy: { date: "desc" },
    }),
  ]);

  const income = payments.reduce((s, p) => s + p.amountCents, 0);
  const expenseTotal = expenses.reduce((s, e) => s + e.amountCents, 0);

  const byCategory = new Map<string, number>();
  for (const e of expenses) {
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amountCents);
  }

  const byProperty = new Map<string, { name: string; income: number; expenses: number }>();
  for (const p of properties) {
    byProperty.set(p.id, { name: p.name, income: 0, expenses: 0 });
  }
  for (const p of payments) {
    const row = byProperty.get(p.lease.unit.propertyId);
    if (row) row.income += p.amountCents;
  }
  for (const e of expenses) {
    const row = byProperty.get(e.propertyId);
    if (row) row.expenses += e.amountCents;
  }

  const exportQs = `year=${year}${propertyId ? `&propertyId=${propertyId}` : ""}`;
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  return (
    <div>
      <PageHeader
        title="Accounting"
        subtitle="Income is computed from recorded payments; expenses use IRS Schedule E categories."
        action={
          <div className="flex gap-2">
            <a href={`/accounting/export?type=income&${exportQs}`} className={btnSecondary}>
              Export income CSV
            </a>
            <a href={`/accounting/export?type=expenses&${exportQs}`} className={btnSecondary}>
              Export expenses CSV
            </a>
          </div>
        }
      />

      <form method="get" className="mb-4 flex items-end gap-3">
        <Field label="Year">
          <select name="year" defaultValue={String(year)} className={inputCls}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Property">
          <select name="propertyId" defaultValue={propertyId} className={inputCls}>
            <option value="">All properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <button type="submit" className={btnSecondary}>
          Apply
        </button>
      </form>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label={`Income (${year})`} value={fmtMoney(income)} />
        <StatTile label={`Expenses (${year})`} value={fmtMoney(expenseTotal)} />
        <StatTile
          label={`Net (${year})`}
          value={fmtMoney(income - expenseTotal)}
          hint={income - expenseTotal >= 0 ? "Cash-flow positive" : "Cash-flow negative"}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Expenses by Schedule E category">
          {byCategory.size === 0 ? (
            <EmptyState message="No expenses recorded for this period." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {EXPENSE_CATEGORIES.filter(([v]) => byCategory.has(v)).map(([value, label]) => (
                <li key={value} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-slate-700">{label}</span>
                  <span className="font-medium text-slate-900">
                    {fmtMoney(byCategory.get(value) ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="By property">
          <Table headers={["Property", "Income", "Expenses", "Net"]}>
            {Array.from(byProperty.entries())
              .filter(([id]) => !propertyId || id === propertyId)
              .map(([id, row]) => (
                <tr key={id} className="hover:bg-slate-50">
                  <td className={tdCls}>
                    <Link href={`/properties/${id}`} className="font-medium text-indigo-600 hover:underline">
                      {row.name}
                    </Link>
                  </td>
                  <td className={tdCls}>{fmtMoney(row.income)}</td>
                  <td className={tdCls}>{fmtMoney(row.expenses)}</td>
                  <td className={tdCls}>
                    <span className={row.income - row.expenses < 0 ? "text-red-600" : ""}>
                      {fmtMoney(row.income - row.expenses)}
                    </span>
                  </td>
                </tr>
              ))}
          </Table>
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Expenses">
          <details className="mb-4" open={expenses.length === 0}>
            <summary className="cursor-pointer text-sm font-medium text-indigo-600">
              + Record expense
            </summary>
            <form action={createExpense} className="mt-3 grid gap-3 sm:grid-cols-6">
              <input type="hidden" name="returnTo" value={`/accounting?${exportQs.replace("year=", "year=")}`} />
              <Field label="Property">
                <select name="propertyId" required className={inputCls}>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Date">
                <input name="date" type="date" required defaultValue={toDateInput(todayUTC())} className={inputCls} />
              </Field>
              <Field label="Amount">
                <input name="amount" required className={inputCls} placeholder="$150" />
              </Field>
              <Field label="Category">
                <select name="category" className={inputCls}>
                  {EXPENSE_CATEGORIES.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Vendor">
                <input name="vendor" className={inputCls} />
              </Field>
              <Field label="Description">
                <input name="description" className={inputCls} />
              </Field>
              <div className="sm:col-span-6">
                <button type="submit" className={btnPrimary}>
                  Save expense
                </button>
              </div>
            </form>
          </details>

          {expenses.length === 0 ? (
            <EmptyState message="No expenses recorded for this period." />
          ) : (
            <Table headers={["Date", "Property", "Category", "Vendor", "Description", "Amount", ""]}>
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className={tdCls}>{fmtDate(e.date)}</td>
                  <td className={tdCls}>{e.property.name}</td>
                  <td className={tdCls}>{labelFor(EXPENSE_CATEGORIES, e.category)}</td>
                  <td className={tdCls}>{e.vendor ?? ","}</td>
                  <td className={tdCls}>{e.description ?? ","}</td>
                  <td className={tdCls}>{fmtMoney(e.amountCents)}</td>
                  <td className={tdCls}>
                    <form action={deleteExpense}>
                      <input type="hidden" name="id" value={e.id} />
                      <input type="hidden" name="returnTo" value={`/accounting?${exportQs}`} />
                      <DeleteButton label="✕" confirmText="Delete this expense?" />
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

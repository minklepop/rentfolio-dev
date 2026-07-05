import { emailReport } from "@/app/actions/reports";
import type { Report, ReportType, MonthOption } from "@/lib/reports";
import { Card, Field, Table, tdCls, EmptyState, inputCls, btnSecondary } from "./ui";

export default function ReportView({
  report,
  type,
  basePath,
  month,
  monthOptions,
  emailed,
  error,
}: {
  report: Report;
  type: ReportType;
  basePath: string;
  month?: string;
  monthOptions?: MonthOption[];
  emailed?: string;
  error?: string;
}) {
  const qs = month ? `?month=${encodeURIComponent(month)}` : "";
  return (
    <div>
      {emailed && (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          &ldquo;{emailed}&rdquo; emailed to you (PDF attached).
        </p>
      )}
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        {monthOptions ? (
          <form method="get" className="flex items-end gap-3">
            <Field label="Month">
              <select name="month" defaultValue={month ?? ""} className={inputCls}>
                {monthOptions.map((m) => (
                  <option key={m.value || "all"} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>
            <button type="submit" className={btnSecondary}>
              Apply
            </button>
          </form>
        ) : (
          <div />
        )}

        <div className="flex gap-2">
          <a href={`${basePath}/export${qs}`} className={btnSecondary}>
            Export CSV
          </a>
          <a href={`${basePath}/export${qs}${qs ? "&" : "?"}format=pdf`} className={btnSecondary}>
            Export PDF
          </a>
          <form action={emailReport}>
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="month" value={month ?? ""} />
            <input type="hidden" name="returnTo" value={`${basePath}${qs}`} />
            <button type="submit" className={btnSecondary}>
              Email report to me
            </button>
          </form>
        </div>
      </div>

      <Card>
        {report.rows.length === 0 ? (
          <EmptyState message="No results." />
        ) : (
          <Table headers={report.headers}>
            {report.rows.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50">
                {row.map((cell, j) => (
                  <td key={j} className={tdCls}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";

export const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export const labelCls = "block text-sm font-medium text-slate-700 mb-1";

export const btnPrimary =
  "inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 cursor-pointer";

export const btnSecondary =
  "inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-300 shadow-sm hover:bg-slate-50 cursor-pointer";

export const btnDanger =
  "inline-flex items-center justify-center rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 shadow-sm hover:bg-red-50 cursor-pointer";

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

const BADGE_STYLES: Record<string, string> = {
  // charge / payment statuses
  PAID: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  PARTIAL: "bg-amber-50 text-amber-700 ring-amber-600/20",
  DUE: "bg-sky-50 text-sky-700 ring-sky-600/20",
  OVERDUE: "bg-red-50 text-red-700 ring-red-600/20",
  // lease
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  ENDED: "bg-slate-100 text-slate-600 ring-slate-500/20",
  // maintenance
  OPEN: "bg-amber-50 text-amber-700 ring-amber-600/20",
  IN_PROGRESS: "bg-sky-50 text-sky-700 ring-sky-600/20",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  CANCELED: "bg-slate-100 text-slate-600 ring-slate-500/20",
  // applications
  NEW: "bg-sky-50 text-sky-700 ring-sky-600/20",
  REVIEWING: "bg-amber-50 text-amber-700 ring-amber-600/20",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  DENIED: "bg-red-50 text-red-700 ring-red-600/20",
  // listings
  DRAFT: "bg-slate-100 text-slate-600 ring-slate-500/20",
  PUBLISHED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  CLOSED: "bg-slate-100 text-slate-600 ring-slate-500/20",
  // priorities
  LOW: "bg-slate-100 text-slate-600 ring-slate-500/20",
  NORMAL: "bg-sky-50 text-sky-700 ring-sky-600/20",
  HIGH: "bg-amber-50 text-amber-700 ring-amber-600/20",
  URGENT: "bg-red-50 text-red-700 ring-red-600/20",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const style = BADGE_STYLES[status] ?? "bg-slate-100 text-slate-600 ring-slate-500/20";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}
    >
      {label ?? status.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
    </span>
  );
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <p className="text-sm text-slate-500">{message}</p>
      {action}
    </div>
  );
}

export const thCls =
  "px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500";
export const tdCls = "px-4 py-3 text-sm text-slate-700";

export function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} className={thCls}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

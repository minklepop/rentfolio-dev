import { db } from "./db";
import { fmtMoney } from "./money";
import { fmtDate, todayUTC } from "./format";
import { chargeStatus, paidCents } from "./rent";
import { unitName, tenantNames } from "./names";
import { PAYMENT_METHODS, MAINTENANCE_STATUSES, PRIORITIES, labelFor } from "./constants";

export type ReportType =
  | "tenant-roster"
  | "late-payments"
  | "received-payments"
  | "leases-expiring"
  | "open-maintenance"
  | "rent-roll";

export const REPORT_LABELS: Record<ReportType, string> = {
  "tenant-roster": "Tenant roster",
  "late-payments": "Late payments",
  "received-payments": "Received payments",
  "leases-expiring": "Leases expiring",
  "open-maintenance": "Open maintenance",
  "rent-roll": "Rent roll",
};

/** Reports with a per-row date that "sort by month / All" actually applies to. */
export const FILTERABLE_REPORTS: ReportType[] = [
  "late-payments",
  "received-payments",
  "leases-expiring",
  "open-maintenance",
];

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
}

function toText(title: string, headers: string[], rows: string[][]): string {
  if (rows.length === 0) return `${title}\n\nNo results.`;
  const lines = [title, "", headers.join(" | "), headers.map(() => "---").join(" | ")];
  for (const row of rows) lines.push(row.join(" | "));
  return lines.join("\n");
}

function toHtml(title: string, headers: string[], rows: string[][]): string {
  const head = headers.map((h) => `<th style="text-align:left;padding:4px 8px;">${h}</th>`).join("");
  const body = rows
    .map(
      (r) =>
        `<tr>${r.map((c) => `<td style="padding:4px 8px;border-top:1px solid #e2e8f0;">${c}</td>`).join("")}</tr>`
    )
    .join("");
  return `
    <div style="font-family:sans-serif;color:#0f172a;">
      <h2 style="font-size:16px;">${title}</h2>
      ${rows.length === 0 ? `<p style="color:#64748b;font-size:13px;">No results.</p>` : `<table style="font-size:13px;border-collapse:collapse;"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`}
    </div>
  `;
}

export type Report = { title: string; headers: string[]; rows: string[][] };
export type MonthOption = { value: string; label: string };

/** "YYYY-MM" key for a date, in UTC. */
function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "All" plus a range of months around today - back-looking for history reports, forward-looking for upcoming-lease reports. */
export function monthOptions(monthsBack: number, monthsForward: number): MonthOption[] {
  const today = todayUTC();
  const options: MonthOption[] = [{ value: "", label: "All" }];
  for (let i = monthsForward; i >= -monthsBack; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1));
    const key = monthKey(d);
    options.push({ value: key, label: monthLabel(key) });
  }
  return options;
}

function matchesMonth(date: Date | null, month: string | undefined): boolean {
  if (!month) return true; // "" or undefined = All
  if (!date) return false;
  return monthKey(date) === month;
}

function titleWithMonth(base: string, month: string | undefined): string {
  return month ? `${base}, ${monthLabel(month)}` : `${base}, All`;
}

/** Names, contact info, and current unit for every tenant account. No date dimension to filter by. */
export async function getTenantRoster(): Promise<Report> {
  const tenants = await db.user.findMany({
    where: { role: "TENANT" },
    include: { leases: { include: { lease: { include: { unit: { include: { property: true } } } } } } },
    orderBy: { name: "asc" },
  });
  const rows = tenants.map((t) => [
    t.name,
    t.email,
    t.phone ?? ",",
    t.leases
      .filter((lt) => lt.lease.status === "ACTIVE")
      .map((lt) => unitName(lt.lease.unit))
      .join(", ") || "Not currently leased",
  ]);
  return { title: "Tenant roster", headers: ["Name", "Email", "Phone", "Current unit(s)"], rows };
}

/** Every overdue or partially-paid charge across the portfolio, optionally restricted to one due month. */
export async function getLatePayments(month?: string): Promise<Report> {
  const charges = await db.charge.findMany({
    where: { lease: { status: "ACTIVE" } },
    include: {
      payments: true,
      lease: { include: { unit: { include: { property: true } }, tenants: { include: { user: true } } } },
    },
    orderBy: { dueDate: "asc" },
  });
  const late = charges.filter(
    (c) => ["OVERDUE", "PARTIAL"].includes(chargeStatus(c)) && matchesMonth(c.dueDate, month)
  );
  const rows = late.map((c) => [
    unitName(c.lease.unit),
    tenantNames(c.lease.tenants),
    fmtDate(c.dueDate),
    fmtMoney(c.amountCents),
    fmtMoney(c.amountCents - paidCents(c)),
  ]);
  return {
    title: titleWithMonth("Late payments", month),
    headers: ["Property/Unit", "Tenant(s)", "Due", "Charged", "Owed"],
    rows,
  };
}

/** Every payment recorded, most recent first, optionally restricted to one paid month. */
export async function getReceivedPayments(month?: string): Promise<Report> {
  const payments = await db.payment.findMany({
    include: { lease: { include: { unit: { include: { property: true } } } } },
    orderBy: { paidDate: "desc" },
  });
  const filtered = payments.filter((p) => matchesMonth(p.paidDate, month));
  const rows = filtered.map((p) => [
    fmtDate(p.paidDate),
    unitName(p.lease.unit),
    fmtMoney(p.amountCents),
    labelFor(PAYMENT_METHODS, p.method),
    p.note ?? ",",
  ]);
  return {
    title: titleWithMonth("Received payments", month),
    headers: ["Date", "Property/Unit", "Amount", "Method", "Note"],
    rows,
  };
}

/**
 * Active leases with an end date. With no month chosen ("All"), shows every
 * one of them regardless of how far out it is; choosing a specific month
 * narrows to leases ending in that exact month.
 */
export async function getLeasesExpiring(month?: string): Promise<Report> {
  const leases = await db.lease.findMany({
    where: { status: "ACTIVE", endDate: { not: null } },
    include: { unit: { include: { property: true } }, tenants: { include: { user: true } } },
    orderBy: { endDate: "asc" },
  });
  const filtered = leases.filter((l) => matchesMonth(l.endDate, month));
  const rows = filtered.map((l) => [unitName(l.unit), tenantNames(l.tenants), fmtDate(l.endDate), fmtMoney(l.rentCents)]);
  return { title: titleWithMonth("Leases expiring", month), headers: ["Property/Unit", "Tenant(s)", "Lease end", "Rent"], rows };
}

/** Every open or in-progress maintenance request, optionally restricted to the month it was opened. */
export async function getOpenMaintenanceReport(month?: string): Promise<Report> {
  const requests = await db.maintenanceRequest.findMany({
    where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
    include: { unit: { include: { property: true } }, createdBy: true },
    orderBy: { createdAt: "desc" },
  });
  const filtered = requests.filter((r) => matchesMonth(r.createdAt, month));
  const rows = filtered.map((r) => [
    r.title,
    unitName(r.unit),
    labelFor(PRIORITIES, r.priority),
    labelFor(MAINTENANCE_STATUSES, r.status),
    fmtDate(r.createdAt),
    r.createdBy?.name ?? ",",
  ]);
  return {
    title: titleWithMonth("Open maintenance", month),
    headers: ["Request", "Property/Unit", "Priority", "Status", "Opened", "Reported by"],
    rows,
  };
}

/** Snapshot of every active lease, tenant, rent, and current balance owed. No date dimension to filter by. */
export async function getRentRoll(): Promise<Report> {
  const leases = await db.lease.findMany({
    where: { status: "ACTIVE" },
    include: {
      unit: { include: { property: true } },
      tenants: { include: { user: true } },
      charges: { include: { payments: true } },
    },
    orderBy: { unit: { property: { name: "asc" } } },
  });
  const rows = leases.map((l) => {
    const balance = l.charges.reduce((sum, c) => sum + c.amountCents - paidCents(c), 0);
    return [
      unitName(l.unit),
      tenantNames(l.tenants),
      fmtDate(l.startDate),
      fmtMoney(l.rentCents),
      fmtMoney(l.depositCents),
      fmtMoney(balance),
    ];
  });
  return {
    title: "Rent roll",
    headers: ["Property/Unit", "Tenant(s)", "Lease start", "Monthly rent", "Deposit held", "Balance owed"],
    rows,
  };
}

export async function getReport(type: ReportType, month?: string): Promise<Report> {
  switch (type) {
    case "tenant-roster":
      return getTenantRoster();
    case "late-payments":
      return getLatePayments(month);
    case "received-payments":
      return getReceivedPayments(month);
    case "leases-expiring":
      return getLeasesExpiring(month);
    case "open-maintenance":
      return getOpenMaintenanceReport(month);
    case "rent-roll":
      return getRentRoll();
  }
}

export function reportToText(report: Report): string {
  return toText(report.title, report.headers, report.rows);
}

export function reportToHtml(report: Report): string {
  return toHtml(report.title, report.headers, report.rows);
}

/** Strips "$"/thousand-separator commas from formatted money cells so spreadsheets read them as numbers. */
function csvNumberize(cell: string): string {
  const m = cell.match(/^(-?)\$?([\d,]+\.\d{2})$/);
  return m ? `${m[1]}${m[2].replaceAll(",", "")}` : cell;
}

export function reportToCsv(report: Report): string {
  const rows = report.rows.map((row) => row.map(csvNumberize));
  return toCsv([report.headers, ...rows]);
}

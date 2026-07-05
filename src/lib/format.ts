/** Format a Date as "Jan 5, 2026" (UTC so date-only values don't shift). */
export function fmtDate(d: Date | null | undefined): string {
  if (!d) return ",";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Format a Date as "Jan 5, 2026, 3:04 PM" in local time (for timestamps). */
export function fmtDateTime(d: Date): string {
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Parse an <input type="date"> value (yyyy-mm-dd) as a UTC date. Returns null if empty/invalid. */
export function parseDateInput(input: FormDataEntryValue | null): Date | null {
  if (typeof input !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;
  const d = new Date(input + "T00:00:00.000Z");
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date -> yyyy-mm-dd for <input type="date"> defaults. */
export function toDateInput(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

/** Today as a UTC date-only value. */
export function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

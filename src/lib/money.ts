/** Format integer cents as a US dollar string, e.g. 123456 -> "$1,234.56". */
export function fmtMoney(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

/** Parse a user-entered money string ("1,234.56", "$950") into integer cents. */
export function parseMoney(input: FormDataEntryValue | null): number {
  if (typeof input !== "string") return 0;
  const cleaned = input.replace(/[$,\s]/g, "");
  if (!cleaned) return 0;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}

import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { labelFor, EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/constants";
import { unitName } from "@/lib/names";

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "LANDLORD") {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type") === "expenses" ? "expenses" : "income";
  const year = Number(url.searchParams.get("year")) || new Date().getFullYear();
  const propertyId = url.searchParams.get("propertyId") || "";

  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year + 1, 0, 1));

  let rows: string[][];
  if (type === "income") {
    const payments = await db.payment.findMany({
      where: {
        paidDate: { gte: yearStart, lt: yearEnd },
        ...(propertyId ? { lease: { unit: { propertyId } } } : {}),
      },
      include: { lease: { include: { unit: { include: { property: true } } } }, charge: true },
      orderBy: { paidDate: "asc" },
    });
    rows = [
      ["Date", "Property/Unit", "Amount", "Method", "Charge type", "Note"],
      ...payments.map((p) => [
        p.paidDate.toISOString().slice(0, 10),
        unitName(p.lease.unit),
        (p.amountCents / 100).toFixed(2),
        labelFor(PAYMENT_METHODS, p.method),
        p.charge?.type ?? "",
        p.note ?? "",
      ]),
    ];
  } else {
    const expenses = await db.expense.findMany({
      where: {
        date: { gte: yearStart, lt: yearEnd },
        ...(propertyId ? { propertyId } : {}),
      },
      include: { property: true },
      orderBy: { date: "asc" },
    });
    rows = [
      ["Date", "Property", "Category", "Vendor", "Description", "Amount"],
      ...expenses.map((e) => [
        e.date.toISOString().slice(0, 10),
        e.property.name,
        labelFor(EXPENSE_CATEGORIES, e.category),
        e.vendor ?? "",
        e.description ?? "",
        (e.amountCents / 100).toFixed(2),
      ]),
    ];
  }

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rentfolio-${type}-${year}.csv"`,
    },
  });
}

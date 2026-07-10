import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { geminiText } from "@/lib/gemini";
import { fmtMoney } from "@/lib/money";
import { fmtDate, todayUTC } from "@/lib/format";
import { unitName, tenantNames } from "@/lib/names";
import { paidCents } from "@/lib/rent";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireLandlord();
  if (!process.env.GEMINI_API_KEY) return Response.json({ error: "No API key" }, { status: 500 });

  const { id } = await params;
  const lease = await db.lease.findUnique({
    where: { id },
    include: {
      unit: { include: { property: true } },
      tenants: { include: { user: true } },
      charges: { include: { payments: true }, where: { type: "RENT" } },
    },
  });
  if (!lease) return Response.json({ error: "Not found" }, { status: 404 });

  const landlord = await db.user.findFirst({ where: { role: "LANDLORD" }, select: { aiContextRenewal: true } });
  const extraContext = landlord?.aiContextRenewal ? `\nLandlord context: ${landlord.aiContextRenewal}` : "";

  const today = todayUTC();
  const daysLeft = lease.endDate
    ? Math.floor((lease.endDate.getTime() - today.getTime()) / 86_400_000)
    : null;

  const totalCharges = lease.charges.length;
  const lateCharges = lease.charges.filter((c) => paidCents(c) < c.amountCents).length;
  const onTimeRate = totalCharges > 0
    ? Math.round(((totalCharges - lateCharges) / totalCharges) * 100)
    : 100;

  const prompt = `You are a property-management advisor. A landlord is deciding whether to renew a lease. Give a 3-4 sentence recommendation covering whether to renew, any rent adjustment to consider, and key factors. Be direct.

Unit: ${unitName(lease.unit)}
Tenants: ${tenantNames(lease.tenants)}
Lease end: ${lease.endDate ? fmtDate(lease.endDate) : "month-to-month"}
Days until expiry: ${daysLeft !== null ? daysLeft : "N/A"}
Current rent: ${fmtMoney(lease.rentCents)}/month
Payment history: ${onTimeRate}% on-time (${totalCharges} charges, ${lateCharges} late/outstanding)
Unit market rent: ${lease.unit.marketRentCents ? fmtMoney(lease.unit.marketRentCents) + "/month" : "not set"}${extraContext}`;

  try {
    const recommendation = await geminiText(prompt, 300);
    return Response.json({ recommendation });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

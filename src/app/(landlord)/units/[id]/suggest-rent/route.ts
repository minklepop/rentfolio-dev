import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { geminiText } from "@/lib/gemini";
import { fmtMoney } from "@/lib/money";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireLandlord();
  if (!process.env.GEMINI_API_KEY) return Response.json({ error: "No API key" }, { status: 500 });

  const { id } = await params;
  const unit = await db.unit.findUnique({
    where: { id },
    include: {
      property: true,
      leases: {
        where: { status: "ACTIVE" },
        include: { charges: { where: { type: "RENT" } } },
        take: 1,
      },
    },
  });
  if (!unit) return Response.json({ error: "Not found" }, { status: 404 });

  const landlord = await db.user.findFirst({ where: { role: "LANDLORD" }, select: { aiContextRentSuggestion: true } });
  const extraContext = landlord?.aiContextRentSuggestion ? `\nLandlord context: ${landlord.aiContextRentSuggestion}` : "";

  const currentRent = unit.leases[0]?.charges[0]?.amountCents;

  const prompt = `You are a property-management advisor. Suggest a market rent range for this rental unit and explain your reasoning in 2-3 sentences. End with a concrete suggested range like "$X,XXX – $X,XXX/month". Be concise.

Property: ${unit.property.name}
Unit: ${unit.label}
Bedrooms: ${unit.beds}
Bathrooms: ${unit.baths}
Square footage: ${unit.sqft ? `${unit.sqft} sq ft` : "unknown"}
Current rent: ${currentRent ? fmtMoney(currentRent) + "/month" : "not set"}
Current market rent set in system: ${unit.marketRentCents ? fmtMoney(unit.marketRentCents) + "/month" : "not set"}${extraContext}`;

  try {
    const suggestion = await geminiText(prompt, 300);
    return Response.json({ suggestion });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

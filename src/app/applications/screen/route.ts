import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtMoney } from "@/lib/money";
import { logAiDecision } from "@/lib/aiDecisions";

export async function POST(req: Request) {
  const session = await requireLandlord();
  if (!process.env.GEMINI_API_KEY) return Response.json({ error: "No API key" }, { status: 500 });

  const { applicationId } = await req.json().catch(() => ({}));
  if (!applicationId) return Response.json({ error: "Missing applicationId" }, { status: 400 });

  const landlord = await db.user.findFirst({ where: { role: "LANDLORD" }, select: { aiContextScreening: true } });
  const extraContext = landlord?.aiContextScreening ? `\nLandlord context: ${landlord.aiContextScreening}` : "";

  const app = await db.application.findUnique({
    where: { id: applicationId },
    include: { listing: true },
  });
  if (!app) return Response.json({ error: "Not found" }, { status: 404 });

  const incomeRatio = app.monthlyIncomeCents && app.listing.rentCents
    ? (app.monthlyIncomeCents / app.listing.rentCents).toFixed(1)
    : "unknown";

  const prompt = `Screen this rental application and write a 3-4 sentence plain-English assessment for a landlord.
Cover: income-to-rent ratio, employment situation, occupancy, and an overall recommendation (approve / borderline / decline).
Be direct and concise.

Applicant: ${app.fullName}
Monthly income: ${app.monthlyIncomeCents ? fmtMoney(app.monthlyIncomeCents) : "not provided"}
Monthly rent: ${fmtMoney(app.listing.rentCents)}
Income-to-rent ratio: ${incomeRatio}x (3x is the standard threshold)
Employer: ${app.employer ?? "not provided"}
Job title: ${app.jobTitle ?? "not provided"}
Occupants: ${app.occupants}
Pets: ${app.pets ?? "none listed"}
Reference: ${app.refName ? `${app.refName} (${app.refRelation ?? "unknown relation"})` : "none provided"}
Additional info: ${app.extraInfo ?? "none"}${extraContext}`;

  const model = process.env.ASSISTANT_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 300 },
    }),
  });

  if (!res.ok) return Response.json({ error: "Gemini error" }, { status: 500 });

  const json = await res.json();
  const assessment = (json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
  if (!assessment) return Response.json({ error: "Empty response" }, { status: 500 });

  // Persist to DB
  await db.application.update({
    where: { id: applicationId },
    data: { aiScreening: assessment },
  });

  const decision = await logAiDecision({
    userId: session.userId,
    feature: "SCREENING",
    entityType: "Application",
    entityId: applicationId,
    input: { applicationId, incomeRatio, employer: app.employer, occupants: app.occupants },
    output: assessment,
    model,
  });

  return Response.json({ assessment, decisionId: decision.id });
}

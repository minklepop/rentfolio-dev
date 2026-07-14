import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAiDecision } from "@/lib/aiDecisions";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.GEMINI_API_KEY) return Response.json({ error: "No API key" }, { status: 500 });

  const { title, description } = await req.json().catch(() => ({}));
  if (!title && !description) return Response.json({ error: "Missing input" }, { status: 400 });

  const user = await db.user.findUnique({ where: { id: session.userId }, select: { aiContextMaintenance: true } });
  const extraContext = user?.aiContextMaintenance ? `\nLandlord context: ${user.aiContextMaintenance}` : "";

  const model = process.env.ASSISTANT_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{
          text: `You are a property maintenance classifier.
Rules:
- URGENT = safety hazard (gas leak, flooding, exposed wiring, no heat in winter)
- HIGH = significantly impacts daily living (broken AC in summer, no hot water)
- NORMAL = inconvenient but manageable (leaky faucet, broken appliance)
- LOW = cosmetic or minor (scuff marks, slow drain)
Keep "reason" to one short sentence.${extraContext}`
        }]
      },
      contents: [{ role: "user", parts: [{ text: `Title: ${title}\nDescription: ${description}` }] }],
      generationConfig: {
        maxOutputTokens: 300,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            category: { type: "STRING", enum: ["PLUMBING", "ELECTRICAL", "HVAC", "APPLIANCE", "STRUCTURAL", "PEST_CONTROL", "GENERAL", "OTHER"] },
            priority: { type: "STRING", enum: ["LOW", "NORMAL", "HIGH", "URGENT"] },
            reason: { type: "STRING" },
          },
          required: ["category", "priority", "reason"],
        },
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("[triage] Gemini error:", res.status, errText);
    return Response.json({ error: "Gemini error" }, { status: 500 });
  }

  const json = await res.json();
  const rawText = (json?.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? "")
    .join("")
    .trim();

  try {
    const parsed = JSON.parse(rawText);
    const decision = await logAiDecision({
      userId: session.userId,
      feature: "MAINTENANCE",
      input: { title, description },
      output: parsed,
      model,
    });
    return Response.json({ ...parsed, decisionId: decision.id });
  } catch {
    console.error("[triage] JSON.parse failed:", rawText);
    return Response.json({ error: "Could not parse AI response" }, { status: 500 });
  }
}

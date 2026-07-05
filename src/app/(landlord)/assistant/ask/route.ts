import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertSafeSelect, stripSensitiveColumns } from "@/lib/sqlSafety";
import { SCHEMA_DESCRIPTION } from "@/lib/schemaDescription";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "LANDLORD") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.GEMINI_API_KEY) {
    return Response.json(
      { error: "Set GEMINI_API_KEY in your environment to enable this. Get a free key at https://aistudio.google.com/" },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  const question = body?.question;
  if (!question || typeof question !== "string") {
    return Response.json({ error: "Missing question." }, { status: 400 });
  }

  const systemPrompt = `You translate landlord questions into a single read-only SQLite SELECT statement against this schema:

${SCHEMA_DESCRIPTION}

Rules:
- Output ONLY the raw SQL statement - no markdown fences, no explanation, no commentary.
- Exactly one SELECT statement. Never write to the database.
- Never select passwordHash or totpSecret under any circumstance, including via SELECT *.
- Always include a LIMIT (200 max) unless the question implies a single aggregate value.`;

  const model = process.env.ASSISTANT_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const geminiRes = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: question }] }],
      generationConfig: { maxOutputTokens: 2048 },
    }),
  });

  if (!geminiRes.ok) {
    const err = await geminiRes.text().catch(() => geminiRes.statusText);
    return Response.json({ error: `Gemini API error: ${err}` }, { status: 500 });
  }

  const geminiJson = await geminiRes.json();
  const rawSql = (geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();

  if (!rawSql) {
    return Response.json({ error: "Gemini returned an empty response." }, { status: 500 });
  }

  let sql: string;
  try {
    sql = assertSafeSelect(rawSql);
  } catch (e) {
    return Response.json(
      { error: `Generated query was rejected: ${(e as Error).message}`, sql: rawSql },
      { status: 400 }
    );
  }

  try {
    const rawRows = (await db.$queryRawUnsafe(sql)) as Record<string, unknown>[];
    const rows = stripSensitiveColumns(rawRows)
      .slice(0, 200)
      .map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([k, v]) => [k, typeof v === "bigint" ? Number(v) : v])
        )
      );
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    return Response.json({ sql, columns, rows });
  } catch (e) {
    return Response.json({ error: `Query failed: ${(e as Error).message}`, sql }, { status: 400 });
  }
}

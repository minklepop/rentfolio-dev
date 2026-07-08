/** Shared helper for calling Gemini. Throws on non-OK responses. */
export async function geminiText(prompt: string, maxTokens = 1024): Promise<string> {
  const model = process.env.ASSISTANT_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`Gemini ${res.status}: ${err}`);
  }
  const json = await res.json();
  return (json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
}

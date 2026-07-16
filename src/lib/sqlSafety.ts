const FORBIDDEN =
  /\b(insert|update|delete|drop|alter|create|attach|detach|pragma|replace|truncate|vacuum|begin|commit|rollback|exec|grant|revoke)\b/i;
const SENSITIVE_KEYS = new Set(["passwordhash", "totpsecret"]);

/**
 * Gemini occasionally ignores the raw-SQL instruction and wraps its answer in
 * a Markdown fence or a short introduction. Extract the query before applying
 * the strict read-only validator; this function does not make unsafe SQL safe.
 */
export function extractSql(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:sql|sqlite)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? trimmed).trim();
  const selectAt = candidate.search(/\bselect\b/i);
  if (selectAt < 0) return candidate;
  return candidate.slice(selectAt).replace(/```\s*$/i, "").trim();
}

/** Validates an LLM-generated query is a single, read-only SELECT. Throws if not. Returns the (possibly LIMIT-appended) query. */
export function assertSafeSelect(sql: string): string {
  let trimmed = sql.trim();
  if (trimmed.endsWith(";")) trimmed = trimmed.slice(0, -1).trim();
  if (trimmed.includes(";")) throw new Error("Only a single statement is allowed.");
  if (!/^select\s/i.test(trimmed)) throw new Error("Only SELECT statements are allowed.");
  if (FORBIDDEN.test(trimmed)) throw new Error("Query contains a disallowed keyword.");
  if (/--|\/\*/.test(trimmed)) throw new Error("Comments are not allowed in the query.");
  if (!/\blimit\s+\d+/i.test(trimmed)) trimmed += " LIMIT 200";
  return trimmed;
}

/** Defense in depth: strip sensitive columns from results even if the query selected them (e.g. SELECT *). */
export function stripSensitiveColumns(
  rows: Record<string, unknown>[]
): Record<string, unknown>[] {
  return rows.map((row) => {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (!SENSITIVE_KEYS.has(key.toLowerCase())) clean[key] = value;
    }
    return clean;
  });
}

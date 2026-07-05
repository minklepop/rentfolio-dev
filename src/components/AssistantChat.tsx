"use client";

import { useState, type FormEvent } from "react";
import { Card, Field, inputCls, btnPrimary } from "./ui";

type Success = { sql: string; columns: string[]; rows: Record<string, unknown>[] };
type Failure = { error: string; sql?: string };
type Result = Success | Failure;

const EXAMPLES = [
  "Which tenants are more than 2 weeks late on rent?",
  "What's the total rent roll across all active leases?",
  "List open maintenance requests by priority.",
];

export default function AssistantChat() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function ask(e: FormEvent) {
    e.preventDefault();
    if (!question.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/assistant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      setResult(await res.json());
    } catch {
      setResult({ error: "Request failed, is the server running?" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <form onSubmit={ask} className="flex items-end gap-3">
          <Field label="Ask a question about your portfolio" className="flex-1">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className={inputCls}
              placeholder={EXAMPLES[0]}
            />
          </Field>
          <button type="submit" disabled={loading} className={btnPrimary}>
            {loading ? "Asking…" : "Ask"}
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setQuestion(ex)}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 cursor-pointer"
            >
              {ex}
            </button>
          ))}
        </div>
      </Card>

      {result && "error" in result && (
        <Card>
          <p className="text-sm text-red-700">{result.error}</p>
          {result.sql && (
            <pre className="mt-2 overflow-x-auto rounded bg-slate-50 p-2 text-xs text-slate-600">
              {result.sql}
            </pre>
          )}
        </Card>
      )}

      {result && "rows" in result && (
        <Card title={`${result.rows.length} row${result.rows.length === 1 ? "" : "s"}`}>
          <pre className="mb-3 overflow-x-auto rounded bg-slate-50 p-2 text-xs text-slate-500">
            {result.sql}
          </pre>
          {result.rows.length === 0 ? (
            <p className="text-sm text-slate-500">No matching rows.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr>
                    {result.columns.map((c) => (
                      <th
                        key={c}
                        className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500"
                      >
                        {c.endsWith("Cents") ? c.replace(/Cents$/, "") + " ($)" : c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.rows.map((row, i) => (
                    <tr key={i}>
                      {result.columns.map((c) => {
                        const raw = row[c];
                        const isCents = c.endsWith("Cents") && typeof raw === "number";
                        const display = isCents
                          ? "$" + (raw / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : String(raw ?? "");
                        return (
                          <td key={c} className="px-3 py-2 text-slate-700">
                            {display}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { btnSecondary } from "./ui";

type Props = { unitId: string };

export default function MarketRentSuggestion({ unitId }: Props) {
  const [suggestion, setSuggestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function suggest() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/units/${unitId}/suggest-rent`, { method: "POST" });
      const data = await res.json();
      if (data.suggestion) setSuggestion(data.suggestion);
      else setError(data.error ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {suggestion && (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-indigo-400">AI rent suggestion</p>
          <p className="text-sm leading-relaxed text-slate-800">{suggestion}</p>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button onClick={suggest} disabled={loading} className={`${btnSecondary} disabled:opacity-50`}>
        {loading ? "Analysing…" : "✦ Suggest market rent"}
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { btnSecondary } from "./ui";
import AiFeedback from "./AiFeedback";

type Props = { leaseId: string };

export default function LeaseRenewal({ leaseId }: Props) {
  const [recommendation, setRecommendation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [decisionId, setDecisionId] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/leases/${leaseId}/renewal`, { method: "POST" });
      const data = await res.json();
      if (data.recommendation) { setRecommendation(data.recommendation); setDecisionId(data.decisionId ?? null); }
      else setError(data.error ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {recommendation ? (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-indigo-400">AI renewal recommendation</p>
          <p className="text-sm leading-relaxed text-slate-800">{recommendation}</p>
          <div className="mt-3"><AiFeedback decisionId={decisionId} /></div>
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          Get an AI recommendation on whether to renew this lease and at what rent.
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button onClick={run} disabled={loading} className={`${btnSecondary} disabled:opacity-50`}>
        {loading ? "Analysing…" : recommendation ? "✦ Re-run recommendation" : "✦ Get renewal recommendation"}
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { btnSecondary } from "./ui";

type Props = {
  applicationId: string;
  existingAssessment: string | null;
};

export default function ApplicationScreening({ applicationId, existingAssessment }: Props) {
  const [assessment, setAssessment] = useState(existingAssessment);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/applications/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });
      const data = await res.json();
      if (data.assessment) setAssessment(data.assessment);
      else setError(data.error ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {assessment ? (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-indigo-400">AI screening assessment</p>
          <p className="text-sm text-slate-800 leading-relaxed">{assessment}</p>
        </div>
      ) : (
        <p className="text-sm text-slate-500">No AI assessment yet. Click below to generate one.</p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button onClick={run} disabled={loading} className={`${btnSecondary} disabled:opacity-50`}>
        {loading ? "Analysing…" : assessment ? "✦ Re-run AI screen" : "✦ Run AI screen"}
      </button>
    </div>
  );
}

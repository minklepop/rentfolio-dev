"use client";

import { useState } from "react";
import { reviewAiDecision } from "@/app/actions/aiDecisions";
import { btnSecondary, inputCls } from "./ui";

export default function AiFeedback({ decisionId }: { decisionId: string | null }) {
  const [reviewed, setReviewed] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);
  if (!decisionId) return null;
  if (reviewed) return <p className="text-xs font-medium text-emerald-700">Feedback saved.</p>;

  async function submit(verdict: "accepted" | "rejected", form?: HTMLFormElement) {
    const data = form ? new FormData(form) : new FormData();
    data.set("decisionId", decisionId!);
    data.set("verdict", verdict);
    await reviewAiDecision(data);
    setReviewed(true);
  }

  return (
    <div className="border-t border-indigo-100 pt-3">
      <p className="mb-2 text-xs text-slate-500">Was this recommendation useful?</p>
      {!showCorrection ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnSecondary} onClick={() => submit("accepted")}>Use this recommendation</button>
          <button type="button" className={btnSecondary} onClick={() => setShowCorrection(true)}>Not helpful</button>
        </div>
      ) : (
        <form className="space-y-2" action={(data) => { data.set("decisionId", decisionId); data.set("verdict", "rejected"); return reviewAiDecision(data).then(() => setReviewed(true)); }}>
          <textarea name="overrideValue" rows={2} className={inputCls} placeholder="What would you do instead?" />
          <input name="feedbackNote" className={inputCls} placeholder="Optional reason" />
          <button className={btnSecondary}>Save correction</button>
        </form>
      )}
    </div>
  );
}

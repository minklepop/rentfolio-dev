"use client";
import { useState } from "react";

export default function TenantPayForm({
  leaseId,
  balanceCents,
}: {
  leaseId: string;
  balanceCents: number;
}) {
  const defaultAmount = (balanceCents / 100).toFixed(2);
  const [amount, setAmount] = useState(defaultAmount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    const cents = Math.round(parseFloat(amount) * 100);
    if (!cents || cents <= 0) { setError("Enter a valid amount"); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/portal/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaseId, amountCents: cents }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
        <span className="text-slate-400">$</span>
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-24 bg-transparent text-slate-900 outline-none"
        />
      </div>
      <button
        onClick={pay}
        disabled={loading}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? "Opening Square..." : "Pay via Square"}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <p className="w-full text-xs text-slate-400">
        Amount auto-allocates across your outstanding charges, oldest first.
      </p>
    </div>
  );
}

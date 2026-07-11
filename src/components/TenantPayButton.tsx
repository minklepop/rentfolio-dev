"use client";
import { useState } from "react";

export default function TenantPayButton({ chargeId }: { chargeId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/charges/${chargeId}/payment-link`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create payment link");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <span>
      <button
        onClick={pay}
        disabled={loading}
        className="text-xs font-semibold text-indigo-600 hover:underline disabled:opacity-50"
      >
        {loading ? "Opening..." : "Pay via Square"}
      </button>
      {error && <span className="ml-2 text-xs text-red-500">{error}</span>}
    </span>
  );
}

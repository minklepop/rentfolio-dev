"use client";
import { useState } from "react";

export default function PaymentLinkButton({
  chargeId,
  existingUrl,
}: {
  chargeId: string;
  existingUrl?: string | null;
}) {
  const [url, setUrl] = useState<string | null>(existingUrl ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/charges/${chargeId}/payment-link`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setUrl(data.url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!url) {
    return (
      <span>
        <button
          onClick={generate}
          disabled={loading}
          className="text-xs font-medium text-indigo-600 hover:underline disabled:opacity-50"
        >
          {loading ? "Creating..." : "Payment link"}
        </button>
        {error && <span className="ml-2 text-xs text-red-500">{error}</span>}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-medium text-indigo-600 hover:underline"
      >
        Pay via Square
      </a>
      <button
        onClick={copy}
        className="text-xs text-slate-400 hover:text-slate-600"
        title="Copy link"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </span>
  );
}

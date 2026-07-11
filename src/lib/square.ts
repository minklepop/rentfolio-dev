const BASE_URL =
  process.env.SQUARE_ENV === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";

async function squarePost(path: string, body: unknown) {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!token || !locationId) throw new Error("Square not configured");

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Square-Version": "2025-01-23",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ errors: [{ detail: res.statusText }] }));
    const msg = err?.errors?.[0]?.detail ?? res.statusText;
    throw new Error(`Square ${res.status}: ${msg}`);
  }

  return res.json();
}

export async function createPaymentLink(opts: {
  idempotencyKey: string;
  name: string;
  amountCents: number;
  currency?: string;
}): Promise<{ id: string; url: string }> {
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!locationId) throw new Error("Square not configured");

  const json = await squarePost("/v2/online-checkout/payment-links", {
    idempotency_key: opts.idempotencyKey,
    quick_pay: {
      name: opts.name,
      price_money: { amount: opts.amountCents, currency: opts.currency ?? "USD" },
      location_id: locationId,
    },
  });

  return { id: json.payment_link.id, url: json.payment_link.url };
}

export async function createLeasePaymentLink(opts: {
  idempotencyKey: string;
  leaseId: string;
  label: string;
  amountCents: number;
  currency?: string;
}): Promise<{ id: string; url: string }> {
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!locationId) throw new Error("Square not configured");

  const json = await squarePost("/v2/online-checkout/payment-links", {
    idempotency_key: opts.idempotencyKey,
    order: {
      location_id: locationId,
      reference_id: opts.leaseId,
      line_items: [
        {
          name: opts.label,
          quantity: "1",
          base_price_money: { amount: opts.amountCents, currency: opts.currency ?? "USD" },
        },
      ],
    },
  });

  return { id: json.payment_link.id, url: json.payment_link.url };
}

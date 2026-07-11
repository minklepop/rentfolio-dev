import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { allocatePayment } from "@/lib/allocate";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.text();

  // verify Square signature
  const sigKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (sigKey) {
    const url = process.env.SQUARE_WEBHOOK_URL ?? "";
    const sig = req.headers.get("x-square-hmacsha256-signature") ?? "";
    const expected = crypto
      .createHmac("sha256", sigKey)
      .update(url + body)
      .digest("base64");
    if (sig !== expected) {
      return new Response("Invalid signature", { status: 403 });
    }
  }

  const event = JSON.parse(body);

  if (event.type === "payment.completed") {
    const payment = event.data?.object?.payment;
    if (!payment) return new Response("ok");

    const orderId = payment.order_id;
    if (!orderId) return new Response("ok");

    // fetch order to get reference_id (which we set to leaseId)
    const token = process.env.SQUARE_ACCESS_TOKEN!;
    const base = process.env.SQUARE_ENV === "production"
      ? "https://connect.squareup.com"
      : "https://connect.squareupsandbox.com";

    const orderRes = await fetch(`${base}/v2/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}`, "Square-Version": "2025-01-23" },
    });
    if (!orderRes.ok) return new Response("ok");

    const { order } = await orderRes.json();
    const leaseId = order?.reference_id;
    if (!leaseId) return new Response("ok");

    // idempotency: skip if already recorded for this Square payment
    const existing = await db.payment.findFirst({
      where: { note: { contains: payment.id } },
    });
    if (existing) return new Response("ok");

    const amountCents = payment.amount_money?.amount ?? 0;
    if (amountCents <= 0) return new Response("ok");

    await allocatePayment({
      leaseId,
      amountCents,
      method: "SQUARE",
      note: `Square payment ${payment.id}`,
    });

    revalidatePath("/", "layout");
  }

  return new Response("ok");
}

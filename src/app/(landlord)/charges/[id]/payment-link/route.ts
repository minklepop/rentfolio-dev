import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { createPaymentLink } from "@/lib/square";
import { fmtMoney } from "@/lib/money";
import { paidCents } from "@/lib/rent";
import { unitName } from "@/lib/names";
import { fmtDate } from "@/lib/format";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.SQUARE_ACCESS_TOKEN || !process.env.SQUARE_LOCATION_ID) {
    return Response.json({ error: "Square not configured yet" }, { status: 503 });
  }

  const { id } = await params;
  const charge = await db.charge.findUnique({
    where: { id },
    include: {
      payments: true,
      lease: { include: { unit: { include: { property: true } } } },
    },
  });
  if (!charge) return Response.json({ error: "Not found" }, { status: 404 });

  const remaining = charge.amountCents - paidCents(charge);

  // return cached link if already created
  if (charge.squarePaymentLinkUrl) {
    return Response.json({ url: charge.squarePaymentLinkUrl });
  }

  const label = `${unitName(charge.lease.unit)} – ${charge.description ?? charge.type} due ${fmtDate(charge.dueDate)} (${fmtMoney(charge.amountCents)})`;

  try {
    const link = await createPaymentLink({
      idempotencyKey: charge.id,
      name: label,
      amountCents: remaining,
    });

    await db.charge.update({
      where: { id },
      data: { squarePaymentLinkId: link.id, squarePaymentLinkUrl: link.url },
    });

    return Response.json({ url: link.url });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

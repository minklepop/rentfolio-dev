import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { paidCents } from "@/lib/rent";
import { unitName } from "@/lib/names";
import { createLeasePaymentLink } from "@/lib/square";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.SQUARE_ACCESS_TOKEN || !process.env.SQUARE_LOCATION_ID) {
    return Response.json({ error: "Square not configured" }, { status: 503 });
  }

  const { leaseId, amountCents } = await req.json();
  if (!leaseId || !amountCents || amountCents <= 0) {
    return Response.json({ error: "Invalid amount" }, { status: 400 });
  }

  // verify tenant is on this lease
  const membership = await db.leaseTenant.findUnique({
    where: { leaseId_userId: { leaseId, userId: session.userId } },
    include: { lease: { include: { unit: { include: { property: true } } } } },
  });
  if (!membership) return Response.json({ error: "Not found" }, { status: 404 });

  const lease = membership.lease;
  const label = `Rent payment, ${unitName(lease.unit)}`;

  try {
    const link = await createLeasePaymentLink({
      idempotencyKey: `${leaseId}-${amountCents}-${Date.now()}`,
      leaseId,
      label,
      amountCents,
    });
    return Response.json({ url: link.url });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

import { requireTenant } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";
import { unitName } from "@/lib/names";
import { sendMessage } from "@/app/actions/messages";
import { PageHeader, Card, Field, EmptyState, inputCls, btnPrimary } from "@/components/ui";

export default async function TenantMessagesPage() {
  const session = await requireTenant();

  const memberships = await db.leaseTenant.findMany({
    where: { userId: session.userId },
    include: {
      lease: {
        include: {
          unit: { include: { property: true } },
          messages: { include: { author: true }, orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  const leases = memberships
    .map((m) => m.lease)
    .sort((a, b) => (a.status === "ACTIVE" ? -1 : 1) - (b.status === "ACTIVE" ? -1 : 1));

  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle="Communication log shared with your landlord."
      />

      {leases.length === 0 ? (
        <Card>
          <EmptyState message="You're not on a lease yet." />
        </Card>
      ) : (
        <div className="space-y-6">
          {leases.map((lease) => (
            <Card key={lease.id} title={unitName(lease.unit)}>
              {lease.messages.length === 0 ? (
                <EmptyState message="No messages yet. Start the conversation below." />
              ) : (
                <ul className="mb-4 space-y-2">
                  {lease.messages.map((m) => {
                    const isMe = m.authorId === session.userId;
                    return (
                      <li
                        key={m.id}
                        className={`rounded-lg p-3 ${isMe ? "bg-indigo-50" : "bg-slate-50"}`}
                      >
                        <p className="text-sm text-slate-800">{m.body}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {isMe ? "You" : m.author?.name ?? "Landlord"} · {fmtDateTime(m.createdAt)}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
              <form action={sendMessage} className="flex items-end gap-3">
                <input type="hidden" name="leaseId" value={lease.id} />
                <input type="hidden" name="returnTo" value="/portal/messages" />
                <Field label="Message" className="flex-1">
                  <input name="body" required className={inputCls} placeholder="Hi, I have a question about..." />
                </Field>
                <button type="submit" className={btnPrimary}>
                  Send
                </button>
              </form>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

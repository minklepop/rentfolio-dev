import { requireLandlord } from "@/lib/auth";
import { db } from "@/lib/db";
import { changePassword } from "@/app/actions/auth";
import { sendDigestNow } from "@/app/actions/digest";
import MfaSettingsCard from "@/components/MfaSettingsCard";
import { PageHeader, Card, Field, inputCls, btnPrimary, btnSecondary } from "@/components/ui";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    saved?: string;
    mfaEnabled?: string;
    mfaDisabled?: string;
    mfaError?: string;
    mfaWrongPassword?: string;
    digestSent?: string;
    digestError?: string;
  }>;
}) {
  const session = await requireLandlord();
  const {
    error,
    saved,
    mfaEnabled,
    mfaDisabled,
    mfaError,
    mfaWrongPassword,
    digestSent,
    digestError,
  } = await searchParams;
  const user = await db.user.findUniqueOrThrow({ where: { id: session.userId } });

  return (
    <div className="max-w-xl space-y-6">
      <PageHeader title="Settings" subtitle={`Signed in as ${session.email}`} />
      <Card title="Change password">
        {saved && (
          <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Password updated.
          </p>
        )}
        {error === "wrong" && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Current password is incorrect.
          </p>
        )}
        {error === "short" && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            New password must be at least 8 characters.
          </p>
        )}
        <form action={changePassword} className="space-y-4">
          <Field label="Current password">
            <input name="current" type="password" required className={inputCls} />
          </Field>
          <Field label="New password (min 8 characters)">
            <input name="next" type="password" required minLength={8} className={inputCls} />
          </Field>
          <button type="submit" className={btnPrimary}>
            Update password
          </button>
        </form>
      </Card>

      {mfaEnabled && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Two-factor authentication is now enabled.
        </p>
      )}
      {mfaDisabled && (
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
          Two-factor authentication has been disabled.
        </p>
      )}
      <MfaSettingsCard
        email={user.email}
        totpEnabled={user.totpEnabled}
        totpSecret={user.totpSecret}
        mfaError={mfaError}
        mfaWrongPassword={mfaWrongPassword}
      />

      <Card title="Weekly follow-up digest">
        <p className="mb-3 text-sm text-slate-600">
          Emails a summary of overdue rent, leases ending within 30 days, and open maintenance,
          who to follow up with this week. Requires SMTP credentials in your environment
          (<code>SMTP_HOST</code>, <code>SMTP_USER</code>, <code>SMTP_PASS</code>, etc., see README)
          before sending will work.
        </p>
        {digestSent && (
          <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Sent to {process.env.DIGEST_TO || session.email}.
          </p>
        )}
        {digestError && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{digestError}</p>
        )}
        <form action={sendDigestNow}>
          <button type="submit" className={btnSecondary}>
            Send digest now
          </button>
        </form>
        <p className="mt-3 text-xs text-slate-500">
          To run it automatically every week, schedule a request to{" "}
          <code>/digest/send?token=YOUR_DIGEST_CRON_SECRET</code> (cron, Windows Task Scheduler,
          etc.), see README for setup.
        </p>
      </Card>

      <p className="text-xs text-slate-500">
        Rentfolio is self-hosted: your data lives in <code>prisma/dev.db</code> (SQLite) and
        uploaded files in the <code>uploads/</code> folder. Back both up regularly, copying the
        two files/folders is a complete backup.
      </p>
    </div>
  );
}

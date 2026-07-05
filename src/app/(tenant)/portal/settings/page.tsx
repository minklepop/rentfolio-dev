import { requireTenant } from "@/lib/auth";
import { db } from "@/lib/db";
import { changePassword } from "@/app/actions/auth";
import MfaSettingsCard from "@/components/MfaSettingsCard";
import { PageHeader, Card, Field, inputCls, btnPrimary } from "@/components/ui";

export default async function TenantSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    saved?: string;
    mfaEnabled?: string;
    mfaDisabled?: string;
    mfaError?: string;
    mfaWrongPassword?: string;
  }>;
}) {
  const session = await requireTenant();
  const { error, saved, mfaEnabled, mfaDisabled, mfaError, mfaWrongPassword } = await searchParams;
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
    </div>
  );
}

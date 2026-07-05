import QRCode from "qrcode";
import { totpUri } from "@/lib/totp";
import { startMfaEnrollment, confirmMfaEnrollment, cancelMfaEnrollment, disableMfa } from "@/app/actions/mfa";
import { Card, Field, inputCls, btnPrimary, btnSecondary } from "./ui";

export default async function MfaSettingsCard({
  email,
  totpEnabled,
  totpSecret,
  mfaError,
  mfaWrongPassword,
}: {
  email: string;
  totpEnabled: boolean;
  totpSecret: string | null;
  mfaError?: string;
  mfaWrongPassword?: string;
}) {
  if (totpEnabled) {
    return (
      <Card title="Two-factor authentication">
        <p className="mb-3 text-sm text-emerald-700">
          Enabled, a 6-digit code from your authenticator app is required at sign-in.
        </p>
        {mfaWrongPassword && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Incorrect password.
          </p>
        )}
        <form action={disableMfa} className="flex items-end gap-3">
          <Field label="Current password, to disable" className="flex-1">
            <input name="password" type="password" required className={inputCls} />
          </Field>
          <button type="submit" className={btnSecondary}>
            Disable
          </button>
        </form>
      </Card>
    );
  }

  if (totpSecret) {
    const uri = totpUri(email, totpSecret);
    const qr = await QRCode.toDataURL(uri);
    return (
      <Card title="Finish setting up two-factor authentication">
        {mfaError && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Incorrect code, try again.
          </p>
        )}
        <p className="mb-3 text-sm text-slate-600">
          Scan this with Google Authenticator, Authy, or any TOTP app, then enter the 6-digit
          code it shows.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="Two-factor setup QR code" className="mb-3 h-40 w-40" />
        <p className="mb-4 text-xs text-slate-500">
          Can&apos;t scan? Enter this key manually:{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5">{totpSecret}</code>
        </p>
        <div className="flex items-end gap-3">
          <form action={confirmMfaEnrollment} className="flex flex-1 items-end gap-3">
            <Field label="6-digit code" className="flex-1">
              <input
                name="code"
                required
                maxLength={6}
                inputMode="numeric"
                autoFocus
                className={inputCls}
              />
            </Field>
            <button type="submit" className={btnPrimary}>
              Confirm &amp; enable
            </button>
          </form>
          <form action={cancelMfaEnrollment}>
            <button type="submit" className={btnSecondary}>
              Cancel
            </button>
          </form>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Two-factor authentication">
      <p className="mb-3 text-sm text-slate-600">
        Not enabled. Adds a 6-digit code requirement at sign-in using any free authenticator
        app, no SMS provider, no third-party cost.
      </p>
      <form action={startMfaEnrollment}>
        <button type="submit" className={btnPrimary}>
          Set up two-factor authentication
        </button>
      </form>
    </Card>
  );
}

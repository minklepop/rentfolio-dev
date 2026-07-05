import { redirect } from "next/navigation";
import { getPendingMfaUserId } from "@/lib/auth";
import { verifyMfaCode } from "@/app/actions/auth";
import { btnPrimary, inputCls, labelCls } from "@/components/ui";

export default async function VerifyMfaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const userId = await getPendingMfaUserId();
  if (!userId) redirect("/login");
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white">
            R
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Two-factor code</h1>
          <p className="mt-1 text-sm text-slate-500">
            Enter the 6-digit code from your authenticator app.
          </p>
        </div>
        <form
          action={verifyMfaCode}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              Incorrect or expired code.
            </p>
          )}
          <div>
            <label className={labelCls}>Code</label>
            <input
              name="code"
              required
              autoFocus
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              className={`${inputCls} text-center text-lg tracking-widest`}
            />
          </div>
          <button type="submit" className={`${btnPrimary} w-full`}>
            Verify
          </button>
        </form>
      </div>
    </main>
  );
}

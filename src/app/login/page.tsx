import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { login } from "@/app/actions/auth";
import { btnPrimary, inputCls, labelCls } from "@/components/ui";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (session) redirect(session.role === "LANDLORD" ? "/dashboard" : "/portal");
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white">
            R
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Rentfolio</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to manage your rentals
          </p>
        </div>
        <form
          action={login}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              Invalid email or password.
            </p>
          )}
          <div>
            <label className={labelCls}>Email</label>
            <input name="email" type="email" required autoFocus className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Password</label>
            <input name="password" type="password" required className={inputCls} />
          </div>
          <button type="submit" className={`${btnPrimary} w-full`}>
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}

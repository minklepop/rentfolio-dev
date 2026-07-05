import Link from "next/link";
import { requireTenant } from "@/lib/auth";
import { logout } from "@/app/actions/auth";

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireTenant();
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/portal" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
                R
              </span>
              <span className="font-bold tracking-tight text-slate-900">Rentfolio</span>
            </Link>
            <nav className="flex gap-4 text-sm font-medium text-slate-600">
              <Link href="/portal" className="hover:text-slate-900">
                My rental
              </Link>
              <Link href="/portal/maintenance" className="hover:text-slate-900">
                Maintenance
              </Link>
              <Link href="/portal/messages" className="hover:text-slate-900">
                Messages
              </Link>
              <Link href="/portal/settings" className="hover:text-slate-900">
                Settings
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-500 sm:inline">{session.name}</span>
            <form action={logout}>
              <button
                type="submit"
                className="text-sm font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl p-4 py-8">{children}</main>
    </div>
  );
}

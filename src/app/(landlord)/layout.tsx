import { requireLandlord } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import Sidebar from "@/components/Sidebar";

export default async function LandlordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireLandlord();
  return (
    <div className="flex min-h-screen">
      <Sidebar userName={session.name} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-end border-b border-slate-200 bg-white px-6">
          <form action={logout}>
            <button
              type="submit"
              className="text-sm font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              Sign out
            </button>
          </form>
        </header>
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

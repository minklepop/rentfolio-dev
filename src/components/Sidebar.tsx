"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/properties", label: "Properties", icon: "⌂" },
  { href: "/leases", label: "Leases", icon: "✎" },
  { href: "/payments", label: "Payments", icon: "$" },
  { href: "/maintenance", label: "Maintenance", icon: "🔧" },
  { href: "/listings", label: "Listings", icon: "◎" },
  { href: "/leads", label: "Leads", icon: "★" },
  { href: "/applications", label: "Applications", icon: "☰" },
  { href: "/tenants", label: "Tenants", icon: "👥" },
  { href: "/accounting", label: "Accounting", icon: "Σ" },
  { href: "/reports", label: "Reports", icon: "▤" },
  { href: "/resources", label: "Resources", icon: "🔗" },
  { href: "/assistant", label: "Ask the data", icon: "💬" },
  { href: "/analytics", label: "Analytics", icon: "%" },
  { href: "/ai-history", label: "AI history", icon: "AI" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export default function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 items-center gap-2 border-b border-slate-100 px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
          R
        </span>
        <span className="text-lg font-bold tracking-tight text-slate-900">Rentfolio</span>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className="w-4 text-center text-xs">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-100 p-4">
        <p className="truncate text-sm font-medium text-slate-900">{userName}</p>
        <p className="text-xs text-slate-500">Landlord</p>
      </div>
    </aside>
  );
}

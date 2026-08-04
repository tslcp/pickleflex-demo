"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CircleDot, LogOut, X } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { useAuth } from "@/lib/auth-context";
import { getInitials } from "@/lib/format";

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.push("/signin");
    router.refresh();
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col bg-slate-900 transition-transform duration-300 ease-in-out md:static md:z-auto md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-6">
          <Link href="/" onClick={onClose} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500">
              <CircleDot className="h-5 w-5 text-slate-900" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-lg font-bold leading-tight tracking-tight text-white">
                Pickle<span className="text-emerald-400">Flex</span>
              </p>
              <p className="text-xs text-slate-400">League Manager</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:text-white md:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.isActive(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  active
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${
                    active ? "text-emerald-400" : "text-slate-400 group-hover:text-white"
                  }`}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{item.label}</span>
                  <span className="truncate text-xs font-normal text-slate-500">
                    {item.description}
                  </span>
                </span>
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="border-t border-slate-800 p-4">
            <div className="flex items-center gap-3 rounded-lg bg-slate-800/60 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold text-slate-900">
                {getInitials(user.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{user.name}</p>
                <p className="truncate text-xs text-slate-400">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

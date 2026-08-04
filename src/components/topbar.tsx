"use client";

import { usePathname } from "next/navigation";
import { Bell, Menu } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { useAuth } from "@/lib/auth-context";
import { getInitials } from "@/lib/format";

interface TopbarProps {
  onOpenMobile: () => void;
}

export function Topbar({ onOpenMobile }: TopbarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const current = NAV_ITEMS.find((item) => item.isActive(pathname)) ?? NAV_ITEMS[0];

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white/80 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobile}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 md:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">
            {current.label}
          </h1>
          <p className="hidden text-sm text-zinc-500 sm:block">{current.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          className="relative rounded-full p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>
        {user && (
          <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold text-slate-900 sm:flex">
            {getInitials(user.name)}
          </div>
        )}
      </div>
    </header>
  );
}

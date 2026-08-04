import { LayoutDashboard, Search, ShieldCheck, Trophy, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Player Dashboard",
    description: "Your matches & stats",
    icon: LayoutDashboard,
    isActive: (pathname) => pathname === "/",
  },
  {
    href: "/tournaments",
    label: "Browse Tournaments",
    description: "Find your next event",
    icon: Search,
    isActive: (pathname) => pathname.startsWith("/tournaments"),
  },
  {
    href: "/admin",
    label: "Admin Panel",
    description: "Manage the season",
    icon: ShieldCheck,
    isActive: (pathname) => pathname.startsWith("/admin"),
  },
  {
    href: "/standings",
    label: "Public Standings",
    description: "Live leaderboard",
    icon: Trophy,
    isActive: (pathname) => pathname.startsWith("/standings"),
  },
];

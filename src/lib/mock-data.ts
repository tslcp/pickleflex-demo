import type { AdminMatch, AdminStat, PlayerProfile } from "@/lib/types";

export const PLAYER_PROFILE: PlayerProfile = {
  name: "Jordan Diaz",
  initials: "JD",
  email: "jordan@pickleflex.gg",
  skillLevel: 4.0,
  division: "Intermediate",
  record: "7-2",
  winRate: 78,
  rank: 3,
};

export const ADMIN_STATS: AdminStat[] = [
  {
    key: "players",
    label: "Total Players",
    value: "128",
    hint: "+12 since last month",
    iconBg: "bg-zinc-100",
    iconColor: "text-zinc-600",
  },
  {
    key: "completed",
    label: "Matches Completed",
    value: "342",
    hint: "86% of season played",
    iconBg: "bg-zinc-100",
    iconColor: "text-zinc-600",
  },
  {
    key: "disputes",
    label: "Pending Disputes",
    value: "4",
    hint: "Needs admin review",
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
  },
  {
    key: "days",
    label: "Days Left in Season",
    value: "18",
    hint: "Ends August 7",
    iconBg: "bg-zinc-100",
    iconColor: "text-zinc-600",
  },
];

export const ADMIN_MATCHES: AdminMatch[] = [
  { id: "M-1042", division: "Division A · 4.0", players: ["Jordan Diaz", "Dave Okonkwo"], status: "disputed" },
  { id: "M-1041", division: "Division B · 3.5", players: ["Amara Chen", "Felix Grant"], status: "pending" },
  { id: "M-1040", division: "Division A · 4.0", players: ["Priya Nathan", "Jordan Diaz"], status: "scheduled" },
  { id: "M-1039", division: "Division C · 3.0", players: ["Sam Wexler", "Nina Torres"], status: "unscheduled" },
  { id: "M-1038", division: "Division B · 3.5", players: ["Lena Sorokin", "Marcus Ibe"], status: "completed" },
  { id: "M-1037", division: "Division A · 4.0", players: ["Owen Blake", "Ravi Sethi"], status: "disputed" },
  { id: "M-1036", division: "Division C · 3.0", players: ["Talia Brooks", "Ken Yamada"], status: "completed" },
];

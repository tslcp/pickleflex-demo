import type { AdminMatch, AdminStat, Division, PlayerProfile } from "@/lib/types";

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

export const DIVISIONS: Division[] = [
  {
    id: "a",
    label: "Division A · 4.0 Skill",
    standings: [
      { rank: 1, name: "Priya Nathan", wins: 11, losses: 1, pointDiff: 48 },
      { rank: 2, name: "Owen Blake", wins: 9, losses: 3, pointDiff: 31 },
      { rank: 3, name: "Jordan Diaz", wins: 7, losses: 2, pointDiff: 22 },
      { rank: 4, name: "Ravi Sethi", wins: 6, losses: 5, pointDiff: 9 },
      { rank: 5, name: "Dave Okonkwo", wins: 5, losses: 6, pointDiff: -4 },
      { rank: 6, name: "Casey Whitfield", wins: 2, losses: 9, pointDiff: -37 },
    ],
  },
  {
    id: "b",
    label: "Division B · 3.5 Skill",
    standings: [
      { rank: 1, name: "Amara Chen", wins: 10, losses: 2, pointDiff: 39 },
      { rank: 2, name: "Lena Sorokin", wins: 8, losses: 3, pointDiff: 25 },
      { rank: 3, name: "Marcus Ibe", wins: 8, losses: 4, pointDiff: 18 },
      { rank: 4, name: "Felix Grant", wins: 6, losses: 6, pointDiff: 2 },
      { rank: 5, name: "Nina Torres", wins: 3, losses: 8, pointDiff: -21 },
      { rank: 6, name: "Sam Wexler", wins: 1, losses: 10, pointDiff: -44 },
    ],
  },
  {
    id: "c",
    label: "Division C · 3.0 Skill",
    standings: [
      { rank: 1, name: "Ken Yamada", wins: 9, losses: 1, pointDiff: 33 },
      { rank: 2, name: "Talia Brooks", wins: 8, losses: 2, pointDiff: 27 },
      { rank: 3, name: "Nora Fischer", wins: 6, losses: 4, pointDiff: 11 },
      { rank: 4, name: "Ben Ortiz", wins: 5, losses: 5, pointDiff: 0 },
      { rank: 5, name: "Zoe Patterson", wins: 3, losses: 7, pointDiff: -14 },
      { rank: 6, name: "Milo Hendricks", wins: 1, losses: 9, pointDiff: -35 },
    ],
  },
];

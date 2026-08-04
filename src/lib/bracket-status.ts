import type { BracketMatchStatus } from "@/lib/bracket-types";

export const BRACKET_MATCH_STATUS_LABEL: Record<BracketMatchStatus, { label: string; classes: string }> = {
  pending_participants: { label: "TBD", classes: "bg-zinc-100 text-zinc-500 ring-zinc-500/20" },
  tentative_placeholder: { label: "Tentative", classes: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  unscheduled: { label: "Needs Scheduling", classes: "bg-zinc-100 text-zinc-600 ring-zinc-500/20" },
  scheduled: { label: "Scheduled", classes: "bg-blue-50 text-blue-700 ring-blue-600/20" },
  completed: { label: "Completed", classes: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  forfeited: { label: "Forfeited", classes: "bg-red-50 text-red-700 ring-red-600/20" },
};

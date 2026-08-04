import type { TournamentStatus } from "@/lib/types";

export const TOURNAMENT_STATUS_LABEL: Record<TournamentStatus, { label: string; classes: string }> = {
  registration_open: {
    label: "Registration Open",
    classes: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  },
  scheduled: {
    label: "Schedule Released",
    classes: "bg-blue-50 text-blue-700 ring-blue-600/20",
  },
  in_progress: {
    label: "In Progress",
    classes: "bg-amber-50 text-amber-700 ring-amber-600/20",
  },
  completed: {
    label: "Completed",
    classes: "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
  },
};

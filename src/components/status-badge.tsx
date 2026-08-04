import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  Clock,
  type LucideIcon,
} from "lucide-react";
import type { MatchStatus } from "@/lib/types";

const STATUS_CONFIG: Record<
  MatchStatus,
  { label: string; classes: string; icon: LucideIcon }
> = {
  unscheduled: {
    label: "Unscheduled",
    classes: "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
    icon: CircleDashed,
  },
  scheduled: {
    label: "Scheduled",
    classes: "bg-blue-50 text-blue-700 ring-blue-600/20",
    icon: CalendarClock,
  },
  pending: {
    label: "Pending Confirmation",
    classes: "bg-amber-50 text-amber-700 ring-amber-600/20",
    icon: Clock,
  },
  completed: {
    label: "Completed",
    classes: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    icon: CheckCircle2,
  },
  disputed: {
    label: "Disputed",
    classes: "bg-red-50 text-red-700 ring-red-600/20",
    icon: AlertTriangle,
  },
};

export function StatusBadge({ status }: { status: MatchStatus }) {
  const { label, classes, icon: Icon } = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${classes}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

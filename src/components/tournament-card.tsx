import Link from "next/link";
import { Calendar, MapPin, Users } from "lucide-react";
import type { Tournament } from "@/lib/types";
import { formatDateRange } from "@/lib/format";
import { TOURNAMENT_STATUS_LABEL } from "@/lib/tournament-status";

interface TournamentCardProps {
  tournament: Tournament;
  spotsFilled: number;
  spotsTotal: number;
}

export function TournamentCard({ tournament, spotsFilled, spotsTotal }: TournamentCardProps) {
  const status = TOURNAMENT_STATUS_LABEL[tournament.status];
  const pct = spotsTotal > 0 ? Math.min(100, Math.round((spotsFilled / spotsTotal) * 100)) : 0;

  return (
    <Link
      href={`/tournaments/${tournament.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-colors hover:border-zinc-300"
    >
      <div className="flex h-28 items-start bg-slate-900 p-5">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${status.classes}`}
        >
          {status.label}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 group-hover:text-emerald-700">
            {tournament.name}
          </h3>
          <p className="text-sm text-zinc-500">{tournament.tagline}</p>
        </div>
        <div className="flex flex-col gap-1.5 text-sm text-zinc-600">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 shrink-0 text-zinc-400" />
            {formatDateRange(tournament.startDate, tournament.endDate)}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 shrink-0 text-zinc-400" />
            {tournament.venue} · {tournament.city}
          </span>
        </div>
        <div className="mt-auto flex flex-wrap gap-1.5">
          {tournament.divisions.map((d) => (
            <span
              key={d.id}
              className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600"
            >
              {d.skillLevel} Skill
            </span>
          ))}
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {spotsFilled}/{spotsTotal} registered
            </span>
            <span>${tournament.entryFee} entry</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </Link>
  );
}

import type { ReactNode } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  MapPin,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useTournaments } from "@/lib/tournament-context";
import { formatDateRange } from "@/lib/format";
import type { Tournament, TournamentStatus } from "@/lib/types";

export const HERO_STATUS_LABEL: Record<TournamentStatus, { label: string; classes: string }> = {
  registration_open: {
    label: "Registration Open",
    classes: "bg-emerald-400/10 text-emerald-400 ring-emerald-400/20",
  },
  scheduled: {
    label: "Schedule Released",
    classes: "bg-blue-400/10 text-blue-300 ring-blue-400/20",
  },
  in_progress: {
    label: "In Progress",
    classes: "bg-amber-400/10 text-amber-300 ring-amber-400/20",
  },
  completed: {
    label: "Completed",
    classes: "bg-zinc-400/10 text-zinc-300 ring-zinc-400/20",
  },
};

const HOW_SCHEDULING_WORKS = [
  "Choose a scheduling cohort — a set of 3 possible days that fits your week.",
  "Pick at least 2 of those days and a 3-hour window for each.",
  "Every player in your division schedules the same way, so PickleFlex can always find at least one overlapping hour between you and any opponent.",
  "Once you're matched, your earliest shared time slot is scheduled automatically — no back-and-forth required.",
  "Need to move a match? You get up to 2 reschedules within your cohort before the scheduled time becomes final.",
];

export function Fact({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-white">{value}</p>
      </div>
    </div>
  );
}

export function Card({
  title,
  children,
  accent,
  id,
}: {
  title: string;
  children: ReactNode;
  accent?: boolean;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={`scroll-mt-24 rounded-2xl border p-5 sm:p-6 ${
        accent ? "border-emerald-200 bg-emerald-50/40" : "border-zinc-200 bg-white"
      }`}
    >
      <h3 className="mb-4 text-base font-semibold text-zinc-900">{title}</h3>
      {children}
    </div>
  );
}

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-medium text-zinc-900">{value}</dd>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      {children}
    </label>
  );
}

export function TournamentHero({ tournament, children }: { tournament: Tournament; children?: ReactNode }) {
  const status = HERO_STATUS_LABEL[tournament.status];
  return (
    <section className="overflow-hidden rounded-2xl bg-slate-900 p-6 sm:p-8">
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${status.classes}`}
      >
        {status.label}
      </span>
      <h1 className="mt-3 text-2xl font-bold text-white sm:text-3xl">{tournament.name}</h1>
      <p className="mt-1 text-slate-300">{tournament.tagline}</p>
      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-800 pt-5 sm:grid-cols-4">
        <Fact icon={Calendar} label="Dates" value={formatDateRange(tournament.startDate, tournament.endDate)} />
        <Fact icon={MapPin} label="Location" value={tournament.city} />
        <Fact icon={Trophy} label="Format" value={tournament.format.split(",")[0]} />
        <Fact icon={DollarSign} label="Entry Fee" value={`$${tournament.entryFee}`} />
      </div>
      {children && <div className="mt-6 border-t border-slate-800 pt-6">{children}</div>}
    </section>
  );
}

export function RegisteredList({ tournamentId }: { tournamentId: string }) {
  const { registrationsFor, tournaments } = useTournaments();
  const tournament = tournaments.find((t) => t.id === tournamentId)!;
  const regs = registrationsFor(tournamentId);

  if (regs.length === 0) {
    return <p className="text-sm text-zinc-500">Be the first to register for this event.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {tournament.divisions.map((d) => {
        const players = regs.filter((r) => r.divisionId === d.id);
        if (players.length === 0) return null;
        return (
          <div key={d.id}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {d.label} · {d.skillLevel} Skill
            </p>
            <div className="flex flex-wrap gap-2">
              {players.map((p) => {
                const cohort = tournament.cohorts.find((c) => c.id === p.cohortId);
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 rounded-lg bg-zinc-100 py-1.5 pl-1.5 pr-3"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-300 text-[10px] font-semibold text-zinc-700">
                      {p.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                    <span className="flex flex-col leading-tight">
                      <span className="text-xs font-medium text-zinc-700">
                        {p.name}
                        {p.isCurrentUser && <span className="ml-1 text-emerald-600">(You)</span>}
                      </span>
                      <span className="text-[11px] text-zinc-500">{cohort?.label ?? "No cohort"}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TournamentDetailsSections({ tournament }: { tournament: Tournament }) {
  const { registrationsFor } = useTournaments();

  return (
    <>
      <Card title="About This Event">
        <p className="text-sm leading-relaxed text-zinc-600">{tournament.description}</p>
      </Card>

      <Card title="Event Schedule">
        <ul className="flex flex-col gap-3">
          {tournament.schedule.map((s) => (
            <li key={s.label} className="flex gap-3 text-sm">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                <p className="font-medium text-zinc-900">{s.label}</p>
                <p className="text-zinc-500">{s.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="How Match Scheduling Works">
        <ul className="flex flex-col gap-2.5">
          {HOW_SCHEDULING_WORKS.map((line) => (
            <li key={line} className="flex gap-2.5 text-sm text-zinc-600">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              {line}
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Divisions & Spots">
        <div className="flex flex-col gap-4">
          {tournament.divisions.map((d) => {
            const filled = registrationsFor(tournament.id, d.id).length;
            const pct = Math.min(100, Math.round((filled / d.maxPlayers) * 100));
            return (
              <div key={d.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-zinc-900">
                    {d.label} · {d.skillLevel} Skill
                  </span>
                  <span className="text-zinc-500">
                    {filled}/{d.maxPlayers} registered
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Rules & Format">
        <ul className="flex flex-col gap-2.5">
          {tournament.rules.map((rule) => (
            <li key={rule} className="flex gap-2.5 text-sm text-zinc-600">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              {rule}
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Who's Registered">
        <RegisteredList tournamentId={tournament.id} />
      </Card>
    </>
  );
}

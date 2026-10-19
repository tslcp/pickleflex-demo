"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Mail, RotateCcw } from "lucide-react";
import { CohortAvailabilityPicker } from "@/components/cohort-availability-picker";
import { Card, Field, Row, TournamentDetailsSections, TournamentHero } from "@/components/tournament-overview";
import { useAuth } from "@/lib/auth-context";
import type { AuthUser } from "@/lib/auth-store";
import { useTournaments } from "@/lib/tournament-context";
import { formatDate } from "@/lib/format";
import { formatBlock } from "@/lib/scheduling";
import type { DayAvailability, Tournament } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

const MIN_AVAILABILITY_DAYS = 2;

export function TournamentDetail({ id }: { id: string }) {
  const { user } = useAuth();
  const { tournaments } = useTournaments();
  const tournament = tournaments.find((t) => t.id === id);

  if (!tournament) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
        <p className="text-sm text-zinc-500">This tournament could not be found.</p>
        <Link
          href="/#tournaments"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <Link href="/#tournaments" className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700">
          <ArrowLeft size={16} /> Back to Home
        </Link>
        <TournamentHero tournament={tournament} />
        <TournamentDetailsSections tournament={tournament} />
        <TournamentContact tournament={tournament} />
      </div>
    );
  }

  return <TournamentDetailContent id={id} tournament={tournament} user={user} />;
}

function TournamentContact({ tournament }: { tournament: Tournament }) {
  return (
    <Card title="Tournament Information">
      <dl className="flex flex-col gap-3 text-sm">
        <Row label="Venue" value={`${tournament.venue}, ${tournament.city}`} />
        <Row label="Format" value={tournament.format} />
        <Row label="Registration deadline" value={formatDate(tournament.registrationDeadline)} />
        <Row label="Organizer" value={tournament.organizer} />
      </dl>
      <a href={`mailto:${tournament.organizerEmail}`} className="mt-4 inline-flex items-center gap-2 break-all text-sm text-emerald-700">
        <Mail size={16} />{tournament.organizerEmail}
      </a>
    </Card>
  );
}

function TournamentDetailContent({
  id,
  tournament,
  user,
}: {
  id: string;
  tournament: Tournament;
  user: AuthUser;
}) {
  const { registrationsFor, myRegistration, registerForTournament, cancelRegistration } = useTournaments();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [divisionId, setDivisionId] = useState(tournament.divisions?.[0]?.id ?? "");
  const [cohortId, setCohortId] = useState(tournament.cohorts?.[0]?.id ?? "");
  const [availability, setAvailability] = useState<DayAvailability[]>([]);

  const registration = myRegistration(tournament.id);
  const isAvailabilityValid = availability.length >= MIN_AVAILABILITY_DAYS;
  const canSubmit = Boolean(name && email && divisionId && cohortId) && isAvailabilityValid;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    registerForTournament(tournament.id, { name, email, divisionId, cohortId, availability });
  }

  const registeredCohort = registration
    ? tournament.cohorts.find((c) => c.id === registration.cohortId)
    : undefined;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/#tournaments" className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>
        <Link
          href="/tournaments"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Tournaments
        </Link>
        <Link
          href={`/tournaments/${id}/wizard`}
          className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          Preview guided signup version <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <TournamentHero tournament={tournament} />
      <TournamentContact tournament={tournament} />

      <Card title={registration ? "You're Registered" : "Reserve Your Spot"} accent>
        {registration ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">Registration confirmed</span>
            </div>
            <dl className="flex flex-col gap-2 text-sm">
              <Row
                label="Division"
                value={tournament.divisions.find((d) => d.id === registration.divisionId)?.label ?? "—"}
              />
              <Row label="Cohort" value={registeredCohort?.label ?? "—"} />
              <Row label="Registered" value={formatDate(registration.registeredAt)} />
              <Row label="Entry Fee" value={`$${tournament.entryFee} — pay at check-in`} />
            </dl>

            <div className="rounded-lg bg-white p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Your Availability
              </p>
              <div className="flex flex-col gap-1.5">
                {registration.availability.map((a) => (
                  <div key={a.day} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-zinc-900">{a.day}</span>
                    <span className="text-zinc-500">{formatBlock(a.startHour)}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="flex items-start gap-2 text-xs text-zinc-500">
              <RotateCcw className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              This availability is locked in once the tournament is confirmed. You&apos;ll get up to 2
              reschedules per match if something comes up
              {registration.reschedulesUsed > 0 ? ` (${registration.reschedulesUsed} used so far).` : "."}
            </p>

            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              View My Dashboard
            </Link>
            {tournament.status === "registration_open" && (
              <button
                type="button"
                onClick={() => cancelRegistration(tournament.id)}
                className="text-sm font-medium text-red-500 hover:text-red-600"
              >
                Cancel registration
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Full Name">
              <input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass}
              />
            </Field>
            <Field label="Division">
              <select value={divisionId} onChange={(e) => setDivisionId(e.target.value)} className={inputClass}>
                {tournament.divisions.map((d) => {
                  const filled = registrationsFor(tournament.id, d.id).length;
                  const full = filled >= d.maxPlayers;
                  return (
                    <option key={d.id} value={d.id} disabled={full}>
                      {d.label} · {d.skillLevel} Skill {full ? "(Full)" : ""}
                    </option>
                  );
                })}
              </select>
            </Field>

            <div className="border-t border-zinc-200 pt-4">
              <CohortAvailabilityPicker
                cohorts={tournament.cohorts}
                cohortId={cohortId}
                onCohortChange={setCohortId}
                availability={availability}
                onAvailabilityChange={setAvailability}
              />
              {!isAvailabilityValid && (
                <p className="mt-2 text-xs text-zinc-500">
                  Select at least {MIN_AVAILABILITY_DAYS} days to continue.
                </p>
              )}
            </div>

            <p className="rounded-lg bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700">
              No payment required to reserve your spot. The ${tournament.entryFee} entry fee is collected at
              check-in.
            </p>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              Reserve My Spot
            </button>
          </form>
        )}
      </Card>

      <Card title="Event Organizer">
        <div className="flex flex-col gap-2 text-sm text-zinc-600">
          <p className="font-medium text-zinc-900">{tournament.organizer}</p>
          <p className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            {tournament.organizerEmail}
          </p>
          <p className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Registration closes {formatDate(tournament.registrationDeadline)}
          </p>
        </div>
      </Card>

      <TournamentDetailsSections tournament={tournament} />
    </div>
  );
}

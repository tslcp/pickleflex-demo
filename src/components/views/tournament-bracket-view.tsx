"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Trophy } from "lucide-react";
import { BracketView } from "@/components/bracket/bracket-view";
import { MyBracketMatches } from "@/components/bracket/my-bracket-matches";
import { useTournaments } from "@/lib/tournament-context";
import { useBracket } from "@/lib/use-bracket";

export function TournamentBracketView({ id }: { id: string }) {
  const { tournaments } = useTournaments();
  const tournament = tournaments.find((t) => t.id === id);
  const searchParams = useSearchParams();
  const initialDivisionId = searchParams.get("division") ?? tournament?.divisions[0]?.id ?? "";
  const initialCohortId = searchParams.get("cohort") ?? tournament?.cohorts[0]?.id ?? "";
  const [divisionId, setDivisionId] = useState(initialDivisionId);
  const [cohortId, setCohortId] = useState(initialCohortId);

  if (!tournament) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
        <p className="text-sm text-zinc-500">This tournament could not be found.</p>
        <Link
          href="/tournaments"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Tournaments
        </Link>
      </div>
    );
  }

  const division = tournament.divisions.find((d) => d.id === divisionId) ?? tournament.divisions[0];
  const cohort = tournament.cohorts.find((c) => c.id === cohortId) ?? tournament.cohorts[0];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={`/tournaments/${tournament.id}`}
            className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back to {tournament.name}
          </Link>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-zinc-900">
            <Trophy className="h-5 w-5 text-emerald-600" /> Bracket
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tournament.divisions.length > 1 && (
            <select
              value={division?.id ?? ""}
              onChange={(e) => setDivisionId(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {tournament.divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label} · {d.skillLevel} Skill
                </option>
              ))}
            </select>
          )}
          {tournament.cohorts.length > 1 && (
            <select
              value={cohort?.id ?? ""}
              onChange={(e) => setCohortId(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {tournament.cohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {division && cohort ? (
        <DivisionBracket tournamentId={tournament.id} divisionId={division.id} cohortId={cohort.id} />
      ) : (
        <p className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
          This tournament has no divisions or cohorts set up.
        </p>
      )}
    </div>
  );
}

function DivisionBracket({
  tournamentId,
  divisionId,
  cohortId,
}: {
  tournamentId: string;
  divisionId: string;
  cohortId: string;
}) {
  const { bracket, loading, error, setBracket } = useBracket(tournamentId, divisionId, cohortId);

  if (loading) {
    return <p className="text-sm text-zinc-400">Loading bracket…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!bracket) {
    return (
      <p className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
        No bracket has been generated for this division and cohort yet. Check back once the tournament organizer
        starts it.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-3 text-base font-semibold text-zinc-900">My Matches</h2>
        <MyBracketMatches bracket={bracket} onUpdate={setBracket} />
      </section>
      <section>
        <h2 className="mb-3 text-base font-semibold text-zinc-900">Full Bracket</h2>
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <BracketView bracket={bracket} />
        </div>
      </section>
    </div>
  );
}

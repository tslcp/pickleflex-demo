"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { TournamentCard } from "@/components/tournament-card";
import { useTournaments } from "@/lib/tournament-context";

export function BrowseTournaments() {
  const { tournaments, registrationsFor } = useTournaments();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tournaments;
    return tournaments.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.city.toLowerCase().includes(q) ||
        t.venue.toLowerCase().includes(q),
    );
  }, [tournaments, query]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">Upcoming Tournaments</h3>
          <p className="text-sm text-zinc-500">
            {filtered.length} event{filtered.length === 1 ? "" : "s"} found
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or city"
            className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-9 pr-4 text-sm text-zinc-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center text-sm text-zinc-500">
          No tournaments match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => {
            const spotsTotal = t.divisions.reduce((sum, d) => sum + d.maxPlayers, 0);
            const spotsFilled = registrationsFor(t.id).length;
            return (
              <TournamentCard
                key={t.id}
                tournament={t}
                spotsFilled={spotsFilled}
                spotsTotal={spotsTotal}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

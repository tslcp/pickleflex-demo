"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { DIVISIONS } from "@/lib/mock-data";

const RANK_BADGE: Record<number, string> = {
  1: "bg-amber-100 text-amber-600",
  2: "bg-zinc-200 text-zinc-600",
  3: "bg-orange-100 text-orange-700",
};

export function PublicStandings() {
  const [divisionId, setDivisionId] = useState(DIVISIONS[0].id);
  const division = DIVISIONS.find((d) => d.id === divisionId) ?? DIVISIONS[0];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">League Standings</h3>
          <p className="text-sm text-zinc-500">Updated live as scores are confirmed</p>
        </div>
        <div className="relative">
          <select
            value={divisionId}
            onChange={(event) => setDivisionId(event.target.value)}
            className="w-full appearance-none rounded-lg border border-zinc-200 bg-white py-2.5 pl-4 pr-10 text-sm font-medium text-zinc-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:w-64"
          >
            {DIVISIONS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-3 font-medium">Rank</th>
                <th className="px-5 py-3 font-medium">Player</th>
                <th className="px-5 py-3 text-center font-medium">W</th>
                <th className="px-5 py-3 text-center font-medium">L</th>
                <th className="px-5 py-3 text-right font-medium">Point Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {division.standings.map((row) => (
                <tr
                  key={row.rank}
                  className={`transition-colors hover:bg-zinc-50/70 ${
                    row.rank <= 3 ? "bg-emerald-50/30" : ""
                  }`}
                >
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                        RANK_BADGE[row.rank] ?? "text-zinc-500"
                      }`}
                    >
                      {row.rank}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-medium text-zinc-900">{row.name}</td>
                  <td className="px-5 py-4 text-center text-zinc-700">{row.wins}</td>
                  <td className="px-5 py-4 text-center text-zinc-700">{row.losses}</td>
                  <td
                    className={`px-5 py-4 text-right font-semibold ${
                      row.pointDiff > 0
                        ? "text-emerald-600"
                        : row.pointDiff < 0
                          ? "text-red-500"
                          : "text-zinc-500"
                    }`}
                  >
                    {row.pointDiff > 0 ? `+${row.pointDiff}` : row.pointDiff}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

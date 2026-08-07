import type { Registration, StandingsRow, TournamentMatch } from "@/lib/types";

/**
 * Standings for one division, computed from completed round-robin match
 * results. Bracket (elimination) results aren't folded in here — a bracket
 * is a separate playoff structure with its own progress view, not regular-
 * season play. Registrants with no completed matches yet still appear,
 * ranked last, so the table isn't empty right after sign-ups open.
 */
export function computeStandings(matches: TournamentMatch[], registrations: Registration[]): StandingsRow[] {
  const stats = new Map<string, { wins: number; losses: number; pointDiff: number }>(
    registrations.map((r) => [r.id, { wins: 0, losses: 0, pointDiff: 0 }]),
  );

  for (const m of matches) {
    if (m.status !== "completed" || !m.score) continue;
    const a = stats.get(m.playerAId);
    const b = stats.get(m.playerBId);
    if (!a || !b) continue;

    const diff = m.score.a - m.score.b;
    a.pointDiff += diff;
    b.pointDiff -= diff;
    if (m.score.a > m.score.b) {
      a.wins += 1;
      b.losses += 1;
    } else if (m.score.b > m.score.a) {
      b.wins += 1;
      a.losses += 1;
    }
  }

  return registrations
    .map((r) => ({ name: r.name, ...stats.get(r.id)! }))
    .sort((x, y) => y.wins - x.wins || y.pointDiff - x.pointDiff || x.name.localeCompare(y.name))
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

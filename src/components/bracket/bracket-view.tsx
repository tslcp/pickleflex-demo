import { BRACKET_MATCH_STATUS_LABEL } from "@/lib/bracket-status";
import { formatDateTime } from "@/lib/format";
import { formatHour } from "@/lib/scheduling";
import type { BracketDTO, BracketMatchDTO, BracketParticipantDTO } from "@/lib/bracket-types";

function ParticipantLabel({
  participant,
  isWinner,
}: {
  participant: BracketParticipantDTO | null;
  isWinner: boolean;
}) {
  if (!participant) return <span className="text-zinc-400">TBD</span>;
  return (
    <span className={isWinner ? "font-semibold text-zinc-900" : "text-zinc-700"}>{participant.name}</span>
  );
}

function MatchCard({ match }: { match: BracketMatchDTO }) {
  const status = BRACKET_MATCH_STATUS_LABEL[match.status];

  return (
    <div className="w-56 shrink-0 rounded-lg border border-zinc-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${status.classes}`}
        >
          {status.label}
        </span>
        {match.scheduledAt && match.status !== "completed" && (
          <span className="truncate text-[10px] text-zinc-400">{formatDateTime(match.scheduledAt)}</span>
        )}
      </div>
      <div className="flex flex-col gap-1 text-sm">
        <div className="flex items-center justify-between gap-2">
          <ParticipantLabel participant={match.participant1} isWinner={match.winnerId === match.participant1?.id} />
          {match.status === "completed" && <span className="text-xs text-zinc-500">{match.scoreA}</span>}
        </div>
        <div className="flex items-center justify-between gap-2">
          <ParticipantLabel participant={match.participant2} isWinner={match.winnerId === match.participant2?.id} />
          {match.status === "completed" && <span className="text-xs text-zinc-500">{match.scoreB}</span>}
        </div>
      </div>
      {match.status === "tentative_placeholder" && match.placeholderCandidates && (
        <div className="mt-2 flex flex-col gap-0.5 border-t border-zinc-100 pt-2 text-[10px] text-zinc-400">
          {match.placeholderCandidates.map((c) => (
            <p key={c.participantId} className="truncate">
              vs {c.participantName}: {c.day && c.hour !== null ? `${c.day} ${formatHour(c.hour)}` : "no overlap"}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function BracketColumns({ matches, side }: { matches: BracketMatchDTO[]; side: BracketMatchDTO["bracketSide"] }) {
  const sideMatches = matches.filter((m) => m.bracketSide === side);
  if (sideMatches.length === 0) return null;
  const rounds = [...new Set(sideMatches.map((m) => m.round))].sort((a, b) => a - b);

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {rounds.map((round) => (
        <div key={round} className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            {side === "grand_final" ? (round === 2 ? "Bracket Reset" : "Grand Final") : `Round ${round}`}
          </p>
          <div className="flex flex-col justify-around gap-4">
            {sideMatches
              .filter((m) => m.round === round)
              .map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function BracketView({ bracket }: { bracket: BracketDTO }) {
  const hasGrandFinal = bracket.matches.some((m) => m.bracketSide === "grand_final");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-zinc-900">Winners Bracket</h3>
        <BracketColumns matches={bracket.matches} side="winners" />
      </div>
      {bracket.format === "double" && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-zinc-900">Losers Bracket</h3>
          <BracketColumns matches={bracket.matches} side="losers" />
        </div>
      )}
      {hasGrandFinal && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-zinc-900">Final</h3>
          <BracketColumns matches={bracket.matches} side="grand_final" />
        </div>
      )}
    </div>
  );
}

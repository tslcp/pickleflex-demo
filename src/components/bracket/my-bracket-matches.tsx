"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, RotateCcw, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { requestRescheduleRequest, submitScoreRequest } from "@/lib/bracket-client";
import { BRACKET_MATCH_STATUS_LABEL } from "@/lib/bracket-status";
import { formatDateTime } from "@/lib/format";
import { formatHour } from "@/lib/scheduling";
import type { BracketDTO, BracketMatchDTO, BracketParticipantDTO } from "@/lib/bracket-types";

const MAX_RESCHEDULES = 2;

const primaryBtn =
  "inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-300";
const neutralBtn =
  "inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40";
const fieldClass =
  "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

interface MyMatch {
  match: BracketMatchDTO;
  self: BracketParticipantDTO;
  opponent: BracketParticipantDTO | null;
}

function findMyMatches(bracket: BracketDTO, email: string): MyMatch[] {
  const myParticipantIds = new Set(
    bracket.participants
      .filter((p) => p.members.some((m) => m.email.toLowerCase() === email.toLowerCase()))
      .map((p) => p.id),
  );

  const result: MyMatch[] = [];
  for (const match of bracket.matches) {
    const selfIsP1 = Boolean(match.participant1 && myParticipantIds.has(match.participant1.id));
    const selfIsP2 = Boolean(match.participant2 && myParticipantIds.has(match.participant2.id));
    if (!selfIsP1 && !selfIsP2) continue;
    const self = (selfIsP1 ? match.participant1 : match.participant2)!;
    const opponent = selfIsP1 ? match.participant2 : match.participant1;
    result.push({ match, self, opponent });
  }
  return result;
}

function MatchRow({ entry, onUpdate }: { entry: MyMatch; onUpdate: (b: BracketDTO) => void }) {
  const { match, self, opponent } = entry;
  const [mode, setMode] = useState<"idle" | "report" | "reschedule">("idle");
  const [scoreSelf, setScoreSelf] = useState("");
  const [scoreOpp, setScoreOpp] = useState("");
  const [rescheduleAt, setRescheduleAt] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isSelfP1 = match.participant1?.id === self.id;

  async function submitScore(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (scoreSelf === "" || scoreOpp === "") return;
    setBusy(true);
    setError("");
    try {
      const a = isSelfP1 ? Number(scoreSelf) : Number(scoreOpp);
      const b = isSelfP1 ? Number(scoreOpp) : Number(scoreSelf);
      const updated = await submitScoreRequest(match.id, a, b);
      onUpdate(updated);
      setMode("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit score.");
    } finally {
      setBusy(false);
    }
  }

  async function submitReschedule(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!rescheduleAt) return;
    setBusy(true);
    setError("");
    try {
      const updated = await requestRescheduleRequest(match.id, self.id, {
        customDateTime: new Date(rescheduleAt).toISOString(),
      });
      onUpdate(updated);
      setMode("idle");
      setRescheduleAt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reschedule.");
    } finally {
      setBusy(false);
    }
  }

  const status = BRACKET_MATCH_STATUS_LABEL[match.status];
  const reschedulesLeft = Math.max(0, MAX_RESCHEDULES - self.rescheduleCount);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-zinc-900">
            {opponent ? `vs ${opponent.name}` : match.isBye ? "Bye — advancing automatically" : "Opponent TBD"}
          </p>
          <p className="text-xs text-zinc-400">
            {match.bracketSide === "grand_final"
              ? match.round === 2
                ? "Grand Final — Bracket Reset"
                : "Grand Final"
              : `${match.bracketSide === "winners" ? "Winners" : "Losers"} Bracket · Round ${match.round}`}
          </p>
        </div>
        <span
          className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${status.classes}`}
        >
          {status.label}
        </span>
      </div>

      {match.scheduledAt && match.status !== "completed" && (
        <p className="text-xs text-zinc-500">Scheduled for {formatDateTime(match.scheduledAt)}</p>
      )}

      {match.status === "tentative_placeholder" && match.placeholderCandidates && (
        <div className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-500">
          <p className="mb-1 font-medium text-zinc-600">Waiting on the previous round&apos;s result:</p>
          {match.placeholderCandidates.map((c) => (
            <p key={c.participantId}>
              If you face {c.participantName}:{" "}
              {c.day && c.hour !== null
                ? `${c.day} ${formatHour(c.hour)}`
                : "no automatic overlap — will need manual scheduling"}
            </p>
          ))}
        </div>
      )}

      {match.status === "completed" && (
        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          {isSelfP1 ? `${match.scoreA} – ${match.scoreB}` : `${match.scoreB} – ${match.scoreA}`}
          {match.winnerId === self.id ? " · You won" : " · You lost"}
        </p>
      )}

      {(match.status === "scheduled" || match.status === "unscheduled") && opponent && (
        <div className="flex flex-wrap items-center gap-2">
          {mode !== "report" && (
            <button type="button" onClick={() => setMode("report")} className={primaryBtn}>
              Report Score
            </button>
          )}
          {mode !== "reschedule" && (
            <button
              type="button"
              onClick={() => setMode("reschedule")}
              disabled={reschedulesLeft <= 0}
              className={neutralBtn}
            >
              <RotateCcw className="h-4 w-4" />
              {reschedulesLeft > 0 ? `Request Reschedule (${reschedulesLeft} left)` : "Final Time — No Reschedules Left"}
            </button>
          )}
        </div>
      )}

      {reschedulesLeft <= 0 && match.status !== "completed" && opponent && (
        <p className="flex items-center gap-1.5 text-xs text-amber-700">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
          You&apos;ve used both reschedules. This time is final — play as scheduled or forfeit.
        </p>
      )}

      {mode === "report" && (
        <form onSubmit={submitScore} className="flex flex-wrap items-end gap-3 rounded-lg bg-zinc-50 p-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-zinc-700">Your games won</span>
            <input
              type="number"
              min={0}
              value={scoreSelf}
              onChange={(e) => setScoreSelf(e.target.value)}
              required
              className={`w-24 ${fieldClass}`}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-zinc-700">Opponent games won</span>
            <input
              type="number"
              min={0}
              value={scoreOpp}
              onChange={(e) => setScoreOpp(e.target.value)}
              required
              className={`w-24 ${fieldClass}`}
            />
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={primaryBtn}>
              Submit
            </button>
            <button type="button" onClick={() => setMode("idle")} className={neutralBtn}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {mode === "reschedule" && (
        <form onSubmit={submitReschedule} className="flex flex-wrap items-end gap-3 rounded-lg bg-zinc-50 p-3">
          <label className="flex flex-1 min-w-[12rem] flex-col gap-1.5 text-sm">
            <span className="font-medium text-zinc-700">New date &amp; time</span>
            <input
              type="datetime-local"
              value={rescheduleAt}
              onChange={(e) => setRescheduleAt(e.target.value)}
              required
              className={fieldClass}
            />
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={primaryBtn}>
              Confirm
            </button>
            <button type="button" onClick={() => setMode("idle")} className={neutralBtn}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function MyBracketMatches({ bracket, onUpdate }: { bracket: BracketDTO; onUpdate: (b: BracketDTO) => void }) {
  const { user } = useAuth();
  if (!user) return null;
  const myMatches = findMyMatches(bracket, user.email);

  if (myMatches.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500">
        You don&apos;t have any matches in this bracket.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {myMatches.map((entry) => (
        <MatchRow key={entry.match.id} entry={entry} onUpdate={onUpdate} />
      ))}
    </div>
  );
}

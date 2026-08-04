"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Calendar, CheckCircle2, Mail, Send, ShieldAlert, X } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { PLAYER_PROFILE } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";
import { useTournaments, type MatchWithContext } from "@/lib/tournament-context";
import { formatDateTime, getInitials } from "@/lib/format";
import { TOURNAMENT_STATUS_LABEL } from "@/lib/tournament-status";

const neutralBtn =
  "inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50";
const emeraldBtn =
  "inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500";
const ghostBtn =
  "rounded-lg border border-zinc-200 px-3.5 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100";
const fieldClass =
  "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center sm:text-left">
      <p className="text-lg font-bold text-white sm:text-xl">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

function MatchCard({ match }: { match: MatchWithContext }) {
  const { scheduleMatch, reportScore, confirmScore, disputeScore } = useTournaments();
  const [mode, setMode] = useState<"idle" | "schedule" | "report">("idle");
  const [scheduledAt, setScheduledAt] = useState("");
  const [myScore, setMyScore] = useState("");
  const [oppScore, setOppScore] = useState("");

  const opponentInitials = match.opponent.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isSelfPlayerA = match.playerAId === match.self.id;
  const myFinalScore = match.score ? (isSelfPlayerA ? match.score.a : match.score.b) : undefined;
  const oppFinalScore = match.score ? (isSelfPlayerA ? match.score.b : match.score.a) : undefined;

  function submitSchedule(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!scheduledAt) return;
    scheduleMatch(match.id, new Date(scheduledAt).toISOString());
    setMode("idle");
  }

  function submitScore(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (myScore === "" || oppScore === "") return;
    const scoreForA = isSelfPlayerA ? Number(myScore) : Number(oppScore);
    const scoreForB = isSelfPlayerA ? Number(oppScore) : Number(myScore);
    reportScore(match.id, scoreForA, scoreForB);
    setMyScore("");
    setOppScore("");
    setMode("idle");
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-600">
            {opponentInitials}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-zinc-900">{match.opponent.name}</p>
            <p className="flex items-center gap-1.5 text-sm text-zinc-500">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{match.opponent.email}</span>
            </p>
            <p className="text-xs text-zinc-400">{match.tournament.name}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          <StatusBadge status={match.status} />
          {match.status === "unscheduled" && mode !== "schedule" && (
            <button type="button" onClick={() => setMode("schedule")} className={neutralBtn}>
              <Calendar className="h-4 w-4" /> Set Time Manually
            </button>
          )}
          {match.status === "scheduled" && mode !== "report" && (
            <button type="button" onClick={() => setMode("report")} className={emeraldBtn}>
              <Send className="h-4 w-4" /> Report Score
            </button>
          )}
          {match.status === "pending" && (
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => confirmScore(match.id)} className={emeraldBtn}>
                <CheckCircle2 className="h-4 w-4" /> Confirm Score
              </button>
              <button
                type="button"
                onClick={() => disputeScore(match.id)}
                className="text-sm font-medium text-red-500 hover:text-red-600"
              >
                Dispute
              </button>
            </div>
          )}
          {match.status === "completed" && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-600">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {myFinalScore}–{oppFinalScore}
            </span>
          )}
          {match.status === "disputed" && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3.5 py-2 text-sm font-medium text-red-600">
              <ShieldAlert className="h-4 w-4" /> Awaiting Admin
            </span>
          )}
        </div>
      </div>

      {match.status === "scheduled" && match.scheduledAt && mode !== "report" && (
        <p className="text-xs text-zinc-500">Scheduled for {formatDateTime(match.scheduledAt)}</p>
      )}

      {match.status === "pending" && match.score && (
        <p className="text-xs text-zinc-500">
          Reported score: {myFinalScore}–{oppFinalScore}. Waiting on confirmation.
        </p>
      )}

      {match.status === "unscheduled" && mode !== "schedule" && (
        <p className="text-xs text-zinc-400">
          No shared availability window was found automatically — likely different cohorts. Set a time manually below.
        </p>
      )}

      {mode === "schedule" && (
        <form onSubmit={submitSchedule} className="flex flex-col gap-3 rounded-lg bg-zinc-50 p-4 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1.5 text-sm">
            <span className="font-medium text-zinc-700">Match date & time</span>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
              className={fieldClass}
            />
          </label>
          <div className="flex gap-2">
            <button type="submit" className={emeraldBtn}>
              Confirm
            </button>
            <button type="button" onClick={() => setMode("idle")} className={ghostBtn} aria-label="Cancel">
              <X className="h-4 w-4" />
            </button>
          </div>
        </form>
      )}

      {mode === "report" && (
        <form onSubmit={submitScore} className="flex flex-col gap-3 rounded-lg bg-zinc-50 p-4 sm:flex-row sm:items-end">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-zinc-700">Your games won</span>
            <input
              type="number"
              min={0}
              value={myScore}
              onChange={(e) => setMyScore(e.target.value)}
              required
              className={`w-24 ${fieldClass}`}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-zinc-700">Opponent games won</span>
            <input
              type="number"
              min={0}
              value={oppScore}
              onChange={(e) => setOppScore(e.target.value)}
              required
              className={`w-24 ${fieldClass}`}
            />
          </label>
          <div className="flex gap-2">
            <button type="submit" className={emeraldBtn}>
              Submit
            </button>
            <button type="button" onClick={() => setMode("idle")} className={ghostBtn} aria-label="Cancel">
              <X className="h-4 w-4" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function PlayerDashboard() {
  const { user } = useAuth();
  const { tournaments, registrationsFor, myMatches } = useTournaments();
  const myRegisteredTournaments = tournaments.filter((t) =>
    registrationsFor(t.id).some((r) => r.isCurrentUser),
  );

  if (!user) {
    return <div className="mx-auto max-w-5xl text-sm text-zinc-500">Loading your dashboard…</div>;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <section className="overflow-hidden rounded-2xl bg-slate-900 p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-xl font-bold text-slate-900">
              {getInitials(user.name)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white sm:text-2xl">{user.name}</h2>
              <p className="text-sm text-slate-400">{user.email}</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 ring-1 ring-inset ring-emerald-400/20">
                  Skill Level {user.skillLevel.toFixed(1)}
                </span>
                <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-300 ring-1 ring-inset ring-white/10">
                  {PLAYER_PROFILE.division} Division
                </span>
              </div>
            </div>
          </div>
          <div className="flex justify-between gap-6 border-t border-slate-800 pt-5 sm:justify-end sm:gap-8 sm:border-t-0 sm:pt-0">
            <Stat label="Record" value={PLAYER_PROFILE.record} />
            <Stat label="Win Rate" value={`${PLAYER_PROFILE.winRate}%`} />
            <Stat label="Rank" value={`#${PLAYER_PROFILE.rank}`} />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-900">My Tournaments</h3>
          <Link href="/tournaments" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
            Browse more →
          </Link>
        </div>
        {myRegisteredTournaments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center">
            <p className="text-sm text-zinc-500">You haven&apos;t joined a tournament yet.</p>
            <Link href="/tournaments" className={`mt-3 inline-flex ${emeraldBtn}`}>
              Browse Tournaments
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {myRegisteredTournaments.map((t) => {
              const reg = registrationsFor(t.id).find((r) => r.isCurrentUser)!;
              const division = t.divisions.find((d) => d.id === reg.divisionId);
              const status = TOURNAMENT_STATUS_LABEL[t.status];
              const matchCount = myMatches.filter((m) => m.tournamentId === t.id).length;
              return (
                <Link
                  key={t.id}
                  href={`/tournaments/${t.id}`}
                  className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-zinc-900">{t.name}</p>
                    <p className="text-sm text-zinc-500">
                      {division?.label} · {division?.skillLevel} Skill
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${status.classes}`}
                    >
                      {status.label}
                    </span>
                    {matchCount > 0 && (
                      <span className="text-xs text-zinc-400">
                        {matchCount} match{matchCount === 1 ? "" : "es"}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-900">Your Matches</h3>
          <span className="text-sm text-zinc-500">{myMatches.length} total</span>
        </div>
        {myMatches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
            Matches will appear here once a tournament organizer generates the schedule for your division.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {myMatches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

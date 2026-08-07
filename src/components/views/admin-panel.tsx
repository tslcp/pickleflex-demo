"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Plus,
  ShieldAlert,
  Trash2,
  Trophy,
  UserPlus,
  Users,
  Wand2,
  X,
  type LucideIcon,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { generateBracketRequest } from "@/lib/bracket-client";
import type { BracketFormat, GenerateBracketInput } from "@/lib/bracket-types";
import { formatDateTime } from "@/lib/format";
import { ADMIN_MATCHES, ADMIN_STATS } from "@/lib/mock-data";
import { useTournaments } from "@/lib/tournament-context";
import { TOURNAMENT_STATUS_LABEL } from "@/lib/tournament-status";
import { useBracket } from "@/lib/use-bracket";
import type { AdminStat, Cohort, MatchStatus, Registration, Tournament, TournamentDivision } from "@/lib/types";

const STAT_ICONS: Record<AdminStat["key"], LucideIcon> = {
  players: Users,
  completed: CheckCircle2,
  disputes: AlertTriangle,
  days: CalendarClock,
};

const fieldClass =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

function AdminAction({ status }: { status: MatchStatus }) {
  if (status === "disputed") {
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-500"
      >
        <ShieldAlert className="h-3.5 w-3.5" />
        Resolve Dispute
      </button>
    );
  }

  if (status === "completed") {
    return <span className="text-xs text-zinc-400">No action needed</span>;
  }

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-50"
    >
      <BellRing className="h-3.5 w-3.5" />
      Trigger Reminder
    </button>
  );
}

function ReminderButton() {
  const [sent, setSent] = useState(false);

  return (
    <button
      type="button"
      disabled={sent}
      onClick={() => {
        setSent(true);
        setTimeout(() => setSent(false), 2000);
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-60"
    >
      <BellRing className="h-3.5 w-3.5" />
      {sent ? "Reminder Sent" : "Trigger Reminder"}
    </button>
  );
}

function LabeledField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      {children}
    </label>
  );
}

interface DivisionDraft {
  label: string;
  skillLevel: string;
  maxPlayers: string;
}

function CreateTournamentForm({ onDone }: { onDone: () => void }) {
  const { createTournament } = useTournaments();
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [format, setFormat] = useState("Round robin pool play, single-elimination bracket to follow");
  const [entryFee, setEntryFee] = useState("40");
  const [organizer, setOrganizer] = useState("");
  const [organizerEmail, setOrganizerEmail] = useState("");
  const [rulesText, setRulesText] = useState(
    "All matches are best of 3 games to 11, win by 2.\nUSA Pickleball rally scoring rules apply throughout the event.",
  );
  const [divisions, setDivisions] = useState<DivisionDraft[]>([
    { label: "Intermediate", skillLevel: "4.0", maxPlayers: "16" },
  ]);

  function updateDivision(index: number, patch: Partial<DivisionDraft>) {
    setDivisions((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  function addDivision() {
    setDivisions((prev) => [...prev, { label: "", skillLevel: "", maxPlayers: "16" }]);
  }

  function removeDivision(index: number) {
    setDivisions((prev) => prev.filter((_, i) => i !== index));
  }

  const validDivisions = divisions.filter(
    (d) => d.label.trim() && d.skillLevel.trim() && Number(d.maxPlayers) > 0,
  );
  const canSubmit = Boolean(
    name.trim() &&
      venue.trim() &&
      city.trim() &&
      startDate &&
      endDate &&
      registrationDeadline &&
      organizer.trim() &&
      organizerEmail.trim() &&
      validDivisions.length > 0,
  );

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    createTournament({
      name: name.trim(),
      tagline: tagline.trim() || "A PickleFlex community tournament",
      description: description.trim() || "Details coming soon.",
      venue: venue.trim(),
      city: city.trim(),
      startDate,
      endDate,
      registrationDeadline,
      format: format.trim(),
      entryFee: Number(entryFee) || 0,
      organizer: organizer.trim(),
      organizerEmail: organizerEmail.trim(),
      divisions: validDivisions.map((d) => ({
        label: d.label.trim(),
        skillLevel: d.skillLevel.trim(),
        maxPlayers: Number(d.maxPlayers),
      })),
      rules: rulesText
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean),
      schedule: [{ label: "Details", detail: "Full schedule to be announced." }],
    });
    onDone();
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-900">New Tournament</h3>
        <button type="button" onClick={onDone} className="text-zinc-400 hover:text-zinc-600" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <LabeledField label="Tournament Name">
            <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} required />
          </LabeledField>
          <LabeledField label="Tagline">
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className={fieldClass}
              placeholder="Optional"
            />
          </LabeledField>
        </div>

        <LabeledField label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={fieldClass}
          />
        </LabeledField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <LabeledField label="Venue">
            <input value={venue} onChange={(e) => setVenue(e.target.value)} className={fieldClass} required />
          </LabeledField>
          <LabeledField label="City">
            <input value={city} onChange={(e) => setCity(e.target.value)} className={fieldClass} required />
          </LabeledField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <LabeledField label="Start Date">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={fieldClass}
              required
            />
          </LabeledField>
          <LabeledField label="End Date">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={fieldClass}
              required
            />
          </LabeledField>
          <LabeledField label="Registration Deadline">
            <input
              type="date"
              value={registrationDeadline}
              onChange={(e) => setRegistrationDeadline(e.target.value)}
              className={fieldClass}
              required
            />
          </LabeledField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <LabeledField label="Format">
            <input value={format} onChange={(e) => setFormat(e.target.value)} className={fieldClass} />
          </LabeledField>
          <LabeledField label="Entry Fee ($)">
            <input
              type="number"
              min={0}
              value={entryFee}
              onChange={(e) => setEntryFee(e.target.value)}
              className={fieldClass}
            />
          </LabeledField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <LabeledField label="Organizer">
            <input
              value={organizer}
              onChange={(e) => setOrganizer(e.target.value)}
              className={fieldClass}
              required
            />
          </LabeledField>
          <LabeledField label="Organizer Email">
            <input
              type="email"
              value={organizerEmail}
              onChange={(e) => setOrganizerEmail(e.target.value)}
              className={fieldClass}
              required
            />
          </LabeledField>
        </div>

        <LabeledField label="Rules (one per line)">
          <textarea
            value={rulesText}
            onChange={(e) => setRulesText(e.target.value)}
            rows={3}
            className={fieldClass}
          />
        </LabeledField>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700">Divisions</span>
            <button
              type="button"
              onClick={addDivision}
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700"
            >
              <Plus className="h-3.5 w-3.5" /> Add Division
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {divisions.map((d, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                <input
                  placeholder="Label (e.g. Intermediate)"
                  value={d.label}
                  onChange={(e) => updateDivision(i, { label: e.target.value })}
                  className={fieldClass}
                />
                <input
                  placeholder="Skill (e.g. 4.0)"
                  value={d.skillLevel}
                  onChange={(e) => updateDivision(i, { skillLevel: e.target.value })}
                  className={fieldClass}
                />
                <input
                  type="number"
                  min={2}
                  placeholder="Max players"
                  value={d.maxPlayers}
                  onChange={(e) => updateDivision(i, { maxPlayers: e.target.value })}
                  className={fieldClass}
                />
                <button
                  type="button"
                  onClick={() => removeDivision(i)}
                  disabled={divisions.length === 1}
                  className="rounded-lg border border-zinc-200 px-2 text-zinc-400 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Remove division"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-zinc-200 pt-4">
          <button type="button" onClick={onDone} className="text-sm font-medium text-zinc-500 hover:text-zinc-700">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            <Plus className="h-4 w-4" /> Create Tournament
          </button>
        </div>
      </form>
    </div>
  );
}

function CohortBracketPanel({
  tournament,
  division,
  cohort,
  registrations,
}: {
  tournament: Tournament;
  division: TournamentDivision;
  cohort: Cohort;
  registrations: Registration[];
}) {
  const { bracket, loading, error, setBracket } = useBracket(tournament.id, division.id, cohort.id);
  const [format, setFormat] = useState<BracketFormat>("single");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  async function handleGenerate() {
    setGenerating(true);
    setGenError("");
    try {
      const participants: GenerateBracketInput["participants"] = [...registrations]
        .sort((a, b) => b.skillLevel - a.skillLevel)
        .map((r) => ({
          sourceId: r.id,
          kind: "single" as const,
          name: r.name,
          cohortLabel: cohort.label,
          cohortDays: cohort.days,
          members: [{ name: r.name, email: r.email, availability: r.availability }],
        }));

      const result = await generateBracketRequest({
        tournamentId: tournament.id,
        divisionId: division.id,
        divisionLabel: division.label,
        cohortId: cohort.id,
        cohortLabel: cohort.label,
        format,
        participants,
      });
      setBracket(result);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Failed to generate bracket.");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return null;

  return (
    <div className="flex flex-col gap-2 rounded-md border border-zinc-100 bg-white p-2.5 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs font-medium text-zinc-600">
        {cohort.label} <span className="font-normal text-zinc-400">· {registrations.length} registered</span>
      </span>

      {bracket ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">
            {bracket.format === "double" ? "Double" : "Single"}-elimination generated
          </span>
          <Link
            href={`/tournaments/${tournament.id}/bracket?division=${division.id}&cohort=${cohort.id}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-emerald-300 hover:text-emerald-700"
          >
            <Trophy className="h-3.5 w-3.5" /> View Bracket
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as BracketFormat)}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-600 focus:border-emerald-500 focus:outline-none"
          >
            <option value="single">Single Elimination</option>
            <option value="double">Double Elimination</option>
          </select>
          <button
            type="button"
            disabled={registrations.length < 2 || generating}
            onClick={handleGenerate}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trophy className="h-3.5 w-3.5" /> {generating ? "Generating…" : "Generate Bracket"}
          </button>
        </div>
      )}
      {(error || genError) && <p className="text-xs text-red-600">{genError || error}</p>}
    </div>
  );
}

function DivisionCohortBrackets({
  tournament,
  division,
  registrations,
}: {
  tournament: Tournament;
  division: TournamentDivision;
  registrations: Registration[];
}) {
  const cohortGroups = tournament.cohorts
    .map((cohort) => ({ cohort, regs: registrations.filter((r) => r.cohortId === cohort.id) }))
    .filter(({ regs }) => regs.length >= 2);

  if (cohortGroups.length === 0) {
    return (
      <p className="mt-3 border-t border-zinc-200 pt-3 text-xs text-zinc-400">
        Brackets are generated per cohort — need at least 2 registrants sharing the same cohort.
      </p>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-zinc-200 pt-3">
      {cohortGroups.map(({ cohort, regs }) => (
        <CohortBracketPanel key={cohort.id} tournament={tournament} division={division} cohort={cohort} registrations={regs} />
      ))}
    </div>
  );
}

function TournamentOperations() {
  const {
    tournaments,
    registrationsFor,
    matches,
    generateSchedule,
    resolveDispute,
    deleteTournament,
    addTestRegistration,
    removeRegistration,
    clearTestRegistrations,
  } = useTournaments();

  if (tournaments.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
        No tournaments yet. Create one to get started.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {tournaments.map((t) => {
        const tMatches = matches.filter((m) => m.tournamentId === t.id);
        const testRegs = registrationsFor(t.id).filter((r) => r.isTestPlayer);
        const status = TOURNAMENT_STATUS_LABEL[t.status];

        return (
          <div key={t.id} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-zinc-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-zinc-900">{t.name}</h3>
                <p className="text-sm text-zinc-500">
                  {registrationsFor(t.id).length} registered · {t.divisions.length} divisions
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${status.classes}`}
                >
                  {status.label}
                </span>
                {t.status === "registration_open" ? (
                  <button
                    type="button"
                    onClick={() => generateSchedule(t.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                  >
                    <Wand2 className="h-4 w-4" /> Generate Schedule
                  </button>
                ) : (
                  <span className="text-xs text-zinc-400">{tMatches.length} matches generated</span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete "${t.name}"? This removes all registrations and matches for this tournament.`,
                      )
                    ) {
                      deleteTournament(t.id);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
              {t.divisions.map((d) => {
                const regs = registrationsFor(t.id, d.id);
                const full = regs.length >= d.maxPlayers;
                return (
                  <div key={d.id} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-zinc-900">
                          {d.label} · {d.skillLevel} Skill
                        </p>
                        <p className="text-xs text-zinc-500">
                          {regs.length}/{d.maxPlayers} registered
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={full || t.status !== "registration_open"}
                        onClick={() => addTestRegistration(t.id, d.id)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <UserPlus className="h-3.5 w-3.5" /> Add Test Player
                      </button>
                    </div>
                    <DivisionCohortBrackets tournament={t} division={d} registrations={regs} />
                  </div>
                );
              })}
            </div>

            {testRegs.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 px-5 py-3">
                <span className="text-xs font-medium text-zinc-400">Test players:</span>
                {testRegs.map((r) => (
                  <span
                    key={r.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700"
                  >
                    {r.name}
                    <button
                      type="button"
                      onClick={() => removeRegistration(r.id)}
                      className="text-amber-500 hover:text-amber-700"
                      aria-label={`Remove ${r.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => clearTestRegistrations(t.id)}
                  className="ml-1 text-xs font-medium text-zinc-400 hover:text-red-500"
                >
                  Clear all
                </button>
              </div>
            )}

            {tMatches.length > 0 && (
              <div className="overflow-x-auto border-t border-zinc-200">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                      <th className="px-5 py-3 font-medium">Players</th>
                      <th className="px-5 py-3 font-medium">Division</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">When</th>
                      <th className="px-5 py-3 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {tMatches.map((m) => {
                      const division = t.divisions.find((d) => d.id === m.divisionId);
                      const registrants = registrationsFor(t.id);
                      const a = registrants.find((r) => r.id === m.playerAId);
                      const b = registrants.find((r) => r.id === m.playerBId);
                      return (
                        <tr key={m.id} className="transition-colors hover:bg-zinc-50/70">
                          <td className="px-5 py-4 font-medium text-zinc-900">
                            {a?.name} <span className="font-normal text-zinc-400">vs</span> {b?.name}
                          </td>
                          <td className="px-5 py-4 text-zinc-700">{division?.skillLevel} Skill</td>
                          <td className="px-5 py-4">
                            <StatusBadge status={m.status} />
                          </td>
                          <td className="px-5 py-4 text-zinc-500">
                            {m.scheduledAt ? formatDateTime(m.scheduledAt) : <span className="text-zinc-300">—</span>}
                          </td>
                          <td className="px-5 py-4 text-right">
                            {m.status === "disputed" ? (
                              <button
                                type="button"
                                onClick={() => resolveDispute(m.id)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-500"
                              >
                                <ShieldAlert className="h-3.5 w-3.5" /> Resolve Dispute
                              </button>
                            ) : m.status === "completed" ? (
                              <span className="text-xs text-zinc-400">No action needed</span>
                            ) : (
                              <ReminderButton />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AdminPanel() {
  const [showCreateForm, setShowCreateForm] = useState(false);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ADMIN_STATS.map((stat) => {
          const Icon = STAT_ICONS[stat.key];
          return (
            <div key={stat.key} className="rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.iconBg}`}>
                  <Icon className={`h-4 w-4 ${stat.iconColor}`} />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-zinc-900">{stat.value}</p>
              <p className="mt-1 text-xs text-zinc-400">{stat.hint}</p>
            </div>
          );
        })}
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-900">Tournament Operations</h3>
          {!showCreateForm && (
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
            >
              <Plus className="h-4 w-4" /> New Tournament
            </button>
          )}
        </div>
        {showCreateForm && (
          <div className="mb-6">
            <CreateTournamentForm onDone={() => setShowCreateForm(false)} />
          </div>
        )}
        <TournamentOperations />
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <h3 className="text-base font-semibold text-zinc-900">Other League Matches</h3>
          <span className="text-sm text-zinc-500">{ADMIN_MATCHES.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-3 font-medium">Match ID</th>
                <th className="px-5 py-3 font-medium">Division</th>
                <th className="px-5 py-3 font-medium">Players</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {ADMIN_MATCHES.map((match) => (
                <tr key={match.id} className="transition-colors hover:bg-zinc-50/70">
                  <td className="px-5 py-4 font-mono text-xs text-zinc-500">{match.id}</td>
                  <td className="px-5 py-4 text-zinc-700">{match.division}</td>
                  <td className="px-5 py-4 font-medium text-zinc-900">
                    {match.players[0]} <span className="font-normal text-zinc-400">vs</span>{" "}
                    {match.players[1]}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={match.status} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <AdminAction status={match.status} />
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

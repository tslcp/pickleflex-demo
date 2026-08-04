import { getCurrentUser } from "@/lib/auth-store";
import { createId } from "@/lib/id";
import { findEarliestOverlap, FULL_WEEK_ORDER, nextCalendarDateTime, toBlocks } from "@/lib/overlap";
import { roundRobinPairs, validBlockStarts } from "@/lib/scheduling";
import { DEFAULT_COHORTS, SEED_REGISTRATIONS, SEED_TOURNAMENTS } from "@/lib/tournament-data";
import type { Cohort, DayAvailability, Registration, Tournament, TournamentMatch } from "@/lib/types";

// Bump this whenever the persisted shape changes in a way older cached data
// won't satisfy (e.g. new required fields) — old keys are simply abandoned
// rather than migrated, so a stale cache can never crash the app.
const STORAGE_KEY = "pickleflex.tournaments.v2";

export interface TournamentState {
  tournaments: Tournament[];
  registrations: Registration[];
  matches: TournamentMatch[];
}

function seedState(): TournamentState {
  return {
    tournaments: SEED_TOURNAMENTS,
    registrations: SEED_REGISTRATIONS,
    matches: [],
  };
}

const SERVER_STATE = seedState();

let state: TournamentState = SERVER_STATE;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore write errors (storage disabled or full)
  }
}

function setState(updater: (prev: TournamentState) => TournamentState) {
  state = updater(state);
  persist();
  emit();
}

function isValidState(value: unknown): value is TournamentState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<TournamentState>;
  return (
    Array.isArray(candidate.tournaments) &&
    Array.isArray(candidate.registrations) &&
    Array.isArray(candidate.matches) &&
    candidate.tournaments.every((t) => Array.isArray(t?.cohorts) && Array.isArray(t?.divisions)) &&
    candidate.registrations.every((r) => Array.isArray(r?.availability))
  );
}

/** Pulls persisted state from localStorage. Safe to call multiple times; only applies once. */
export function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isValidState(parsed)) {
        state = parsed;
        emit();
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  } catch {
    // ignore malformed local storage
  }
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): TournamentState {
  return state;
}

export function getServerSnapshot(): TournamentState {
  return SERVER_STATE;
}

interface RegisterInput {
  name: string;
  email: string;
  divisionId: string;
  cohortId: string;
  availability: DayAvailability[];
}

export function registerForTournament(tournamentId: string, input: RegisterInput) {
  const authUser = getCurrentUser();
  setState((prev) => {
    const already = prev.registrations.some(
      (r) => r.tournamentId === tournamentId && r.isCurrentUser,
    );
    if (already) return prev;
    const registration: Registration = {
      id: createId("reg"),
      tournamentId,
      divisionId: input.divisionId,
      name: input.name,
      email: input.email,
      skillLevel: authUser?.skillLevel ?? 3.5,
      isCurrentUser: true,
      registeredAt: new Date().toISOString(),
      cohortId: input.cohortId,
      availability: input.availability,
      reschedulesUsed: 0,
    };
    return { ...prev, registrations: [...prev.registrations, registration] };
  });
}

export function cancelRegistration(tournamentId: string) {
  setState((prev) => ({
    ...prev,
    registrations: prev.registrations.filter(
      (r) => !(r.tournamentId === tournamentId && r.isCurrentUser),
    ),
  }));
}

export function removeRegistration(registrationId: string) {
  setState((prev) => ({
    ...prev,
    registrations: prev.registrations.filter((r) => r.id !== registrationId),
  }));
}

export function clearTestRegistrations(tournamentId: string) {
  setState((prev) => ({
    ...prev,
    registrations: prev.registrations.filter(
      (r) => !(r.tournamentId === tournamentId && r.isTestPlayer),
    ),
  }));
}

interface CreateTournamentInput {
  name: string;
  tagline: string;
  description: string;
  venue: string;
  city: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  format: string;
  entryFee: number;
  organizer: string;
  organizerEmail: string;
  divisions: { label: string; skillLevel: string; maxPlayers: number }[];
  rules: string[];
  schedule: { label: string; detail: string }[];
}

export function createTournament(input: CreateTournamentInput): string {
  const id = createId("t");
  setState((prev) => {
    const tournament: Tournament = {
      id,
      name: input.name,
      tagline: input.tagline,
      description: input.description,
      venue: input.venue,
      city: input.city,
      startDate: input.startDate,
      endDate: input.endDate,
      registrationDeadline: input.registrationDeadline,
      format: input.format,
      entryFee: input.entryFee,
      organizer: input.organizer,
      organizerEmail: input.organizerEmail,
      divisions: input.divisions.map((d, index) => ({
        id: createId(`div-${index}`),
        label: d.label,
        skillLevel: d.skillLevel,
        maxPlayers: d.maxPlayers,
      })),
      cohorts: DEFAULT_COHORTS,
      status: "registration_open",
      rules: input.rules,
      schedule: input.schedule,
    };
    return { ...prev, tournaments: [...prev.tournaments, tournament] };
  });
  return id;
}

export function deleteTournament(tournamentId: string) {
  setState((prev) => ({
    tournaments: prev.tournaments.filter((t) => t.id !== tournamentId),
    registrations: prev.registrations.filter((r) => r.tournamentId !== tournamentId),
    matches: prev.matches.filter((m) => m.tournamentId !== tournamentId),
  }));
}

const TEST_PLAYER_NAMES = [
  "Alex Rivera",
  "Jamie Chen",
  "Morgan Lee",
  "Taylor Brooks",
  "Sam Patel",
  "Jordan Kim",
  "Casey Nguyen",
  "Riley Foster",
  "Drew Sullivan",
  "Quinn Alvarez",
  "Reese Coleman",
  "Skyler Diaz",
  "Rowan Mitchell",
  "Emerson Clarke",
  "Finley Watts",
];

function randomTestName(existingNames: Set<string>): string {
  const available = TEST_PLAYER_NAMES.filter((n) => !existingNames.has(n));
  if (available.length > 0) return available[Math.floor(Math.random() * available.length)];
  const base = TEST_PLAYER_NAMES[Math.floor(Math.random() * TEST_PLAYER_NAMES.length)];
  return `${base} ${Math.floor(Math.random() * 900 + 100)}`;
}

function randomAvailability(cohort: Cohort): DayAvailability[] {
  const dayCount = Math.random() < 0.5 ? 2 : 3;
  const shuffledDays = [...cohort.days].sort(() => Math.random() - 0.5);
  const starts = validBlockStarts(cohort);
  return shuffledDays.slice(0, dayCount).map((day) => ({
    day,
    startHour: starts[Math.floor(Math.random() * starts.length)],
  }));
}

export function addTestRegistration(tournamentId: string, divisionId: string) {
  setState((prev) => {
    const tournament = prev.tournaments.find((t) => t.id === tournamentId);
    if (!tournament || tournament.cohorts.length === 0) return prev;

    const existingNames = new Set(
      prev.registrations.filter((r) => r.tournamentId === tournamentId).map((r) => r.name),
    );
    const name = randomTestName(existingNames);
    const cohort = tournament.cohorts[Math.floor(Math.random() * tournament.cohorts.length)];
    const division = tournament.divisions.find((d) => d.id === divisionId);

    const registration: Registration = {
      id: createId("reg"),
      tournamentId,
      divisionId,
      name,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@test.pickleflex.gg`,
      skillLevel: division ? Number(division.skillLevel) : 3.5,
      isTestPlayer: true,
      registeredAt: new Date().toISOString(),
      cohortId: cohort.id,
      availability: randomAvailability(cohort),
      reschedulesUsed: 0,
    };
    return { ...prev, registrations: [...prev.registrations, registration] };
  });
}

export function generateSchedule(tournamentId: string) {
  setState((prev) => {
    const tournament = prev.tournaments.find((t) => t.id === tournamentId);
    if (!tournament || tournament.status !== "registration_open") return prev;

    const newMatches: TournamentMatch[] = [];
    for (const division of tournament.divisions) {
      const players = prev.registrations.filter(
        (r) => r.tournamentId === tournamentId && r.divisionId === division.id,
      );
      const pairs = roundRobinPairs(players);
      for (const [a, b] of pairs) {
        // Auto-schedule using each player's cohort availability, mirroring the
        // bracket engine's overlap logic — walk the full week (not just one
        // cohort's days) so cross-cohort pairings can still land on a shared
        // day if one exists, falling back to manual scheduling if not.
        const slot = findEarliestOverlap(FULL_WEEK_ORDER, toBlocks(a.availability), toBlocks(b.availability));
        newMatches.push({
          id: createId("match"),
          tournamentId,
          divisionId: division.id,
          playerAId: a.id,
          playerBId: b.id,
          status: slot ? "scheduled" : "unscheduled",
          scheduledAt: slot ? nextCalendarDateTime(slot.day, slot.hour) : undefined,
        });
      }
    }

    return {
      ...prev,
      matches: [...prev.matches, ...newMatches],
      tournaments: prev.tournaments.map((t) =>
        t.id === tournamentId ? { ...t, status: "scheduled" as const } : t,
      ),
    };
  });
}

function updateMatch(matchId: string, updater: (match: TournamentMatch) => TournamentMatch) {
  setState((prev) => ({
    ...prev,
    matches: prev.matches.map((m) => (m.id === matchId ? updater(m) : m)),
  }));
}

export function scheduleMatch(matchId: string, scheduledAt: string) {
  updateMatch(matchId, (m) => ({ ...m, status: "scheduled", scheduledAt }));
}

export function reportScore(matchId: string, scoreA: number, scoreB: number) {
  updateMatch(matchId, (m) => ({ ...m, status: "pending", score: { a: scoreA, b: scoreB } }));
}

export function confirmScore(matchId: string) {
  updateMatch(matchId, (m) => ({ ...m, status: "completed" }));
}

export function disputeScore(matchId: string) {
  updateMatch(matchId, (m) => ({ ...m, status: "disputed" }));
}

export function resolveDispute(matchId: string) {
  updateMatch(matchId, (m) => ({ ...m, status: "completed" }));
}

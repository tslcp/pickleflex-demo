import type { BracketSide } from "@/lib/bracket-builder";

export type BracketFormat = "single" | "double";

export type BracketMatchStatus =
  | "pending_participants"
  | "tentative_placeholder"
  | "unscheduled"
  | "scheduled"
  | "completed"
  | "forfeited";

export interface ParticipantMemberInput {
  name: string;
  email: string;
  availability: { day: string; startHour: number }[];
}

export interface ParticipantInput {
  /** The client-side registration id this participant was generated from, for reference only. */
  sourceId: string;
  kind: "single" | "team";
  name: string;
  cohortLabel: string;
  cohortDays: string[];
  members: ParticipantMemberInput[];
}

export interface GenerateBracketInput {
  tournamentId: string;
  divisionId: string;
  divisionLabel: string;
  format: BracketFormat;
  /** Already in seed order (index 0 = seed 1). */
  participants: ParticipantInput[];
}

export interface BracketParticipantDTO {
  id: string;
  kind: "single" | "team";
  name: string;
  seed: number;
  cohortLabel: string;
  members: { name: string; email: string }[];
  rescheduleCount: number;
  eliminated: boolean;
}

export interface PlaceholderCandidateDTO {
  participantId: string;
  participantName: string;
  day: string | null;
  hour: number | null;
}

export interface BracketMatchDTO {
  id: string;
  bracketSide: BracketSide;
  round: number;
  slot: number;
  participant1: BracketParticipantDTO | null;
  participant2: BracketParticipantDTO | null;
  winnerId: string | null;
  loserId: string | null;
  status: BracketMatchStatus;
  scoreA: number | null;
  scoreB: number | null;
  scheduledAt: string | null;
  isBye: boolean;
  placeholderCandidates: PlaceholderCandidateDTO[] | null;
}

export interface BracketDTO {
  id: string;
  tournamentId: string;
  divisionId: string;
  divisionLabel: string;
  format: BracketFormat;
  status: "active" | "completed";
  participants: BracketParticipantDTO[];
  matches: BracketMatchDTO[];
}

export type RescheduleFailureReason =
  | "not_found"
  | "not_a_participant"
  | "already_completed"
  | "incomplete_match"
  | "limit_reached"
  | "no_slot_available";

export type RescheduleResult =
  | { ok: true; bracket: BracketDTO }
  | { ok: false; reason: RescheduleFailureReason };

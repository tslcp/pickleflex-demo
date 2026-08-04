export type MatchStatus =
  | "unscheduled"
  | "scheduled"
  | "pending"
  | "completed"
  | "disputed";

export interface PlayerProfile {
  name: string;
  initials: string;
  email: string;
  skillLevel: number;
  division: string;
  record: string;
  winRate: number;
  rank: number;
}

export interface AdminStat {
  key: "players" | "completed" | "disputes" | "days";
  label: string;
  value: string;
  hint: string;
  iconBg: string;
  iconColor: string;
}

export interface AdminMatch {
  id: string;
  division: string;
  players: [string, string];
  status: MatchStatus;
}

export interface StandingsRow {
  rank: number;
  name: string;
  wins: number;
  losses: number;
  pointDiff: number;
}

export interface Division {
  id: string;
  label: string;
  standings: StandingsRow[];
}

export type TournamentStatus =
  | "registration_open"
  | "scheduled"
  | "in_progress"
  | "completed";

export interface TournamentDivision {
  id: string;
  label: string;
  skillLevel: string;
  maxPlayers: number;
}

export interface Cohort {
  id: string;
  label: string;
  /** Exactly 3 candidate days a player can draw availability from. */
  days: string[];
  /** Shared window, in 24h hours, e.g. 17–22 for 5:00–10:00pm. */
  windowStartHour: number;
  windowEndHour: number;
}

export interface DayAvailability {
  day: string;
  /** Start hour (24h) of a 3-hour consecutive block within the cohort window. */
  startHour: number;
}

export interface Tournament {
  id: string;
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
  divisions: TournamentDivision[];
  cohorts: Cohort[];
  status: TournamentStatus;
  rules: string[];
  schedule: { label: string; detail: string }[];
}

export interface Registration {
  id: string;
  tournamentId: string;
  divisionId: string;
  name: string;
  email: string;
  skillLevel: number;
  isCurrentUser?: boolean;
  isTestPlayer?: boolean;
  registeredAt: string;
  cohortId: string;
  availability: DayAvailability[];
  reschedulesUsed: number;
}

export interface TournamentMatch {
  id: string;
  tournamentId: string;
  divisionId: string;
  playerAId: string;
  playerBId: string;
  status: MatchStatus;
  scheduledAt?: string;
  score?: { a: number; b: number };
}

import { buildBracket } from "@/lib/bracket-builder";
import type {
  BracketDTO,
  BracketFormat,
  BracketMatchDTO,
  BracketMatchStatus,
  BracketParticipantDTO,
  GenerateBracketInput,
  PlaceholderCandidateDTO,
  RescheduleResult,
} from "@/lib/bracket-types";
import { getDb } from "@/lib/db";
import { createId } from "@/lib/id";
import {
  findEarliestOverlap,
  FULL_WEEK_ORDER,
  intersectBlocks,
  nextCalendarDateTime,
  toBlocks,
  type AvailabilityBlock,
  type OverlapSlot,
} from "@/lib/overlap";

const MAX_RESCHEDULES = 2;

interface ParticipantRow {
  id: string;
  bracket_id: string;
  kind: "single" | "team";
  name: string;
  seed: number;
  cohort_label: string;
  cohort_days_json: string;
  availability_json: string;
  reschedule_count: number;
  eliminated: number;
  created_at: string;
}

interface ParticipantMemberRow {
  id: string;
  participant_id: string;
  name: string;
  email: string;
}

interface MatchRow {
  id: string;
  bracket_id: string;
  bracket_side: "winners" | "losers" | "grand_final";
  round: number;
  slot: number;
  participant1_id: string | null;
  participant2_id: string | null;
  winner_id: string | null;
  loser_id: string | null;
  status: BracketMatchStatus;
  score_a: number | null;
  score_b: number | null;
  scheduled_at: string | null;
  is_bye: number;
  from_losers_bracket: number;
  next_match_winner_id: string | null;
  next_match_winner_slot: number | null;
  next_match_loser_id: string | null;
  next_match_loser_slot: number | null;
  tried_slots_json: string;
  placeholder_candidate_a_json: string | null;
  placeholder_candidate_b_json: string | null;
  created_at: string;
}

interface BracketRow {
  id: string;
  tournament_id: string;
  division_id: string;
  division_label: string;
  cohort_id: string;
  cohort_label: string;
  format: BracketFormat;
  status: "active" | "completed";
  created_at: string;
}

function getBracketRow(bracketId: string): BracketRow | undefined {
  return getDb().prepare("SELECT * FROM brackets WHERE id = ?").get(bracketId) as BracketRow | undefined;
}

function getMatchRow(matchId: string): MatchRow | undefined {
  return getDb().prepare("SELECT * FROM bracket_matches WHERE id = ?").get(matchId) as MatchRow | undefined;
}

function getParticipantRow(participantId: string): ParticipantRow | undefined {
  return getDb().prepare("SELECT * FROM participants WHERE id = ?").get(participantId) as ParticipantRow | undefined;
}

function findFeederFor(targetMatchId: string, targetSlot: 1 | 2): MatchRow | undefined {
  return getDb()
    .prepare(
      `SELECT * FROM bracket_matches
       WHERE (next_match_winner_id = ? AND next_match_winner_slot = ?)
          OR (next_match_loser_id = ? AND next_match_loser_slot = ?)`,
    )
    .get(targetMatchId, targetSlot, targetMatchId, targetSlot) as MatchRow | undefined;
}

function setSlot(matchId: string, slot: 1 | 2, participantId: string) {
  const column = slot === 1 ? "participant1_id" : "participant2_id";
  getDb().prepare(`UPDATE bracket_matches SET ${column} = ? WHERE id = ?`).run(participantId, matchId);
}

function scheduleMatch(matchId: string, p1Id: string, p2Id: string) {
  const p1 = getParticipantRow(p1Id)!;
  const p2 = getParticipantRow(p2Id)!;
  const blocksA: AvailabilityBlock[] = JSON.parse(p1.availability_json);
  const blocksB: AvailabilityBlock[] = JSON.parse(p2.availability_json);

  const slot = findEarliestOverlap(FULL_WEEK_ORDER, blocksA, blocksB, []);
  const db = getDb();
  if (slot) {
    const scheduledAt = nextCalendarDateTime(slot.day, slot.hour);
    db.prepare(
      "UPDATE bracket_matches SET status = 'scheduled', scheduled_at = ?, tried_slots_json = ? WHERE id = ?",
    ).run(scheduledAt, JSON.stringify([slot]), matchId);
  } else {
    // Cross-cohort pairing with zero shared days — no automatic slot exists.
    // Leaves both participants set so the match is playable, just needs an
    // admin to set a time manually.
    db.prepare("UPDATE bracket_matches SET status = 'unscheduled' WHERE id = ?").run(matchId);
  }
}

/**
 * When a match has exactly one known side and the other slot's feeder match
 * already has both ITS players known (even though undecided), pre-compute
 * the earliest-overlap slot against both possible opponents. The moment the
 * feeder match resolves, tryResolveMatch() picks the matching candidate
 * instantly instead of recomputing.
 */
function maybeSetPlaceholderCandidates(matchId: string) {
  const match = getMatchRow(matchId)!;
  const knownId = match.participant1_id ?? match.participant2_id;
  if (!knownId) return;
  const emptySlot: 1 | 2 = match.participant1_id ? 2 : 1;

  const feeder = findFeederFor(matchId, emptySlot);
  if (!feeder || feeder.status === "completed" || !feeder.participant1_id || !feeder.participant2_id) return;

  const known = getParticipantRow(knownId)!;
  const candidateA = getParticipantRow(feeder.participant1_id)!;
  const candidateB = getParticipantRow(feeder.participant2_id)!;
  const blocksKnown: AvailabilityBlock[] = JSON.parse(known.availability_json);

  const slotA = findEarliestOverlap(FULL_WEEK_ORDER, blocksKnown, JSON.parse(candidateA.availability_json));
  const slotB = findEarliestOverlap(FULL_WEEK_ORDER, blocksKnown, JSON.parse(candidateB.availability_json));

  getDb()
    .prepare(
      `UPDATE bracket_matches
       SET status = 'tentative_placeholder',
           placeholder_candidate_a_json = ?,
           placeholder_candidate_b_json = ?
       WHERE id = ?`,
    )
    .run(
      JSON.stringify({ participantId: candidateA.id, participantName: candidateA.name, slot: slotA }),
      JSON.stringify({ participantId: candidateB.id, participantName: candidateB.name, slot: slotB }),
      matchId,
    );
}

function tryResolveMatch(matchId: string) {
  const match = getMatchRow(matchId);
  if (!match) return;
  if (match.status === "completed" || match.status === "scheduled" || match.status === "forfeited") return;

  const p1 = match.participant1_id;
  const p2 = match.participant2_id;

  if (match.is_bye) {
    if ((p1 !== null) !== (p2 !== null)) {
      const winnerId = (p1 ?? p2)!;
      getDb().prepare("UPDATE bracket_matches SET status = 'completed', winner_id = ? WHERE id = ?").run(winnerId, matchId);
      advanceFrom(matchId, winnerId, null);
    }
    return;
  }

  if (p1 !== null && p2 !== null) {
    const candA: { participantId: string; slot: OverlapSlot | null } | null = match.placeholder_candidate_a_json
      ? JSON.parse(match.placeholder_candidate_a_json)
      : null;
    const candB: { participantId: string; slot: OverlapSlot | null } | null = match.placeholder_candidate_b_json
      ? JSON.parse(match.placeholder_candidate_b_json)
      : null;
    const matched = [candA, candB].find((c) => c && (c.participantId === p1 || c.participantId === p2));

    if (matched?.slot) {
      const scheduledAt = nextCalendarDateTime(matched.slot.day, matched.slot.hour);
      getDb()
        .prepare("UPDATE bracket_matches SET status = 'scheduled', scheduled_at = ?, tried_slots_json = ? WHERE id = ?")
        .run(scheduledAt, JSON.stringify([matched.slot]), matchId);
    } else {
      scheduleMatch(matchId, p1, p2);
    }
    return;
  }

  if ((p1 !== null) !== (p2 !== null)) {
    maybeSetPlaceholderCandidates(matchId);
  }
}

function advanceFrom(matchId: string, winnerId: string, loserId: string | null) {
  const match = getMatchRow(matchId)!;
  if (match.next_match_winner_id && match.next_match_winner_slot) {
    setSlot(match.next_match_winner_id, match.next_match_winner_slot as 1 | 2, winnerId);
    tryResolveMatch(match.next_match_winner_id);
  }
  if (loserId && match.next_match_loser_id && match.next_match_loser_slot) {
    setSlot(match.next_match_loser_id, match.next_match_loser_slot as 1 | 2, loserId);
    tryResolveMatch(match.next_match_loser_id);
  }
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

export function generateBracket(input: GenerateBracketInput): BracketDTO {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM brackets WHERE tournament_id = ? AND division_id = ? AND cohort_id = ?")
    .get(input.tournamentId, input.divisionId, input.cohortId);
  if (existing) {
    throw new Error("A bracket has already been generated for this cohort.");
  }
  if (input.participants.length < 2) {
    throw new Error("Need at least 2 participants to generate a bracket.");
  }

  const bracketId = createId("bracket");
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO brackets (id, tournament_id, division_id, division_label, cohort_id, cohort_label, format, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
  ).run(
    bracketId,
    input.tournamentId,
    input.divisionId,
    input.divisionLabel,
    input.cohortId,
    input.cohortLabel,
    input.format,
    now,
  );

  const participantIds: string[] = [];
  input.participants.forEach((p, index) => {
    const participantId = createId("participant");
    const blocks: AvailabilityBlock[] =
      p.kind === "team" && p.members.length === 2
        ? intersectBlocks(toBlocks(p.members[0].availability), toBlocks(p.members[1].availability))
        : toBlocks(p.members[0]?.availability ?? []);

    db.prepare(
      `INSERT INTO participants
         (id, bracket_id, kind, name, seed, cohort_label, cohort_days_json, availability_json, reschedule_count, eliminated, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`,
    ).run(
      participantId,
      bracketId,
      p.kind,
      p.name,
      index + 1,
      p.cohortLabel,
      JSON.stringify(p.cohortDays),
      JSON.stringify(blocks),
      now,
    );

    for (const member of p.members) {
      db.prepare("INSERT INTO participant_members (id, participant_id, name, email) VALUES (?, ?, ?, ?)").run(
        createId("member"),
        participantId,
        member.name,
        member.email,
      );
    }

    participantIds.push(participantId);
  });

  const drafts = buildBracket(input.format, participantIds);
  const tempToReal = new Map<string, string>();
  for (const draft of drafts) tempToReal.set(draft.tempId, createId("match"));

  const insertMatch = db.prepare(
    `INSERT INTO bracket_matches
       (id, bracket_id, bracket_side, round, slot, participant1_id, participant2_id, status, is_bye,
        next_match_winner_id, next_match_winner_slot, next_match_loser_id, next_match_loser_slot,
        tried_slots_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_participants', ?, ?, ?, ?, ?, '[]', ?)`,
  );

  for (const draft of drafts) {
    insertMatch.run(
      tempToReal.get(draft.tempId),
      bracketId,
      draft.bracketSide,
      draft.round,
      draft.slot,
      draft.participant1Id,
      draft.participant2Id,
      draft.isBye ? 1 : 0,
      draft.nextMatchWinnerTempId ? tempToReal.get(draft.nextMatchWinnerTempId) : null,
      draft.nextMatchWinnerSlot,
      draft.nextMatchLoserTempId ? tempToReal.get(draft.nextMatchLoserTempId) : null,
      draft.nextMatchLoserSlot,
      now,
    );
  }

  // Resolve in round order so byes and any immediately-known matches cascade
  // forward correctly in a single pass.
  const orderedIds = drafts
    .slice()
    .sort((a, b) => a.round - b.round)
    .map((d) => tempToReal.get(d.tempId)!);
  for (const id of orderedIds) tryResolveMatch(id);

  return getBracketDTO(bracketId)!;
}

// ---------------------------------------------------------------------------
// Score submission
// ---------------------------------------------------------------------------

export function submitMatchScore(matchId: string, scoreA: number, scoreB: number): BracketDTO {
  const match = getMatchRow(matchId);
  if (!match) throw new Error("Match not found.");
  if (!match.participant1_id || !match.participant2_id) throw new Error("Match is not ready to be played yet.");
  if (match.status === "completed") throw new Error("This match has already been completed.");
  if (scoreA === scoreB) throw new Error("Scores cannot be tied.");

  const bracket = getBracketRow(match.bracket_id)!;
  const winnerId = scoreA > scoreB ? match.participant1_id : match.participant2_id;
  const loserId = scoreA > scoreB ? match.participant2_id : match.participant1_id;

  const db = getDb();
  db.prepare(
    "UPDATE bracket_matches SET status = 'completed', score_a = ?, score_b = ?, winner_id = ?, loser_id = ? WHERE id = ?",
  ).run(scoreA, scoreB, winnerId, loserId, matchId);

  const eliminatesLoser = bracket.format === "single" || match.bracket_side !== "winners";
  if (eliminatesLoser) {
    db.prepare("UPDATE participants SET eliminated = 1 WHERE id = ?").run(loserId);
  }

  if (match.bracket_side === "grand_final") {
    if (match.round === 1 && winnerId === match.participant2_id) {
      // The losers-bracket entrant won game 1 — both sides now have exactly
      // one loss, so a single decider "bracket reset" match is required.
      const resetId = createId("match");
      db.prepare(
        `INSERT INTO bracket_matches
           (id, bracket_id, bracket_side, round, slot, participant1_id, participant2_id, status, is_bye,
            tried_slots_json, created_at)
         VALUES (?, ?, 'grand_final', 2, 0, ?, ?, 'pending_participants', 0, '[]', ?)`,
      ).run(resetId, match.bracket_id, match.participant1_id, match.participant2_id, new Date().toISOString());
      // The reset participant who lost game 1 is not actually eliminated yet.
      db.prepare("UPDATE participants SET eliminated = 0 WHERE id = ?").run(loserId);
      tryResolveMatch(resetId);
    } else {
      db.prepare("UPDATE brackets SET status = 'completed' WHERE id = ?").run(match.bracket_id);
    }
  } else {
    advanceFrom(matchId, winnerId, match.bracket_side === "winners" ? loserId : null);
    if (match.bracket_side === "winners" && !match.next_match_winner_id) {
      // Single-elimination final, or (in double-elim) this can't happen
      // since the WB final always feeds the grand final.
      db.prepare("UPDATE brackets SET status = 'completed' WHERE id = ?").run(match.bracket_id);
    }
  }

  return getBracketDTO(match.bracket_id)!;
}

// ---------------------------------------------------------------------------
// Rescheduling
// ---------------------------------------------------------------------------

export function requestReschedule(
  matchId: string,
  participantId: string,
  options: { adminOverride?: boolean; customDateTime?: string } = {},
): RescheduleResult {
  const match = getMatchRow(matchId);
  if (!match) return { ok: false, reason: "not_found" };
  if (match.status === "completed") return { ok: false, reason: "already_completed" };
  if (!match.participant1_id || !match.participant2_id) return { ok: false, reason: "incomplete_match" };
  if (
    !options.adminOverride &&
    match.participant1_id !== participantId &&
    match.participant2_id !== participantId
  ) {
    return { ok: false, reason: "not_a_participant" };
  }

  const requester = getParticipantRow(participantId) ?? getParticipantRow(match.participant1_id)!;
  if (!options.adminOverride && requester.reschedule_count >= MAX_RESCHEDULES) {
    return { ok: false, reason: "limit_reached" };
  }

  const otherId = match.participant1_id === requester.id ? match.participant2_id : match.participant1_id;
  const other = getParticipantRow(otherId)!;

  const db = getDb();
  let usedSlot: OverlapSlot | null = null;
  let scheduledAtIso: string;

  if (options.customDateTime) {
    scheduledAtIso = new Date(options.customDateTime).toISOString();
  } else {
    const triedSlots: OverlapSlot[] = JSON.parse(match.tried_slots_json);
    const blocksRequester: AvailabilityBlock[] = JSON.parse(requester.availability_json);
    const blocksOther: AvailabilityBlock[] = JSON.parse(other.availability_json);
    const slot = findEarliestOverlap(FULL_WEEK_ORDER, blocksRequester, blocksOther, triedSlots);
    if (!slot) return { ok: false, reason: "no_slot_available" };
    usedSlot = slot;
    scheduledAtIso = nextCalendarDateTime(slot.day, slot.hour);
  }

  db.prepare("UPDATE bracket_matches SET status = 'scheduled', scheduled_at = ? WHERE id = ?").run(
    scheduledAtIso,
    matchId,
  );
  if (usedSlot) {
    const tried: OverlapSlot[] = JSON.parse(match.tried_slots_json);
    tried.push(usedSlot);
    db.prepare("UPDATE bracket_matches SET tried_slots_json = ? WHERE id = ?").run(JSON.stringify(tried), matchId);
  }
  if (!options.adminOverride) {
    db.prepare("UPDATE participants SET reschedule_count = reschedule_count + 1 WHERE id = ?").run(requester.id);
  }

  return { ok: true, bracket: getBracketDTO(match.bracket_id)! };
}

export function adminSetSchedule(matchId: string, isoDateTime: string): BracketDTO {
  const match = getMatchRow(matchId);
  if (!match) throw new Error("Match not found.");
  getDb()
    .prepare("UPDATE bracket_matches SET status = 'scheduled', scheduled_at = ? WHERE id = ?")
    .run(new Date(isoDateTime).toISOString(), matchId);
  return getBracketDTO(match.bracket_id)!;
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

function toParticipantDTO(row: ParticipantRow, members: ParticipantMemberRow[]): BracketParticipantDTO {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    seed: row.seed,
    cohortLabel: row.cohort_label,
    members: members.filter((m) => m.participant_id === row.id).map((m) => ({ name: m.name, email: m.email })),
    rescheduleCount: row.reschedule_count,
    eliminated: row.eliminated === 1,
  };
}

export function getBracketDTO(bracketId: string): BracketDTO | null {
  const db = getDb();
  const bracket = getBracketRow(bracketId);
  if (!bracket) return null;

  const participantRows = db
    .prepare("SELECT * FROM participants WHERE bracket_id = ? ORDER BY seed ASC")
    .all(bracketId) as ParticipantRow[];
  const memberRows = db
    .prepare(
      `SELECT participant_members.* FROM participant_members
       JOIN participants ON participants.id = participant_members.participant_id
       WHERE participants.bracket_id = ?`,
    )
    .all(bracketId) as ParticipantMemberRow[];
  const matchRows = db
    .prepare("SELECT * FROM bracket_matches WHERE bracket_id = ? ORDER BY round ASC, slot ASC")
    .all(bracketId) as MatchRow[];

  const participantById = new Map(participantRows.map((p) => [p.id, toParticipantDTO(p, memberRows)] as const));

  const matches: BracketMatchDTO[] = matchRows.map((m) => {
    const candA = m.placeholder_candidate_a_json ? JSON.parse(m.placeholder_candidate_a_json) : null;
    const candB = m.placeholder_candidate_b_json ? JSON.parse(m.placeholder_candidate_b_json) : null;
    const placeholderCandidates: PlaceholderCandidateDTO[] | null =
      candA || candB
        ? [candA, candB]
            .filter((c): c is NonNullable<typeof c> => Boolean(c))
            .map((c) => ({
              participantId: c.participantId,
              participantName: c.participantName,
              day: c.slot?.day ?? null,
              hour: c.slot?.hour ?? null,
            }))
        : null;

    return {
      id: m.id,
      bracketSide: m.bracket_side,
      round: m.round,
      slot: m.slot,
      participant1: m.participant1_id ? (participantById.get(m.participant1_id) ?? null) : null,
      participant2: m.participant2_id ? (participantById.get(m.participant2_id) ?? null) : null,
      winnerId: m.winner_id,
      loserId: m.loser_id,
      status: m.status,
      scoreA: m.score_a,
      scoreB: m.score_b,
      scheduledAt: m.scheduled_at,
      isBye: m.is_bye === 1,
      placeholderCandidates,
    };
  });

  return {
    id: bracket.id,
    tournamentId: bracket.tournament_id,
    divisionId: bracket.division_id,
    divisionLabel: bracket.division_label,
    cohortId: bracket.cohort_id,
    cohortLabel: bracket.cohort_label,
    format: bracket.format,
    status: bracket.status,
    participants: [...participantById.values()],
    matches,
  };
}

export function getBracketForCohort(tournamentId: string, divisionId: string, cohortId: string): BracketDTO | null {
  const row = getDb()
    .prepare("SELECT id FROM brackets WHERE tournament_id = ? AND division_id = ? AND cohort_id = ?")
    .get(tournamentId, divisionId, cohortId) as { id: string } | undefined;
  return row ? getBracketDTO(row.id) : null;
}

export function getBracketsForTournament(tournamentId: string): BracketDTO[] {
  const rows = getDb().prepare("SELECT id FROM brackets WHERE tournament_id = ?").all(tournamentId) as {
    id: string;
  }[];
  return rows.map((r) => getBracketDTO(r.id)!).filter(Boolean);
}

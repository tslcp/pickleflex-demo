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
import { getSql, type Db } from "@/lib/db";
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

// Every internal helper takes `db` explicitly so the mutating entry points can
// run the whole cascade (score → advance → reschedule next match) inside one
// transaction.

async function getBracketRow(db: Db, bracketId: string): Promise<BracketRow | undefined> {
  const [row] = await db<BracketRow[]>`SELECT * FROM brackets WHERE id = ${bracketId}`;
  return row;
}

async function getMatchRow(db: Db, matchId: string): Promise<MatchRow | undefined> {
  const [row] = await db<MatchRow[]>`SELECT * FROM bracket_matches WHERE id = ${matchId}`;
  return row;
}

async function getParticipantRow(db: Db, participantId: string): Promise<ParticipantRow | undefined> {
  const [row] = await db<ParticipantRow[]>`SELECT * FROM participants WHERE id = ${participantId}`;
  return row;
}

async function findFeederFor(db: Db, targetMatchId: string, targetSlot: 1 | 2): Promise<MatchRow | undefined> {
  const [row] = await db<MatchRow[]>`
    SELECT * FROM bracket_matches
    WHERE (next_match_winner_id = ${targetMatchId} AND next_match_winner_slot = ${targetSlot})
       OR (next_match_loser_id = ${targetMatchId} AND next_match_loser_slot = ${targetSlot})
    LIMIT 1
  `;
  return row;
}

async function setSlot(db: Db, matchId: string, slot: 1 | 2, participantId: string) {
  const column = slot === 1 ? "participant1_id" : "participant2_id";
  await db`UPDATE bracket_matches SET ${db(column)} = ${participantId} WHERE id = ${matchId}`;
}

async function scheduleMatch(db: Db, matchId: string, p1Id: string, p2Id: string) {
  const p1 = (await getParticipantRow(db, p1Id))!;
  const p2 = (await getParticipantRow(db, p2Id))!;
  const blocksA: AvailabilityBlock[] = JSON.parse(p1.availability_json);
  const blocksB: AvailabilityBlock[] = JSON.parse(p2.availability_json);

  const slot = findEarliestOverlap(FULL_WEEK_ORDER, blocksA, blocksB, []);
  if (slot) {
    const scheduledAt = nextCalendarDateTime(slot.day, slot.hour);
    await db`
      UPDATE bracket_matches
      SET status = 'scheduled', scheduled_at = ${scheduledAt}, tried_slots_json = ${JSON.stringify([slot])}
      WHERE id = ${matchId}
    `;
  } else {
    // Cross-cohort pairing with zero shared days — no automatic slot exists.
    // Leaves both participants set so the match is playable, just needs an
    // admin to set a time manually.
    await db`UPDATE bracket_matches SET status = 'unscheduled' WHERE id = ${matchId}`;
  }
}

/**
 * When a match has exactly one known side and the other slot's feeder match
 * already has both ITS players known (even though undecided), pre-compute
 * the earliest-overlap slot against both possible opponents. The moment the
 * feeder match resolves, tryResolveMatch() picks the matching candidate
 * instantly instead of recomputing.
 */
async function maybeSetPlaceholderCandidates(db: Db, matchId: string) {
  const match = (await getMatchRow(db, matchId))!;
  const knownId = match.participant1_id ?? match.participant2_id;
  if (!knownId) return;
  const emptySlot: 1 | 2 = match.participant1_id ? 2 : 1;

  const feeder = await findFeederFor(db, matchId, emptySlot);
  if (!feeder || feeder.status === "completed" || !feeder.participant1_id || !feeder.participant2_id) return;

  const known = (await getParticipantRow(db, knownId))!;
  const candidateA = (await getParticipantRow(db, feeder.participant1_id))!;
  const candidateB = (await getParticipantRow(db, feeder.participant2_id))!;
  const blocksKnown: AvailabilityBlock[] = JSON.parse(known.availability_json);

  const slotA = findEarliestOverlap(FULL_WEEK_ORDER, blocksKnown, JSON.parse(candidateA.availability_json));
  const slotB = findEarliestOverlap(FULL_WEEK_ORDER, blocksKnown, JSON.parse(candidateB.availability_json));

  const candidateAJson = JSON.stringify({ participantId: candidateA.id, participantName: candidateA.name, slot: slotA });
  const candidateBJson = JSON.stringify({ participantId: candidateB.id, participantName: candidateB.name, slot: slotB });
  await db`
    UPDATE bracket_matches
    SET status = 'tentative_placeholder',
        placeholder_candidate_a_json = ${candidateAJson},
        placeholder_candidate_b_json = ${candidateBJson}
    WHERE id = ${matchId}
  `;
}

async function tryResolveMatch(db: Db, matchId: string) {
  const match = await getMatchRow(db, matchId);
  if (!match) return;
  if (match.status === "completed" || match.status === "scheduled" || match.status === "forfeited") return;

  const p1 = match.participant1_id;
  const p2 = match.participant2_id;

  if (match.is_bye) {
    if ((p1 !== null) !== (p2 !== null)) {
      const winnerId = (p1 ?? p2)!;
      await db`UPDATE bracket_matches SET status = 'completed', winner_id = ${winnerId} WHERE id = ${matchId}`;
      await advanceFrom(db, matchId, winnerId, null);
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
      await db`
        UPDATE bracket_matches
        SET status = 'scheduled', scheduled_at = ${scheduledAt}, tried_slots_json = ${JSON.stringify([matched.slot])}
        WHERE id = ${matchId}
      `;
    } else {
      await scheduleMatch(db, matchId, p1, p2);
    }
    return;
  }

  if ((p1 !== null) !== (p2 !== null)) {
    await maybeSetPlaceholderCandidates(db, matchId);
  }
}

async function advanceFrom(db: Db, matchId: string, winnerId: string, loserId: string | null) {
  const match = (await getMatchRow(db, matchId))!;
  if (match.next_match_winner_id && match.next_match_winner_slot) {
    await setSlot(db, match.next_match_winner_id, match.next_match_winner_slot as 1 | 2, winnerId);
    await tryResolveMatch(db, match.next_match_winner_id);
  }
  if (loserId && match.next_match_loser_id && match.next_match_loser_slot) {
    await setSlot(db, match.next_match_loser_id, match.next_match_loser_slot as 1 | 2, loserId);
    await tryResolveMatch(db, match.next_match_loser_id);
  }
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

export function generateBracket(input: GenerateBracketInput): Promise<BracketDTO> {
  // One transaction for the whole bracket, so a failure partway through never
  // leaves a half-inserted round tree behind.
  return getSql().begin(async (db) => {
    const [existing] = await db`
      SELECT id FROM brackets
      WHERE tournament_id = ${input.tournamentId} AND division_id = ${input.divisionId} AND cohort_id = ${input.cohortId}
    `;
    if (existing) {
      throw new Error("A bracket has already been generated for this cohort.");
    }
    if (input.participants.length < 2) {
      throw new Error("Need at least 2 participants to generate a bracket.");
    }

    const bracketId = createId("bracket");
    const now = new Date().toISOString();
    await db`
      INSERT INTO brackets (id, tournament_id, division_id, division_label, cohort_id, cohort_label, format, status, created_at)
      VALUES (${bracketId}, ${input.tournamentId}, ${input.divisionId}, ${input.divisionLabel},
              ${input.cohortId}, ${input.cohortLabel}, ${input.format}, 'active', ${now})
    `;

    const participantRows: ParticipantRow[] = [];
    const memberRows: ParticipantMemberRow[] = [];
    input.participants.forEach((p, index) => {
      const participantId = createId("participant");
      const blocks: AvailabilityBlock[] =
        p.kind === "team" && p.members.length === 2
          ? intersectBlocks(toBlocks(p.members[0].availability), toBlocks(p.members[1].availability))
          : toBlocks(p.members[0]?.availability ?? []);

      participantRows.push({
        id: participantId,
        bracket_id: bracketId,
        kind: p.kind,
        name: p.name,
        seed: index + 1,
        cohort_label: p.cohortLabel,
        cohort_days_json: JSON.stringify(p.cohortDays),
        availability_json: JSON.stringify(blocks),
        reschedule_count: 0,
        eliminated: 0,
        created_at: now,
      });
      for (const member of p.members) {
        memberRows.push({ id: createId("member"), participant_id: participantId, name: member.name, email: member.email });
      }
    });

    // Bulk inserts: one round trip per table instead of one per row.
    await db`INSERT INTO participants ${db(participantRows)}`;
    if (memberRows.length > 0) {
      await db`INSERT INTO participant_members ${db(memberRows)}`;
    }

    const drafts = buildBracket(
      input.format,
      participantRows.map((p) => p.id),
    );
    const tempToReal = new Map<string, string>();
    for (const draft of drafts) tempToReal.set(draft.tempId, createId("match"));

    const matchRows = drafts.map((draft) => ({
      id: tempToReal.get(draft.tempId)!,
      bracket_id: bracketId,
      bracket_side: draft.bracketSide,
      round: draft.round,
      slot: draft.slot,
      participant1_id: draft.participant1Id,
      participant2_id: draft.participant2Id,
      status: "pending_participants",
      is_bye: draft.isBye ? 1 : 0,
      next_match_winner_id: draft.nextMatchWinnerTempId ? tempToReal.get(draft.nextMatchWinnerTempId)! : null,
      next_match_winner_slot: draft.nextMatchWinnerSlot,
      next_match_loser_id: draft.nextMatchLoserTempId ? tempToReal.get(draft.nextMatchLoserTempId)! : null,
      next_match_loser_slot: draft.nextMatchLoserSlot,
      tried_slots_json: "[]",
      created_at: now,
    }));
    await db`INSERT INTO bracket_matches ${db(matchRows)}`;

    // Resolve in round order so byes and any immediately-known matches cascade
    // forward correctly in a single pass.
    const orderedIds = drafts
      .slice()
      .sort((a, b) => a.round - b.round)
      .map((d) => tempToReal.get(d.tempId)!);
    for (const id of orderedIds) await tryResolveMatch(db, id);

    return (await getBracketDTO(bracketId, db))!;
  });
}

// ---------------------------------------------------------------------------
// Score submission
// ---------------------------------------------------------------------------

export function submitMatchScore(matchId: string, scoreA: number, scoreB: number): Promise<BracketDTO> {
  return getSql().begin(async (db) => {
    // FOR UPDATE: two simultaneous submissions for the same match would
    // otherwise both pass the "already completed" check and advance twice.
    const [match] = await db<MatchRow[]>`SELECT * FROM bracket_matches WHERE id = ${matchId} FOR UPDATE`;
    if (!match) throw new Error("Match not found.");
    if (!match.participant1_id || !match.participant2_id) throw new Error("Match is not ready to be played yet.");
    if (match.status === "completed") throw new Error("This match has already been completed.");
    if (scoreA === scoreB) throw new Error("Scores cannot be tied.");

    const bracket = (await getBracketRow(db, match.bracket_id))!;
    const winnerId = scoreA > scoreB ? match.participant1_id : match.participant2_id;
    const loserId = scoreA > scoreB ? match.participant2_id : match.participant1_id;

    await db`
      UPDATE bracket_matches
      SET status = 'completed', score_a = ${scoreA}, score_b = ${scoreB}, winner_id = ${winnerId}, loser_id = ${loserId}
      WHERE id = ${matchId}
    `;

    const eliminatesLoser = bracket.format === "single" || match.bracket_side !== "winners";
    if (eliminatesLoser) {
      await db`UPDATE participants SET eliminated = 1 WHERE id = ${loserId}`;
    }

    if (match.bracket_side === "grand_final") {
      if (match.round === 1 && winnerId === match.participant2_id) {
        // The losers-bracket entrant won game 1 — both sides now have exactly
        // one loss, so a single decider "bracket reset" match is required.
        const resetId = createId("match");
        await db`
          INSERT INTO bracket_matches
            (id, bracket_id, bracket_side, round, slot, participant1_id, participant2_id, status, is_bye,
             tried_slots_json, created_at)
          VALUES (${resetId}, ${match.bracket_id}, 'grand_final', 2, 0, ${match.participant1_id}, ${match.participant2_id},
                  'pending_participants', 0, '[]', ${new Date().toISOString()})
        `;
        // The reset participant who lost game 1 is not actually eliminated yet.
        await db`UPDATE participants SET eliminated = 0 WHERE id = ${loserId}`;
        await tryResolveMatch(db, resetId);
      } else {
        await db`UPDATE brackets SET status = 'completed' WHERE id = ${match.bracket_id}`;
      }
    } else {
      await advanceFrom(db, matchId, winnerId, match.bracket_side === "winners" ? loserId : null);
      if (match.bracket_side === "winners" && !match.next_match_winner_id) {
        // Single-elimination final, or (in double-elim) this can't happen
        // since the WB final always feeds the grand final.
        await db`UPDATE brackets SET status = 'completed' WHERE id = ${match.bracket_id}`;
      }
    }

    return (await getBracketDTO(match.bracket_id, db))!;
  });
}

// ---------------------------------------------------------------------------
// Rescheduling
// ---------------------------------------------------------------------------

export function requestReschedule(
  matchId: string,
  participantId: string,
  options: { adminOverride?: boolean; customDateTime?: string } = {},
): Promise<RescheduleResult> {
  return getSql().begin(async (db): Promise<RescheduleResult> => {
    const match = await getMatchRow(db, matchId);
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

    const requester =
      (await getParticipantRow(db, participantId)) ?? (await getParticipantRow(db, match.participant1_id))!;
    if (!options.adminOverride && requester.reschedule_count >= MAX_RESCHEDULES) {
      return { ok: false, reason: "limit_reached" };
    }

    const otherId = match.participant1_id === requester.id ? match.participant2_id : match.participant1_id;
    const other = (await getParticipantRow(db, otherId))!;

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

    await db`UPDATE bracket_matches SET status = 'scheduled', scheduled_at = ${scheduledAtIso} WHERE id = ${matchId}`;
    if (usedSlot) {
      const tried: OverlapSlot[] = JSON.parse(match.tried_slots_json);
      tried.push(usedSlot);
      await db`UPDATE bracket_matches SET tried_slots_json = ${JSON.stringify(tried)} WHERE id = ${matchId}`;
    }
    if (!options.adminOverride) {
      await db`UPDATE participants SET reschedule_count = reschedule_count + 1 WHERE id = ${requester.id}`;
    }

    return { ok: true, bracket: (await getBracketDTO(match.bracket_id, db))! };
  });
}

export async function adminSetSchedule(matchId: string, isoDateTime: string): Promise<BracketDTO> {
  const db = getSql();
  const match = await getMatchRow(db, matchId);
  if (!match) throw new Error("Match not found.");
  await db`
    UPDATE bracket_matches SET status = 'scheduled', scheduled_at = ${new Date(isoDateTime).toISOString()}
    WHERE id = ${matchId}
  `;
  return (await getBracketDTO(match.bracket_id, db))!;
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

/** Pass `db` to read inside an open transaction (so it sees that transaction's writes). */
export async function getBracketDTO(bracketId: string, db: Db = getSql()): Promise<BracketDTO | null> {
  const bracket = await getBracketRow(db, bracketId);
  if (!bracket) return null;

  const participantRows = await db<ParticipantRow[]>`
    SELECT * FROM participants WHERE bracket_id = ${bracketId} ORDER BY seed ASC
  `;
  const memberRows = await db<ParticipantMemberRow[]>`
    SELECT participant_members.* FROM participant_members
    JOIN participants ON participants.id = participant_members.participant_id
    WHERE participants.bracket_id = ${bracketId}
  `;
  const matchRows = await db<MatchRow[]>`
    SELECT * FROM bracket_matches WHERE bracket_id = ${bracketId} ORDER BY round ASC, slot ASC
  `;

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

export async function getBracketForCohort(
  tournamentId: string,
  divisionId: string,
  cohortId: string,
): Promise<BracketDTO | null> {
  const [row] = await getSql()<{ id: string }[]>`
    SELECT id FROM brackets
    WHERE tournament_id = ${tournamentId} AND division_id = ${divisionId} AND cohort_id = ${cohortId}
  `;
  return row ? getBracketDTO(row.id) : null;
}

export async function getBracketsForTournament(tournamentId: string): Promise<BracketDTO[]> {
  const rows = await getSql()<{ id: string }[]>`SELECT id FROM brackets WHERE tournament_id = ${tournamentId}`;
  const brackets = await Promise.all(rows.map((r) => getBracketDTO(r.id)));
  return brackets.filter((b): b is BracketDTO => b !== null);
}

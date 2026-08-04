export type BracketSide = "winners" | "losers" | "grand_final";

export interface MatchDraft {
  tempId: string;
  bracketSide: BracketSide;
  round: number;
  slot: number;
  participant1Id: string | null;
  participant2Id: string | null;
  /** True once finalizeByes() determines this match structurally has no possible opponent on one side. */
  isBye: boolean;
  nextMatchWinnerTempId: string | null;
  nextMatchWinnerSlot: 1 | 2 | null;
  nextMatchLoserTempId: string | null;
  nextMatchLoserSlot: 1 | 2 | null;
}

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Standard tournament bracket seeding order: for a bracket of `size` slots,
 * returns seed numbers (1-indexed) in slot order, such that seed 1 and seed
 * 2 can only meet in the final, seeds 1-4 can only meet from the semifinals
 * on, etc.
 */
function seedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const len = order.length * 2;
    const next: number[] = [];
    for (const s of order) next.push(s, len + 1 - s);
    order = next;
  }
  return order;
}

interface SlotRef {
  participantId: string | null;
  feederTempId: string | null;
}

/**
 * Scans the fully-built match list and marks any match where exactly one
 * side can *ever* be filled (a real seed slot with no opponent, or a chain
 * of matches feeding a slot that has no possible source) as a bye. This
 * runs once at the end rather than being tracked inline, so it uniformly
 * catches both round-1 seeding byes and byes that cascade deeper into the
 * bracket (e.g. a losers-bracket slot whose only possible feeder was itself
 * a bye).
 *
 * Heavily-padded brackets (participant counts just above a power of two)
 * can stack byes several levels deep, occasionally producing a match where
 * *both* sides are structurally unfillable — that impossibility has to
 * propagate forward too (a match can't be "possible" just because a dead
 * match technically points at it), so this resolves to a fixed point
 * instead of a single pass.
 */
function finalizeByes(matches: MatchDraft[]) {
  const impossible = new Set<string>();

  const findFeeder = (targetTempId: string, targetSlot: 1 | 2): { match: MatchDraft; kind: "winner" | "loser" } | undefined => {
    for (const m of matches) {
      if (m.nextMatchWinnerTempId === targetTempId && m.nextMatchWinnerSlot === targetSlot) {
        return { match: m, kind: "winner" };
      }
      if (m.nextMatchLoserTempId === targetTempId && m.nextMatchLoserSlot === targetSlot) {
        return { match: m, kind: "loser" };
      }
    }
    return undefined;
  };

  // A match always produces a *winner* once it's not itself structurally dead
  // (even a bye has a winner — the lone real entrant advances automatically).
  // It only produces a *loser* if both its own slots are genuinely fillable —
  // a bye match has no opponent, so nobody loses it. A slot fed by another
  // match's loser-link is therefore only possible if that feeder is a real,
  // two-sided match, not merely "not impossible".
  const slotPossible = (m: MatchDraft, slot: 1 | 2): boolean => {
    const participantId = slot === 1 ? m.participant1Id : m.participant2Id;
    if (participantId !== null) return true;
    const feeder = findFeeder(m.tempId, slot);
    if (!feeder) return false;
    if (impossible.has(feeder.match.tempId)) return false;
    if (feeder.kind === "winner") return true;
    return slotPossible(feeder.match, 1) && slotPossible(feeder.match, 2);
  };

  let changed = true;
  while (changed) {
    changed = false;
    for (const m of matches) {
      if (impossible.has(m.tempId)) continue;
      if (!slotPossible(m, 1) && !slotPossible(m, 2)) {
        impossible.add(m.tempId);
        changed = true;
      }
    }
  }

  for (const m of matches) {
    m.isBye = slotPossible(m, 1) !== slotPossible(m, 2);
  }
}

function makeDraft(
  tempId: string,
  bracketSide: BracketSide,
  round: number,
  slot: number,
  participant1Id: string | null,
  participant2Id: string | null,
): MatchDraft {
  return {
    tempId,
    bracketSide,
    round,
    slot,
    participant1Id,
    participant2Id,
    isBye: false,
    nextMatchWinnerTempId: null,
    nextMatchWinnerSlot: null,
    nextMatchLoserTempId: null,
    nextMatchLoserSlot: null,
  };
}

/** Builds a single-elimination bracket for the given (seed-ordered) participant ids. */
export function buildSingleElimination(participantIds: string[]): MatchDraft[] {
  const size = nextPowerOfTwo(participantIds.length);
  if (size <= 1) return [];

  const order = seedOrder(size);
  const seededSlots: (string | null)[] = order.map((seedNum) => participantIds[seedNum - 1] ?? null);
  const rounds = Math.log2(size);

  let seq = 0;
  const tempId = (prefix: string) => `${prefix}-${(seq += 1)}`;

  const matches: MatchDraft[] = [];
  const byId = new Map<string, MatchDraft>();
  const push = (m: MatchDraft) => {
    matches.push(m);
    byId.set(m.tempId, m);
  };
  const link = (feederTempId: string | null, targetTempId: string, targetSlot: 1 | 2) => {
    if (!feederTempId) return;
    const feeder = byId.get(feederTempId)!;
    feeder.nextMatchWinnerTempId = targetTempId;
    feeder.nextMatchWinnerSlot = targetSlot;
  };

  let currentSlots: SlotRef[] = seededSlots.map((id) => ({ participantId: id, feederTempId: null }));

  for (let round = 1; round <= rounds; round += 1) {
    const nextSlots: SlotRef[] = [];
    for (let i = 0; i < currentSlots.length; i += 2) {
      const a = currentSlots[i];
      const b = currentSlots[i + 1];
      const id = tempId(`wb-r${round}`);
      push(makeDraft(id, "winners", round, Math.floor(i / 2), a.participantId, b.participantId));
      link(a.feederTempId, id, 1);
      link(b.feederTempId, id, 2);
      nextSlots.push({ participantId: null, feederTempId: id });
    }
    currentSlots = nextSlots;
  }

  finalizeByes(matches);
  return matches;
}

/**
 * Builds a double-elimination bracket: a winners bracket identical in shape
 * to single-elimination, a losers bracket that alternates "drop-down"
 * rounds (losers bracket survivors face newly-eliminated winners-bracket
 * players) with "consolidation" rounds (survivors face each other), and a
 * grand final between the winners and losers bracket champions.
 *
 * This is the standard construction for power-of-two participant counts.
 * Non-power-of-two counts are padded with byes the same way as single
 * elimination, and byes cascade correctly through the losers bracket via
 * finalizeByes(), but the shape is best-verified for power-of-two sizes
 * (4, 8, 16, ...).
 */
export function buildDoubleElimination(participantIds: string[]): MatchDraft[] {
  const size = nextPowerOfTwo(participantIds.length);
  if (size <= 1) return [];

  const wbRounds = Math.log2(size);
  let seq = 0;
  const tempId = (prefix: string) => `${prefix}-${(seq += 1)}`;

  const matches: MatchDraft[] = [];
  const byId = new Map<string, MatchDraft>();
  const push = (m: MatchDraft) => {
    matches.push(m);
    byId.set(m.tempId, m);
  };
  const linkWinner = (feederTempId: string | null, targetTempId: string, targetSlot: 1 | 2) => {
    if (!feederTempId) return;
    const feeder = byId.get(feederTempId)!;
    feeder.nextMatchWinnerTempId = targetTempId;
    feeder.nextMatchWinnerSlot = targetSlot;
  };
  const linkLoser = (feederTempId: string | null, targetTempId: string, targetSlot: 1 | 2) => {
    if (!feederTempId) return;
    const feeder = byId.get(feederTempId)!;
    feeder.nextMatchLoserTempId = targetTempId;
    feeder.nextMatchLoserSlot = targetSlot;
  };

  // ---------- Winners bracket ----------
  const order = seedOrder(size);
  const seededSlots: (string | null)[] = order.map((seedNum) => participantIds[seedNum - 1] ?? null);
  let currentWbSlots: SlotRef[] = seededSlots.map((id) => ({ participantId: id, feederTempId: null }));
  const wbRoundMatchIds: string[][] = [];

  for (let round = 1; round <= wbRounds; round += 1) {
    const nextSlots: SlotRef[] = [];
    const roundIds: string[] = [];
    for (let i = 0; i < currentWbSlots.length; i += 2) {
      const a = currentWbSlots[i];
      const b = currentWbSlots[i + 1];
      const id = tempId(`wb-r${round}`);
      push(makeDraft(id, "winners", round, Math.floor(i / 2), a.participantId, b.participantId));
      linkWinner(a.feederTempId, id, 1);
      linkWinner(b.feederTempId, id, 2);
      nextSlots.push({ participantId: null, feederTempId: id });
      roundIds.push(id);
    }
    wbRoundMatchIds.push(roundIds);
    currentWbSlots = nextSlots;
  }
  const wbFinalId = wbRoundMatchIds[wbRoundMatchIds.length - 1][0];

  // ---------- Losers bracket ----------
  let lbRound = 0;
  let lbSurvivors: SlotRef[] = [];

  if (wbRounds >= 2) {
    // LB round 1: pair up the winners-bracket round-1 losers.
    lbRound += 1;
    const r1Losers = wbRoundMatchIds[0];
    const survivors: SlotRef[] = [];
    for (let i = 0; i < r1Losers.length; i += 2) {
      const id = tempId(`lb-r${lbRound}`);
      push(makeDraft(id, "losers", lbRound, Math.floor(i / 2), null, null));
      linkLoser(r1Losers[i], id, 1);
      linkLoser(r1Losers[i + 1], id, 2);
      survivors.push({ participantId: null, feederTempId: id });
    }
    lbSurvivors = survivors;

    // Alternate drop-down (survivors vs newly-dropped WB losers) and
    // consolidation (survivors vs each other) rounds for WB rounds 2..N-1.
    for (let wbRound = 2; wbRound <= wbRounds - 1; wbRound += 1) {
      lbRound += 1;
      const losers = wbRoundMatchIds[wbRound - 1];
      const dropped: SlotRef[] = [];
      for (let i = 0; i < lbSurvivors.length; i += 1) {
        const survivor = lbSurvivors[i];
        const id = tempId(`lb-r${lbRound}`);
        push(makeDraft(id, "losers", lbRound, i, survivor.participantId, null));
        linkWinner(survivor.feederTempId, id, 1);
        linkLoser(losers[i], id, 2);
        dropped.push({ participantId: null, feederTempId: id });
      }
      lbSurvivors = dropped;

      if (lbSurvivors.length > 1) {
        lbRound += 1;
        const consolidated: SlotRef[] = [];
        for (let i = 0; i < lbSurvivors.length; i += 2) {
          const a = lbSurvivors[i];
          const b = lbSurvivors[i + 1];
          const id = tempId(`lb-r${lbRound}`);
          push(makeDraft(id, "losers", lbRound, Math.floor(i / 2), null, null));
          linkWinner(a.feederTempId, id, 1);
          linkWinner(b.feederTempId, id, 2);
          consolidated.push({ participantId: null, feederTempId: id });
        }
        lbSurvivors = consolidated;
      }
    }
  }

  // ---------- Grand final ----------
  const grandFinalId = tempId("gf");
  push(makeDraft(grandFinalId, "grand_final", 1, 0, null, null));
  linkWinner(wbFinalId, grandFinalId, 1);

  if (wbRounds >= 2) {
    lbRound += 1;
    const lbFinalId = tempId(`lb-r${lbRound}`);
    const survivor = lbSurvivors[0];
    push(makeDraft(lbFinalId, "losers", lbRound, 0, survivor?.participantId ?? null, null));
    linkWinner(survivor?.feederTempId ?? null, lbFinalId, 1);
    linkLoser(wbFinalId, lbFinalId, 2);
    linkWinner(lbFinalId, grandFinalId, 2);
  } else {
    // Only 2 participants: no losers bracket, the single WB match's loser
    // goes straight to the grand final.
    linkLoser(wbFinalId, grandFinalId, 2);
  }

  finalizeByes(matches);
  return matches;
}

export function buildBracket(format: "single" | "double", participantIds: string[]): MatchDraft[] {
  return format === "single" ? buildSingleElimination(participantIds) : buildDoubleElimination(participantIds);
}

import type { DayAvailability } from "@/lib/types";

const SINGLES_BLOCK_LENGTH_HOURS = 3;

export const FULL_WEEK_ORDER = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Next calendar occurrence of a weekday+hour on or after `from`, as an ISO string. */
export function nextCalendarDateTime(day: string, hour: number, from: Date = new Date()): string {
  const targetDow = FULL_WEEK_ORDER.indexOf(day);
  const result = new Date(from);
  result.setHours(hour, 0, 0, 0);
  let diff = (targetDow - from.getDay() + 7) % 7;
  if (diff === 0 && result.getTime() <= from.getTime()) diff = 7;
  result.setDate(result.getDate() + diff);
  return result.toISOString();
}

export interface AvailabilityBlock {
  day: string;
  startHour: number;
  /** Exclusive. */
  endHour: number;
}

export interface OverlapSlot {
  day: string;
  hour: number;
}

/** Converts a player's raw {day, startHour} selections into explicit blocks. */
export function toBlocks(
  availability: DayAvailability[],
  blockLength = SINGLES_BLOCK_LENGTH_HOURS,
): AvailabilityBlock[] {
  return availability.map((a) => ({
    day: a.day,
    startHour: a.startHour,
    endHour: a.startHour + blockLength,
  }));
}

/**
 * A doubles team's combined availability: only the days *and* hours both
 * partners are free, mirroring the "Team Availability" concept from the
 * original scheduling spec (intersect, don't union, each partner's blocks).
 */
export function intersectBlocks(a: AvailabilityBlock[], b: AvailabilityBlock[]): AvailabilityBlock[] {
  const result: AvailabilityBlock[] = [];
  for (const blockA of a) {
    for (const blockB of b) {
      if (blockA.day !== blockB.day) continue;
      const start = Math.max(blockA.startHour, blockB.startHour);
      const end = Math.min(blockA.endHour, blockB.endHour);
      if (end > start) result.push({ day: blockA.day, startHour: start, endHour: end });
    }
  }
  return result;
}

/**
 * Finds the earliest one-hour slot where both sides' blocks overlap,
 * walking days in cohort order — "earliest" means earliest day in the
 * cohort, then earliest hour within that day. `exclude` filters out slots
 * already tried in a previous reschedule, so calling this again after a
 * reschedule naturally returns the *next* valid slot.
 *
 * Works for both singles (pass raw toBlocks(...) on each side) and doubles
 * (pass intersectBlocks(memberA, memberB) for a team) — the function itself
 * doesn't care which.
 */
export function findEarliestOverlap(
  cohortDayOrder: string[],
  blocksA: AvailabilityBlock[],
  blocksB: AvailabilityBlock[],
  exclude: OverlapSlot[] = [],
): OverlapSlot | null {
  const isExcluded = (day: string, hour: number) =>
    exclude.some((slot) => slot.day === day && slot.hour === hour);

  for (const day of cohortDayOrder) {
    const dayBlocksA = blocksA.filter((b) => b.day === day);
    const dayBlocksB = blocksB.filter((b) => b.day === day);
    if (dayBlocksA.length === 0 || dayBlocksB.length === 0) continue;

    const candidateHours = new Set<number>();
    for (const blockA of dayBlocksA) {
      for (const blockB of dayBlocksB) {
        const start = Math.max(blockA.startHour, blockB.startHour);
        const end = Math.min(blockA.endHour, blockB.endHour);
        for (let h = start; h < end; h += 1) candidateHours.add(h);
      }
    }

    const sortedHours = [...candidateHours].sort((a, b) => a - b);
    for (const hour of sortedHours) {
      if (!isExcluded(day, hour)) return { day, hour };
    }
  }

  return null;
}

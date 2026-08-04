import type { Cohort } from "@/lib/types";

export function roundRobinPairs<T>(items: T[]): Array<[T, T]> {
  const pairs: Array<[T, T]> = [];
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      pairs.push([items[i], items[j]]);
    }
  }
  return pairs;
}

const BLOCK_LENGTH_HOURS = 3;

/** The five one-hour slot start times inside a cohort's shared window. */
export function cohortHourSlots(cohort: Cohort): number[] {
  const slots: number[] = [];
  for (let h = cohort.windowStartHour; h < cohort.windowEndHour; h += 1) slots.push(h);
  return slots;
}

/** Valid starting hours for a 3-consecutive-hour block inside the cohort window. */
export function validBlockStarts(cohort: Cohort): number[] {
  const slots = cohortHourSlots(cohort);
  const starts: number[] = [];
  for (let i = 0; i + BLOCK_LENGTH_HOURS <= slots.length; i += 1) starts.push(slots[i]);
  return starts;
}

export function blockHours(startHour: number): number[] {
  return [startHour, startHour + 1, startHour + 2];
}

export function formatHour(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:00 ${period}`;
}

export function formatBlock(startHour: number): string {
  return `${formatHour(startHour)} – ${formatHour(startHour + BLOCK_LENGTH_HOURS)}`;
}

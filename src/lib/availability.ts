import { parseDateOnly, toDateOnly } from "@/lib/format";
import { FULL_WEEK_ORDER } from "@/lib/overlap";

export type AvailabilityKind = "available" | "unavailable";

export interface AvailabilityEntry {
  id: string;
  kind: AvailabilityKind;
  /** 0 = Sunday … 6 = Saturday. Set when the entry repeats every week. */
  weekday: number | null;
  /** Weekly entries only: first date the repeat applies ("YYYY-MM-DD"), or null for no start. */
  startDate: string | null;
  /** Weekly entries only: last date the repeat applies, or null to repeat with no end. */
  endDate: string | null;
  /** "YYYY-MM-DD". Set when the entry applies to that one date only. */
  date: string | null;
  /** Wall-clock 24h "HH:MM". */
  startTime: string;
  /** Wall-clock 24h "HH:MM", exclusive. Always after startTime — no crossing midnight. */
  endTime: string;
}

export type NewAvailabilityEntry = Omit<AvailabilityEntry, "id">;

export interface TimeRange {
  startTime: string;
  endTime: string;
}

type DateFields = Pick<AvailabilityEntry, "weekday" | "startDate" | "endDate" | "date">;

/**
 * A whole day: the widest range a time input (and the table's "HH:MM" check)
 * allows. No entry can end later, so an all-day "can't play" blocks everything.
 */
export const ALL_DAY: TimeRange = { startTime: "00:00", endTime: "23:59" };

export function isAllDay(range: TimeRange): boolean {
  return range.startTime === ALL_DAY.startTime && range.endTime === ALL_DAY.endTime;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDate(value: string): boolean {
  // Round-tripping rejects dates that match the pattern but don't exist, e.g. 2026-02-31.
  return DATE_PATTERN.test(value) && toDateOnly(parseDateOnly(value)) === value;
}

function addDays(date: string, days: number): string {
  const d = parseDateOnly(date);
  return toDateOnly(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
}

function weekdayOf(date: string): number {
  return parseDateOnly(date).getDay();
}

// "YYYY-MM-DD" strings compare correctly as plain strings; null is an open bound.
function laterStart(a: string | null, b: string | null): string | null {
  return a === null ? b : b === null ? a : a > b ? a : b;
}

function earlierEnd(a: string | null, b: string | null): string | null {
  return a === null ? b : b === null ? a : a < b ? a : b;
}

/** The days an entry covers: one date, or every `weekday` between optional inclusive bounds. */
type DateSet = { date: string } | { weekday: number; startDate: string | null; endDate: string | null };

function dateSetOf(entry: DateFields): DateSet {
  return entry.date !== null
    ? { date: entry.date }
    : { weekday: entry.weekday as number, startDate: entry.startDate, endDate: entry.endDate };
}

function dateFieldsOf(set: DateSet): DateFields {
  return "date" in set
    ? { weekday: null, startDate: null, endDate: null, date: set.date }
    : { weekday: set.weekday, startDate: set.startDate, endDate: set.endDate, date: null };
}

/**
 * Snaps a weekly set's bounds onto real occurrences of its weekday, collapses a
 * single occurrence into a one-off date, and returns null when no day is left.
 */
function normalizeDateSet(set: DateSet): DateSet | null {
  if ("date" in set) return set;
  const { weekday } = set;
  const startDate = set.startDate && addDays(set.startDate, (weekday - weekdayOf(set.startDate) + 7) % 7);
  const endDate = set.endDate && addDays(set.endDate, -((weekdayOf(set.endDate) - weekday + 7) % 7));
  if (startDate !== null && endDate !== null) {
    if (startDate > endDate) return null;
    if (startDate === endDate) return { date: startDate };
  }
  return { weekday, startDate, endDate };
}

function covers(set: DateSet, date: string): boolean {
  if ("date" in set) return set.date === date;
  return (
    weekdayOf(date) === set.weekday &&
    (set.startDate === null || date >= set.startDate) &&
    (set.endDate === null || date <= set.endDate)
  );
}

function intersectDateSets(a: DateSet, b: DateSet): DateSet | null {
  if ("date" in a) return covers(b, a.date) ? a : null;
  if ("date" in b) return covers(a, b.date) ? b : null;
  if (a.weekday !== b.weekday) return null;
  return normalizeDateSet({
    weekday: a.weekday,
    startDate: laterStart(a.startDate, b.startDate),
    endDate: earlierEnd(a.endDate, b.endDate),
  });
}

/** `set` minus `cut`, where `cut` is a normalized part of `set` (what intersectDateSets returns). */
function subtractDateSet(set: DateSet, cut: DateSet): DateSet[] {
  if ("date" in set) return [];
  const [cutStart, cutEnd] = "date" in cut ? [cut.date, cut.date] : [cut.startDate, cut.endDate];
  const pieces = [
    cutStart === null ? null : normalizeDateSet({ ...set, endDate: addDays(cutStart, -7) }),
    cutEnd === null ? null : normalizeDateSet({ ...set, startDate: addDays(cutEnd, 7) }),
  ];
  return pieces.filter((piece): piece is DateSet => piece !== null);
}

/** Whether `set` has a day on or after `date`. */
function reaches(set: DateSet, date: string): boolean {
  return "date" in set ? set.date >= date : set.endDate === null || set.endDate >= date;
}

// Zero-padded "HH:MM" strings compare correctly as plain strings too.
function timesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

/** `range` minus `cut`, where the two overlap. */
function subtractTime(range: TimeRange, cut: TimeRange): TimeRange[] {
  const pieces: TimeRange[] = [];
  if (cut.startTime > range.startTime) pieces.push({ startTime: range.startTime, endTime: cut.startTime });
  if (cut.endTime < range.endTime) pieces.push({ startTime: cut.endTime, endTime: range.endTime });
  return pieces;
}

/**
 * Validates untrusted input (a request body, or the form's own values) into a
 * new entry. Returns an error message instead when it isn't valid. A repeat's
 * bounds are snapped to real occurrences of its weekday, and a repeat that
 * only happens once becomes a one-off date.
 */
export function parseNewEntry(input: unknown): NewAvailabilityEntry | string {
  if (!input || typeof input !== "object") return "Invalid request body.";
  const {
    kind,
    weekday = null,
    date = null,
    startDate = null,
    endDate = null,
    startTime,
    endTime,
  } = input as Record<string, unknown>;

  if (kind !== "available" && kind !== "unavailable") {
    return 'kind must be "available" or "unavailable".';
  }
  if ((weekday === null) === (date === null)) {
    return "Set exactly one of weekday or date.";
  }
  if (weekday !== null && !(typeof weekday === "number" && Number.isInteger(weekday) && weekday >= 0 && weekday <= 6)) {
    return "weekday must be an integer from 0 (Sunday) to 6 (Saturday).";
  }
  if (date !== null && !(typeof date === "string" && isValidDate(date))) {
    return "date must be a real date in YYYY-MM-DD format.";
  }
  if (weekday === null && (startDate !== null || endDate !== null)) {
    return "Only repeating entries can have start and end dates.";
  }
  for (const bound of [startDate, endDate]) {
    if (bound !== null && !(typeof bound === "string" && isValidDate(bound))) {
      return "Repeat dates must be real dates in YYYY-MM-DD format.";
    }
  }
  if (typeof startDate === "string" && typeof endDate === "string" && endDate < startDate) {
    return "The repeat can't end before it starts.";
  }
  if (typeof startTime !== "string" || typeof endTime !== "string" || !TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) {
    return "Enter both a start and an end time.";
  }
  if (endTime <= startTime) {
    return "End time must be after start time.";
  }

  const days = normalizeDateSet(dateSetOf({ weekday, date, startDate, endDate } as DateFields));
  if (!days) return `There's no ${FULL_WEEK_ORDER[weekday as number]} between those dates.`;

  return { kind, ...dateFieldsOf(days), startTime, endTime };
}

/** Entries that apply on `date`: its one-off entries plus the weekly ones whose repeat covers it. */
export function entriesForDate(entries: AvailabilityEntry[], date: string): AvailabilityEntry[] {
  return entries
    .filter((entry) => covers(dateSetOf(entry), date))
    .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.endTime.localeCompare(b.endTime));
}

/**
 * Existing entries of the opposite kind that `entry` clashes with: they share
 * at least one day on or after `fromDate` and some time on it. Same-kind
 * overlaps don't clash — they just merge in freeRangesOn.
 */
export function findConflicts(
  entries: AvailabilityEntry[],
  entry: NewAvailabilityEntry,
  fromDate: string,
): AvailabilityEntry[] {
  const days = dateSetOf(entry);
  return entries.filter((other) => {
    if (other.kind === entry.kind || !timesOverlap(other, entry)) return false;
    const shared = intersectDateSets(dateSetOf(other), days);
    return shared !== null && reaches(shared, fromDate);
  });
}

/**
 * What's left of `old` once `cut` takes over the days and times they share:
 * `old` unchanged on its other days, plus whatever of its time `cut` doesn't
 * cover on the shared days. A weekly entry splits around the shared dates.
 */
export function carveOut(old: NewAvailabilityEntry, cut: NewAvailabilityEntry): NewAvailabilityEntry[] {
  const oldDays = dateSetOf(old);
  const shared = intersectDateSets(oldDays, dateSetOf(cut));
  if (!shared || !timesOverlap(old, cut)) return [old];

  const piece = (days: DateSet, times: TimeRange): NewAvailabilityEntry => ({
    kind: old.kind,
    ...dateFieldsOf(days),
    startTime: times.startTime,
    endTime: times.endTime,
  });
  return [
    ...subtractDateSet(oldDays, shared).map((days) => piece(days, old)),
    ...subtractTime(old, cut).map((times) => piece(shared, times)),
  ];
}

/**
 * What's left of `entry` once its days from `from` to `to` (inclusive; null is
 * open-ended) are removed — a repeat splits around the gap. Returns null when
 * none of its days fall in that range, so there's nothing to remove.
 */
export function removeDays(
  entry: NewAvailabilityEntry,
  from: string | null,
  to: string | null,
): NewAvailabilityEntry[] | null {
  const days = dateSetOf(entry);
  const removed =
    "date" in days
      ? (from === null || days.date >= from) && (to === null || days.date <= to)
        ? days
        : null
      : intersectDateSets(days, { weekday: days.weekday, startDate: from, endDate: to });
  if (!removed) return null;
  return subtractDateSet(days, removed).map((left) => ({
    kind: entry.kind,
    ...dateFieldsOf(left),
    startTime: entry.startTime,
    endTime: entry.endTime,
  }));
}

function toMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function fromMinutes(total: number): string {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * The time actually free to play on `date`. Weekly and one-off entries layer
 * together: every "available" range for the day, merged, minus every
 * "unavailable" range — where the two overlap, "can't play" wins.
 */
export function freeRangesOn(entries: AvailabilityEntry[], date: string): TimeRange[] {
  const dayEntries = entriesForDate(entries, date);
  const toSpan = (entry: AvailabilityEntry): [number, number] => [toMinutes(entry.startTime), toMinutes(entry.endTime)];

  // entriesForDate already sorts by start time, so one pass merges overlaps.
  const merged: [number, number][] = [];
  for (const [start, end] of dayEntries.filter((e) => e.kind === "available").map(toSpan)) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }

  let free = merged;
  for (const [blockStart, blockEnd] of dayEntries.filter((e) => e.kind === "unavailable").map(toSpan)) {
    free = free.flatMap(([start, end]): [number, number][] => {
      if (blockEnd <= start || blockStart >= end) return [[start, end]];
      const pieces: [number, number][] = [];
      if (blockStart > start) pieces.push([start, blockStart]);
      if (blockEnd < end) pieces.push([blockEnd, end]);
      return pieces;
    });
  }

  return free.map(([start, end]) => ({ startTime: fromMinutes(start), endTime: fromMinutes(end) }));
}

/** "17:30" → "5:30 PM". */
export function formatTime(time: string): string {
  const [hour, minute] = time.split(":").map(Number);
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, "0")} ${period}`;
}

export function formatTimeRange(startTime: string, endTime: string): string {
  if (isAllDay({ startTime, endTime })) return "All day";
  return `${formatTime(startTime)} – ${formatTime(endTime)}`;
}

function formatShortDate(date: string): string {
  return parseDateOnly(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Which days an entry covers: "Every Wednesday · Nov 4 – Dec 16", or "Wed, Nov 11" for a one-off. */
export function describeDays(entry: DateFields): string {
  if (entry.date !== null) {
    return parseDateOnly(entry.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }
  const every = `Every ${FULL_WEEK_ORDER[entry.weekday as number]}`;
  if (entry.startDate && entry.endDate) return `${every} · ${formatShortDate(entry.startDate)} – ${formatShortDate(entry.endDate)}`;
  if (entry.startDate) return `${every} · from ${formatShortDate(entry.startDate)}`;
  if (entry.endDate) return `${every} · until ${formatShortDate(entry.endDate)}`;
  return every;
}

/** The same, worded to sit mid-sentence: "every Wednesday from Nov 4 to Dec 16", or "on Wed, Nov 11". */
export function describeDaysInline(entry: DateFields): string {
  if (entry.date !== null) {
    return `on ${parseDateOnly(entry.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`;
  }
  const every = `every ${FULL_WEEK_ORDER[entry.weekday as number]}`;
  if (entry.startDate && entry.endDate) return `${every} from ${formatShortDate(entry.startDate)} to ${formatShortDate(entry.endDate)}`;
  if (entry.startDate) return `${every} from ${formatShortDate(entry.startDate)}`;
  if (entry.endDate) return `${every} until ${formatShortDate(entry.endDate)}`;
  return every;
}

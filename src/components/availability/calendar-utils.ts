import {
  addDays,
  entriesForDate,
  fromMinutes,
  isAllDay,
  toMinutes,
  type AvailabilityEntry,
  type AvailabilityKind,
  type TimeRange,
} from "@/lib/availability";
import { parseDateOnly, toDateOnly } from "@/lib/format";

/** Pixel height of one hour in the week view's time grid. */
export const HOUR_HEIGHT = 48;

export { addDays };

/** The Sunday on or before `date`. */
export function startOfWeek(date: string): string {
  return addDays(date, -parseDateOnly(date).getDay());
}

/** "2026-10" shifted by `delta` months. */
export function shiftMonth(month: string, delta: number): string {
  const first = parseDateOnly(`${month}-01`);
  return toDateOnly(new Date(first.getFullYear(), first.getMonth() + delta, 1)).slice(0, 7);
}

/** Every date a month grid shows: whole Sunday-first weeks covering the month. */
export function monthGridDates(month: string): string[] {
  const first = parseDateOnly(`${month}-01`);
  const last = toDateOnly(new Date(first.getFullYear(), first.getMonth() + 1, 0));
  const end = addDays(startOfWeek(last), 6);
  const dates: string[] = [];
  for (let date = startOfWeek(`${month}-01`); date <= end; date = addDays(date, 1)) dates.push(date);
  return dates;
}

/**
 * What the calendar draws on `date`. A repeat with no start date technically
 * covers every past week too; showing it there is just noise, so on past days
 * only one-offs and repeats with an explicit start date appear.
 */
export function entriesShownOn(entries: AvailabilityEntry[], date: string, today: string): AvailabilityEntry[] {
  const onDate = entriesForDate(entries, date);
  return date < today ? onDate.filter((entry) => entry.weekday === null || entry.startDate !== null) : onDate;
}

/** One continuous stretch of a single kind on a day — what the calendar draws. */
export interface DayBlock extends TimeRange {
  kind: AvailabilityKind;
  /** The entries joined into this block: just one, unless several touch or overlap. */
  entryIds: string[];
}

/**
 * Joins a day's same-kind entries that touch or overlap — "can't play 5–6 PM"
 * and "6–7 PM" become one 5–7 PM block. Display only: the entries themselves
 * stay separate, and the day popup still lists (and deletes) each one.
 */
export function mergeIntoBlocks(entries: AvailabilityEntry[]): DayBlock[] {
  const blocks: DayBlock[] = [];
  for (const kind of ["available", "unavailable"] as const) {
    let current: DayBlock | null = null;
    const sameKind = entries.filter((e) => e.kind === kind).sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (const entry of sameKind) {
      if (current && entry.startTime <= current.endTime) {
        if (entry.endTime > current.endTime) current.endTime = entry.endTime;
        current.entryIds.push(entry.id);
      } else {
        current = { kind, startTime: entry.startTime, endTime: entry.endTime, entryIds: [entry.id] };
        blocks.push(current);
      }
    }
  }
  return blocks.sort((a, b) => a.startTime.localeCompare(b.startTime) || a.endTime.localeCompare(b.endTime));
}

/** Minutes since midnight as "HH:MM", capped at 23:59 — the latest time an entry can end. */
export function timeOf(minutes: number): string {
  return fromMinutes(Math.min(Math.max(minutes, 0), 23 * 60 + 59));
}

export const minutesOf = toMinutes;

/** "7 AM", "12 PM". */
export function hourLabel(hour: number): string {
  return `${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 ? "AM" : "PM"}`;
}

function shortTime(time: string, withPeriod: boolean): string {
  const [hour, minute] = time.split(":").map(Number);
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}${minute ? `:${String(minute).padStart(2, "0")}` : ""}${withPeriod ? (hour < 12 ? "a" : "p") : ""}`;
}

/** Compact, for month-view chips: "5–9p", "11a–1p", "5:30–6:30p", or "All day". */
export function shortRange(range: TimeRange): string {
  if (isAllDay(range)) return "All day";
  const samePeriod = range.startTime < "12:00" === range.endTime < "12:00";
  return `${shortTime(range.startTime, !samePeriod)}–${shortTime(range.endTime, true)}`;
}

/**
 * Side-by-side lanes for one day's blocks, like Google Calendar: blocks that
 * overlap (directly or through a chain) share the width of their cluster.
 */
export function layoutBlocks<T extends TimeRange>(items: T[]): { item: T; lane: number; lanes: number }[] {
  const sorted = [...items].sort(
    (a, b) => minutesOf(a.startTime) - minutesOf(b.startTime) || minutesOf(b.endTime) - minutesOf(a.endTime),
  );
  const placed: { item: T; lane: number; lanes: number }[] = [];
  let cluster: { item: T; lane: number }[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;

  const flush = () => {
    for (const block of cluster) placed.push({ ...block, lanes: laneEnds.length });
    cluster = [];
    laneEnds = [];
    clusterEnd = -1;
  };

  for (const item of sorted) {
    const start = minutesOf(item.startTime);
    const end = minutesOf(item.endTime);
    if (cluster.length > 0 && start >= clusterEnd) flush();
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    if (lane === -1) lane = laneEnds.push(end) - 1;
    else laneEnds[lane] = end;
    cluster.push({ item, lane });
    clusterEnd = Math.max(clusterEnd, end);
  }
  flush();
  return placed;
}

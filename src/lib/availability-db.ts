import { randomUUID } from "node:crypto";
import type { AvailabilityEntry, NewAvailabilityEntry } from "@/lib/availability";
import type { Db } from "@/lib/db";

export async function listEntries(db: Db, userId: string): Promise<AvailabilityEntry[]> {
  return db<AvailabilityEntry[]>`
    SELECT id, series_id AS "seriesId", kind, weekday, start_date AS "startDate", end_date AS "endDate", date,
           start_time AS "startTime", end_time AS "endTime"
    FROM availability
    WHERE user_id = ${userId}
    ORDER BY start_time, end_time
  `;
}

/** One of the user's entries, or undefined if it doesn't exist or belongs to someone else. */
export async function getEntry(db: Db, userId: string, entryId: string): Promise<AvailabilityEntry | undefined> {
  const [entry] = await db<AvailabilityEntry[]>`
    SELECT id, series_id AS "seriesId", kind, weekday, start_date AS "startDate", end_date AS "endDate", date,
           start_time AS "startTime", end_time AS "endTime"
    FROM availability
    WHERE id = ${entryId} AND user_id = ${userId}
  `;
  return entry;
}

/** Every row split from the same original entry (just the one row if it was never split). */
export async function listSeries(db: Db, userId: string, seriesId: string): Promise<AvailabilityEntry[]> {
  return db<AvailabilityEntry[]>`
    SELECT id, series_id AS "seriesId", kind, weekday, start_date AS "startDate", end_date AS "endDate", date,
           start_time AS "startTime", end_time AS "endTime"
    FROM availability
    WHERE series_id = ${seriesId} AND user_id = ${userId}
  `;
}

/** Saves `entry` as part of `seriesId`, or — when left out — as the start of a new series. */
export async function insertEntry(db: Db, userId: string, entry: NewAvailabilityEntry, seriesId?: string) {
  const id = randomUUID();
  await db`
    INSERT INTO availability
      (id, series_id, user_id, kind, weekday, start_date, end_date, date, start_time, end_time, created_at)
    VALUES (${id}, ${seriesId ?? id}, ${userId}, ${entry.kind}, ${entry.weekday}, ${entry.startDate}, ${entry.endDate},
            ${entry.date}, ${entry.startTime}, ${entry.endTime}, ${new Date().toISOString()})
  `;
}

// Both deletes are scoped to the user, so nobody can delete someone else's entries by id.
export async function deleteEntry(db: Db, userId: string, entryId: string) {
  await db`DELETE FROM availability WHERE id = ${entryId} AND user_id = ${userId}`;
}

export async function deleteSeries(db: Db, userId: string, seriesId: string) {
  await db`DELETE FROM availability WHERE series_id = ${seriesId} AND user_id = ${userId}`;
}

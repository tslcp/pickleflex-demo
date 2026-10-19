import { randomUUID } from "node:crypto";
import type { AvailabilityEntry, NewAvailabilityEntry } from "@/lib/availability";
import type { Db } from "@/lib/db";

export async function listEntries(db: Db, userId: string): Promise<AvailabilityEntry[]> {
  return db<AvailabilityEntry[]>`
    SELECT id, kind, weekday, start_date AS "startDate", end_date AS "endDate", date,
           start_time AS "startTime", end_time AS "endTime"
    FROM availability
    WHERE user_id = ${userId}
    ORDER BY start_time, end_time
  `;
}

/** One of the user's entries, or undefined if it doesn't exist or belongs to someone else. */
export async function getEntry(db: Db, userId: string, entryId: string): Promise<AvailabilityEntry | undefined> {
  const [entry] = await db<AvailabilityEntry[]>`
    SELECT id, kind, weekday, start_date AS "startDate", end_date AS "endDate", date,
           start_time AS "startTime", end_time AS "endTime"
    FROM availability
    WHERE id = ${entryId} AND user_id = ${userId}
  `;
  return entry;
}

export async function insertEntry(db: Db, userId: string, entry: NewAvailabilityEntry) {
  await db`
    INSERT INTO availability (id, user_id, kind, weekday, start_date, end_date, date, start_time, end_time, created_at)
    VALUES (${randomUUID()}, ${userId}, ${entry.kind}, ${entry.weekday}, ${entry.startDate}, ${entry.endDate},
            ${entry.date}, ${entry.startTime}, ${entry.endTime}, ${new Date().toISOString()})
  `;
}

// Scoped to the user, so nobody can delete someone else's entry by id.
export async function deleteEntry(db: Db, userId: string, entryId: string) {
  await db`DELETE FROM availability WHERE id = ${entryId} AND user_id = ${userId}`;
}

import { NextResponse, type NextRequest } from "next/server";
import { carveOut, findConflicts, isValidDate, parseNewEntry, type NewAvailabilityEntry } from "@/lib/availability";
import { deleteEntry, insertEntry, listEntries } from "@/lib/availability-db";
import { getSql } from "@/lib/db";
import { toDateOnly } from "@/lib/format";
import { getSessionUserFromRequest } from "@/lib/session";

// Far more than anyone needs, but stops one account from filling the table.
const MAX_ENTRIES_PER_USER = 200;

function isSameEntry(a: NewAvailabilityEntry, b: NewAvailabilityEntry): boolean {
  return (
    a.kind === b.kind &&
    a.weekday === b.weekday &&
    a.startDate === b.startDate &&
    a.endDate === b.endDate &&
    a.date === b.date &&
    a.startTime === b.startTime &&
    a.endTime === b.endTime
  );
}

export async function GET(request: NextRequest) {
  const user = await getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  return NextResponse.json(await listEntries(getSql(), user.id));
}

/**
 * Adds an entry and responds with the user's full, updated list. If it clashes
 * with existing entries of the opposite kind, nothing is saved and the clashes
 * come back as a 409 — unless `override: true`, which trims the clashing part
 * out of those entries so the new one takes it over.
 */
export async function POST(request: NextRequest) {
  const user = await getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = parseNewEntry(body);
  if (typeof parsed === "string") {
    return NextResponse.json({ error: parsed }, { status: 400 });
  }
  const override = body.override === true;
  // The browser's date: the server's clock may be a day off in the user's timezone.
  const today = typeof body.today === "string" && isValidDate(body.today) ? body.today : toDateOnly(new Date());

  const sql = getSql();
  const entries = await listEntries(sql, user.id);
  if (entries.length >= MAX_ENTRIES_PER_USER) {
    return NextResponse.json(
      { error: `You can save up to ${MAX_ENTRIES_PER_USER} availability entries. Remove some first.` },
      { status: 400 },
    );
  }
  if (entries.some((entry) => isSameEntry(entry, parsed))) {
    return NextResponse.json({ error: "You've already added that time." }, { status: 409 });
  }

  const conflicts = findConflicts(entries, parsed, today);
  if (conflicts.length > 0 && !override) {
    return NextResponse.json({ error: "This overlaps with times you've already set.", conflicts }, { status: 409 });
  }

  await sql.begin(async (db) => {
    for (const old of conflicts) {
      await deleteEntry(db, user.id, old.id);
      for (const piece of carveOut(old, parsed, today)) await insertEntry(db, user.id, piece, old.seriesId);
    }
    await insertEntry(db, user.id, parsed);
  });

  return NextResponse.json(await listEntries(sql, user.id), { status: 201 });
}

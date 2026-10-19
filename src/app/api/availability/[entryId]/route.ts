import { NextResponse, type NextRequest } from "next/server";
import { isValidDate, removeDays } from "@/lib/availability";
import { deleteEntry, getEntry, insertEntry, listEntries } from "@/lib/availability-db";
import { getSql } from "@/lib/db";
import { FULL_WEEK_ORDER } from "@/lib/overlap";
import { getSessionUserFromRequest } from "@/lib/session";

/**
 * Deletes an entry and responds with the user's full, updated list. With
 * `?from=` and/or `?to=` (YYYY-MM-DD, inclusive), only a repeat's days in that
 * range are removed and the rest of the repeat is kept around the gap.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ entryId: string }> }) {
  const user = await getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { entryId } = await params;
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  if ((from !== null && !isValidDate(from)) || (to !== null && !isValidDate(to))) {
    return NextResponse.json({ error: "from and to must be real dates in YYYY-MM-DD format." }, { status: 400 });
  }
  if (from !== null && to !== null && to < from) {
    return NextResponse.json({ error: "The range can't end before it starts." }, { status: 400 });
  }

  const sql = getSql();
  const entry = await getEntry(sql, user.id, entryId);
  if (!entry) {
    return NextResponse.json({ error: "Availability entry not found." }, { status: 404 });
  }

  if (from === null && to === null) {
    await deleteEntry(sql, user.id, entry.id);
  } else {
    const remaining = removeDays(entry, from, to);
    if (!remaining) {
      const error =
        entry.weekday === null
          ? "That date isn't in the range."
          : `This repeat has no ${FULL_WEEK_ORDER[entry.weekday]}s in that range.`;
      return NextResponse.json({ error }, { status: 400 });
    }
    await sql.begin(async (db) => {
      await deleteEntry(db, user.id, entry.id);
      for (const piece of remaining) await insertEntry(db, user.id, piece);
    });
  }

  return NextResponse.json(await listEntries(sql, user.id));
}

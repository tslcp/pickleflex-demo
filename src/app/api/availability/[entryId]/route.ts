import { NextResponse, type NextRequest } from "next/server";
import { isValidDate, removeDays } from "@/lib/availability";
import { deleteEntry, deleteSeries, getEntry, insertEntry, listEntries, listSeries } from "@/lib/availability-db";
import { getSql } from "@/lib/db";
import { toDateOnly } from "@/lib/format";
import { FULL_WEEK_ORDER } from "@/lib/overlap";
import { getSessionUserFromRequest } from "@/lib/session";

/**
 * Deletes an entry and responds with the user's full, updated list.
 * - No query: just this row.
 * - `?series=1`: every row split from the same repeat ("the whole repeat").
 * - `?from=` and/or `?to=` (YYYY-MM-DD, inclusive): only the days in that
 *   range, across every row of the repeat; the rest is kept around the gap.
 * `?today=` is the browser's date, used to drop leftover parts that only
 * cover the past.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ entryId: string }> }) {
  const user = await getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { entryId } = await params;
  const query = request.nextUrl.searchParams;
  const from = query.get("from");
  const to = query.get("to");
  if ((from !== null && !isValidDate(from)) || (to !== null && !isValidDate(to))) {
    return NextResponse.json({ error: "from and to must be real dates in YYYY-MM-DD format." }, { status: 400 });
  }
  if (from !== null && to !== null && to < from) {
    return NextResponse.json({ error: "The range can't end before it starts." }, { status: 400 });
  }
  const todayParam = query.get("today");
  // The server's clock may be a day off in the user's timezone.
  const today = todayParam !== null && isValidDate(todayParam) ? todayParam : toDateOnly(new Date());

  const sql = getSql();
  const entry = await getEntry(sql, user.id, entryId);
  if (!entry) {
    return NextResponse.json({ error: "Availability entry not found." }, { status: 404 });
  }

  if (from === null && to === null) {
    if (query.get("series") === "1") await deleteSeries(sql, user.id, entry.seriesId);
    else await deleteEntry(sql, user.id, entry.id);
    return NextResponse.json(await listEntries(sql, user.id));
  }

  const changes = (await listSeries(sql, user.id, entry.seriesId))
    .map((row) => ({ row, remaining: removeDays(row, from, to, today) }))
    .filter((change) => change.remaining !== null);
  if (changes.length === 0) {
    const error =
      entry.weekday === null
        ? "That date isn't in the range."
        : `This repeat has no ${FULL_WEEK_ORDER[entry.weekday]}s in that range.`;
    return NextResponse.json({ error }, { status: 400 });
  }

  await sql.begin(async (db) => {
    for (const { row, remaining } of changes) {
      await deleteEntry(db, user.id, row.id);
      for (const piece of remaining ?? []) await insertEntry(db, user.id, piece, row.seriesId);
    }
  });

  return NextResponse.json(await listEntries(sql, user.id));
}

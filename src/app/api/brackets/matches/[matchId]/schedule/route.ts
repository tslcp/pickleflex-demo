import { NextResponse, type NextRequest } from "next/server";
import { adminSetSchedule } from "@/lib/bracket-engine";
import { getSessionUserFromRequest } from "@/lib/session";

export async function POST(request: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const user = getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { matchId } = await params;
  const body = await request.json().catch(() => null);
  const dateTime = typeof body?.dateTime === "string" ? body.dateTime : "";
  if (!dateTime) return NextResponse.json({ error: "dateTime is required." }, { status: 400 });

  try {
    const bracket = adminSetSchedule(matchId, dateTime);
    return NextResponse.json(bracket);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to set match time.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

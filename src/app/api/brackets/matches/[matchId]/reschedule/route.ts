import { NextResponse, type NextRequest } from "next/server";
import { requestReschedule } from "@/lib/bracket-engine";
import { getSessionUserFromRequest } from "@/lib/session";

export async function POST(request: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const user = await getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { matchId } = await params;
  const body = await request.json().catch(() => null);
  const participantId = typeof body?.participantId === "string" ? body.participantId : "";
  const adminOverride = Boolean(body?.adminOverride);
  const customDateTime = typeof body?.customDateTime === "string" ? body.customDateTime : undefined;

  if (!participantId) {
    return NextResponse.json({ error: "participantId is required." }, { status: 400 });
  }

  const result = await requestReschedule(matchId, participantId, { adminOverride, customDateTime });
  if (!result.ok) {
    const messages: Record<string, string> = {
      not_found: "Match not found.",
      not_a_participant: "You're not a participant in this match.",
      already_completed: "This match has already been completed.",
      incomplete_match: "This match doesn't have both participants yet.",
      limit_reached: "You've used both of your reschedules for this tournament.",
      no_slot_available: "No overlapping time slot could be found.",
    };
    const status = result.reason === "not_found" ? 404 : 400;
    return NextResponse.json({ error: messages[result.reason], reason: result.reason }, { status });
  }

  return NextResponse.json(result.bracket);
}

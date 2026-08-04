import { NextResponse, type NextRequest } from "next/server";
import { submitMatchScore } from "@/lib/bracket-engine";
import { getSessionUserFromRequest } from "@/lib/session";

export async function POST(request: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const user = getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { matchId } = await params;
  const body = await request.json().catch(() => null);
  const scoreA = Number(body?.scoreA);
  const scoreB = Number(body?.scoreB);
  if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB)) {
    return NextResponse.json({ error: "scoreA and scoreB must be numbers." }, { status: 400 });
  }

  try {
    const bracket = submitMatchScore(matchId, scoreA, scoreB);
    return NextResponse.json(bracket);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit score.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

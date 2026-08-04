import { NextResponse, type NextRequest } from "next/server";
import { generateBracket, getBracketForDivision } from "@/lib/bracket-engine";
import { getSessionUserFromRequest } from "@/lib/session";
import type { GenerateBracketInput } from "@/lib/bracket-types";

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tournamentId = searchParams.get("tournamentId");
  const divisionId = searchParams.get("divisionId");
  if (!tournamentId || !divisionId) {
    return NextResponse.json({ error: "tournamentId and divisionId are required." }, { status: 400 });
  }

  const bracket = getBracketForDivision(tournamentId, divisionId);
  if (!bracket) return NextResponse.json({ error: "No bracket generated yet." }, { status: 404 });
  return NextResponse.json(bracket);
}

export async function POST(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as GenerateBracketInput | null;
  if (!body || !body.tournamentId || !body.divisionId || !Array.isArray(body.participants)) {
    return NextResponse.json({ error: "Invalid bracket generation request." }, { status: 400 });
  }

  try {
    const bracket = generateBracket(body);
    return NextResponse.json(bracket);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate bracket.";
    const status = message.includes("already been generated") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

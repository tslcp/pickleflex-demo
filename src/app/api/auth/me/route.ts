import { NextResponse, type NextRequest } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE } from "@/lib/session";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const user = await getUserBySessionToken(token);
  if (!user) {
    // Cookie is present but doesn't match a live session (e.g. the local
    // database was reset) — clear it so the browser stops sending a dead
    // token and the proxy's cookie-presence check stops waving it through.
    const response = NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  return NextResponse.json(user);
}

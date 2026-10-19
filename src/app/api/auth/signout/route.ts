import { authFailure } from "@/lib/auth-response";
import { NextResponse, type NextRequest } from "next/server";
import { deleteSession, SESSION_COOKIE } from "@/lib/session";

async function handleRequest(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

export async function POST(request: NextRequest) {
  try {
    const response = await handleRequest(request);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    return authFailure(error);
  }
}

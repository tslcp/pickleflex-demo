import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export function sessionResponse(user: unknown, token: string, expiresAt: string) {
  const response = NextResponse.json(user);
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
  return response;
}

// Keep connection strings, SQL and credentials out of HTTP responses and logs.
export function authFailure(error: unknown) {
  const code = error && typeof error === "object" && "code" in error
    ? String(error.code) : "UNKNOWN";
  console.error("Authentication database operation failed:", code);
  return NextResponse.json(
    { error: "Authentication is temporarily unavailable. Please try again later." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

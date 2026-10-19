import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { GOOGLE_FLOW_COOKIE, flowCookieOptions, googleConfig } from "@/lib/google-auth";
import { getSql } from "@/lib/db";
import { createSession, SESSION_COOKIE } from "@/lib/session";

export async function GET(request: NextRequest) {
  let response: NextResponse;
  try {
    const config = googleConfig();
    const flow = JSON.parse(request.cookies.get(GOOGLE_FLOW_COOKIE)?.value ?? "null");
    const code = request.nextUrl.searchParams.get("code");
    if (!flow || typeof flow.verifier !== "string" || typeof flow.state !== "string" ||
        typeof flow.expires !== "number" || !code || flow.expires < Date.now() ||
        request.nextUrl.searchParams.get("state") !== flow.state) throw new Error("Invalid OAuth flow");
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: config.clientId, client_secret: config.clientSecret,
        redirect_uri: config.redirectUri, grant_type: "authorization_code", code_verifier: flow.verifier }),
      cache: "no-store", signal: AbortSignal.timeout(10000),
    });
    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok || typeof tokens.access_token !== "string") throw new Error("Token exchange failed");
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` }, cache: "no-store", signal: AbortSignal.timeout(10000),
    });
    const profile = await profileResponse.json();
    if (!profileResponse.ok || typeof profile.sub !== "string" || !profile.sub ||
        profile.email_verified !== true || typeof profile.email !== "string") throw new Error("Unverified identity");
    const email = profile.email.trim().toLowerCase();
    const result = await getSql().begin(async (sql) => {
      // Serialize first-time logins for this identity, including concurrent callbacks.
      await sql`SELECT pg_advisory_xact_lock(hashtextextended(${`google:${profile.sub}`}, 0))`;
      const [identity] = await sql`SELECT user_id FROM auth_identities WHERE provider = 'google' AND provider_subject = ${profile.sub}`;
      let userId = identity?.user_id as string | undefined;
      if (!userId) {
        // Existing password accounts must be linked explicitly, never by email alone.
        const [existing] = await sql`SELECT id FROM users WHERE email = ${email}`;
        if (existing) return null;
        userId = randomUUID();
        await sql`INSERT INTO users (id, name, email, password_hash) VALUES
          (${userId}, ${typeof profile.name === "string" ? profile.name : email.split("@")[0]}, ${email}, ${`oauth-only:${randomUUID()}`})`;
        await sql`INSERT INTO auth_identities (provider, provider_subject, user_id) VALUES ('google', ${profile.sub}, ${userId})`;
      }
      return createSession(userId, sql);
    });
    response = NextResponse.redirect(new URL(result ? "/" : "/signin?authError=existing", config.origin));
    if (result) response.cookies.set(SESSION_COOKIE, result.token, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: new Date(result.expiresAt),
    });
  } catch {
    response = NextResponse.redirect(new URL("/signin?authError=google", request.url));
  }
  response.cookies.set(GOOGLE_FLOW_COOKIE, "", { ...flowCookieOptions, maxAge: 0 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

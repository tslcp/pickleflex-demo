import { NextResponse } from "next/server";
import { GOOGLE_FLOW_COOKIE, flowCookieOptions, googleConfig, newGoogleFlow } from "@/lib/google-auth";

export async function GET(request: Request) {
  try {
    const config = googleConfig();
    const flow = newGoogleFlow();
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri,
      response_type: "code", scope: "openid email profile", state: flow.state,
      code_challenge: flow.challenge, code_challenge_method: "S256", prompt: "select_account" }).toString();
    const response = NextResponse.redirect(url);
    response.headers.set("Cache-Control", "no-store");
    response.cookies.set(GOOGLE_FLOW_COOKIE, JSON.stringify({ ...flow, expires: Date.now() + 600_000 }), flowCookieOptions);
    return response;
  } catch {
    return NextResponse.redirect(new URL("/signin?authError=configuration", request.url));
  }
}

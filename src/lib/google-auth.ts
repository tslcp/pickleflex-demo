import { createHash, randomBytes } from "node:crypto";

export const GOOGLE_FLOW_COOKIE = "google_oauth_flow";
export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const origin = process.env.AUTH_ORIGIN;
  if (!clientId || !clientSecret || !origin) throw new Error("Google login is not configured");
  const url = new URL(origin);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "localhost")) {
    throw new Error("Invalid authentication origin");
  }
  return { clientId, clientSecret, origin: url.origin, redirectUri: `${url.origin}/api/auth/google/callback` };
}
export function newGoogleFlow() {
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  return { state, verifier, challenge: createHash("sha256").update(verifier).digest("base64url") };
}
export const flowCookieOptions = {
  httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const,
  path: "/api/auth/google", maxAge: 600,
};

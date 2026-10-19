import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { getSql, type Db } from "@/lib/db";

export const SESSION_COOKIE = "session_token";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  skillLevel: number;
  zipCode: string;
}

export async function createSession(userId: string, sql: Db = getSql()): Promise<{ token: string; expiresAt: string }> {
  const token = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await sql`
    INSERT INTO sessions (id, user_id, created_at, expires_at)
    VALUES (${token}, ${userId}, ${now.toISOString()}, ${expiresAt.toISOString()})
  `;
  return { token, expiresAt: expiresAt.toISOString() };
}

export async function getUserBySessionToken(token: string): Promise<SessionUser | null> {
  const [row] = await getSql()<(SessionUser & { expiresAt: string })[]>`
    SELECT users.id AS id, users.name AS name, users.email AS email,
           users.skill_level AS "skillLevel", users.zip_code AS "zipCode",
           sessions.expires_at AS "expiresAt"
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.id = ${token}
  `;

  if (!row) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    await deleteSession(token);
    return null;
  }
  return { id: row.id, name: row.name, email: row.email, skillLevel: row.skillLevel, zipCode: row.zipCode };
}

export async function deleteSession(token: string) {
  await getSql()`DELETE FROM sessions WHERE id = ${token}`;
}

/** Resolves the signed-in user for a route handler request, or null. */
export async function getSessionUserFromRequest(request: NextRequest): Promise<SessionUser | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getUserBySessionToken(token);
}

import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";

export const SESSION_COOKIE = "session_token";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  skillLevel: number;
}

export function createSession(userId: string): { token: string; expiresAt: string } {
  const token = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  getDb()
    .prepare("INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .run(token, userId, now.toISOString(), expiresAt.toISOString());
  return { token, expiresAt: expiresAt.toISOString() };
}

export function getUserBySessionToken(token: string): SessionUser | null {
  const row = getDb()
    .prepare(
      `SELECT users.id as id, users.name as name, users.email as email,
              users.skill_level as skillLevel, sessions.expires_at as expiresAt
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.id = ?`,
    )
    .get(token) as (SessionUser & { expiresAt: string }) | undefined;

  if (!row) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    deleteSession(token);
    return null;
  }
  return { id: row.id, name: row.name, email: row.email, skillLevel: row.skillLevel };
}

export function deleteSession(token: string) {
  getDb().prepare("DELETE FROM sessions WHERE id = ?").run(token);
}

/** Resolves the signed-in user for a route handler request, or null. */
export function getSessionUserFromRequest(request: NextRequest): SessionUser | null {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getUserBySessionToken(token);
}

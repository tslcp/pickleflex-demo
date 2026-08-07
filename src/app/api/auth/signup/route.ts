import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createSession, SESSION_COOKIE } from "@/lib/session";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ZIP_PATTERN = /^\d{5}(-\d{4})?$/;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const zipCode = typeof body.zipCode === "string" ? body.zipCode.trim() : "";
  const skillLevel = Number(body.skillLevel);

  if (!name || !email || !password || !zipCode) {
    return NextResponse.json({ error: "Name, email, password, and zip code are required." }, { status: 400 });
  }
  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!ZIP_PATTERN.test(zipCode)) {
    return NextResponse.json({ error: "Enter a valid 5-digit zip code." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const id = randomUUID();
  const passwordHash = hashPassword(password);
  const validSkill = Number.isFinite(skillLevel) && skillLevel >= 1 && skillLevel <= 6 ? skillLevel : 3.5;

  db.prepare(
    "INSERT INTO users (id, name, email, password_hash, skill_level, zip_code, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(id, name, email, passwordHash, validSkill, zipCode, new Date().toISOString());

  const { token, expiresAt } = createSession(id);

  const response = NextResponse.json({ id, name, email, skillLevel: validSkill, zipCode });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
  return response;
}

import { authFailure, sessionResponse } from "@/lib/auth-response";
import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getSql } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createSession } from "@/lib/session";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ZIP_PATTERN = /^\d{5}(-\d{4})?$/;

async function handlePost(request: NextRequest) {
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

  const sql = getSql();
  const [existing] = await sql`SELECT id FROM users WHERE email = ${email}`;
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const id = randomUUID();
  const passwordHash = hashPassword(password);
  const validSkill = Number.isFinite(skillLevel) && skillLevel >= 1 && skillLevel <= 6 ? skillLevel : 3.5;

  const { token, expiresAt } = await sql.begin(async (tx) => {
    await tx`
      INSERT INTO users (id, name, email, password_hash, skill_level, zip_code, created_at)
      VALUES (${id}, ${name}, ${email}, ${passwordHash}, ${validSkill}, ${zipCode}, ${new Date().toISOString()})
    `;
    return createSession(id, tx);
  });

  return sessionResponse({ id, name, email, skillLevel: validSkill, zipCode }, token, expiresAt);
}

export async function POST(request: NextRequest) {
  try {
    return await handlePost(request);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }
    return authFailure(error);
  }
}

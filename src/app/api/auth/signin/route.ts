import { authFailure, sessionResponse } from "@/lib/auth-response";
import { NextResponse, type NextRequest } from "next/server";
import { getSql } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  skill_level: number;
  zip_code: string;
}

async function handlePost(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const [user] = await getSql()<UserRow[]>`SELECT * FROM users WHERE email = ${email}`;
  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const { token, expiresAt } = await createSession(user.id);
  return sessionResponse({
    id: user.id,
    name: user.name,
    email: user.email,
    skillLevel: user.skill_level,
    zipCode: user.zip_code,
  }, token, expiresAt);
}

export async function POST(request: NextRequest) {
  try {
    return await handlePost(request);
  } catch (error) {
    return authFailure(error);
  }
}

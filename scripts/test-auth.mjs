import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import postgres from "postgres";

const origin = process.env.AUTH_TEST_ORIGIN ?? "http://localhost:3000";
const email = `auth-smoke-${randomUUID()}@example.com`;
const password = randomUUID();
let cookie = "";
async function request(path, body, expected) {
  const response = await fetch(`${origin}/api/auth/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  assert.equal(response.status, expected, `${path}: expected ${expected}, got ${response.status}`);
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  return { response, data: await response.json() };
}

const sql = postgres(process.env.DATABASE_URL, { ssl: "require", connect_timeout: 10, max: 1 });
try {
  await request("me", undefined, 401);
  await request("signup", { email }, 400);
  const input = { name: "Auth Smoke Test", email, password, zipCode: "90210", skillLevel: 4 };
  const signup = await request("signup", input, 200);
  assert.ok(signup.response.headers.get("set-cookie").includes("HttpOnly"));
  assert.equal(signup.data.email, email);
  assert.equal("password_hash" in signup.data, false);
  const token = cookie;
  const me = await request("me", undefined, 200);
  assert.equal(me.data.id, signup.data.id);
  await request("signup", input, 409);
  await request("signout", {}, 200);
  // Replaying the old token must fail after server-side revocation.
  cookie = token;
  await request("me", undefined, 401);
  await request("signin", { email, password: "incorrect-password" }, 401);
  const signin = await request("signin", { email: email.toUpperCase(), password }, 200);
  assert.equal(signin.data.id, signup.data.id);
  await request("me", undefined, 200);
  await request("signout", {}, 200);
  await request("me", undefined, 401);
  console.log("PASS: signup, validation, duplicate email, signin, session lookup and signout/revocation.");
} catch (error) {
  console.error("Auth smoke test failed:", error.code ?? error.message);
  process.exitCode = 1;
} finally {
  try {
    await sql.begin(async (tx) => {
      await tx`DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email = ${email})`;
      await tx`DELETE FROM users WHERE email = ${email}`;
    });
  } catch (error) {
    console.error("Smoke-test account cleanup failed:", error.code ?? "UNKNOWN");
    process.exitCode = 1;
  }
  await sql.end({ timeout: 2 });
}

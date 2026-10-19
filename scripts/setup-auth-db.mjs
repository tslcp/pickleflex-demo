import { readFile } from "node:fs/promises";
import postgres from "postgres";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const sql = postgres(process.env.DATABASE_URL, { ssl: "require", connect_timeout: 10, max: 1 });
try {
  await sql.begin(async (tx) => {
    await tx.unsafe(await readFile(new URL("../supabase/auth-schema.sql", import.meta.url), "utf8"));
  });
  console.log("Auth database schema is ready.");
} catch (error) {
  console.error("Auth database setup failed:", error.code ?? "UNKNOWN");
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 2 });
}

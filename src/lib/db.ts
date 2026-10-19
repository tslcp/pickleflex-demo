import postgres from "postgres";

// The schema lives in Supabase (created once via the SQL editor), not here —
// unlike the old SQLite setup, nothing is created on connect.

declare global {
  var __pickleflexSql: postgres.Sql | undefined;
}

/** Anything queries can run against: the pool itself or an open transaction. */
export type Db = postgres.ISql;

// Opened lazily (on first real query) rather than at module load, so that
// Next's build-time static analysis of route modules never needs DATABASE_URL.
// Cached on globalThis so dev-mode hot reloads don't leak a new pool each time.
export function getSql(): postgres.Sql {
  if (!globalThis.__pickleflexSql) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not set. Add your Supabase connection string to .env.");
    }
    globalThis.__pickleflexSql = postgres(url, {
      // Supabase's transaction pooler (port 6543) doesn't support prepared statements.
      prepare: false,
      // better-sqlite3 bound undefined as NULL; postgres.js throws on it instead.
      transform: { undefined: null },
    });
  }
  return globalThis.__pickleflexSql;
}

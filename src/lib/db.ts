import Database from "better-sqlite3";
import path from "node:path";

const DB_PATH = path.join(process.cwd(), "data", "pickleflex.db");

declare global {
  var __pickleflexDb: Database.Database | undefined;
}

function createConnection(): Database.Database {
  const instance = new Database(DB_PATH);
  instance.pragma("journal_mode = WAL");
  // Bracket match rows reference other bracket_matches rows (next_match_winner_id /
  // next_match_loser_id) that don't exist yet at insert time — the whole round tree is
  // inserted in one pass with pre-allocated ids. FKs here are documentation only; nothing
  // relies on ON DELETE CASCADE actually firing.
  instance.pragma("foreign_keys = OFF");
  instance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      skill_level REAL NOT NULL DEFAULT 3.5,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    -- One row per (tournament, division) bracket that's been generated.
    -- Tournament/division themselves still live in the client-side tournament
    -- store; a bracket is created by snapshotting that division's registered
    -- players in as participants at generation time.
    CREATE TABLE IF NOT EXISTS brackets (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      division_id TEXT NOT NULL,
      division_label TEXT NOT NULL,
      format TEXT NOT NULL CHECK (format IN ('single', 'double')),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
      created_at TEXT NOT NULL,
      UNIQUE (tournament_id, division_id)
    );

    -- A bracket entrant: one player (kind='single') or one doubles team
    -- (kind='team', see participant_members). reschedule_count is scoped to
    -- this participant within this one bracket, which is exactly "per
    -- tournament, per team-or-player" as required.
    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      bracket_id TEXT NOT NULL REFERENCES brackets(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK (kind IN ('single', 'team')),
      name TEXT NOT NULL,
      seed INTEGER NOT NULL,
      cohort_label TEXT NOT NULL,
      cohort_days_json TEXT NOT NULL,
      availability_json TEXT NOT NULL,
      reschedule_count INTEGER NOT NULL DEFAULT 0,
      eliminated INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    -- Individual player(s) behind a participant. One row for kind='single',
    -- two rows for kind='team' (doubles partners).
    CREATE TABLE IF NOT EXISTS participant_members (
      id TEXT PRIMARY KEY,
      participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bracket_matches (
      id TEXT PRIMARY KEY,
      bracket_id TEXT NOT NULL REFERENCES brackets(id) ON DELETE CASCADE,
      bracket_side TEXT NOT NULL CHECK (bracket_side IN ('winners', 'losers', 'grand_final')),
      round INTEGER NOT NULL,
      slot INTEGER NOT NULL,
      participant1_id TEXT REFERENCES participants(id),
      participant2_id TEXT REFERENCES participants(id),
      winner_id TEXT REFERENCES participants(id),
      loser_id TEXT REFERENCES participants(id),
      status TEXT NOT NULL DEFAULT 'pending_participants' CHECK (
        status IN (
          'pending_participants', 'tentative_placeholder', 'unscheduled',
          'scheduled', 'completed', 'forfeited'
        )
      ),
      score_a INTEGER,
      score_b INTEGER,
      scheduled_at TEXT,
      is_bye INTEGER NOT NULL DEFAULT 0,
      from_losers_bracket INTEGER NOT NULL DEFAULT 0,
      next_match_winner_id TEXT REFERENCES bracket_matches(id),
      next_match_winner_slot INTEGER,
      next_match_loser_id TEXT REFERENCES bracket_matches(id),
      next_match_loser_slot INTEGER,
      tried_slots_json TEXT NOT NULL DEFAULT '[]',
      placeholder_candidate_a_json TEXT,
      placeholder_candidate_b_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_participants_bracket ON participants(bracket_id);
    CREATE INDEX IF NOT EXISTS idx_participant_members_participant ON participant_members(participant_id);
    CREATE INDEX IF NOT EXISTS idx_bracket_matches_bracket ON bracket_matches(bracket_id);
  `);
  return instance;
}

// Opened lazily (on first real query) rather than at module load, so that
// Next's build-time static analysis of route modules never touches the file —
// with several parallel build workers importing these modules, opening the
// connection eagerly caused concurrent SQLITE_BUSY lock errors.
export function getDb(): Database.Database {
  if (!globalThis.__pickleflexDb) {
    globalThis.__pickleflexDb = createConnection();
  }
  return globalThis.__pickleflexDb;
}

-- My Availability: when each user can (or can't) play.
-- Run once in the Supabase SQL editor. Follows the existing schema's
-- conventions: text ids, ISO-text timestamps, RLS on (the app connects as
-- the postgres role through DATABASE_URL, which bypasses RLS).

CREATE TABLE availability (
  id text PRIMARY KEY,
  -- Rows split from one entry share this; an entry never split is its own series (= its id).
  series_id text NOT NULL,
  user_id text NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('available', 'unavailable')),
  -- Exactly one of these is set: weekday repeats every week
  -- (0 = Sunday … 6 = Saturday), date is one specific day (YYYY-MM-DD).
  weekday integer CHECK (weekday BETWEEN 0 AND 6),
  date text CHECK (date ~ '^\d{4}-\d{2}-\d{2}$'),
  -- Weekly entries only: optional first/last date the repeat applies (inclusive).
  start_date text CHECK (start_date ~ '^\d{4}-\d{2}-\d{2}$'),
  end_date text CHECK (end_date ~ '^\d{4}-\d{2}-\d{2}$'),
  -- Wall-clock 24h "HH:MM"; end is exclusive and ranges can't cross midnight.
  start_time text NOT NULL CHECK (start_time ~ '^([01]\d|2[0-3]):[0-5]\d$'),
  end_time text NOT NULL CHECK (end_time ~ '^([01]\d|2[0-3]):[0-5]\d$'),
  created_at text NOT NULL,
  CHECK ((weekday IS NULL) <> (date IS NULL)),
  CHECK (end_time > start_time),
  CONSTRAINT availability_range_weekly_only
    CHECK (weekday IS NOT NULL OR (start_date IS NULL AND end_date IS NULL)),
  CONSTRAINT availability_range_order
    CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date)
);

CREATE INDEX availability_user_id_idx ON availability (user_id);
CREATE INDEX availability_user_series_idx ON availability (user_id, series_id);

ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

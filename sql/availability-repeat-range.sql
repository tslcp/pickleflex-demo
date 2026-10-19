-- Optional start/end dates for repeating (weekly) availability entries.
-- Run once in the Supabase SQL editor on a database created from an older
-- sql/availability.sql (it already includes these columns for new setups).
-- Both are nullable, so existing rows keep repeating with no start or end.

ALTER TABLE availability
  ADD COLUMN start_date text CHECK (start_date ~ '^\d{4}-\d{2}-\d{2}$'),
  ADD COLUMN end_date text CHECK (end_date ~ '^\d{4}-\d{2}-\d{2}$'),
  ADD CONSTRAINT availability_range_weekly_only
    CHECK (weekday IS NOT NULL OR (start_date IS NULL AND end_date IS NULL)),
  ADD CONSTRAINT availability_range_order
    CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date);

-- Groups the rows split from one entry (e.g. deleting a single day out of a
-- repeat), so "delete the whole repeat" can find every part of it.
-- Run once in the Supabase SQL editor on a database created from an older
-- sql/availability.sql (it already includes this column for new setups).
-- Existing rows each become their own series.

ALTER TABLE availability ADD COLUMN series_id text;
UPDATE availability SET series_id = id WHERE series_id IS NULL;
ALTER TABLE availability ALTER COLUMN series_id SET NOT NULL;

CREATE INDEX availability_user_series_idx ON availability (user_id, series_id);

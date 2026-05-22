-- ─────────────────────────────────────────────────────────────
-- TuCancha – owner_courts schema upgrade
-- Run this in your Supabase SQL editor once
-- ─────────────────────────────────────────────────────────────

-- 1. Extend owner_courts with missing columns
ALTER TABLE owner_courts
  ADD COLUMN IF NOT EXISTS format      text,
  ADD COLUMN IF NOT EXISTS surface     text,
  ADD COLUMN IF NOT EXISTS max_players integer,
  ADD COLUMN IF NOT EXISTS slots       text[]    DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz DEFAULT now();

-- 2. Keep updated_at current automatically
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_owner_courts_updated_at ON owner_courts;
CREATE TRIGGER trg_owner_courts_updated_at
  BEFORE UPDATE ON owner_courts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3. Ensure owner_id column exists and is indexed
ALTER TABLE owner_courts
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_owner_courts_owner_id ON owner_courts(owner_id);

-- 4. Realtime: enable publication for the table
ALTER PUBLICATION supabase_realtime ADD TABLE owner_courts;

-- ─────────────────────────────────────────────────────────────
-- Done. All new columns are nullable so existing rows are safe.
-- ─────────────────────────────────────────────────────────────

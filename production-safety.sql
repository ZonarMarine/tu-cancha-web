-- ============================================================
-- TuCancha Production Safety Migration
-- ============================================================
-- Run this against your Supabase PostgreSQL database.
-- Safe to re-run: uses IF NOT EXISTS / IF EXISTS guards throughout.
-- ============================================================


-- ============================================================
-- SECTION 1: Double-booking protection (unique partial index)
-- ============================================================
-- Prevents two active bookings for the same court + date + time slot.
-- "Active" means status is NOT in ('failed', 'cancelled', 'expired').
-- Only enforced when court_id is not NULL.

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_slot_active
  ON bookings(court_id, date, time)
  WHERE status NOT IN ('failed', 'cancelled', 'expired')
    AND court_id IS NOT NULL;


-- ============================================================
-- SECTION 2: Row-Level Security on bookings table
-- ============================================================
-- NOTE: The Supabase service role key automatically bypasses RLS
-- at the infrastructure level — no explicit policy is needed for it.

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts before recreating them
DROP POLICY IF EXISTS "Players can read own bookings"   ON bookings;
DROP POLICY IF EXISTS "Players can insert bookings"     ON bookings;
DROP POLICY IF EXISTS "Players can update own bookings" ON bookings;
DROP POLICY IF EXISTS "Owners can read court bookings"  ON bookings;

-- Players can read their own bookings
CREATE POLICY "Players can read own bookings"
  ON bookings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Players can insert bookings for themselves
CREATE POLICY "Players can insert bookings"
  ON bookings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Players can update their own pending bookings
CREATE POLICY "Players can update own bookings"
  ON bookings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Court owners can read bookings for their courts
-- (joins against owner_courts to verify ownership)
CREATE POLICY "Owners can read court bookings"
  ON bookings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM owner_courts oc
      WHERE oc.id = bookings.court_id
        AND oc.owner_id = auth.uid()
        AND oc.deleted_at IS NULL
    )
  );


-- ============================================================
-- SECTION 3: Reto acceptance policy fix
-- ============================================================
-- The previous UPDATE policy blocked all non-creators from accepting
-- retos because it used USING (auth.uid() = user_id) alone.
-- We replace it with two targeted policies:
--   1. Creators retain full update/delete rights on their own retos.
--   2. Any authenticated user can accept an open reto they did not create.

-- Drop the broken policy (exact name from retos-rls-fix.sql)
DROP POLICY IF EXISTS "Owners can update their retos" ON retos;

-- Also drop the replacement policies if they already exist (idempotency)
DROP POLICY IF EXISTS "retos_update_own"   ON retos;
DROP POLICY IF EXISTS "retos_accept_open"  ON retos;

-- Policy 1: Creators can fully update/delete their own retos
CREATE POLICY "retos_update_own"
  ON retos
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 2: Any authenticated user can accept an open reto they did not create.
-- USING controls which rows the UPDATE can target (must be open & not your own).
-- WITH CHECK ensures the accepting user is still not the creator after the update.
CREATE POLICY "retos_accept_open"
  ON retos
  FOR UPDATE
  USING (
    auth.uid() != user_id
    AND status IN ('open', 'looking_for_rival', 'pending_rival', 'active', 'published', 'created')
  )
  WITH CHECK (auth.uid() != user_id);


-- ============================================================
-- SECTION 4: Expired pending booking cleanup
-- ============================================================

-- Function: marks stale pending bookings as 'expired'
CREATE OR REPLACE FUNCTION expire_stale_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE bookings
  SET status = 'expired'
  WHERE status IN ('pending_payment', 'pending')
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$;

-- Schedule with pg_cron every 15 minutes.
-- Wrapped in an exception handler so this is a no-op when pg_cron
-- is not available (e.g. local dev environments).
DO $$
BEGIN
  PERFORM cron.schedule(
    'expire-stale-bookings',   -- job name (idempotent key)
    '*/15 * * * *',            -- every 15 minutes
    'SELECT expire_stale_bookings();'
  );
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'pg_cron not available — skipping cron schedule for expire_stale_bookings(). Error: %', SQLERRM;
END;
$$;


-- ============================================================
-- SECTION 5: Missing indexes
-- ============================================================

-- bookings table
CREATE INDEX IF NOT EXISTS idx_bookings_court_id
  ON bookings(court_id);

CREATE INDEX IF NOT EXISTS idx_bookings_date
  ON bookings(date);

CREATE INDEX IF NOT EXISTS idx_bookings_status
  ON bookings(status);

CREATE INDEX IF NOT EXISTS idx_bookings_user_id
  ON bookings(user_id);

CREATE INDEX IF NOT EXISTS idx_bookings_court_date_status
  ON bookings(court_id, date, status);

-- retos table
CREATE INDEX IF NOT EXISTS idx_retos_date_status
  ON retos(date, status);

-- notifications table
CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON notifications(user_id, read, created_at DESC);

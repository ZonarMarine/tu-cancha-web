-- ============================================================
-- TuCancha — Owner Court FK Fix
-- ============================================================
-- PROBLEM: bookings.court_id is INTEGER but owner_courts.id is UUID.
--          Direct join/comparison fails with a type error, so the
--          bookings_owner_read RLS policy and court_id-based indexes
--          never matched real owner_courts rows.
--
-- FIX: Add a proper bookings.owner_court_id UUID column that references
--      owner_courts(id). Rebuild the unique anti-double-booking index and
--      owner-read RLS policy on this new column.
--
-- Safe to re-run: all operations use IF NOT EXISTS / IF EXISTS guards.
-- ============================================================


-- ── 1. Add the UUID FK column ─────────────────────────────────────────────────

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS owner_court_id uuid
    REFERENCES public.owner_courts(id) ON DELETE SET NULL;


-- ── 2. Rebuild the unique anti-double-booking index on the UUID column ────────
--
-- The previous index was on the integer court_id — which is never populated
-- from a real owner_courts row. Replace it with one on owner_court_id.

DROP INDEX IF EXISTS public.idx_bookings_slot_active;

CREATE UNIQUE INDEX idx_bookings_slot_active
  ON public.bookings(owner_court_id, date, time)
  WHERE status NOT IN ('failed', 'cancelled', 'expired')
    AND owner_court_id IS NOT NULL;


-- ── 3. Fix old indexes that pointed at the integer court_id ──────────────────

-- Replace with UUID-based counterparts
DROP INDEX IF EXISTS public.idx_bookings_court_id;
DROP INDEX IF EXISTS public.idx_bookings_court_date_status;

CREATE INDEX IF NOT EXISTS idx_bookings_owner_court_id
  ON public.bookings(owner_court_id);

CREATE INDEX IF NOT EXISTS idx_bookings_owner_court_date_status
  ON public.bookings(owner_court_id, date, status);


-- ── 4. Fix the bookings_owner_read RLS policy ─────────────────────────────────
--
-- The old policy joined on oc.id = bookings.court_id (uuid = integer) which
-- would throw a type mismatch error at runtime. Replace it with the UUID join.

DROP POLICY IF EXISTS "Owners can read court bookings" ON public.bookings;
DROP POLICY IF EXISTS "bookings_owner_read"            ON public.bookings;

CREATE POLICY "Owners can read court bookings"
  ON public.bookings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.owner_courts oc
      WHERE oc.id        = bookings.owner_court_id   -- uuid = uuid ✓
        AND oc.owner_id  = auth.uid()
        AND oc.deleted_at IS NULL
    )
  );


-- ── 5. Done ──────────────────────────────────────────────────────────────────
-- The bookings table now has:
--   court_id       integer  (legacy column — left in place, no longer used)
--   owner_court_id uuid FK  (correct FK to owner_courts.id — use this going forward)
--
-- Update your application code to:
--   • Set owner_court_id (not court_id) when creating bookings
--   • Filter by owner_court_id when querying owner bookings

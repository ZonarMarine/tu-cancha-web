-- ═══════════════════════════════════════════════════════════════════════════
-- TuCancha — Final Production Migration
-- ═══════════════════════════════════════════════════════════════════════════
-- Paste this ENTIRE file into Supabase → SQL Editor → Run All.
-- Each section is independent. Read the output after each section.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── 1. Add owner_court_id column ─────────────────────────────────────────────
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS owner_court_id uuid;


-- ── 2. Add FK constraint ──────────────────────────────────────────────────────
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_owner_court_id_fkey;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_owner_court_id_fkey
  FOREIGN KEY (owner_court_id)
  REFERENCES public.owner_courts(id)
  ON DELETE SET NULL;


-- ── 3. Backfill owner_court_id from court_name for existing bookings ──────────
UPDATE public.bookings b
SET    owner_court_id = oc.id
FROM   public.owner_courts oc
WHERE  oc.name           = b.court_name
  AND  b.owner_court_id IS NULL;


-- ── 4. Rebuild anti-double-booking unique index on UUID column ────────────────
DROP INDEX IF EXISTS public.idx_bookings_slot_active;

CREATE UNIQUE INDEX idx_bookings_slot_active
  ON public.bookings (owner_court_id, date, time)
  WHERE status NOT IN ('failed', 'cancelled', 'expired')
    AND owner_court_id IS NOT NULL;


-- ── 5. Supporting indexes ──────────────────────────────────────────────────────
DROP INDEX IF EXISTS public.idx_bookings_court_id;
DROP INDEX IF EXISTS public.idx_bookings_court_date_status;

CREATE INDEX IF NOT EXISTS idx_bookings_owner_court_id
  ON public.bookings (owner_court_id);

CREATE INDEX IF NOT EXISTS idx_bookings_owner_court_date_status
  ON public.bookings (owner_court_id, date, status);

CREATE INDEX IF NOT EXISTS idx_bookings_date
  ON public.bookings (date);

CREATE INDEX IF NOT EXISTS idx_bookings_status
  ON public.bookings (status);

CREATE INDEX IF NOT EXISTS idx_bookings_user_id
  ON public.bookings (user_id);

CREATE INDEX IF NOT EXISTS idx_retos_date_status
  ON public.retos (date, status);

CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON public.notifications (user_id, read, created_at DESC);


-- ── 6. Enable RLS on bookings ─────────────────────────────────────────────────
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;


-- ── 7. Drop all old bookings policies (clean slate) ───────────────────────────
DROP POLICY IF EXISTS "Players can read own bookings"     ON public.bookings;
DROP POLICY IF EXISTS "Players can insert bookings"       ON public.bookings;
DROP POLICY IF EXISTS "Players can update own bookings"   ON public.bookings;
DROP POLICY IF EXISTS "Owners can read court bookings"    ON public.bookings;
DROP POLICY IF EXISTS "bookings_player_read"              ON public.bookings;
DROP POLICY IF EXISTS "bookings_player_insert"            ON public.bookings;
DROP POLICY IF EXISTS "bookings_player_update"            ON public.bookings;
DROP POLICY IF EXISTS "bookings_owner_read"               ON public.bookings;
DROP POLICY IF EXISTS "Enable read access for all users"  ON public.bookings;
DROP POLICY IF EXISTS "Allow individual read access"      ON public.bookings;


-- ── 8. Create correct bookings RLS policies ───────────────────────────────────

-- Players read their own bookings
CREATE POLICY "bookings_player_read"
  ON public.bookings FOR SELECT
  USING (auth.uid() = user_id);

-- Players insert only for themselves
CREATE POLICY "bookings_player_insert"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Players update their own bookings
CREATE POLICY "bookings_player_update"
  ON public.bookings FOR UPDATE
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Owners read bookings for their courts via UUID FK — no type mismatch
CREATE POLICY "bookings_owner_read"
  ON public.bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM   public.owner_courts oc
      WHERE  oc.id       = bookings.owner_court_id
        AND  oc.owner_id = auth.uid()
        AND  oc.deleted_at IS NULL
    )
  );


-- ── 9. Fix reto acceptance RLS ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Owners can update their retos"  ON public.retos;
DROP POLICY IF EXISTS "retos_update_own"               ON public.retos;
DROP POLICY IF EXISTS "retos_accept_open"              ON public.retos;

-- Creators can update their own retos
CREATE POLICY "retos_update_own"
  ON public.retos FOR UPDATE
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Any authenticated non-creator can accept an open reto
CREATE POLICY "retos_accept_open"
  ON public.retos FOR UPDATE
  USING (
    auth.uid() != user_id
    AND status IN (
      'open', 'looking_for_rival', 'pending_rival',
      'active', 'published', 'created'
    )
  )
  WITH CHECK (auth.uid() != user_id);


-- ── 10. expire_stale_bookings function ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.expire_stale_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.bookings
  SET    status = 'expired'
  WHERE  status    IN ('pending_payment', 'pending')
    AND  expires_at IS NOT NULL
    AND  expires_at <  NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_stale_bookings() TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_stale_bookings() TO authenticated;


-- ── 11. pg_cron schedule (safe no-op if extension not installed) ──────────────
DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('expire-stale-bookings');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  PERFORM cron.schedule(
    'expire-stale-bookings',
    '*/15 * * * *',
    'SELECT public.expire_stale_bookings();'
  );
  RAISE NOTICE 'pg_cron: expire-stale-bookings scheduled every 15 min';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available (enable in Dashboard → Extensions): %', SQLERRM;
END;
$$;


-- ── 12. Reload PostgREST schema cache ─────────────────────────────────────────
NOTIFY pgrst, 'reload schema';


-- ── 13. Verification ──────────────────────────────────────────────────────────
-- All rows should show the expected value in the "status" column.
SELECT
  'owner_court_id column'            AS check_name,
  CASE
    WHEN data_type = 'uuid' THEN 'PASS — uuid'
    ELSE 'FAIL — ' || coalesce(data_type, 'MISSING')
  END                                AS status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'bookings'
  AND column_name  = 'owner_court_id'

UNION ALL

SELECT
  'FK bookings_owner_court_id_fkey',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.bookings'::regclass
        AND conname  = 'bookings_owner_court_id_fkey'
        AND contype  = 'f'
    ) THEN 'PASS'
    ELSE 'FAIL — constraint missing'
  END

UNION ALL

SELECT
  'idx_bookings_slot_active on owner_court_id',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname  = 'idx_bookings_slot_active'
        AND indexdef   ILIKE '%owner_court_id%'
        AND indexdef   ILIKE '%unique%'
    ) THEN 'PASS — unique partial on owner_court_id'
    ELSE 'FAIL — index missing or on wrong column'
  END

UNION ALL

SELECT
  'bookings_owner_read uses owner_court_id',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename  = 'bookings'
        AND policyname = 'bookings_owner_read'
        AND qual       ILIKE '%owner_court_id%'
    ) THEN 'PASS'
    ELSE 'FAIL — policy missing or uses wrong column'
  END

UNION ALL

SELECT
  'no UUID=integer policy on bookings',
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename  = 'bookings'
        AND qual       ILIKE '%bookings.court_id%'
    ) THEN 'PASS — no type-mismatch policy'
    ELSE 'FAIL — stale policy with court_id still exists'
  END

UNION ALL

SELECT
  'expire_stale_bookings() function',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'expire_stale_bookings'
    ) THEN 'PASS'
    ELSE 'FAIL — function not found'
  END

UNION ALL

SELECT
  'RLS enabled on bookings',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename  = 'bookings'
        AND rowsecurity = true
    ) THEN 'PASS'
    ELSE 'FAIL — RLS not enabled'
  END

ORDER BY check_name;

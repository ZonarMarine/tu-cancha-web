-- ═══════════════════════════════════════════════════════════════════════════
-- TuCancha — Owner Court FK Fix  (v2 — hardened, step-by-step)
-- ═══════════════════════════════════════════════════════════════════════════
-- Run each block ONE AT A TIME in Supabase SQL Editor.
-- Check for errors after each block before running the next.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────
-- BLOCK 1: Add owner_court_id column
-- Expected output: "ALTER TABLE" with no errors
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS owner_court_id uuid;

-- Verify it was added:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'bookings'
  AND column_name  = 'owner_court_id';
-- Expected: one row: owner_court_id | uuid | YES


-- ─────────────────────────────────────────────────────────────────────────
-- BLOCK 2: Add FK constraint separately (safer than inline with ADD COLUMN)
-- Expected output: "ALTER TABLE" with no errors
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_owner_court_id_fkey;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_owner_court_id_fkey
  FOREIGN KEY (owner_court_id)
  REFERENCES public.owner_courts(id)
  ON DELETE SET NULL;

-- Verify FK exists:
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'public.bookings'::regclass
  AND conname  = 'bookings_owner_court_id_fkey';
-- Expected: one row showing constraint type 'f' (foreign key)


-- ─────────────────────────────────────────────────────────────────────────
-- BLOCK 3: Rebuild the unique anti-double-booking index on the UUID column
-- Expected output: "DROP INDEX" + "CREATE INDEX"
-- ─────────────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS public.idx_bookings_slot_active;

CREATE UNIQUE INDEX idx_bookings_slot_active
  ON public.bookings(owner_court_id, date, time)
  WHERE status NOT IN ('failed', 'cancelled', 'expired')
    AND owner_court_id IS NOT NULL;

-- Verify:
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname  = 'idx_bookings_slot_active';
-- Expected: one row with UNIQUE and owner_court_id in the definition


-- ─────────────────────────────────────────────────────────────────────────
-- BLOCK 4: Replace integer-based indexes with UUID-based ones
-- ─────────────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS public.idx_bookings_court_id;
DROP INDEX IF EXISTS public.idx_bookings_court_date_status;

CREATE INDEX IF NOT EXISTS idx_bookings_owner_court_id
  ON public.bookings(owner_court_id);

CREATE INDEX IF NOT EXISTS idx_bookings_owner_court_date_status
  ON public.bookings(owner_court_id, date, status);


-- ─────────────────────────────────────────────────────────────────────────
-- BLOCK 5: Fix the owner bookings RLS policy
-- Expected output: "DROP POLICY" + "CREATE POLICY"
-- ─────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Owners can read court bookings"  ON public.bookings;
DROP POLICY IF EXISTS "bookings_owner_read"             ON public.bookings;

CREATE POLICY "Owners can read court bookings"
  ON public.bookings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.owner_courts oc
      WHERE oc.id        = bookings.owner_court_id  -- uuid = uuid ✓
        AND oc.owner_id  = auth.uid()
        AND oc.deleted_at IS NULL
    )
  );

-- Verify policy:
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename  = 'bookings'
  AND policyname = 'Owners can read court bookings';
-- Expected: one row. qual should contain 'owner_court_id'


-- ─────────────────────────────────────────────────────────────────────────
-- BLOCK 6: Recreate expire_stale_bookings + reload PostgREST schema cache
-- Expected output: "CREATE FUNCTION" + "NOTIFY"
-- ─────────────────────────────────────────────────────────────────────────
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

-- Grant execute to service role (needed for PostgREST RPC)
GRANT EXECUTE ON FUNCTION public.expire_stale_bookings() TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_stale_bookings() TO authenticated;

-- Force PostgREST to reload its schema cache immediately
NOTIFY pgrst, 'reload schema';

-- Verify function:
SELECT proname, prosecdef
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'expire_stale_bookings';
-- Expected: one row  proname=expire_stale_bookings  prosecdef=true


-- ─────────────────────────────────────────────────────────────────────────
-- BLOCK 7: Register pg_cron job (only if pg_cron extension is enabled)
-- Expected output: "DO" with no errors
-- ─────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  PERFORM cron.unschedule('expire-stale-bookings');
EXCEPTION WHEN others THEN NULL;  -- job may not exist yet
END $$;

DO $$
BEGIN
  PERFORM cron.schedule(
    'expire-stale-bookings',
    '*/15 * * * *',
    'SELECT public.expire_stale_bookings();'
  );
EXCEPTION WHEN others THEN
  RAISE NOTICE 'pg_cron not available: %', SQLERRM;
END $$;

-- Verify cron job (only works if pg_cron is enabled):
SELECT jobname, schedule, command, active
FROM cron.job
WHERE jobname = 'expire-stale-bookings';
-- Expected: one row  schedule=*/15 * * * *  active=true


-- ─────────────────────────────────────────────────────────────────────────
-- BLOCK 8: Final sanity check — confirm everything is in place
-- ─────────────────────────────────────────────────────────────────────────
SELECT
  (SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='bookings' AND column_name='owner_court_id'
  ))  AS owner_court_id_exists,
  (SELECT data_type FROM information_schema.columns
    WHERE table_schema='public' AND table_name='bookings' AND column_name='owner_court_id'
  )   AS owner_court_id_type,
  (SELECT EXISTS(
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='idx_bookings_slot_active'
      AND indexdef ILIKE '%owner_court_id%'
  ))  AS slot_index_on_uuid_col,
  (SELECT EXISTS(
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='bookings'
      AND policyname='Owners can read court bookings'
      AND qual ILIKE '%owner_court_id%'
  ))  AS owner_read_policy_uses_uuid_fk,
  (SELECT EXISTS(
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='expire_stale_bookings'
  ))  AS expire_function_exists,
  (SELECT EXISTS(
    SELECT 1 FROM pg_tables
    WHERE schemaname='public' AND tablename='bookings' AND rowsecurity=true
  ))  AS rls_enabled;
-- All columns should be TRUE except owner_court_id_type which should be 'uuid'

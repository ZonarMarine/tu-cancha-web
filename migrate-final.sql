-- ═══════════════════════════════════════════════════════════════════════════
-- TuCancha — Final Production Migration
-- ═══════════════════════════════════════════════════════════════════════════
-- Paste this ENTIRE file into Supabase → SQL Editor → Run.
-- Each step is wrapped in its own exception handler.
-- After it runs, read the NOTICE messages at the bottom for a pass/fail report.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  pass_count  int := 0;
  fail_count  int := 0;
  col_type    text;
  idx_def     text;
  pol_qual    text;
  proc_count  int;

  -- ── tiny helpers ────────────────────────────────────────────────────────
  PROCEDURE ok(step text) LANGUAGE plpgsql AS $p$
  BEGIN
    pass_count := pass_count + 1;
    RAISE NOTICE '  ✅  %', step;
  END $p$;

  PROCEDURE fail(step text, detail text) LANGUAGE plpgsql AS $p$
  BEGIN
    fail_count := fail_count + 1;
    RAISE NOTICE '  ❌  % — %', step, detail;
  END $p$;

BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════════════════════';
  RAISE NOTICE '  TuCancha Production Migration';
  RAISE NOTICE '══════════════════════════════════════════════════════════════';

  -- ────────────────────────────────────────────────────────────────────────
  -- STEP 1 — Add owner_court_id column (no inline FK yet — safer)
  -- ────────────────────────────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '── Step 1: Add bookings.owner_court_id ──';
  BEGIN
    ALTER TABLE public.bookings
      ADD COLUMN IF NOT EXISTS owner_court_id uuid;
    CALL ok('bookings.owner_court_id column added');
  EXCEPTION WHEN OTHERS THEN
    CALL fail('Add owner_court_id', SQLERRM);
  END;

  -- ────────────────────────────────────────────────────────────────────────
  -- STEP 2 — Add FK constraint separately
  -- ────────────────────────────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '── Step 2: Add FK constraint ──';
  BEGIN
    ALTER TABLE public.bookings
      DROP CONSTRAINT IF EXISTS bookings_owner_court_id_fkey;
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_owner_court_id_fkey
      FOREIGN KEY (owner_court_id)
      REFERENCES public.owner_courts(id)
      ON DELETE SET NULL;
    CALL ok('FK bookings.owner_court_id → owner_courts(id)');
  EXCEPTION WHEN OTHERS THEN
    CALL fail('Add FK constraint', SQLERRM);
  END;

  -- ────────────────────────────────────────────────────────────────────────
  -- STEP 3 — Backfill owner_court_id from court_name where possible
  -- (joins on court_name to populate the UUID for existing bookings)
  -- ────────────────────────────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '── Step 3: Backfill owner_court_id from court_name ──';
  BEGIN
    UPDATE public.bookings b
    SET    owner_court_id = oc.id
    FROM   public.owner_courts oc
    WHERE  oc.name          = b.court_name
      AND  b.owner_court_id IS NULL;
    CALL ok('Backfill complete — ' || to_char(found, '') || ' rows updated');
  EXCEPTION WHEN OTHERS THEN
    CALL fail('Backfill owner_court_id', SQLERRM);
  END;

  -- ────────────────────────────────────────────────────────────────────────
  -- STEP 4 — Drop old integer-based unique index, create UUID-based one
  -- ────────────────────────────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '── Step 4: Rebuild anti-double-booking unique index ──';
  BEGIN
    DROP INDEX IF EXISTS public.idx_bookings_slot_active;
    CALL ok('Dropped old idx_bookings_slot_active (was on integer court_id)');
  EXCEPTION WHEN OTHERS THEN
    CALL fail('Drop old index', SQLERRM);
  END;

  BEGIN
    CREATE UNIQUE INDEX idx_bookings_slot_active
      ON public.bookings (owner_court_id, date, time)
      WHERE status NOT IN ('failed', 'cancelled', 'expired')
        AND owner_court_id IS NOT NULL;
    CALL ok('Created UNIQUE PARTIAL idx_bookings_slot_active on owner_court_id');
  EXCEPTION WHEN OTHERS THEN
    CALL fail('Create new unique index', SQLERRM);
  END;

  -- ────────────────────────────────────────────────────────────────────────
  -- STEP 5 — Supporting indexes on owner_court_id
  -- ────────────────────────────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '── Step 5: Supporting indexes ──';

  BEGIN
    DROP INDEX IF EXISTS public.idx_bookings_court_id;
    DROP INDEX IF EXISTS public.idx_bookings_court_date_status;
    CREATE INDEX IF NOT EXISTS idx_bookings_owner_court_id
      ON public.bookings (owner_court_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_owner_court_date_status
      ON public.bookings (owner_court_id, date, status);
    -- Keep these regardless
    CREATE INDEX IF NOT EXISTS idx_bookings_date    ON public.bookings (date);
    CREATE INDEX IF NOT EXISTS idx_bookings_status  ON public.bookings (status);
    CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings (user_id);
    CALL ok('idx_bookings_owner_court_id');
    CALL ok('idx_bookings_owner_court_date_status');
    CALL ok('idx_bookings_date / status / user_id');
  EXCEPTION WHEN OTHERS THEN
    CALL fail('Supporting indexes', SQLERRM);
  END;

  BEGIN
    CREATE INDEX IF NOT EXISTS idx_retos_date_status
      ON public.retos (date, status);
    CALL ok('idx_retos_date_status');
  EXCEPTION WHEN OTHERS THEN
    CALL fail('idx_retos_date_status', SQLERRM);
  END;

  BEGIN
    CREATE INDEX IF NOT EXISTS idx_notifications_user
      ON public.notifications (user_id, read, created_at DESC);
    CALL ok('idx_notifications_user');
  EXCEPTION WHEN OTHERS THEN
    CALL fail('idx_notifications_user', SQLERRM);
  END;

  -- ────────────────────────────────────────────────────────────────────────
  -- STEP 6 — Enable RLS on bookings (idempotent)
  -- ────────────────────────────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '── Step 6: RLS on bookings ──';
  BEGIN
    ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
    CALL ok('RLS enabled on bookings');
  EXCEPTION WHEN OTHERS THEN
    CALL fail('Enable RLS', SQLERRM);
  END;

  -- ────────────────────────────────────────────────────────────────────────
  -- STEP 7 — Drop ALL old bookings policies (clean slate)
  -- ────────────────────────────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '── Step 7: Drop stale bookings policies ──';
  BEGIN
    DROP POLICY IF EXISTS "Players can read own bookings"   ON public.bookings;
    DROP POLICY IF EXISTS "Players can insert bookings"     ON public.bookings;
    DROP POLICY IF EXISTS "Players can update own bookings" ON public.bookings;
    DROP POLICY IF EXISTS "Owners can read court bookings"  ON public.bookings;
    DROP POLICY IF EXISTS "bookings_player_read"            ON public.bookings;
    DROP POLICY IF EXISTS "bookings_player_insert"          ON public.bookings;
    DROP POLICY IF EXISTS "bookings_player_update"          ON public.bookings;
    DROP POLICY IF EXISTS "bookings_owner_read"             ON public.bookings;
    -- Drop any other stale policies that might exist
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.bookings;
    DROP POLICY IF EXISTS "Allow individual read access"     ON public.bookings;
    CALL ok('All stale bookings policies dropped');
  EXCEPTION WHEN OTHERS THEN
    CALL fail('Drop old policies', SQLERRM);
  END;

  -- ────────────────────────────────────────────────────────────────────────
  -- STEP 8 — Create correct bookings RLS policies
  -- NOTE: No UUID/integer comparison anywhere here.
  -- ────────────────────────────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '── Step 8: Create correct bookings RLS policies ──';

  -- Policy A: Players read their own bookings
  BEGIN
    CREATE POLICY "bookings_player_read"
      ON public.bookings FOR SELECT
      USING (auth.uid() = user_id);
    CALL ok('bookings_player_read');
  EXCEPTION WHEN OTHERS THEN
    CALL fail('bookings_player_read', SQLERRM);
  END;

  -- Policy B: Players insert only for themselves
  BEGIN
    CREATE POLICY "bookings_player_insert"
      ON public.bookings FOR INSERT
      WITH CHECK (auth.uid() = user_id);
    CALL ok('bookings_player_insert');
  EXCEPTION WHEN OTHERS THEN
    CALL fail('bookings_player_insert', SQLERRM);
  END;

  -- Policy C: Players update their own bookings
  BEGIN
    CREATE POLICY "bookings_player_update"
      ON public.bookings FOR UPDATE
      USING  (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
    CALL ok('bookings_player_update');
  EXCEPTION WHEN OTHERS THEN
    CALL fail('bookings_player_update', SQLERRM);
  END;

  -- Policy D: Owners read bookings for their courts
  -- Uses owner_court_id UUID FK — no type mismatch possible.
  BEGIN
    CREATE POLICY "bookings_owner_read"
      ON public.bookings FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM   public.owner_courts oc
          WHERE  oc.id       = bookings.owner_court_id  -- uuid = uuid ✓
            AND  oc.owner_id = auth.uid()
            AND  oc.deleted_at IS NULL
        )
      );
    CALL ok('bookings_owner_read (uuid = uuid join — no type mismatch)');
  EXCEPTION WHEN OTHERS THEN
    CALL fail('bookings_owner_read', SQLERRM);
  END;

  -- ────────────────────────────────────────────────────────────────────────
  -- STEP 9 — Fix reto acceptance RLS
  -- ────────────────────────────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '── Step 9: Reto acceptance RLS ──';
  BEGIN
    -- Drop all old reto update policies
    DROP POLICY IF EXISTS "Owners can update their retos" ON public.retos;
    DROP POLICY IF EXISTS "retos_update_own"              ON public.retos;
    DROP POLICY IF EXISTS "retos_accept_open"             ON public.retos;

    -- Creators can update their own retos
    CREATE POLICY "retos_update_own"
      ON public.retos FOR UPDATE
      USING     (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    -- Non-creators can accept open retos
    CREATE POLICY "retos_accept_open"
      ON public.retos FOR UPDATE
      USING (
        auth.uid() != user_id
        AND status IN (
          'open','looking_for_rival','pending_rival',
          'active','published','created'
        )
      )
      WITH CHECK (auth.uid() != user_id);

    CALL ok('retos_update_own + retos_accept_open (old broken policy removed)');
  EXCEPTION WHEN OTHERS THEN
    CALL fail('Reto RLS policies', SQLERRM);
  END;

  -- ────────────────────────────────────────────────────────────────────────
  -- STEP 10 — expire_stale_bookings function
  -- ────────────────────────────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '── Step 10: expire_stale_bookings() function ──';
  BEGIN
    CREATE OR REPLACE FUNCTION public.expire_stale_bookings()
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $fn$
    BEGIN
      UPDATE public.bookings
      SET    status = 'expired'
      WHERE  status    IN ('pending_payment', 'pending')
        AND  expires_at IS NOT NULL
        AND  expires_at <  NOW();
    END;
    $fn$;

    GRANT EXECUTE ON FUNCTION public.expire_stale_bookings() TO service_role;
    GRANT EXECUTE ON FUNCTION public.expire_stale_bookings() TO authenticated;

    CALL ok('expire_stale_bookings() created and granted');
  EXCEPTION WHEN OTHERS THEN
    CALL fail('expire_stale_bookings()', SQLERRM);
  END;

  -- ────────────────────────────────────────────────────────────────────────
  -- STEP 11 — pg_cron schedule
  -- ────────────────────────────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '── Step 11: pg_cron schedule ──';
  BEGIN
    -- Remove if exists, then re-add (idempotent)
    BEGIN
      PERFORM cron.unschedule('expire-stale-bookings');
    EXCEPTION WHEN OTHERS THEN
      NULL;  -- job didn't exist yet — fine
    END;

    PERFORM cron.schedule(
      'expire-stale-bookings',
      '*/15 * * * *',
      'SELECT public.expire_stale_bookings();'
    );
    CALL ok('pg_cron: expire-stale-bookings every 15 min');
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '  ⚠️   pg_cron not available — %', SQLERRM;
    RAISE NOTICE '       Enable it: Dashboard → Database → Extensions → pg_cron';
  END;

  -- ────────────────────────────────────────────────────────────────────────
  -- STEP 12 — Force PostgREST schema cache reload
  -- ────────────────────────────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '── Step 12: Reload PostgREST schema cache ──';
  BEGIN
    NOTIFY pgrst, 'reload schema';
    CALL ok('PostgREST schema cache reload triggered');
  EXCEPTION WHEN OTHERS THEN
    CALL fail('NOTIFY pgrst', SQLERRM);
  END;

  -- ────────────────────────────────────────────────────────────────────────
  -- STEP 13 — Verification snapshot
  -- ────────────────────────────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '── Step 13: Verification ──';

  -- owner_court_id column
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'bookings'
    AND column_name = 'owner_court_id';

  IF col_type = 'uuid' THEN
    CALL ok('bookings.owner_court_id EXISTS and is UUID');
  ELSE
    CALL fail('bookings.owner_court_id', 'column missing or wrong type: ' || coalesce(col_type,'NULL'));
  END IF;

  -- FK constraint
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.bookings'::regclass
      AND conname  = 'bookings_owner_court_id_fkey'
      AND contype  = 'f'
  ) THEN
    CALL ok('FK bookings_owner_court_id_fkey exists');
  ELSE
    CALL fail('FK constraint', 'bookings_owner_court_id_fkey not found');
  END IF;

  -- Unique index on owner_court_id
  SELECT indexdef INTO idx_def
  FROM pg_indexes
  WHERE schemaname = 'public' AND indexname = 'idx_bookings_slot_active';

  IF idx_def ILIKE '%owner_court_id%' AND idx_def ILIKE '%unique%' THEN
    CALL ok('idx_bookings_slot_active is UNIQUE on owner_court_id');
  ELSIF idx_def IS NOT NULL THEN
    CALL fail('idx_bookings_slot_active', 'exists but wrong column: ' || left(idx_def,100));
  ELSE
    CALL fail('idx_bookings_slot_active', 'index not found');
  END IF;

  -- Owner RLS uses owner_court_id
  SELECT qual INTO pol_qual
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'bookings'
    AND policyname = 'bookings_owner_read';

  IF pol_qual ILIKE '%owner_court_id%' THEN
    CALL ok('bookings_owner_read policy uses owner_court_id (uuid = uuid)');
  ELSIF pol_qual IS NULL THEN
    CALL fail('bookings_owner_read', 'policy not found');
  ELSE
    CALL fail('bookings_owner_read', 'policy does NOT use owner_court_id: ' || left(pol_qual,100));
  END IF;

  -- expire_stale_bookings exists
  SELECT count(*) INTO proc_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'expire_stale_bookings';

  IF proc_count > 0 THEN
    CALL ok('expire_stale_bookings() function exists');
  ELSE
    CALL fail('expire_stale_bookings()', 'function not found in pg_proc');
  END IF;

  -- No UUID=integer policy exists on bookings
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'bookings' AND schemaname = 'public'
      AND (qual ILIKE '%= bookings.court_id%' OR qual ILIKE '%court_id =%')
  ) THEN
    CALL ok('No UUID=integer policy comparison exists on bookings');
  ELSE
    CALL fail('UUID=integer check', 'A policy still uses court_id — type mismatch risk!');
  END IF;

  -- ────────────────────────────────────────────────────────────────────────
  -- STEP 14 — Double-booking simulation
  -- ────────────────────────────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '── Step 14: Double-booking simulation ──';
  DECLARE
    test_court_id uuid;
    test_user_id  uuid;
    b1_id         uuid;
    b2_id         uuid;
    dup_blocked   bool := false;
  BEGIN
    SELECT id INTO test_court_id FROM public.owner_courts LIMIT 1;
    SELECT id INTO test_user_id  FROM auth.users           LIMIT 1;

    IF test_court_id IS NULL OR test_user_id IS NULL THEN
      RAISE NOTICE '  ⚠️   No owner_courts/users rows — skipping simulation';
    ELSE
      -- Insert first booking
      INSERT INTO public.bookings
        (owner_court_id, court_name, date, time, status, user_id, players, hours, base_price, service_fee, total_price)
      VALUES
        (test_court_id, '__sim_test__', '2099-12-30', '22:00', 'confirmed',
         test_user_id, 2, 1, 0, 0, 0)
      RETURNING id INTO b1_id;

      -- Try duplicate
      BEGIN
        INSERT INTO public.bookings
          (owner_court_id, court_name, date, time, status, user_id, players, hours, base_price, service_fee, total_price)
        VALUES
          (test_court_id, '__sim_test__', '2099-12-30', '22:00', 'confirmed',
           test_user_id, 2, 1, 0, 0, 0)
        RETURNING id INTO b2_id;
        CALL fail('Double-booking simulation', 'Duplicate was ALLOWED — index not working!');
      EXCEPTION WHEN unique_violation THEN
        dup_blocked := true;
        CALL ok('Duplicate booking blocked with unique_violation (23505) ✓');
      END;

      -- Cancelled same slot should be allowed
      BEGIN
        INSERT INTO public.bookings
          (owner_court_id, court_name, date, time, status, user_id, players, hours, base_price, service_fee, total_price)
        VALUES
          (test_court_id, '__sim_test__', '2099-12-30', '22:00', 'cancelled',
           test_user_id, 2, 1, 0, 0, 0)
        RETURNING id INTO b2_id;
        CALL ok('Cancelled booking for same slot allowed (partial index correct)');
        DELETE FROM public.bookings WHERE id = b2_id;
      EXCEPTION WHEN unique_violation THEN
        CALL fail('Partial index', 'Cancelled booking incorrectly blocked!');
      END;

      DELETE FROM public.bookings WHERE id = b1_id;
      CALL ok('Simulation rows cleaned up');
    END IF;
  END;

  -- ────────────────────────────────────────────────────────────────────────
  -- STEP 15 — Stale booking expiry simulation
  -- ────────────────────────────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '── Step 15: Stale booking expiry simulation ──';
  DECLARE
    test_user_id uuid;
    stale_id     uuid;
    status_after text;
  BEGIN
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;

    IF test_user_id IS NULL THEN
      RAISE NOTICE '  ⚠️   No users found — skipping expiry simulation';
    ELSE
      INSERT INTO public.bookings
        (court_name, date, time, status, user_id, players, hours, base_price, service_fee, total_price, expires_at)
      VALUES
        ('__expire_sim__', '2020-01-01', '10:00', 'pending_payment',
         test_user_id, 2, 1, 0, 0, 0, NOW() - INTERVAL '1 hour')
      RETURNING id INTO stale_id;

      PERFORM public.expire_stale_bookings();

      SELECT status INTO status_after FROM public.bookings WHERE id = stale_id;

      IF status_after = 'expired' THEN
        CALL ok('expire_stale_bookings() correctly set status → "expired"');
      ELSE
        CALL fail('Expiry simulation', 'Status is: ' || coalesce(status_after,'NULL'));
      END IF;

      DELETE FROM public.bookings WHERE id = stale_id;
      CALL ok('Expiry simulation row cleaned up');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    CALL fail('Expiry simulation', SQLERRM);
  END;

  -- ────────────────────────────────────────────────────────────────────────
  -- FINAL REPORT
  -- ────────────────────────────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════════════════════';
  RAISE NOTICE '  MIGRATION REPORT';
  RAISE NOTICE '══════════════════════════════════════════════════════════════';
  RAISE NOTICE '  ✅  Passed: %', pass_count;
  RAISE NOTICE '  ❌  Failed: %', fail_count;
  RAISE NOTICE '';

  IF fail_count = 0 THEN
    RAISE NOTICE '  🟢  ALL STEPS PASSED — migration complete';
    RAISE NOTICE '  Run: node scripts/verify-safety.mjs (expect 16/16 after cache reload)';
  ELSIF fail_count <= 2 THEN
    RAISE NOTICE '  🟡  MOSTLY OK — read failures above and fix manually';
  ELSE
    RAISE NOTICE '  🔴  MIGRATION INCOMPLETE — read failures and re-run';
  END IF;

  RAISE NOTICE '══════════════════════════════════════════════════════════════';

END $$;

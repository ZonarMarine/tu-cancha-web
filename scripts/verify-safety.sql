-- ═══════════════════════════════════════════════════════════════════════════
-- TuCancha — Production Safety Verification
-- Run this entire file in Supabase → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_pass   int := 0;
  v_fail   int := 0;
  v_warn   int := 0;
  v_detail text;

  -- helpers
  PROCEDURE ok(label text, detail text DEFAULT '') LANGUAGE plpgsql AS $p$
  BEGIN
    RAISE NOTICE '  ✅ %  %', label, detail;
    v_pass := v_pass + 1;
  END $p$;

  PROCEDURE nok(label text, detail text DEFAULT '') LANGUAGE plpgsql AS $p$
  BEGIN
    RAISE NOTICE '  ❌ %  %', label, detail;
    v_fail := v_fail + 1;
  END $p$;

  PROCEDURE wrn(label text, detail text DEFAULT '') LANGUAGE plpgsql AS $p$
  BEGIN
    RAISE NOTICE '  ⚠️  %  %', label, detail;
    v_warn := v_warn + 1;
  END $p$;

BEGIN

-- ══════════════════════════════════════════════════════════════════
RAISE NOTICE '';
RAISE NOTICE '══ 1. INDEXES ══════════════════════════════════════════════════';
-- ══════════════════════════════════════════════════════════════════

DECLARE
  required_indexes text[] := ARRAY[
    'idx_bookings_slot_active',
    'idx_bookings_court_id',
    'idx_bookings_date',
    'idx_bookings_status',
    'idx_bookings_user_id',
    'idx_bookings_court_date_status',
    'idx_retos_date_status',
    'idx_notifications_user'
  ];
  idx_name text;
  idx_def  text;
BEGIN
  FOREACH idx_name IN ARRAY required_indexes LOOP
    SELECT indexdef INTO idx_def
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = idx_name;

    IF idx_def IS NOT NULL THEN
      CALL ok(idx_name, left(idx_def, 80));
    ELSE
      CALL nok('Missing index: ' || idx_name);
    END IF;
  END LOOP;

  -- Verify slot index is UNIQUE + PARTIAL
  SELECT indexdef INTO idx_def
  FROM pg_indexes
  WHERE schemaname = 'public' AND indexname = 'idx_bookings_slot_active';

  IF idx_def IS NOT NULL THEN
    IF idx_def ILIKE '%unique%' AND idx_def ILIKE '%where%' THEN
      CALL ok('idx_bookings_slot_active is UNIQUE + PARTIAL — correct');
    ELSE
      CALL nok('idx_bookings_slot_active exists but is NOT unique partial!', idx_def);
    END IF;
  END IF;
END;

-- ══════════════════════════════════════════════════════════════════
RAISE NOTICE '';
RAISE NOTICE '══ 2. RLS ENABLED ══════════════════════════════════════════════';
-- ══════════════════════════════════════════════════════════════════

DECLARE
  tbl      text;
  rls_on   bool;
  tables   text[] := ARRAY['bookings','retos','payments','notifications','owner_courts'];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    SELECT rowsecurity INTO rls_on
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = tbl;

    IF rls_on IS NULL THEN
      CALL wrn(tbl || ' — table not found');
    ELSIF rls_on THEN
      CALL ok('RLS enabled on ' || tbl);
    ELSE
      CALL nok('RLS NOT enabled on ' || tbl || ' — any authenticated user can read all rows!');
    END IF;
  END LOOP;
END;

-- ══════════════════════════════════════════════════════════════════
RAISE NOTICE '';
RAISE NOTICE '══ 3. RLS POLICIES ═════════════════════════════════════════════';
-- ══════════════════════════════════════════════════════════════════

DECLARE
  pol_name text;
  qual_txt text;
  with_chk text;
  required_booking_policies text[] := ARRAY[
    'bookings_player_read',
    'bookings_player_insert',
    'bookings_player_update',
    'bookings_owner_read'
  ];
  required_reto_policies text[] := ARRAY[
    'retos_update_own',
    'retos_accept_open'
  ];
BEGIN
  -- Check bookings policies
  FOREACH pol_name IN ARRAY required_booking_policies LOOP
    SELECT qual, with_check INTO qual_txt, with_chk
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bookings' AND policyname = pol_name;

    IF qual_txt IS NOT NULL OR with_chk IS NOT NULL THEN
      CALL ok('Policy: bookings.' || pol_name);
    ELSE
      CALL nok('Missing policy: bookings.' || pol_name);
    END IF;
  END LOOP;

  -- Check reto policies
  FOREACH pol_name IN ARRAY required_reto_policies LOOP
    SELECT qual, with_check INTO qual_txt, with_chk
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'retos' AND policyname = pol_name;

    IF qual_txt IS NOT NULL OR with_chk IS NOT NULL THEN
      CALL ok('Policy: retos.' || pol_name);
    ELSE
      CALL nok('Missing policy: retos.' || pol_name);
    END IF;
  END LOOP;

  -- Old broken policy must be gone
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'retos'
      AND policyname = 'Owners can update their retos'
  ) THEN
    CALL nok('OLD BROKEN POLICY still exists: "Owners can update their retos" — reto acceptance blocked for everyone!');
  ELSE
    CALL ok('Old broken reto UPDATE policy is gone');
  END IF;

  -- Verify bookings_owner_read uses court_id (not court_name)
  SELECT qual INTO qual_txt
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'bookings' AND policyname = 'bookings_owner_read';

  IF qual_txt IS NOT NULL THEN
    IF qual_txt ILIKE '%owner_courts%' AND qual_txt ILIKE '%court_id%' THEN
      CALL ok('bookings_owner_read uses court_id FK join — cross-owner leak prevented');
    ELSIF qual_txt ILIKE '%court_name%' THEN
      CALL nok('bookings_owner_read uses court_name string — owners with same court name share data!', qual_txt);
    ELSE
      CALL wrn('bookings_owner_read USING clause is unusual', qual_txt);
    END IF;
  END IF;

  -- Show all policies for reference
  RAISE NOTICE '';
  RAISE NOTICE '  All policies:';
  FOR pol_name, qual_txt IN
    SELECT policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('bookings','retos')
    ORDER BY tablename, policyname
  LOOP
    RAISE NOTICE '    [%] %', qual_txt, pol_name;
  END LOOP;
END;

-- ══════════════════════════════════════════════════════════════════
RAISE NOTICE '';
RAISE NOTICE '══ 4. EXPIRY FUNCTION + PG_CRON ════════════════════════════════';
-- ══════════════════════════════════════════════════════════════════

BEGIN
  -- Function exists?
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'expire_stale_bookings'
  ) THEN
    CALL ok('expire_stale_bookings() function exists');
  ELSE
    CALL nok('expire_stale_bookings() function NOT found');
  END IF;

  -- pg_cron job?
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-stale-bookings') THEN
      DECLARE
        job_schedule text;
        job_active   bool;
      BEGIN
        SELECT schedule, active INTO job_schedule, job_active
        FROM cron.job WHERE jobname = 'expire-stale-bookings';
        CALL ok('pg_cron job "expire-stale-bookings" exists', 'schedule: ' || job_schedule);
        IF job_active THEN
          CALL ok('pg_cron job is active');
        ELSE
          CALL wrn('pg_cron job is INACTIVE — bookings will not auto-expire');
        END IF;
      END;
    ELSE
      CALL wrn('pg_cron job "expire-stale-bookings" NOT found', 'Enable pg_cron in Dashboard → Extensions, then re-run production-safety.sql');
    END IF;
  ELSE
    CALL wrn('pg_cron extension not installed', 'Enable in Dashboard → Database → Extensions → pg_cron');
  END IF;
END;

-- ══════════════════════════════════════════════════════════════════
RAISE NOTICE '';
RAISE NOTICE '══ 5. DOUBLE-BOOKING SIMULATION ════════════════════════════════';
-- ══════════════════════════════════════════════════════════════════

DECLARE
  test_court_id integer;
  b1_id         uuid;
  b2_id         uuid;
  insert_ok     bool;
BEGIN
  -- Get a real court_id to use (or skip if none exist)
  SELECT id INTO test_court_id FROM owner_courts LIMIT 1;

  IF test_court_id IS NULL THEN
    CALL wrn('No owner_courts rows found — skipping double-booking simulation');
  ELSE
    -- Insert first active booking
    INSERT INTO bookings(court_id, court_name, date, time, status, user_id, players, hours, total_price)
    VALUES (test_court_id, '__safety_test__', '2099-12-31', '23:55', 'confirmed',
            (SELECT id FROM auth.users LIMIT 1), 2, 1, 0)
    RETURNING id INTO b1_id;

    CALL ok('First booking inserted for slot 2099-12-31 23:55', b1_id::text);

    -- Try to insert duplicate
    insert_ok := true;
    BEGIN
      INSERT INTO bookings(court_id, court_name, date, time, status, user_id, players, hours, total_price)
      VALUES (test_court_id, '__safety_test__', '2099-12-31', '23:55', 'confirmed',
              (SELECT id FROM auth.users LIMIT 1 OFFSET 1), 2, 1, 0)
      RETURNING id INTO b2_id;
    EXCEPTION
      WHEN unique_violation THEN
        insert_ok := false;
        CALL ok('Duplicate booking BLOCKED by unique index — 23505 unique_violation raised ✓');
    END;

    IF insert_ok AND b2_id IS NOT NULL THEN
      CALL nok('Duplicate booking was ALLOWED — unique index NOT working!', b2_id::text);
      DELETE FROM bookings WHERE id = b2_id;
    END IF;

    -- Test: cancelled slot same time should be allowed
    BEGIN
      INSERT INTO bookings(court_id, court_name, date, time, status, user_id, players, hours, total_price)
      VALUES (test_court_id, '__safety_test__', '2099-12-31', '23:55', 'cancelled',
              (SELECT id FROM auth.users LIMIT 1), 2, 1, 0)
      RETURNING id INTO b2_id;
      CALL ok('Cancelled booking for same slot allowed (partial index correctly excludes cancelled)');
      DELETE FROM bookings WHERE id = b2_id;
    EXCEPTION WHEN unique_violation THEN
      CALL nok('Cancelled booking for same slot blocked — partial index is wrong!');
    END;

    -- Cleanup
    DELETE FROM bookings WHERE id = b1_id;
    CALL ok('Test bookings cleaned up');
  END IF;
END;

-- ══════════════════════════════════════════════════════════════════
RAISE NOTICE '';
RAISE NOTICE '══ 6. EXPIRY FUNCTIONAL TEST ═══════════════════════════════════';
-- ══════════════════════════════════════════════════════════════════

DECLARE
  stale_id uuid;
  status_after text;
BEGIN
  -- Insert a booking that is already expired
  INSERT INTO bookings(court_name, date, time, status, user_id, players, hours, total_price, expires_at)
  VALUES ('__expire_test__', '2020-01-01', '10:00', 'pending_payment',
          (SELECT id FROM auth.users LIMIT 1), 2, 1, 0,
          NOW() - interval '1 hour')
  RETURNING id INTO stale_id;

  IF stale_id IS NOT NULL THEN
    CALL ok('Inserted stale pending_payment booking', stale_id::text);

    -- Call the cleanup function
    PERFORM expire_stale_bookings();

    -- Check status
    SELECT status INTO status_after FROM bookings WHERE id = stale_id;

    IF status_after = 'expired' THEN
      CALL ok('expire_stale_bookings() correctly set status to "expired"');
    ELSE
      CALL nok('expire_stale_bookings() did NOT expire stale booking', 'status is: ' || COALESCE(status_after, 'NULL'));
    END IF;

    DELETE FROM bookings WHERE id = stale_id;
    CALL ok('Stale test booking cleaned up');
  ELSE
    CALL wrn('Could not insert stale test booking — check bookings table constraints');
  END IF;
EXCEPTION WHEN OTHERS THEN
  CALL nok('expire_stale_bookings() test failed', SQLERRM);
END;

-- ══════════════════════════════════════════════════════════════════
RAISE NOTICE '';
RAISE NOTICE '══ 7. WEBHOOK_EVENTS TABLE ══════════════════════════════════════';
-- ══════════════════════════════════════════════════════════════════

BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'webhook_events') THEN
    CALL ok('webhook_events table exists');

    -- Check unique constraint on onvo_event_id
    IF EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'webhook_events'
        AND indexdef ILIKE '%unique%'
        AND indexdef ILIKE '%onvo_event_id%'
    ) THEN
      CALL ok('onvo_event_id has UNIQUE index — duplicate webhook events blocked');
    ELSE
      CALL nok('onvo_event_id has NO unique index — duplicate webhook deliveries could double-confirm payments!');
    END IF;

    -- Check key columns exist
    DECLARE
      required_cols text[] := ARRAY['id','onvo_event_id','event_type','payload','processed','error'];
      col_name      text;
      col_exists    bool;
    BEGIN
      FOREACH col_name IN ARRAY required_cols LOOP
        SELECT EXISTS(
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'webhook_events' AND column_name = col_name
        ) INTO col_exists;

        IF col_exists THEN
          CALL ok('webhook_events.' || col_name || ' exists');
        ELSE
          CALL nok('webhook_events.' || col_name || ' MISSING');
        END IF;
      END LOOP;
    END;
  ELSE
    CALL nok('webhook_events table DOES NOT EXIST — run onvo-payments.sql migration!');
  END IF;
END;

-- ══════════════════════════════════════════════════════════════════
RAISE NOTICE '';
RAISE NOTICE '══ 8. BOOKINGS TABLE SCHEMA ════════════════════════════════════';
-- ══════════════════════════════════════════════════════════════════

BEGIN
  DECLARE
    col_name  text;
    col_type  text;
    important_cols text[] := ARRAY[
      'id','user_id','court_id','court_name','date','time','status',
      'hours','total_price','payment_id','expires_at','paid_at'
    ];
  BEGIN
    FOREACH col_name IN ARRAY important_cols LOOP
      SELECT data_type INTO col_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = col_name;

      IF col_type IS NOT NULL THEN
        CALL ok('bookings.' || col_name || ' (' || col_type || ')');
      ELSE
        CALL nok('bookings.' || col_name || ' MISSING — run migrations!');
      END IF;
    END LOOP;

    -- Check court_id type specifically (critical for unique index + RLS)
    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'court_id';

    IF col_type IN ('integer','bigint','smallint') THEN
      CALL ok('bookings.court_id is numeric (' || col_type || ') — consistent with owner_courts.id serial');
    ELSIF col_type IN ('uuid') THEN
      CALL ok('bookings.court_id is uuid — consistent with owner_courts.id uuid');
    ELSE
      CALL wrn('bookings.court_id type is unexpected: ' || COALESCE(col_type, 'NULL'));
    END IF;
  END;
END;

-- ══════════════════════════════════════════════════════════════════
RAISE NOTICE '';
RAISE NOTICE '══ FINAL REPORT ════════════════════════════════════════════════';
-- ══════════════════════════════════════════════════════════════════

RAISE NOTICE '';
RAISE NOTICE '  ✅ Passed:  %', v_pass;
RAISE NOTICE '  ❌ Failed:  %', v_fail;
RAISE NOTICE '  ⚠️  Warned:  %', v_warn;
RAISE NOTICE '';

IF v_fail = 0 AND v_warn = 0 THEN
  RAISE NOTICE '  🟢 ALL CHECKS PASSED — production-safety.sql applied correctly';
ELSIF v_fail = 0 THEN
  RAISE NOTICE '  🟡 All hard checks passed — review warnings (usually pg_cron)';
ELSIF v_fail <= 2 THEN
  RAISE NOTICE '  🟠 Minor failures — fix before launch';
ELSE
  RAISE NOTICE '  🔴 CRITICAL FAILURES — DO NOT launch until resolved';
END IF;

RAISE NOTICE '';

END $$;

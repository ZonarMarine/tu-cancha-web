-- ============================================================
-- TuCancha — Diagnose & fix courts that owners can't delete
-- Run in Supabase SQL Editor.
-- ============================================================
-- Symptom: an owner registered a court but the delete button does
-- nothing. Root cause: the court's owner_id is NULL or doesn't match
-- the logged-in user, so the RLS UPDATE policy (owner_id = auth.uid())
-- silently matches zero rows.

-- ── STEP 1: Find courts with a missing / orphaned owner_id ────
-- Run this first to SEE the problem rows.
SELECT
  oc.id,
  oc.name,
  oc.owner_id,
  oc.active,
  oc.deleted_at,
  oc.created_at
FROM public.owner_courts oc
WHERE oc.owner_id IS NULL
   OR oc.owner_id NOT IN (SELECT id FROM auth.users)
ORDER BY oc.created_at DESC;

-- ── STEP 2: Backfill owner_id for a specific court ────────────
-- Replace the two UUIDs below, then run.
-- Find your user id with:  SELECT id, email FROM auth.users;
--
-- UPDATE public.owner_courts
-- SET    owner_id = 'YOUR_AUTH_USER_UUID'
-- WHERE  id = 'THE_COURT_UUID';

-- ── STEP 3 (alternative): assign ALL orphaned courts to one owner ─
-- Only use if you are the sole owner and every orphaned court is yours.
--
-- UPDATE public.owner_courts
-- SET    owner_id = 'YOUR_AUTH_USER_UUID'
-- WHERE  owner_id IS NULL;

-- ── STEP 4 (admin hard delete): permanently remove a court ────
-- Service-role only (run from SQL editor, which bypasses RLS).
-- Bookings reference owner_court_id, so soft-delete is preferred,
-- but to fully purge a court with no bookings:
--
-- DELETE FROM public.owner_courts WHERE id = 'THE_COURT_UUID';
--
-- If it has bookings, soft-delete instead:
-- UPDATE public.owner_courts
-- SET deleted_at = now(), active = false
-- WHERE id = 'THE_COURT_UUID';

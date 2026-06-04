-- ============================================================
-- TuCancha — RLS fix migration
-- Run once in Supabase SQL editor or via CLI:
--   supabase db push
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. ENABLE RLS on owner_courts (was completely unprotected)
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.owner_courts ENABLE ROW LEVEL SECURITY;

-- Owners can read only their own courts
CREATE POLICY "owner_courts_select_own"
  ON public.owner_courts
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- Owners can insert courts for themselves
CREATE POLICY "owner_courts_insert_own"
  ON public.owner_courts
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Owners can update their own courts
CREATE POLICY "owner_courts_update_own"
  ON public.owner_courts
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Owners can soft-delete (or hard-delete) their own courts
CREATE POLICY "owner_courts_delete_own"
  ON public.owner_courts
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- ──────────────────────────────────────────────────────────────
-- 2. Service-role bypass (needed for server-side API routes)
-- ──────────────────────────────────────────────────────────────
-- The service role already bypasses RLS by default — no extra
-- policy needed. All API routes that mutate owner_courts use
-- createServiceClient() which runs as service role.

-- ──────────────────────────────────────────────────────────────
-- 3. Allow court owners to confirm / reject bookings on their courts
-- ──────────────────────────────────────────────────────────────
-- Owners need UPDATE on bookings where the booking references
-- one of their courts (via owner_court_id FK).
CREATE POLICY "bookings_owner_update"
  ON public.bookings
  FOR UPDATE
  TO authenticated
  USING (
    owner_court_id IN (
      SELECT id FROM public.owner_courts
      WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    owner_court_id IN (
      SELECT id FROM public.owner_courts
      WHERE owner_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────────
-- 4. Backfill payments.owner_id from owner_courts via bookings
-- ──────────────────────────────────────────────────────────────
-- Run after the owner_id column is confirmed to exist in payments.
-- This backfills existing payments that were created before the
-- owner_id was being written by the API.
UPDATE public.payments p
SET    owner_id = oc.owner_id
FROM   public.bookings b
JOIN   public.owner_courts oc ON oc.id = b.owner_court_id
WHERE  p.reservation_id = b.id
  AND  p.owner_id IS NULL
  AND  oc.owner_id IS NOT NULL;

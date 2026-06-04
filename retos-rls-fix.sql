-- ─────────────────────────────────────────────────────────────
-- Fix RLS on retos table
-- Run this in Supabase → SQL Editor
-- ─────────────────────────────────────────────────────────────

-- 1. Make sure RLS is enabled (in case it isn't yet)
ALTER TABLE retos ENABLE ROW LEVEL SECURITY;

-- 2. Anyone (logged in or not) can READ active/open retos
--    This makes the /juegos page work for all visitors.
DROP POLICY IF EXISTS "Public can read active retos" ON retos;
CREATE POLICY "Public can read active retos"
  ON retos
  FOR SELECT
  TO anon, authenticated
  USING (
    status IN (
      'open', 'looking_for_rival', 'pending_rival',
      'active', 'published', 'created'
    )
  );

-- 3. Anyone can INSERT a reto (logged-in or guest)
--    Necessary because crear-partido allows non-logged-in submissions.
DROP POLICY IF EXISTS "Anyone can create retos" ON retos;
CREATE POLICY "Anyone can create retos"
  ON retos
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 4. Owners can UPDATE their own retos
DROP POLICY IF EXISTS "Owners can update their retos" ON retos;
CREATE POLICY "Owners can update their retos"
  ON retos
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Owners can DELETE their own retos
DROP POLICY IF EXISTS "Owners can delete their retos" ON retos;
CREATE POLICY "Owners can delete their retos"
  ON retos
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- Verify: you should see 4 policies after running this
-- ─────────────────────────────────────────────────────────────
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'retos'
ORDER BY cmd;

-- ══════════════════════════════════════════════════════════════
--  Tu Cancha CR — Social Infrastructure Migration
--  Run this once in: Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════

-- ── 1. Notifications ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       text        NOT NULL DEFAULT 'general',
  title      text        NOT NULL,
  body       text        NOT NULL DEFAULT '',
  read       boolean     NOT NULL DEFAULT false,
  meta       jsonb       NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_notifs"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users_update_own_notifs"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Allow server-side inserts (service role bypasses RLS)
-- No INSERT policy needed for anon/authenticated — notifications
-- are created server-side via service role.

-- ── 2. Team messages ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name   text        NOT NULL,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text        NOT NULL DEFAULT 'Jugador',
  body        text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read messages (needed for team visibility)
CREATE POLICY "auth_read_team_messages"
  ON public.team_messages FOR SELECT TO authenticated
  USING (true);

-- Users can only insert their own messages
CREATE POLICY "auth_insert_own_messages"
  ON public.team_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ── 3. Player status column ───────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS player_status text NOT NULL DEFAULT 'offline';

-- ── 4. Enable realtime on new tables ─────────────────────────
-- Run in Supabase Dashboard → Database → Replication → Add tables:
-- OR via SQL (Supabase-specific):
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;

-- ══════════════════════════════════════════════════════════════
-- Done. Realtime chat + notifications + player status active.
-- ══════════════════════════════════════════════════════════════

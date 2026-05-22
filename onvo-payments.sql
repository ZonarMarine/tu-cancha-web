-- ══════════════════════════════════════════════════════════════
--  TuCancha CR — ONVO Pay Payment Architecture
--  Run in: Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════

-- ── 1. Payments — master ledger ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.payments (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- References
  reservation_id    uuid        REFERENCES public.bookings(id)    ON DELETE SET NULL,
  match_id          uuid        REFERENCES public.retos(id)       ON DELETE SET NULL,
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id          uuid        REFERENCES auth.users(id)         ON DELETE SET NULL,
  -- ONVO identifiers
  onvo_session_id   text        UNIQUE,
  onvo_payment_id   text        UNIQUE,
  onvo_checkout_url text,
  -- Amounts (CRC)
  gross_amount      integer     NOT NULL DEFAULT 0,
  platform_fee      integer     NOT NULL DEFAULT 0,
  onvo_fee_estimate integer     NOT NULL DEFAULT 0,
  owner_net_amount  integer     NOT NULL DEFAULT 0,
  currency          text        NOT NULL DEFAULT 'CRC',
  -- Payment details
  payment_method    text,                     -- card, sinpe, etc.
  status            text        NOT NULL DEFAULT 'pending_payment',
  -- Status: pending_payment | partially_paid | paid | confirmed
  --         failed | expired | cancelled | refunded
  failure_reason    text,
  paid_at           timestamptz,
  expires_at        timestamptz,
  -- Split payment
  is_split          boolean     NOT NULL DEFAULT false,
  split_count       integer     NOT NULL DEFAULT 1,
  split_paid_count  integer     NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_payments"
  ON public.payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = owner_id);

-- ── 2. Payment splits — per-player shares ─────────────────────
CREATE TABLE IF NOT EXISTS public.payment_splits (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id      uuid        NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  user_id         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  player_name     text        NOT NULL DEFAULT 'Jugador',
  player_email    text,
  amount          integer     NOT NULL DEFAULT 0,
  -- ONVO per-player checkout
  onvo_session_id text        UNIQUE,
  onvo_checkout_url text,
  status          text        NOT NULL DEFAULT 'pending_payment',
  paid_at         timestamptz,
  reminder_sent_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_splits"
  ON public.payment_splits FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ── 3. Webhook events — immutable audit log ───────────────────
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  onvo_event_id   text        UNIQUE,
  event_type      text        NOT NULL,     -- payment_success | payment_failed | refund_success | checkout_expired
  payload         jsonb       NOT NULL DEFAULT '{}',
  processed       boolean     NOT NULL DEFAULT false,
  processed_at    timestamptz,
  error           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Only service role writes to this table — no RLS needed for client

-- ── 4. Add payment columns to bookings ────────────────────────
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_id   uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS expires_at   timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at      timestamptz;

-- Status values for bookings.status:
-- pending_payment | partially_paid | paid | confirmed | failed | expired | cancelled | refunded

-- ── 5. Indexes for performance ────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_payments_reservation ON public.payments(reservation_id);
CREATE INDEX IF NOT EXISTS idx_payments_user        ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_owner       ON public.payments(owner_id);
CREATE INDEX IF NOT EXISTS idx_payments_status      ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_onvo_sess   ON public.payments(onvo_session_id);
CREATE INDEX IF NOT EXISTS idx_splits_payment       ON public.payment_splits(payment_id);
CREATE INDEX IF NOT EXISTS idx_splits_user          ON public.payment_splits(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_event_type  ON public.webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhooks_processed   ON public.webhook_events(processed);

-- ── 6. Enable realtime on payments ────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_splits;

-- ── 7. Platform fee helper function ───────────────────────────
-- Platform takes 8% of gross. ONVO estimated 2.9% + 300 CRC per transaction.
CREATE OR REPLACE FUNCTION public.calculate_fees(gross integer)
RETURNS TABLE(platform_fee integer, onvo_fee integer, owner_net integer)
LANGUAGE sql IMMUTABLE AS $$
  SELECT
    (gross * 0.08)::integer                          AS platform_fee,
    (gross * 0.029 + 300)::integer                   AS onvo_fee,
    (gross - (gross*0.08)::integer - (gross*0.029+300)::integer) AS owner_net
$$;

-- ══════════════════════════════════════════════════════════════
-- Done. Run this once, then set ONVO_SECRET_KEY env variable.
-- ══════════════════════════════════════════════════════════════

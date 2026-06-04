-- ============================================================
-- TuCancha — Booking confirmation email tracking
-- Run in Supabase SQL editor.
-- ============================================================

-- Add dedup timestamp: once set, the confirmation email will never be sent again
-- for this booking, even on webhook replay.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMPTZ;

-- Optional index for finding bookings that still need an email (admin resend tool)
CREATE INDEX IF NOT EXISTS idx_bookings_email_pending
  ON public.bookings (id)
  WHERE confirmation_email_sent_at IS NULL
    AND status IN ('confirmed', 'paid');

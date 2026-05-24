-- ─────────────────────────────────────────────────────────────
-- TuCancha – notifications system
-- Run once in Supabase SQL editor
-- ─────────────────────────────────────────────────────────────

-- 1. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       text        NOT NULL DEFAULT 'general',
  title      text        NOT NULL,
  body       text,
  read       boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 2. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- 3. Row-level security: users only see their own notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own notifications" ON notifications;
CREATE POLICY "own notifications" ON notifications
  FOR ALL USING (auth.uid() = user_id);

-- 4. Trigger: notify reto creator when their reto is accepted
CREATE OR REPLACE FUNCTION fn_notify_reto_accepted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'accepted' AND NEW.user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body)
    VALUES (
      NEW.user_id,
      'rival_accepted',
      '¡Tu reto fue aceptado!',
      TRIM(
        COALESCE(NEW.court_name, NEW.location, 'Cancha') ||
        CASE WHEN NEW.time IS NOT NULL THEN ' · ' || NEW.time ELSE '' END ||
        CASE WHEN NEW.format IS NOT NULL THEN ' · ' || NEW.format ELSE '' END
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_reto_accepted ON retos;
CREATE TRIGGER trg_notify_reto_accepted
  AFTER UPDATE ON retos
  FOR EACH ROW EXECUTE FUNCTION fn_notify_reto_accepted();

-- 5. Trigger: notify player when their booking is confirmed
CREATE OR REPLACE FUNCTION fn_notify_booking_confirmed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.status IN ('confirmed', 'paid')
     AND NEW.user_id IS NOT NULL
  THEN
    INSERT INTO notifications (user_id, type, title, body)
    VALUES (
      NEW.user_id,
      'reservation',
      'Reserva confirmada ✓',
      TRIM(
        COALESCE(NEW.court_name, 'Cancha') ||
        CASE WHEN NEW.date IS NOT NULL THEN ' · ' || NEW.date::text ELSE '' END ||
        CASE WHEN NEW.time IS NOT NULL THEN ' · ' || NEW.time ELSE '' END
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_booking_confirmed ON bookings;
CREATE TRIGGER trg_notify_booking_confirmed
  AFTER UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION fn_notify_booking_confirmed();

-- 6. Trigger: notify player when their booking is cancelled
CREATE OR REPLACE FUNCTION fn_notify_booking_cancelled()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'cancelled' AND NEW.user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body)
    VALUES (
      NEW.user_id,
      'booking_cancelled',
      'Reserva cancelada',
      COALESCE(NEW.court_name, 'Cancha') ||
      CASE WHEN NEW.date IS NOT NULL THEN ' · ' || NEW.date::text ELSE '' END
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_booking_cancelled ON bookings;
CREATE TRIGGER trg_notify_booking_cancelled
  AFTER UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION fn_notify_booking_cancelled();

-- ─────────────────────────────────────────────────────────────
-- Done. Notifications will now appear automatically when:
--   · A reto is accepted
--   · A booking is confirmed or paid
--   · A booking is cancelled
-- ─────────────────────────────────────────────────────────────

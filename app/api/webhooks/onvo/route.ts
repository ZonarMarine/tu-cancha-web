/**
 * POST /api/webhooks/onvo
 *
 * Handles ONVO Pay webhook events. Idempotent — safe to replay.
 * The webhook_events table is an immutable audit log.
 *
 * Events handled:
 *   checkout-session.succeeded → booking confirmed, owner notified
 *   payment-intent.succeeded   → payment confirmed (direct integration)
 *   payment-intent.failed      → booking/payment marked failed
 *   payment-intent.deferred    → SINPE pending, booking stays partially_paid
 */
import { NextRequest, NextResponse }                 from 'next/server';
import { createServiceClient }                        from '@/lib/supabase-server';
import { verifyWebhookSignature, OnvoWebhookPayload } from '@/lib/onvo';

export async function POST(req: NextRequest) {
  const rawBody     = await req.text();
  const headerSecret = req.headers.get('x-webhook-secret') ?? '';

  // ── Signature verification ────────────────────────────────────────────────
  const sandboxMode = process.env.ONVO_SANDBOX === 'true';
  if (!sandboxMode && !verifyWebhookSignature(rawBody, headerSecret)) {
    console.warn('ONVO webhook: invalid X-Webhook-Secret');
    return NextResponse.json({ error: 'Invalid secret.' }, { status: 401 });
  }

  let event: OnvoWebhookPayload;
  try {
    event = JSON.parse(rawBody) as OnvoWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // ── Idempotency: use event type + session/payment id as dedup key ─────────
  const dedupKey = `${event.type}::${event.data?.id ?? event.data?.session_id ?? event.data?.payment_intent_id ?? JSON.stringify(event.data).slice(0, 64)}`;

  const { data: existing } = await supabase
    .from('webhook_events')
    .select('id, processed')
    .eq('onvo_event_id', dedupKey)
    .maybeSingle();

  if (existing?.processed) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { data: eventRow } = await supabase
    .from('webhook_events')
    .upsert(
      { onvo_event_id: dedupKey, event_type: event.type, payload: event },
      { onConflict: 'onvo_event_id' },
    )
    .select('id')
    .single();

  try {
    await handleEvent(supabase, event);

    await supabase
      .from('webhook_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('id', eventRow?.id);

    return NextResponse.json({ ok: true });

  } catch (err: any) {
    console.error('ONVO webhook handler error:', err);

    await supabase
      .from('webhook_events')
      .update({ error: err.message })
      .eq('id', eventRow?.id);

    // Return 200 so ONVO doesn't retry endlessly — we logged the error
    return NextResponse.json({ ok: false, error: err.message });
  }
}

// ─── Event handlers ──────────────────────────────────────────────────────────

async function handleEvent(
  supabase: ReturnType<typeof createServiceClient>,
  event: OnvoWebhookPayload,
) {
  const d = event.data ?? {};

  // Session ID is the ONVO checkout session id we stored in payments.onvo_session_id
  const sessionId  = d.id ?? d.session_id ?? null;
  const paymentId  = d.payment_intent_id ?? d.payment_id ?? null;

  switch (event.type) {

    // ── Checkout session completed (user paid via hosted checkout) ───────────
    case 'checkout-session.succeeded': {
      if (!sessionId) break;
      const now = new Date().toISOString();

      const { data: payment } = await findPaymentBySession(supabase, sessionId);
      if (!payment) { console.warn('No payment found for session', sessionId); break; }

      await supabase.from('payments').update({
        status:          'paid',
        onvo_payment_id: paymentId ?? null,
        payment_method:  d.payment_method ?? null,
        paid_at:         now,
        updated_at:      now,
      }).eq('id', payment.id);

      if (payment.reservation_id) {
        await supabase.from('bookings')
          .update({ status: 'confirmed', paid_at: now })
          .eq('id', payment.reservation_id);

        await notifyOwner(supabase, payment.reservation_id, payment.id);
      }
      break;
    }

    // ── Direct payment intent succeeded ─────────────────────────────────────
    case 'payment-intent.succeeded': {
      const now = new Date().toISOString();

      // Try to find by payment intent id first, then fall back to session
      const { data: payment } = paymentId
        ? await findPaymentByOnvoPaymentId(supabase, paymentId)
        : await findPaymentBySession(supabase, sessionId ?? '');

      if (!payment) break;

      await supabase.from('payments').update({
        status:          'paid',
        onvo_payment_id: paymentId ?? null,
        payment_method:  d.payment_method ?? null,
        paid_at:         now,
        updated_at:      now,
      }).eq('id', payment.id);

      if (payment.reservation_id) {
        await supabase.from('bookings')
          .update({ status: 'confirmed', paid_at: now })
          .eq('id', payment.reservation_id);

        await notifyOwner(supabase, payment.reservation_id, payment.id);
      }
      break;
    }

    // ── Payment failed ───────────────────────────────────────────────────────
    case 'payment-intent.failed': {
      const now = new Date().toISOString();

      const { data: payment } = sessionId
        ? await findPaymentBySession(supabase, sessionId)
        : { data: null };

      if (!payment) break;

      await supabase.from('payments').update({
        status:         'failed',
        failure_reason: d.failure_reason ?? d.decline_reason ?? 'Pago rechazado.',
        updated_at:     now,
      }).eq('id', payment.id);

      if (payment.reservation_id) {
        await supabase.from('bookings')
          .update({ status: 'failed' })
          .eq('id', payment.reservation_id);
      }
      break;
    }

    // ── SINPE deferred (mobile transfer pending) ─────────────────────────────
    case 'payment-intent.deferred': {
      const now = new Date().toISOString();
      const { data: payment } = sessionId
        ? await findPaymentBySession(supabase, sessionId)
        : { data: null };

      if (!payment) break;

      await supabase.from('payments').update({
        status:     'partially_paid',
        updated_at: now,
      }).eq('id', payment.id);

      if (payment.reservation_id) {
        await supabase.from('bookings')
          .update({ status: 'partially_paid' })
          .eq('id', payment.reservation_id);
      }
      break;
    }

    default:
      // Log unhandled event types but don't fail
      console.log('ONVO unhandled event:', event.type);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function findPaymentBySession(
  supabase: ReturnType<typeof createServiceClient>,
  sessionId: string,
) {
  return supabase
    .from('payments')
    .select('id, reservation_id, is_split')
    .eq('onvo_session_id', sessionId)
    .maybeSingle();
}

async function findPaymentByOnvoPaymentId(
  supabase: ReturnType<typeof createServiceClient>,
  paymentId: string,
) {
  return supabase
    .from('payments')
    .select('id, reservation_id, is_split')
    .eq('onvo_payment_id', paymentId)
    .maybeSingle();
}

async function notifyOwner(
  supabase: ReturnType<typeof createServiceClient>,
  bookingId: string,
  paymentId: string,
) {
  const { data: booking } = await supabase
    .from('bookings')
    .select('court_name, date, time, user_id')
    .eq('id', bookingId)
    .single();

  if (!booking) return;

  try {
    await supabase.from('notifications').insert({
      type:       'booking_confirmed',
      booking_id: bookingId,
      payment_id: paymentId,
      user_id:    booking.user_id,
      message:    `Reserva confirmada — ${booking.court_name} · ${booking.date} ${booking.time}`,
      read:       false,
    });
  } catch {
    // notifications table may not exist yet — silent fail
  }
}

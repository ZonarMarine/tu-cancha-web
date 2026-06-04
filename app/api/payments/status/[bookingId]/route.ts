/**
 * GET /api/payments/status/[bookingId]
 *
 * Returns the current payment + booking status for polling from the client.
 * Access is allowed if:
 *   1. No auth header (backward compat — ONVO redirect lands here unauthenticated)
 *   2. Authenticated user is the booking owner (user_id match)
 *   3. Authenticated user owns the court referenced by the booking (owner check)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient }               from '@supabase/supabase-js';
import { createServiceClient }        from '@/lib/supabase-server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const { bookingId } = await params;

  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId requerido.' }, { status: 400 });
  }

  // Resolve caller identity if a Bearer token is present.
  // No token = unauthenticated access allowed (post-ONVO redirect use-case).
  let callerId: string | null = null;
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token) {
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    callerId = user?.id ?? null;
  }

  const supabase = createServiceClient();

  // Step 1: fetch the booking (simple columns only — never fails on schema issues)
  const { data: booking, error: bookingErr } = await supabase
    .from('bookings')
    .select('id, status, date, time, hours, court_name, total_price, expires_at, paid_at, payment_id, user_id, owner_court_id')
    .eq('id', bookingId)
    .single();

  if (bookingErr || !booking) {
    console.error('Booking lookup error:', bookingErr?.message, '| id:', bookingId);
    return NextResponse.json({ error: 'Reserva no encontrada.' }, { status: 404 });
  }

  // If a logged-in caller is present, verify they own this booking or its court.
  // Skip check when callerId is null (unauthenticated post-payment redirect).
  if (callerId) {
    const isBookingOwner = booking.user_id === callerId;
    let isCourtOwner = false;
    if (!isBookingOwner && booking.owner_court_id) {
      const { data: court } = await supabase
        .from('owner_courts')
        .select('owner_id')
        .eq('id', booking.owner_court_id)
        .single();
      isCourtOwner = court?.owner_id === callerId;
    }
    if (!isBookingOwner && !isCourtOwner) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }
  }

  // Strip internal columns before responding
  const { user_id: _uid, owner_court_id: _ocid, ...bookingPublic } = booking as any;

  // Step 2: fetch the payment record separately — if it fails, still return the booking
  let payments = null;
  if (booking.payment_id) {
    const { data: payment } = await supabase
      .from('payments')
      .select('id, status, gross_amount, platform_fee, onvo_checkout_url, payment_method, paid_at, failure_reason, is_split, split_count, split_paid_count')
      .eq('id', booking.payment_id)
      .maybeSingle();

    if (payment) {
      // Step 3: fetch splits if this is a split payment
      let payment_splits: unknown[] = [];
      if (payment.is_split) {
        const { data: splits } = await supabase
          .from('payment_splits')
          .select('id, player_name, player_email, amount, status, onvo_checkout_url, paid_at')
          .eq('payment_id', payment.id);
        payment_splits = splits ?? [];
      }
      payments = { ...payment, payment_splits };
    }
  }

  return NextResponse.json({ ...bookingPublic, payments });
}

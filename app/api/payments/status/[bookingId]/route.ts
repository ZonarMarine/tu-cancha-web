/**
 * GET /api/payments/status/[bookingId]
 *
 * Returns the current payment + booking status for polling from the client.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient }        from '@/lib/supabase-server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const { bookingId } = await params;

  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId requerido.' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Step 1: fetch the booking (simple columns only — never fails on schema issues)
  const { data: booking, error: bookingErr } = await supabase
    .from('bookings')
    .select('id, status, date, time, hours, court_name, total_price, expires_at, paid_at, payment_id')
    .eq('id', bookingId)
    .single();

  if (bookingErr || !booking) {
    console.error('Booking lookup error:', bookingErr?.message, '| id:', bookingId);
    return NextResponse.json({ error: 'Reserva no encontrada.' }, { status: 404 });
  }

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

  return NextResponse.json({ ...booking, payments });
}

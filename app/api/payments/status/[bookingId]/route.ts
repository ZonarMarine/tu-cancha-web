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

  const { data: booking, error } = await supabase
    .from('bookings')
    .select(`
      id, status, date, time, hours, court_name, total_price, expires_at, paid_at,
      payment_id,
      payments (
        id, status, gross_amount, platform_fee, onvo_fee_estimate, owner_net_amount,
        onvo_checkout_url, payment_method, paid_at, failure_reason, is_split, split_count, split_paid_count,
        payment_splits ( id, player_name, player_email, amount, status, onvo_checkout_url, paid_at )
      )
    `)
    .eq('id', bookingId)
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: 'Reserva no encontrada.' }, { status: 404 });
  }

  return NextResponse.json(booking);
}

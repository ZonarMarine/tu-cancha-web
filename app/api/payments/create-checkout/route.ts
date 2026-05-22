/**
 * POST /api/payments/create-checkout
 *
 * Creates a pending booking + ONVO hosted checkout session.
 * Returns { checkoutUrl, bookingId, paymentId }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient }        from '@/lib/supabase-server';
import { createCheckoutSession, calculateFees } from '@/lib/onvo';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      courtId,
      courtName,
      date,        // 'YYYY-MM-DD'
      time,        // 'HH:MM'
      hours,
      players,
      basePrice,
      userId,
      userName,
      userEmail,
      isSplit,
      splitCount,
    } = body;

    // Validate required fields
    if (!courtName || !date || !time || !hours || !basePrice || !userId) {
      return NextResponse.json({ error: 'Campos requeridos faltantes.' }, { status: 400 });
    }

    const gross = Math.round(basePrice * hours);
    const fees  = calculateFees(gross);

    const supabase = createServiceClient();

    // 1. Insert booking as pending_payment
    const bookingPayload: Record<string, unknown> = {
      user_id:     userId,
      court_name:  courtName,
      date,
      time,
      hours,
      players:     players ?? 10,
      base_price:  basePrice,
      service_fee: 0,
      total_price: gross,
      status:      'pending_payment',
      expires_at:  new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };

    const maybeInt = Number(courtId);
    if (!isNaN(maybeInt) && Number.isInteger(maybeInt)) {
      bookingPayload.court_id = maybeInt;
    }

    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .insert(bookingPayload)
      .select('id')
      .single();

    if (bookingErr || !booking) {
      console.error('Booking insert error:', bookingErr);
      return NextResponse.json({ error: bookingErr?.message ?? 'Error creando reserva.' }, { status: 500 });
    }

    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tucanchacr.com';

    // 2. Create ONVO checkout session
    const session = await createCheckoutSession({
      amount:       gross,
      description:  `TuCancha — ${courtName} · ${date} ${time} (${hours}h)`,
      successUrl:   `${origin}/reserva/${booking.id}?status=success`,
      cancelUrl:    `${origin}/reserva/${booking.id}?status=cancelled`,
      customerEmail: userEmail,
      customerName:  userName,
      metadata: {
        booking_id: booking.id,
        user_id:    userId,
        court_name: courtName,
      },
    });

    // 3. Insert payment record
    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .insert({
        reservation_id:    booking.id,
        user_id:           userId,
        onvo_session_id:   session.id,
        onvo_checkout_url: session.checkout_url,
        gross_amount:      gross,
        platform_fee:      fees.platform_fee,
        onvo_fee_estimate: fees.onvo_fee,
        owner_net_amount:  fees.owner_net,
        currency:          'CRC',
        status:            'pending_payment',
        expires_at:        session.expires_at,
        is_split:          isSplit ?? false,
        split_count:       splitCount ?? 1,
      })
      .select('id')
      .single();

    if (payErr || !payment) {
      console.error('Payment insert error:', payErr);
      // Booking created but payment record failed — still redirect, webhook will reconcile
    }

    // 4. Link payment record back to booking
    if (payment) {
      await supabase
        .from('bookings')
        .update({ payment_id: payment.id })
        .eq('id', booking.id);
    }

    return NextResponse.json({
      checkoutUrl: session.checkout_url,
      bookingId:   booking.id,
      paymentId:   payment?.id ?? null,
      sessionId:   session.id,
    });

  } catch (err: any) {
    console.error('create-checkout error:', err);
    return NextResponse.json(
      { error: err.message ?? 'Error interno del servidor.' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/payments/create-checkout
 *
 * Creates a pending booking + ONVO hosted checkout session.
 * Returns { checkoutUrl, bookingId, paymentId }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient }               from '@supabase/supabase-js';
import { createServiceClient }        from '@/lib/supabase-server';
import { createCheckoutSession, calculateFees } from '@/lib/onvo';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      courtId,
      courtName,   // display hint only — authoritative name comes from the DB
      date,        // 'YYYY-MM-DD'
      time,        // 'HH:MM'
      hours,
      players,
      isSplit,
      splitCount,
    } = body;

    // Validate required fields. courtId is now REQUIRED — the price is looked up
    // server-side from owner_courts, never trusted from the client (P0-1 fix).
    if (!courtId || !date || !time || hours == null) {
      return NextResponse.json({ error: 'Campos requeridos faltantes.' }, { status: 400 });
    }

    // hours must be a positive integer within a sane range (prevents fractional
    // or zero-hour bookings that would understate the charged amount).
    const numHours = Number(hours);
    if (!Number.isInteger(numHours) || numHours < 1 || numHours > 24) {
      return NextResponse.json({ error: 'Duración inválida.' }, { status: 400 });
    }

    // Verify JWT and extract user identity server-side (prevents IDOR).
    // Use an anon-key client with the user JWT injected as the Bearer — this is
    // the correct Supabase pattern for server-side JWT validation. The service
    // role client is only used for the subsequent DB writes (bypasses RLS).
    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    // Service client for all subsequent DB operations (bypasses RLS)
    const supabase = createServiceClient();

    const userId    = user.id;
    const userEmail = user.email;
    const userName  = (user.user_metadata?.name as string | undefined) ?? user.email;

    // ── P0-1: authoritative price comes from the DB, never the client ────────
    // Look up the court's real base_price and owner. The client no longer sends
    // (or, if it does, we ignore) the price — this closes the "pay ₡1 for any
    // court" exploit. Also rejects bookings against deleted/unknown courts.
    const { data: courtRow, error: courtErr } = await supabase
      .from('owner_courts')
      .select('owner_id, base_price, name, deleted_at, active')
      .eq('id', courtId)
      .single();

    if (courtErr || !courtRow) {
      return NextResponse.json({ error: 'Cancha no encontrada.' }, { status: 404 });
    }
    if (courtRow.deleted_at || courtRow.active === false) {
      return NextResponse.json({ error: 'Esta cancha no está disponible.' }, { status: 409 });
    }

    const dbBasePrice = Number(courtRow.base_price);
    if (!Number.isFinite(dbBasePrice) || dbBasePrice <= 0) {
      return NextResponse.json({ error: 'Esta cancha no tiene un precio configurado.' }, { status: 409 });
    }

    const courtOwnerId: string | null = courtRow.owner_id ?? null;
    // Authoritative court name from the DB (fall back to the client hint only if absent).
    const resolvedCourtName: string = courtRow.name ?? courtName ?? 'Cancha';

    const gross = Math.round(dbBasePrice * numHours);
    const fees  = calculateFees(gross);

    // 1. Insert booking as pending_payment.
    // This route is the SINGLE source of booking creation (P0-2 fix): the mobile
    // client no longer inserts its own row. owner_court_id and expires_at are
    // always set here so the slot is reaped by expire_stale_bookings() if abandoned.
    const bookingPayload: Record<string, unknown> = {
      user_id:        userId,
      owner_court_id: courtId,   // correct UUID FK to owner_courts(id)
      court_name:     resolvedCourtName,
      date,
      time,
      hours:          numHours,
      players:        players ?? 10,
      base_price:     dbBasePrice,   // authoritative DB price, not client-supplied
      service_fee:    0,
      total_price:    gross,
      status:         'pending_payment',
      expires_at:     new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };

    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .insert(bookingPayload)
      .select('id')
      .single();

    if (bookingErr || !booking) {
      // 23505 = unique_violation on idx_bookings_*_slot → the slot is already taken.
      const isDuplicate = bookingErr?.code === '23505';
      if (isDuplicate) {
        return NextResponse.json(
          { error: 'SLOT_TAKEN', message: 'Este horario ya fue reservado. Elegí otro horario.' },
          { status: 409 },
        );
      }
      console.error('Booking insert error:', bookingErr);
      return NextResponse.json({ error: bookingErr?.message ?? 'Error creando reserva.' }, { status: 500 });
    }

    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tucanchacr.com';

    // 2. Create ONVO checkout session
    // ONVO expects unitAmount in the smallest currency unit (centimos).
    // CRC: ₡25,000 → pass 2,500,000 centimos so ONVO displays ₡25,000.
    const session = await createCheckoutSession({
      amount:       gross * 100,
      description:  `TuCancha — ${resolvedCourtName} · ${date} ${time} (${numHours}h)`,
      successUrl:   `${origin}/reserva/${booking.id}?status=success`,
      cancelUrl:    `${origin}/reserva/${booking.id}?status=cancelled`,
      customerEmail: userEmail,
      customerName:  userName,
      metadata: {
        booking_id: booking.id,
        user_id:    userId,
        court_name: resolvedCourtName,
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
        owner_id:          courtOwnerId,
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

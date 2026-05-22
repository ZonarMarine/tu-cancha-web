/**
 * POST /api/payments/create-split
 *
 * Creates individual ONVO checkout sessions for each split-payment player.
 * Call after /create-checkout when isSplit=true.
 * Body: { paymentId, bookingId, players: [{name, email, amount}] }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient }        from '@/lib/supabase-server';
import { createCheckoutSession }      from '@/lib/onvo';

export async function POST(req: NextRequest) {
  try {
    const { paymentId, bookingId, players } = await req.json();

    if (!paymentId || !bookingId || !Array.isArray(players) || players.length === 0) {
      return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const origin   = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tucanchacr.com';

    // Fetch parent payment to get description context
    const { data: payment } = await supabase
      .from('payments')
      .select('gross_amount, split_count')
      .eq('id', paymentId)
      .single();

    const results = await Promise.allSettled(
      players.map(async (p: { name: string; email?: string; amount: number; userId?: string }) => {
        // Create ONVO checkout for this player
        const session = await createCheckoutSession({
          amount:        p.amount,
          description:   `TuCancha — parte de ${p.name}`,
          successUrl:    `${origin}/reserva/${bookingId}?split=success&player=${encodeURIComponent(p.name)}`,
          cancelUrl:     `${origin}/reserva/${bookingId}?split=cancelled`,
          customerEmail: p.email,
          customerName:  p.name,
          metadata: {
            payment_id: paymentId,
            booking_id: bookingId,
            player_name: p.name,
          },
        });

        // Store the split record
        const { data: split } = await supabase
          .from('payment_splits')
          .insert({
            payment_id:        paymentId,
            user_id:           p.userId ?? null,
            player_name:       p.name,
            player_email:      p.email ?? null,
            amount:            p.amount,
            onvo_session_id:   session.id,
            onvo_checkout_url: session.checkout_url,
            status:            'pending_payment',
          })
          .select('id')
          .single();

        return { split, session };
      }),
    );

    const splits = results
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<any>).value);

    const failed = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({ splits, failed });

  } catch (err: any) {
    console.error('create-split error:', err);
    return NextResponse.json(
      { error: err.message ?? 'Error interno.' },
      { status: 500 },
    );
  }
}

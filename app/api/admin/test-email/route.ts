/**
 * GET /api/admin/test-email?to=you@example.com
 *
 * Sends a test TuCancha confirmation email to the given address.
 * ONLY works in development (NODE_ENV !== 'production').
 * Use this to verify the template renders correctly in real email clients.
 *
 * Example:
 *   curl "http://localhost:3000/api/admin/test-email?to=you@gmail.com"
 */
import { NextRequest, NextResponse }       from 'next/server';
import { sendTestConfirmationEmail }       from '@/lib/email/sendBookingConfirmation';

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production.' }, { status: 403 });
  }

  const to = req.nextUrl.searchParams.get('to');
  if (!to || !to.includes('@')) {
    return NextResponse.json({ error: 'Provide ?to=email@example.com' }, { status: 400 });
  }

  const result = await sendTestConfirmationEmail(to);
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}

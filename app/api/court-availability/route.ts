/**
 * GET /api/court-availability?courtId=<uuid>&date=<YYYY-MM-DD>
 *
 * Returns the list of time slots already taken for a given court + date.
 * Public endpoint — only exposes booked times, not user identity.
 * Blocks any booking status that holds a slot (pending_payment, paid, confirmed).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient }        from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const courtId = searchParams.get('courtId');
  const date    = searchParams.get('date');   // YYYY-MM-DD

  if (!courtId || !date) {
    return NextResponse.json({ error: 'courtId and date are required.' }, { status: 400 });
  }

  // Basic date format validation
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD.' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Fetch all active bookings for this court + date.
  // Excludes failed / cancelled / expired — those free the slot back up.
  const { data, error } = await supabase
    .from('bookings')
    .select('time')
    .eq('owner_court_id', courtId)
    .eq('date', date)
    .not('status', 'in', '("failed","cancelled","expired")');

  if (error) {
    console.error('court-availability error:', error.message);
    // Return empty array on error — better to let user try than to block all slots
    return NextResponse.json({ bookedTimes: [] });
  }

  const bookedTimes = (data ?? []).map(r => r.time as string);
  return NextResponse.json({ bookedTimes });
}

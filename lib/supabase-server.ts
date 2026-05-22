/**
 * Server-side Supabase client using the SERVICE ROLE key.
 * Only import this in Server Components, API routes, and server actions.
 * NEVER expose to the browser.
 */
import { createClient } from '@supabase/supabase-js';

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

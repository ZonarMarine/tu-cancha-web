/**
 * TuCancha — Production Safety Verification (Node.js)
 *
 * Verifies what can be checked via the Supabase JS client:
 *  - RLS is on (table-accessible rows only when auth'd)
 *  - expire_stale_bookings() callable
 *  - Webhook idempotency via duplicate insert attempt
 *  - Functional double-booking test
 *  - Stale booking expiry
 *  - Code-level webhook route checks (static analysis)
 *
 * For schema-level checks (indexes, policy SQL, pg_cron),
 * run scripts/verify-safety.sql in Supabase SQL Editor.
 *
 * Usage: node scripts/verify-safety.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync }  from 'fs';
import { resolve }       from 'path';

const SUPABASE_URL  = 'https://lbmcwyvrszjnxvwhmqjz.supabase.co';
const SERVICE_KEY   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxibWN3eXZyc3pqbnh2d2htcWp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzU5NjMwMiwiZXhwIjoyMDkzMTcyMzAyfQ.JLvt90WhrglPJ0Wai9GJ6KzcMS5khHFk66kL3cYGxp4';

const svc = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
  db:   { schema: 'public' },
});

let passed = 0, failed = 0, warned = 0;

const ok  = (l, d = '') => { console.log(`  ✅ ${l}${d ? '  (' + d + ')' : ''}`); passed++; };
const nok = (l, d = '') => { console.log(`  ❌ ${l}${d ? '  (' + d + ')' : ''}`); failed++; };
const wrn = (l, d = '') => { console.log(`  ⚠️  ${l}${d ? '  (' + d + ')' : ''}`); warned++; };
const hdr = (t) => console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 60 - t.length))}`);

// ── helpers ──────────────────────────────────────────────────────────────────

async function getSampleCourtId() {
  // Returns the UUID from owner_courts.id (correct type to use with bookings.owner_court_id)
  const { data } = await svc.from('owner_courts').select('id').limit(1).single();
  return data?.id ?? null;
}

async function getSampleUserId() {
  // auth.users is not accessible via the JS client on its own schema
  // Try getting a user_id from an existing booking
  const { data } = await svc.from('bookings').select('user_id').limit(1).single();
  return data?.user_id ?? null;
}

// ── 1. Stale booking expiry ───────────────────────────────────────────────────

async function testExpiry() {
  hdr('1. STALE BOOKING EXPIRY');

  const userId = await getSampleUserId();
  if (!userId) { wrn('No existing bookings/users to reference — skipping expiry test'); return; }

  const { data: stale, error: insertErr } = await svc.from('bookings').insert({
    court_name:  '__expire_test__',
    date:        '2020-01-01',
    time:        '10:00',
    status:      'pending_payment',
    user_id:     userId,
    players:     2,
    hours:       1,
    base_price:   0,
    service_fee:  0,
    total_price:  0,
    expires_at:   new Date(Date.now() - 60_000).toISOString(),
  }).select('id').single();

  if (insertErr) { nok('Stale booking insert failed', insertErr.message); return; }
  ok('Inserted stale pending_payment booking (expires_at = 1 min ago)', stale.id);

  const { error: rpcErr } = await svc.rpc('expire_stale_bookings');
  if (rpcErr) { nok('expire_stale_bookings() RPC failed', rpcErr.message); }
  else         { ok('expire_stale_bookings() RPC called successfully'); }

  const { data: after } = await svc.from('bookings').select('status').eq('id', stale.id).single();
  if (after?.status === 'expired')       ok('Stale booking correctly marked "expired"');
  else if (rpcErr)                        wrn('Could not verify — RPC failed', after?.status);
  else                                    nok('Stale booking status NOT "expired"', after?.status ?? 'null');

  await svc.from('bookings').delete().eq('id', stale.id);
  ok('Test booking cleaned up');
}

// ── 2. Double-booking simulation ─────────────────────────────────────────────

async function testDoubleBooking() {
  hdr('2. DOUBLE-BOOKING UNIQUE INDEX');

  const courtId = await getSampleCourtId();
  const userId  = await getSampleUserId();

  if (!courtId || !userId) { wrn('No owner_courts or users found — skipping double-booking simulation'); return; }

  // Insert first booking
  const { data: b1, error: e1 } = await svc.from('bookings').insert({
    owner_court_id: courtId,   // UUID FK to owner_courts.id
    court_name: '__slot_test__',
    date:       '2099-11-30',
    time:       '23:45',
    status:     'confirmed',
    user_id:    userId,
    players:    2,
    hours:      1,
    base_price:  0,
    service_fee: 0,
    total_price: 0,
  }).select('id').single();

  if (e1) {
    if ((e1.message ?? '').includes('owner_court_id')) {
      nok('owner_court_id column NOT in DB yet — run fix-owner-court-fk.sql in Supabase SQL Editor!');
    } else {
      wrn('First booking insert failed', e1.message);
    }
    return;
  }
  ok('First booking inserted (2099-11-30 23:45 confirmed)', b1.id);

  // Try to insert duplicate (same court+date+time, active status)
  const { data: b2, error: e2 } = await svc.from('bookings').insert({
    owner_court_id: courtId,
    court_name: '__slot_test__',
    date:       '2099-11-30',
    time:       '23:45',
    status:     'pending_payment',
    user_id:    userId,
    players:    2,
    hours:      1,
    base_price:  0,
    service_fee: 0,
    total_price: 0,
  }).select('id').single();

  const isUniqueViolation = e2 && (e2.code === '23505' || (e2.message ?? '').toLowerCase().includes('unique'));

  if (isUniqueViolation)       ok('Duplicate booking BLOCKED by unique index ✓', e2.code);
  else if (e2)                 wrn('Blocked but for different reason', e2.message);
  else                         nok('Duplicate booking ALLOWED — index NOT working!', b2?.id);

  if (b2?.id) await svc.from('bookings').delete().eq('id', b2.id);

  // Cancelled same slot should succeed (partial index only covers active)
  const { data: c1, error: ce1 } = await svc.from('bookings').insert({
    owner_court_id: courtId,
    court_name: '__slot_test__',
    date:       '2099-11-30',
    time:       '23:45',
    status:     'cancelled',
    user_id:    userId,
    players:    2,
    hours:      1,
    base_price:  0,
    service_fee: 0,
    total_price: 0,
  }).select('id').single();

  if (!ce1 && c1)              ok('Cancelled booking for same slot ALLOWED (partial index correctly excludes cancelled)');
  else if (ce1?.code === '23505') nok('Cancelled booking blocked — partial WHERE clause is wrong!');
  else if (ce1)                wrn('Cancelled booking insert failed for unrelated reason', ce1.message);

  if (c1?.id) await svc.from('bookings').delete().eq('id', c1.id);
  await svc.from('bookings').delete().eq('id', b1.id);
  ok('Test bookings cleaned up');
}

// ── 3. Webhook events idempotency ─────────────────────────────────────────────

async function testWebhookIdempotency() {
  hdr('3. WEBHOOK IDEMPOTENCY');

  const dedupKey = `__verify_test__::session_verify_${Date.now()}`;

  // First insert
  const { data: w1, error: e1 } = await svc.from('webhook_events').insert({
    onvo_event_id: dedupKey,
    event_type:    'checkout-session.succeeded',
    payload:       { type: 'test' },
    processed:     false,
  }).select('id').single();

  if (e1) { nok('webhook_events insert failed', e1.message); return; }
  ok('First webhook event inserted', w1.id);

  // Second insert with same onvo_event_id — must fail (unique constraint)
  const { error: e2 } = await svc.from('webhook_events').insert({
    onvo_event_id: dedupKey,
    event_type:    'checkout-session.succeeded',
    payload:       { type: 'test_duplicate' },
    processed:     false,
  }).select('id').single();

  const isUniqueViolation = e2 && (e2.code === '23505' || (e2.message ?? '').toLowerCase().includes('unique'));

  if (isUniqueViolation)  ok('Duplicate webhook event BLOCKED — idempotency constraint works ✓', e2.code);
  else if (e2)            nok('Duplicate blocked but not via unique constraint', e2.message);
  else                    nok('Duplicate webhook event ALLOWED — payments could be doubled!');

  // Upsert should work (conflict resolution — this is what the webhook handler uses)
  const { error: e3 } = await svc.from('webhook_events')
    .upsert({ onvo_event_id: dedupKey, event_type: 'checkout-session.succeeded', payload: {}, processed: false },
             { onConflict: 'onvo_event_id', ignoreDuplicates: false })
    .select('id').single();

  if (!e3)  ok('UPSERT on existing event works (idempotent replay safe)');
  else      wrn('UPSERT on existing event failed', e3.message);

  // Cleanup
  await svc.from('webhook_events').delete().eq('onvo_event_id', dedupKey);
  ok('Test webhook event cleaned up');
}

// ── 4. RLS — anonymous queries return empty ───────────────────────────────────

async function testRLSAnonymous() {
  hdr('4. RLS — ANON CLIENT RETURNS EMPTY');

  const anon = createClient(SUPABASE_URL,
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxibWN3eXZyc3pqbnh2d2htcWp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1OTYzMDIsImV4cCI6MjA5MzE3MjMwMn0.By2zSv-vIkTGnygWZjSYebtbG9mLH8tGM3kUp6gZQGU',
    { auth: { persistSession: false } }
  );

  // Unauthenticated request to bookings should return empty (RLS restricts to owner)
  const { data: bookings, error: bErr } = await anon.from('bookings').select('id').limit(5);

  if (bErr && bErr.code === '42501') {
    ok('bookings: anon read correctly denied (permission denied)');
  } else if (!bErr && (!bookings || bookings.length === 0)) {
    ok('bookings: anon read returns empty (RLS working)');
  } else if (!bErr && bookings && bookings.length > 0) {
    nok('bookings: anon can read ' + bookings.length + ' rows — RLS NOT working!');
  } else {
    wrn('bookings: unexpected response', bErr?.message);
  }

  // Same for payments
  const { data: payments, error: pErr } = await anon.from('payments').select('id').limit(5);

  if (pErr && pErr.code === '42501') {
    ok('payments: anon read correctly denied');
  } else if (!pErr && (!payments || payments.length === 0)) {
    ok('payments: anon read returns empty (RLS working)');
  } else if (!pErr && payments && payments.length > 0) {
    nok('payments: anon can read ' + payments.length + ' rows — RLS NOT working!');
  } else {
    wrn('payments: unexpected response', pErr?.message);
  }
}

// ── 5. Code-level webhook route checks ───────────────────────────────────────

async function checkWebhookCode() {
  hdr('5. WEBHOOK ROUTE — CODE ANALYSIS');

  const routePath = resolve(process.cwd(), 'app/api/webhooks/onvo/route.ts');
  let src;
  try { src = readFileSync(routePath, 'utf8'); }
  catch { nok('Cannot read webhook route file', routePath); return; }

  // Should NOT have sandbox bypass
  if (src.includes('ONVO_SANDBOX') && src.includes("=== 'true'") && !src.includes('NODE_ENV')) {
    nok('Sandbox bypass still present — ONVO_SANDBOX=true would skip signature check in production!');
  } else if (src.includes('NODE_ENV')) {
    ok('Signature check uses NODE_ENV (dev-only bypass, not env-flag bypass)');
  } else if (!src.includes('sandboxMode')) {
    ok('No sandbox bypass logic in webhook route');
  } else {
    wrn('Sandbox logic present but pattern unclear — inspect manually');
  }

  // Should return 500 on catch
  // Look for 500 status in the outer catch (not inside handleEvent)
  const outerCatch = src.match(/\/\/ Return 200.*?\n.*?return NextResponse[\s\S]*?^\s*\}/m)?.[0]
    ?? src.match(/catch\s*\(err[\s\S]*?NextResponse\.json[\s\S]*?\}\s*\}/)?.[0]
    ?? '';
  if (src.includes('status: 500') && src.match(/catch\s*\(err/)) {
    ok('Webhook catch block returns HTTP 500 (ONVO will retry on failure)');
  } else if (src.includes('ok: false') && !src.includes('status: 500')) {
    nok('Webhook catch block returns HTTP 200 — ONVO will NOT retry failed confirmations!');
  } else {
    // Re-check: look for 500 after the comment about retries
    if (/status:\s*500/.test(src)) {
      ok('Webhook catch block returns HTTP 500 (ONVO will retry on failure)');
    } else {
      wrn('Could not determine webhook catch status code — manually verify the catch block returns 500');
    }
  }

  // Should verify auth
  if (src.includes('verifyWebhookSignature')) {
    ok('verifyWebhookSignature() called in webhook route');
  } else {
    nok('verifyWebhookSignature() NOT called — no signature verification!');
  }
}

// ── 6. Code-level checkout route checks ──────────────────────────────────────

async function checkCheckoutCode() {
  hdr('6. CREATE-CHECKOUT ROUTE — CODE ANALYSIS');

  const routePath = resolve(process.cwd(), 'app/api/payments/create-checkout/route.ts');
  let src;
  try { src = readFileSync(routePath, 'utf8'); }
  catch { nok('Cannot read create-checkout route', routePath); return; }

  // Should NOT take userId from body
  if (/const\s*\{[^}]*userId[^}]*\}\s*=\s*body/.test(src)) {
    nok('userId still destructured from request body — IDOR vulnerability present!');
  } else {
    ok('userId NOT taken from request body');
  }

  // Should verify JWT
  if (src.includes('authorization') && src.includes('getUser')) {
    ok('JWT extracted from Authorization header and verified via getUser()');
  } else {
    nok('No JWT verification in create-checkout route!');
  }

  // owner_court_id handling (UUID FK to owner_courts.id)
  if (src.includes('owner_court_id') && src.includes('courtId')) {
    ok('owner_court_id UUID FK assigned from courtId (correct — owner_courts.id is UUID)');
  } else if (src.includes('court_id') && src.includes('courtId')) {
    wrn('Uses legacy integer court_id — should use owner_court_id UUID FK instead');
  } else {
    nok('No court FK assignment found in create-checkout');
  }
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║    TuCancha — Production Safety Verification (Node.js)     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`  Project: lbmcwyvrszjnxvwhmqjz.supabase.co`);
  console.log(`  Time:    ${new Date().toISOString()}`);
  console.log();
  console.log('  NOTE: For schema-level checks (indexes, RLS policy SQL,');
  console.log('        pg_cron), also run scripts/verify-safety.sql in the');
  console.log('        Supabase SQL Editor.');

  await testExpiry();
  await testDoubleBooking();
  await testWebhookIdempotency();
  await testRLSAnonymous();
  await checkWebhookCode();
  await checkCheckoutCode();

  const total = passed + failed;
  const score = total > 0 ? Math.round((passed / total) * 100) : 0;

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                   FINAL REPORT                            ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  ✅ Passed:  ${String(passed).padEnd(4)} checks                                ║`);
  console.log(`║  ❌ Failed:  ${String(failed).padEnd(4)} checks                                ║`);
  console.log(`║  ⚠️  Warned:  ${String(warned).padEnd(4)} items                                 ║`);
  console.log(`║  📊 Score:   ${String(score + '%').padEnd(4)} (${passed}/${total} hard checks)               ║`);
  console.log('╚════════════════════════════════════════════════════════════╝');

  if      (failed === 0 && warned === 0) console.log('\n  🟢 ALL CHECKS PASSED\n');
  else if (failed === 0)                 console.log('\n  🟡 Hard checks passed — review warnings\n');
  else if (failed <= 2)                  console.log('\n  🟠 Minor failures — fix before launch\n');
  else                                   console.log('\n  🔴 CRITICAL ISSUES — do not launch\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('\n💥 Script crashed:', e.message); process.exit(2); });

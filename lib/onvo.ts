/**
 * ONVO Pay API client — TuCancha CR
 *
 * Docs: https://docs.onvopay.com
 * All amounts in CRC (Costa Rican Colones), as integers (e.g. 5000 = ₡5,000).
 */

const ONVO_BASE = process.env.ONVO_BASE_URL ?? 'https://api.onvopay.com/v1';
const ONVO_KEY  = process.env.ONVO_SECRET_KEY ?? '';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OnvoCheckoutSession {
  id:           string;
  redirectUrl?: string;   // ONVO field for the hosted checkout URL
  url?:         string;   // fallback alias
  checkout_url?: string;  // internal alias we normalise to
  status:       string;
  amount?:      number;
  currency?:    string;
  expires_at?:  string;
}

/**
 * ONVO webhook payload shape.
 * Event types from docs:
 *   checkout-session.succeeded
 *   payment-intent.succeeded
 *   payment-intent.failed
 *   payment-intent.deferred
 *   subscription.renewal.succeeded
 *   subscription.renewal.failed
 *   mobile-transfer.received
 */
export interface OnvoWebhookPayload {
  type: string;
  data: Record<string, any>;
}

export interface FeeBreakdown {
  gross:        number;
  platform_fee: number;  // 8 %
  onvo_fee:     number;  // 2.9 % + 300 CRC (estimate)
  owner_net:    number;
}

// ─── Fee helper ──────────────────────────────────────────────────────────────

export function calculateFees(gross: number): FeeBreakdown {
  const platform_fee = Math.round(gross * 0.08);
  const onvo_fee     = Math.round(gross * 0.029 + 300);
  const owner_net    = gross - platform_fee - onvo_fee;
  return { gross, platform_fee, onvo_fee, owner_net };
}

// ─── Core fetch helper ───────────────────────────────────────────────────────

async function onvoFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${ONVO_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${ONVO_KEY}`,
      'Content-Type':  'application/json',
      'Accept':        'application/json',
      ...(options.headers ?? {}),
    },
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = (body as any)?.message ?? (body as any)?.error ?? `ONVO ${res.status}`;
    throw new Error(msg);
  }

  return body as T;
}

// ─── Checkout sessions ───────────────────────────────────────────────────────

export interface CreateCheckoutParams {
  amount:         number;   // CRC in centimos (smallest unit) — multiply whole colones × 100
  description:    string;   // shown on ONVO checkout page
  metadata?:      Record<string, string>;
  successUrl:     string;   // redirect after payment (maps to redirectUrl)
  cancelUrl:      string;   // redirect on cancel / back
  customerEmail?: string;
  customerName?:  string;
}

export async function createCheckoutSession(
  params: CreateCheckoutParams,
): Promise<OnvoCheckoutSession> {
  const session = await onvoFetch<OnvoCheckoutSession>('/checkout/sessions/one-time-link', {
    method: 'POST',
    body: JSON.stringify({
      lineItems: [
        {
          description: params.description,
          unitAmount:  params.amount,
          currency:    'CRC',
          quantity:    1,
        },
      ],
      redirectUrl:   params.successUrl,
      cancelUrl:     params.cancelUrl,
      metadata:      params.metadata ?? {},
      customerEmail: params.customerEmail,
      customerName:  params.customerName,
    }),
  });

  // Normalise to checkout_url regardless of what ONVO returns
  return {
    ...session,
    checkout_url: session.checkout_url ?? session.redirectUrl ?? session.url,
  };
}

export async function getCheckoutSession(sessionId: string): Promise<OnvoCheckoutSession> {
  return onvoFetch<OnvoCheckoutSession>(`/checkout/sessions/${sessionId}`);
}

// ─── Refunds ─────────────────────────────────────────────────────────────────

export interface CreateRefundParams {
  payment_id: string;
  amount?:    number;  // partial — omit for full refund
  reason?:    string;
}

export async function createRefund(params: CreateRefundParams) {
  return onvoFetch('/refunds', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ─── Webhook verification ─────────────────────────────────────────────────────
//
// ONVO passes the webhook secret directly in the X-Webhook-Secret header.
// Compare it against the secret stored in ONVO_WEBHOOK_SECRET env var.

export function verifyWebhookSignature(
  _rawBody: string,
  headerSecret: string,
  storedSecret: string = process.env.ONVO_WEBHOOK_SECRET ?? '',
): boolean {
  if (!storedSecret || !headerSecret) return false;
  // Constant-time comparison to prevent timing attacks
  const a = Buffer.from(storedSecret);
  const b = Buffer.from(headerSecret);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

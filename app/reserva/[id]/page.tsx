"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams }        from "next/navigation";
import Link                                   from "next/link";
import {
  CheckCircle, XCircle, Clock, AlertCircle,
  Calendar, MapPin, Users, CreditCard,
  RefreshCw, ChevronRight, Share2, Zap,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Split {
  id:               string;
  player_name:      string;
  player_email:     string | null;
  amount:           number;
  status:           string;
  onvo_checkout_url: string | null;
  paid_at:          string | null;
}

interface Payment {
  id:               string;
  status:           string;
  gross_amount:     number;
  platform_fee:     number;
  onvo_checkout_url: string | null;
  payment_method:   string | null;
  paid_at:          string | null;
  failure_reason:   string | null;
  is_split:         boolean;
  split_count:      number;
  split_paid_count: number;
  payment_splits:   Split[];
}

interface Booking {
  id:          string;
  status:      string;
  date:        string;
  time:        string;
  hours:       number;
  court_name:  string;
  total_price: number;
  expires_at:  string | null;
  paid_at:     string | null;
  payment_id:  string | null;
  payments:    Payment | null;
}

// ─── Status config ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
  icon:    React.ReactNode;
  title:   string;
  desc:    string;
  color:   string;
  bg:      string;
  border:  string;
}> = {
  pending_payment: {
    icon:   <Clock size={32} />,
    title:  "Esperando pago",
    desc:   "Tu reserva está guardada por 30 minutos mientras completás el pago.",
    color:  "#F59E0B",
    bg:     "rgba(245,158,11,0.06)",
    border: "rgba(245,158,11,0.18)",
  },
  partially_paid: {
    icon:   <RefreshCw size={32} />,
    title:  "Pago parcial",
    desc:   "Algunos jugadores ya pagaron. Esperando al resto.",
    color:  "#6366F1",
    bg:     "rgba(99,102,241,0.06)",
    border: "rgba(99,102,241,0.18)",
  },
  paid: {
    icon:   <CheckCircle size={32} />,
    title:  "¡Pago recibido!",
    desc:   "Procesando confirmación de la cancha.",
    color:  "var(--accent)",
    bg:     "rgba(215,255,0,0.06)",
    border: "rgba(215,255,0,0.18)",
  },
  confirmed: {
    icon:   <CheckCircle size={32} />,
    title:  "¡Reserva confirmada!",
    desc:   "Tu cancha está reservada. ¡A jugar!",
    color:  "var(--accent)",
    bg:     "rgba(215,255,0,0.06)",
    border: "rgba(215,255,0,0.18)",
  },
  failed: {
    icon:   <XCircle size={32} />,
    title:  "Pago fallido",
    desc:   "No pudimos procesar tu pago. Intentá de nuevo.",
    color:  "#EF4444",
    bg:     "rgba(239,68,68,0.06)",
    border: "rgba(239,68,68,0.18)",
  },
  expired: {
    icon:   <AlertCircle size={32} />,
    title:  "Reserva expirada",
    desc:   "El tiempo para completar el pago se agotó.",
    color:  "#9CA3AF",
    bg:     "rgba(156,163,175,0.06)",
    border: "rgba(156,163,175,0.18)",
  },
  cancelled: {
    icon:   <XCircle size={32} />,
    title:  "Reserva cancelada",
    desc:   "Cancelaste esta reserva.",
    color:  "#9CA3AF",
    bg:     "rgba(156,163,175,0.06)",
    border: "rgba(156,163,175,0.18)",
  },
  refunded: {
    icon:   <RefreshCw size={32} />,
    title:  "Pago reembolsado",
    desc:   "El monto fue devuelto a tu método de pago.",
    color:  "#6366F1",
    bg:     "rgba(99,102,241,0.06)",
    border: "rgba(99,102,241,0.18)",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `₡${n.toLocaleString('es-CR')}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ReservaPage() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const bookingId    = params.id as string;

  const [booking,  setBooking]  = useState<Booking | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [polling,  setPolling]  = useState(false);

  const urlStatus = searchParams.get('status'); // 'success' | 'cancelled'

  const fetchStatus = useCallback(async () => {
    try {
      const res  = await fetch(`/api/payments/status/${bookingId}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error.'); return; }
      setBooking(data);
    } catch {
      setError('No se pudo cargar el estado de la reserva.');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  // Initial load
  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Auto-poll when status is pending (ONVO webhook may not have arrived yet)
  useEffect(() => {
    if (!booking) return;
    const pending = ['pending_payment', 'paid', 'partially_paid'].includes(booking.status);
    if (!pending) return;

    setPolling(true);
    const t = setInterval(() => { fetchStatus(); }, 4000);
    return () => { clearInterval(t); setPolling(false); };
  }, [booking?.status, fetchStatus]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14, border: '2px solid rgba(215,255,0,0.3)',
          borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite',
          margin: '0 auto 16px',
        }} />
        <p style={{ color: 'var(--text3)', fontSize: 14 }}>Cargando reserva…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error || !booking) return (
    <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <XCircle size={48} style={{ color: '#EF4444', margin: '0 auto 16px', display: 'block' }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Reserva no encontrada</h2>
        <p style={{ color: 'var(--text3)', fontSize: 14, marginBottom: 24 }}>{error}</p>
        <Link href="/explorar" className="btn-primary" style={{ display: 'inline-block', padding: '12px 28px', borderRadius: 12 }}>
          Explorar canchas
        </Link>
      </div>
    </div>
  );

  const statusKey = booking.status as keyof typeof STATUS_CONFIG;
  const cfg       = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.pending_payment;
  const payment   = booking.payments;
  const isConfirmed = booking.status === 'confirmed';
  const isFailed    = ['failed', 'expired', 'cancelled'].includes(booking.status);

  return (
    <>
      <style>{`
        @keyframes spin   { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);} }
        .reserva-card { animation: fadeUp 0.35s ease both; }
      `}</style>

      <div style={{
        minHeight: '100svh', padding: '80px 24px 48px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{ width: '100%', maxWidth: 560 }}>

          {/* ── Status badge ── */}
          <div className="reserva-card" style={{
            background: cfg.bg,
            border:     `1px solid ${cfg.border}`,
            borderRadius: 20,
            padding:    '32px 28px',
            marginBottom: 20,
            display:    'flex',
            alignItems: 'center',
            gap:        20,
          }}>
            <div style={{ color: cfg.color, flexShrink: 0 }}>{cfg.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>
                  {cfg.title}
                </h1>
                {polling && (
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%',
                    border: `2px solid ${cfg.color}`,
                    borderTopColor: 'transparent',
                    animation: 'spin 0.7s linear infinite',
                    opacity: 0.6,
                  }} />
                )}
              </div>
              <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.5, margin: 0 }}>{cfg.desc}</p>
            </div>
          </div>

          {/* ── Booking details ── */}
          <div className="reserva-card" style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20,
            padding: '24px 28px',
            marginBottom: 20,
            animationDelay: '0.05s',
          }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--text3)', marginBottom: 18 }}>
              DETALLE DE RESERVA
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Row icon={<MapPin size={15} />}   label="Cancha"   value={booking.court_name} />
              <Row icon={<Calendar size={15} />} label="Fecha"    value={formatDate(booking.date)} />
              <Row icon={<Clock size={15} />}    label="Hora"     value={`${booking.time} · ${booking.hours}h`} />
              <Row icon={<Users size={15} />}    label="Jugadores" value={`${payment?.split_count ?? 1} jugadores`} />
            </div>

            <div style={{
              marginTop: 20, paddingTop: 16,
              borderTop: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 13, color: 'var(--text3)' }}>Total</span>
              <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>
                {fmt(booking.total_price)}
              </span>
            </div>
          </div>

          {/* ── Split payment progress ── */}
          {payment?.is_split && payment.payment_splits?.length > 0 && (
            <div className="reserva-card" style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20,
              padding: '24px 28px',
              marginBottom: 20,
              animationDelay: '0.1s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--text3)' }}>
                  PAGO DIVIDIDO
                </h2>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
                  {payment.split_paid_count}/{payment.split_count} pagados
                </span>
              </div>

              {/* Progress bar */}
              <div style={{
                height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)',
                marginBottom: 16, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  background: 'var(--accent)',
                  width: `${(payment.split_paid_count / payment.split_count) * 100}%`,
                  transition: 'width 0.4s ease',
                }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {payment.payment_splits.map(s => (
                  <div key={s.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 12,
                    background: s.status === 'paid'
                      ? 'rgba(215,255,0,0.04)'
                      : 'rgba(255,255,255,0.025)',
                    border: `1px solid ${s.status === 'paid' ? 'rgba(215,255,0,0.1)' : 'rgba(255,255,255,0.06)'}`,
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{s.player_name}</div>
                      {s.player_email && (
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{s.player_email}</div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{fmt(s.amount)}</div>
                      {s.status === 'paid' ? (
                        <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2 }}>✓ Pagado</div>
                      ) : s.onvo_checkout_url ? (
                        <a href={s.onvo_checkout_url} style={{
                          fontSize: 11, color: '#6366F1',
                          textDecoration: 'none', marginTop: 2, display: 'block',
                        }}>
                          Pagar ahora →
                        </a>
                      ) : (
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Pendiente</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Payment method ── */}
          {payment?.payment_method && (
            <div className="reserva-card" style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
              padding: '16px 20px',
              marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 12,
              animationDelay: '0.12s',
            }}>
              <CreditCard size={16} style={{ color: 'var(--text3)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--text3)' }}>Pagado con</span>
              <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>
                {payment.payment_method}
              </span>
            </div>
          )}

          {/* ── Failure reason ── */}
          {payment?.failure_reason && (
            <div className="reserva-card" style={{
              padding: '14px 18px', borderRadius: 14,
              background: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.15)',
              fontSize: 13, color: '#EF4444', marginBottom: 20,
              animationDelay: '0.12s',
            }}>
              {payment.failure_reason}
            </div>
          )}

          {/* ── CTA buttons ── */}
          <div className="reserva-card" style={{
            display: 'flex', flexDirection: 'column', gap: 12,
            animationDelay: '0.15s',
          }}>

            {/* Pending: go pay */}
            {booking.status === 'pending_payment' && payment?.onvo_checkout_url && (
              <a href={payment.onvo_checkout_url} className="btn-primary" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '16px', borderRadius: 14, fontSize: 15, fontWeight: 700,
                textDecoration: 'none',
              }}>
                Completar pago <ChevronRight size={18} />
              </a>
            )}

            {/* Confirmed: share */}
            {isConfirmed && (
              <button
                onClick={() => {
                  const msg = `¡Reservé en ${booking.court_name}! ${formatDate(booking.date)} a las ${booking.time} 🎯`;
                  if (navigator.share) {
                    navigator.share({ title: 'TuCancha — reserva confirmada', text: msg });
                  } else {
                    navigator.clipboard.writeText(msg);
                  }
                }}
                className="btn-primary"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '16px', borderRadius: 14, fontSize: 15, fontWeight: 700,
                  width: '100%', cursor: 'pointer',
                }}
              >
                <Share2 size={17} /> Compartir cancha
              </button>
            )}

            {/* Failed / expired: retry */}
            {isFailed && (
              <Link href="/explorar" className="btn-primary" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '16px', borderRadius: 14, fontSize: 15, fontWeight: 700,
                textDecoration: 'none',
              }}>
                Buscar otra cancha
              </Link>
            )}

            {/* Always: back to explore */}
            <Link href="/explorar" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '14px', borderRadius: 14, fontSize: 14, fontWeight: 600,
              color: 'var(--text3)', textDecoration: 'none',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              transition: 'color 0.15s',
            }}>
              Explorar canchas
            </Link>
          </div>

          {/* ── Booking ID ── */}
          <p style={{
            textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.15)',
            marginTop: 32, letterSpacing: '0.05em',
          }}>
            ID · {booking.id.split('-')[0].toUpperCase()}
          </p>

        </div>
      </div>
    </>
  );
}

// ─── Row helper ──────────────────────────────────────────────────────────────

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ color: 'var(--text3)', flexShrink: 0, display: 'flex' }}>{icon}</div>
      <span style={{ fontSize: 13, color: 'var(--text3)', minWidth: 80 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{value}</span>
    </div>
  );
}

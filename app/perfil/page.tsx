"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LogOut, Edit2, Calendar, Clock, MapPin, TrendingUp, Shield, Zap, Target } from "lucide-react";
import Link from "next/link";

const STATUS: Record<string, { label: string; color: string; bg: string; dot: string; border: string }> = {
  confirmed: { label: 'Confirmada', color: '#4ADE80', bg: 'rgba(74,222,128,0.09)',  dot: '#4ADE80', border: 'rgba(74,222,128,0.2)' },
  pending:   { label: 'Pendiente',  color: '#FACC15', bg: 'rgba(250,204,21,0.09)',  dot: '#FACC15', border: 'rgba(250,204,21,0.2)' },
  cancelled: { label: 'Cancelada',  color: '#FF6B6B', bg: 'rgba(255,107,107,0.09)', dot: '#FF6B6B', border: 'rgba(255,107,107,0.2)' },
};

const STATS = [
  { key: 'stat_atk', label: 'Ataque',  short: 'ATK', Icon: Zap,        color: '#D7FF00' },
  { key: 'stat_def', label: 'Defensa', short: 'DEF', Icon: Shield,     color: '#60A5FA' },
  { key: 'stat_str', label: 'Fuerza',  short: 'STR', Icon: TrendingUp, color: '#F97316' },
  { key: 'stat_skl', label: 'Técnica', short: 'SKL', Icon: Target,     color: '#A78BFA' },
];

/* Alternating icon accent colors for booking rows */
const BOOKING_ICONS = ['rgba(215,255,0,0.08)', 'rgba(96,165,250,0.08)', 'rgba(249,115,22,0.08)', 'rgba(167,139,250,0.08)'];
const BOOKING_BORDERS = ['rgba(215,255,0,0.15)', 'rgba(96,165,250,0.15)', 'rgba(249,115,22,0.15)', 'rgba(167,139,250,0.15)'];

const CARD = {
  borderRadius: 18,
  background: 'linear-gradient(160deg, #161616 0%, #111111 100%)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 6px 28px rgba(0,0,0,0.35)',
} as const;

export default function PerfilPage() {
  const router = useRouter();
  const [profile,  setProfile]  = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [ready,    setReady]    = useState(false);
  const [hoveredStat,    setHoveredStat]    = useState<string | null>(null);
  const [hoveredBooking, setHoveredBooking] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.push('/auth'); return; }
      const [{ data: p }, { data: b }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
        supabase.from('bookings').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(10),
      ]);
      setProfile(p ?? { name: session.user.email, team: '' });
      setBookings(b ?? []);
      setLoading(false);
      requestAnimationFrame(() => setTimeout(() => setReady(true), 40));
    })();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100svh' }}>
      <div style={{
        width: 26, height: 26, borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.07)',
        borderTopColor: 'var(--accent)',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const initials = profile?.name
    ? profile.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const level = bookings.length >= 10 ? 'Pro' : bookings.length >= 5 ? 'Semi-Pro' : 'Jugador';

  return (
    <div style={{
      minHeight: '100svh',
      paddingTop: 64,
      background: 'var(--bg)',
      /* Vignette */
      backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(215,255,0,0.03) 0%, transparent 60%)',
      opacity: ready ? 1 : 0,
      transition: 'opacity 0.4s ease',
    }}>

      <style>{`
        @keyframes spin        { to { transform: rotate(360deg); } }
        @keyframes ring-pulse  { 0%,100% { opacity:.55; transform:scale(1); } 50% { opacity:.2; transform:scale(1.14); } }
        @keyframes fade-up     { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }

        .profile-grid { grid-template-columns: 252px 1fr; gap: 18px; }
        @media (max-width: 820px) {
          .profile-grid { grid-template-columns: 1fr !important; gap: 14px !important; }
          .profile-header-inner { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; }
          .profile-actions { align-self: flex-start; }
        }
        @media (max-width: 560px) {
          .profile-header-band { padding: 28px 0 24px !important; }
          .container { padding: 0 20px !important; }
          .profile-main { padding: 20px 20px 48px !important; }
        }

        .stat-row { transition: background 0.15s, border-color 0.15s, transform 0.15s; }
        .stat-row:hover { background: rgba(255,255,255,0.035) !important; border-color: rgba(255,255,255,0.1) !important; transform: translateX(2px); }

        .booking-row { transition: background 0.18s, border-color 0.18s, box-shadow 0.18s, transform 0.18s; }
        .booking-row:hover { border-color: rgba(215,255,0,0.16) !important; transform: translateY(-2px); box-shadow: 0 10px 36px rgba(0,0,0,0.5) !important; }

        .card-fade { animation: fade-up 0.45s ease both; }

        .btn-edit  { transition: border-color 0.18s, color 0.18s, background 0.18s; }
        .btn-edit:hover  { border-color: rgba(215,255,0,0.3) !important; color: var(--text) !important; background: rgba(215,255,0,0.05) !important; }
        .btn-logout { transition: color 0.18s; }
        .btn-logout:hover { color: var(--text2) !important; }

        .section-label { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; color: rgba(255,255,255,0.32); text-transform: uppercase; }
      `}</style>

      {/* ── Profile header band ── */}
      <div
        className="profile-header-band"
        style={{
          background: 'linear-gradient(180deg, rgba(215,255,0,0.05) 0%, rgba(215,255,0,0.012) 55%, transparent 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '36px 0 28px',
        }}>
        <div className="container">
          {/* Constrain content to feel tight, not stretched */}
          <div style={{ maxWidth: 900 }}>
            <div
              className="profile-header-inner"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 20,
              }}>

              {/* Avatar + identity */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>

                {/* Avatar */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {/* Pulsing glow ring */}
                  <div style={{
                    position: 'absolute', inset: -5,
                    borderRadius: 25,
                    border: '1.5px solid rgba(215,255,0,0.28)',
                    animation: 'ring-pulse 3s ease-in-out infinite',
                    pointerEvents: 'none',
                  }} />
                  {/* Avatar tile */}
                  <div style={{
                    width: 72, height: 72, borderRadius: 20,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 900, fontSize: 24, letterSpacing: '-0.02em',
                    background: 'linear-gradient(145deg, rgba(215,255,0,0.14), rgba(215,255,0,0.05))',
                    color: 'var(--accent)',
                    border: '1px solid rgba(215,255,0,0.22)',
                    boxShadow: '0 0 0 1px rgba(215,255,0,0.06), 0 8px 28px rgba(215,255,0,0.1)',
                  }}>
                    {initials}
                  </div>
                  {/* Online dot */}
                  <div style={{
                    position: 'absolute', bottom: 3, right: 3,
                    width: 11, height: 11, borderRadius: '50%',
                    background: '#4ADE80',
                    border: '2px solid var(--bg)',
                    boxShadow: '0 0 6px rgba(74,222,128,0.55)',
                  }} />
                </div>

                {/* Name + meta */}
                <div>
                  {/* Level badge */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
                    padding: '2px 9px', borderRadius: 99, marginBottom: 7,
                    background: 'rgba(215,255,0,0.09)',
                    color: 'var(--accent)',
                    border: '1px solid rgba(215,255,0,0.18)',
                    textTransform: 'uppercase',
                  }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
                    {level}
                  </span>

                  <h1 style={{
                    fontWeight: 900, fontSize: 24, letterSpacing: '-0.03em',
                    lineHeight: 1.1, marginBottom: 7,
                  }}>
                    {profile?.name ?? 'Usuario'}
                  </h1>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 12, color: 'rgba(255,255,255,0.38)',
                    }}>
                      <MapPin size={10} /> Costa Rica
                    </span>
                    {profile?.team && (
                      <>
                        <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 12 }}>·</span>
                        <span style={{
                          fontSize: 11, padding: '2px 9px', borderRadius: 99,
                          background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)',
                          border: '1px solid rgba(255,255,255,0.07)',
                        }}>{profile.team}</span>
                      </>
                    )}
                    <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 12 }}>·</span>
                    <span style={{ fontSize: 11, color: '#4ADE80', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ADE80', display: 'inline-block', boxShadow: '0 0 5px #4ADE80' }} />
                      En línea
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="profile-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Link href="/perfil/editar" className="btn-edit" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 15px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                  background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)',
                  border: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none',
                }}>
                  <Edit2 size={11} /> Editar
                </Link>
                <button onClick={handleLogout} className="btn-logout" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 15px', borderRadius: 10, fontSize: 12, fontWeight: 500,
                  background: 'none', color: 'rgba(255,255,255,0.35)',
                  border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer',
                }}>
                  <LogOut size={11} /> Salir
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="container profile-main" style={{ padding: '24px 40px 60px' }}>
        <div style={{ display: 'grid', alignItems: 'start' }} className="profile-grid">

          {/* ── Left column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Stats card */}
            <div className="card-fade" style={{ ...CARD, padding: '18px 16px', animationDelay: '0.05s' }}>
              {/* Top highlight line */}
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <span className="section-label">Estadísticas</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {STATS.map(s => {
                  const val  = profile?.[s.key];
                  const pct  = val ? Math.min(100, (val / 99) * 100) : 0;
                  const isHov = hoveredStat === s.key;
                  return (
                    <div
                      key={s.key}
                      className="stat-row"
                      onMouseEnter={() => setHoveredStat(s.key)}
                      onMouseLeave={() => setHoveredStat(null)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 11,
                        padding: '9px 10px', borderRadius: 11,
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        cursor: 'default',
                      }}>

                      <div style={{
                        width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: `${s.color}10`,
                        border: `1px solid ${s.color}20`,
                        boxShadow: isHov ? `0 0 12px ${s.color}18` : 'none',
                        transition: 'box-shadow 0.18s',
                      }}>
                        <s.Icon size={13} color={s.color} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>{s.label}</span>
                          <span style={{
                            fontSize: 13, fontWeight: 900,
                            color: val ? s.color : 'rgba(255,255,255,0.2)',
                            letterSpacing: '-0.01em',
                          }}>{val ?? '—'}</span>
                        </div>
                        <div style={{ height: 2, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 99,
                            width: `${pct}%`,
                            background: val ? `linear-gradient(90deg, ${s.color}70, ${s.color})` : 'transparent',
                            transition: 'width 0.7s cubic-bezier(0.25,0.46,0.45,0.94)',
                            boxShadow: val ? `0 0 8px ${s.color}60` : 'none',
                          }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Activity card */}
            <div className="card-fade" style={{ ...CARD, padding: '18px 16px', animationDelay: '0.1s' }}>
              <span className="section-label" style={{ display: 'block', marginBottom: 14 }}>Actividad</span>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {[
                  { label: 'Partidos jugados', val: '0',                    icon: '⚽', accent: false },
                  { label: 'Reservas',          val: String(bookings.length), icon: '📅', accent: bookings.length > 0 },
                  { label: 'Cancha favorita',   val: '–',                    icon: '📍', accent: false },
                  { label: 'Equipo',            val: profile?.team || '–',   icon: '🏴', accent: !!profile?.team },
                ].map((r, i, arr) => (
                  <div key={r.label} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 0',
                    borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <span style={{ fontSize: 13, lineHeight: 1 }}>{r.icon}</span>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)' }}>{r.label}</span>
                    </div>
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      color: r.accent ? 'var(--accent)' : 'rgba(255,255,255,0.55)',
                    }}>{r.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA card */}
            <div className="card-fade" style={{
              borderRadius: 16, padding: '16px 18px',
              background: 'linear-gradient(145deg, rgba(215,255,0,0.07), rgba(215,255,0,0.025))',
              border: '1px solid rgba(215,255,0,0.12)',
              boxShadow: '0 0 32px rgba(215,255,0,0.04)',
              animationDelay: '0.15s',
            }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 3, letterSpacing: '-0.01em' }}>
                ¿Listo para jugar?
              </p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginBottom: 13, lineHeight: 1.55 }}>
                Encontrá canchas disponibles hoy.
              </p>
              <Link href="/explorar" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 11, fontWeight: 700, color: '#000',
                background: 'var(--accent)', padding: '7px 14px',
                borderRadius: 8, textDecoration: 'none', letterSpacing: '-0.01em',
              }}>
                Explorar canchas →
              </Link>
            </div>

          </div>

          {/* ── Right column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Mis Reservas */}
            <div className="card-fade" style={{ animationDelay: '0.08s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span className="section-label">Mis Reservas</span>
                {bookings.length > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    padding: '2px 9px', borderRadius: 99,
                    background: 'rgba(215,255,0,0.07)',
                    color: 'rgba(215,255,0,0.7)',
                    border: '1px solid rgba(215,255,0,0.14)',
                  }}>{bookings.length}</span>
                )}
              </div>

              {bookings.length === 0 ? (
                <div style={{
                  ...CARD,
                  padding: '36px 24px', textAlign: 'center',
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 14, margin: '0 auto 12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}>
                    <Calendar size={20} style={{ color: 'rgba(255,255,255,0.25)' }} />
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.02em' }}>Sin reservas aún</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.32)', marginBottom: 18, lineHeight: 1.55 }}>
                    Explorá canchas disponibles y hacé tu primera reserva.
                  </p>
                  <Link href="/explorar" className="btn-primary" style={{ padding: '8px 20px', fontSize: 12, borderRadius: 9 }}>
                    Explorar canchas →
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {bookings.map((b, idx) => {
                    const meta = STATUS[b.status] ?? STATUS.pending;
                    const isHov = hoveredBooking === b.id;
                    const iconBg  = BOOKING_ICONS[idx % BOOKING_ICONS.length];
                    const iconBdr = BOOKING_BORDERS[idx % BOOKING_BORDERS.length];
                    return (
                      <div
                        key={b.id}
                        className="booking-row"
                        onMouseEnter={() => setHoveredBooking(b.id)}
                        onMouseLeave={() => setHoveredBooking(null)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '13px 16px', borderRadius: 13,
                          background: isHov
                            ? 'linear-gradient(145deg, #1a1a1a, #141414)'
                            : 'linear-gradient(145deg, #161616, #111111)',
                          border: '1px solid rgba(255,255,255,0.07)',
                          boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
                          cursor: 'default', gap: 12,
                        }}>

                        {/* Left */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 16, background: iconBg, border: `1px solid ${iconBdr}`,
                          }}>⚽</div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{
                              fontWeight: 700, fontSize: 13, marginBottom: 2,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              letterSpacing: '-0.01em',
                            }}>{b.court_name}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'rgba(255,255,255,0.32)' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Clock size={9} /> {b.hours}h
                              </span>
                              <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
                              <span>{b.players ?? 10} jugadores</span>
                            </div>
                          </div>
                        </div>

                        {/* Right */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{
                            fontWeight: 800, fontSize: 14, color: 'var(--accent)',
                            letterSpacing: '-0.02em', marginBottom: 4,
                          }}>
                            ₡{Math.round(b.total_price ?? 0).toLocaleString('es-CR')}
                          </p>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 99,
                            background: meta.bg, color: meta.color,
                            border: `1px solid ${meta.border}`,
                            letterSpacing: '0.02em',
                          }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: meta.dot }} />
                            {meta.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Historial */}
            <div className="card-fade" style={{ animationDelay: '0.13s' }}>
              <span className="section-label" style={{ display: 'block', marginBottom: 10 }}>Historial de Partidos</span>

              <div style={{
                ...CARD,
                overflow: 'hidden',
              }}>
                {/* Top accent line */}
                <div style={{
                  height: 2,
                  background: 'linear-gradient(90deg, transparent 0%, rgba(215,255,0,0.28) 50%, transparent 100%)',
                }} />

                <div style={{ padding: '26px 24px', textAlign: 'center' }}>
                  {/* Icon */}
                  <div style={{
                    width: 52, height: 52, borderRadius: 16, margin: '0 auto 14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22,
                    background: 'linear-gradient(145deg, rgba(215,255,0,0.09), rgba(215,255,0,0.02))',
                    border: '1px solid rgba(215,255,0,0.13)',
                    boxShadow: '0 0 28px rgba(215,255,0,0.05)',
                  }}>⚽</div>

                  <p style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 5 }}>
                    Sin partidos aún
                  </p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.32)', marginBottom: 18, lineHeight: 1.6, maxWidth: 240, margin: '0 auto 18px' }}>
                    Aceptá un reto y tu historial aparecerá aquí.
                  </p>

                  {/* W/D/L mini stats */}
                  <div style={{
                    display: 'flex', justifyContent: 'center',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 10, overflow: 'hidden',
                    marginBottom: 18,
                  }}>
                    {[
                      { label: 'V', full: 'Victorias', val: '0', color: '#4ADE80' },
                      { label: 'E', full: 'Empates',   val: '0', color: '#FACC15' },
                      { label: 'D', full: 'Derrotas',  val: '0', color: '#FF6B6B' },
                    ].map((s, i, arr) => (
                      <div key={s.label} style={{
                        flex: 1, padding: '10px 8px', textAlign: 'center',
                        borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      }}>
                        <p style={{ fontWeight: 900, fontSize: 17, letterSpacing: '-0.02em', color: s.color, marginBottom: 2 }}>{s.val}</p>
                        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{s.full}</p>
                      </div>
                    ))}
                  </div>

                  <Link href="/juegos" className="btn-primary" style={{ padding: '8px 20px', fontSize: 12, borderRadius: 9 }}>
                    Ver retos activos →
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

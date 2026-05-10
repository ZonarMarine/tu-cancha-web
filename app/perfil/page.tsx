"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LogOut, Edit2, Calendar, Clock, MapPin, TrendingUp, Shield, Zap, Target } from "lucide-react";
import Link from "next/link";

const STATUS: Record<string, { label: string; color: string; bg: string; dot: string; border: string }> = {
  confirmed: { label: 'Confirmada', color: '#4ADE80', bg: 'rgba(74,222,128,0.08)',  dot: '#4ADE80', border: 'rgba(74,222,128,0.18)' },
  pending:   { label: 'Pendiente',  color: '#FACC15', bg: 'rgba(250,204,21,0.08)',  dot: '#FACC15', border: 'rgba(250,204,21,0.18)' },
  cancelled: { label: 'Cancelada',  color: '#FF6B6B', bg: 'rgba(255,107,107,0.08)', dot: '#FF6B6B', border: 'rgba(255,107,107,0.18)' },
};

const STATS = [
  { key: 'stat_atk', label: 'Ataque',  short: 'ATK', Icon: Zap,      color: '#D7FF00' },
  { key: 'stat_def', label: 'Defensa', short: 'DEF', Icon: Shield,   color: '#60A5FA' },
  { key: 'stat_str', label: 'Fuerza',  short: 'STR', Icon: TrendingUp, color: '#F97316' },
  { key: 'stat_skl', label: 'Técnica', short: 'SKL', Icon: Target,   color: '#A78BFA' },
];

export default function PerfilPage() {
  const router = useRouter();
  const [profile,  setProfile]  = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [hoveredStat, setHoveredStat] = useState<string | null>(null);
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
    })();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100svh' }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.08)',
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
    <div style={{ minHeight: '100svh', paddingTop: 64, background: 'var(--bg)' }}>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(1.18); opacity: 0; }
        }
        .profile-grid { grid-template-columns: 260px 1fr; }
        @media (max-width: 860px) {
          .profile-grid { grid-template-columns: 1fr !important; }
        }
        .stat-tile:hover { transform: translateY(-2px); }
        .booking-row:hover { border-color: rgba(215,255,0,0.14) !important; transform: translateY(-1px); }
        .btn-edit:hover { border-color: rgba(215,255,0,0.25) !important; color: var(--text) !important; }
        .btn-logout:hover { color: var(--text2) !important; }
      `}</style>

      {/* ── Profile hero band ── */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(215,255,0,0.045) 0%, rgba(215,255,0,0.01) 60%, transparent 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '40px 0 32px',
      }}>
        <div className="container">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 20,
          }}>

            {/* Avatar + identity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>

              {/* Avatar with glow ring */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {/* Animated glow ring */}
                <div style={{
                  position: 'absolute', inset: -4,
                  borderRadius: 24,
                  background: 'conic-gradient(from 0deg, rgba(215,255,0,0.35), rgba(215,255,0,0.05), rgba(215,255,0,0.35))',
                  animation: 'pulse-ring 2.8s ease-out infinite',
                  zIndex: 0,
                }} />
                {/* Static glow border */}
                <div style={{
                  position: 'absolute', inset: -2,
                  borderRadius: 22,
                  background: 'linear-gradient(135deg, rgba(215,255,0,0.3), rgba(215,255,0,0.05))',
                  zIndex: 1,
                }} />
                {/* Avatar tile */}
                <div style={{
                  position: 'relative', zIndex: 2,
                  width: 76, height: 76, borderRadius: 20,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, fontSize: 26,
                  background: 'linear-gradient(145deg, rgba(215,255,0,0.15), rgba(215,255,0,0.06))',
                  color: 'var(--accent)',
                  border: '1px solid rgba(215,255,0,0.25)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 8px 32px rgba(215,255,0,0.12)',
                }}>
                  {initials}
                </div>
                {/* Online indicator */}
                <div style={{
                  position: 'absolute', bottom: 2, right: 2, zIndex: 3,
                  width: 12, height: 12, borderRadius: '50%',
                  background: '#4ADE80',
                  border: '2px solid var(--bg)',
                  boxShadow: '0 0 8px rgba(74,222,128,0.6)',
                }} />
              </div>

              {/* Name + meta */}
              <div>
                {/* Level badge */}
                <div style={{ marginBottom: 6 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                    padding: '3px 10px', borderRadius: 99,
                    background: 'rgba(215,255,0,0.1)',
                    color: 'var(--accent)',
                    border: '1px solid rgba(215,255,0,0.2)',
                    textTransform: 'uppercase',
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
                    {level}
                  </span>
                </div>

                <h1 style={{
                  fontWeight: 900, fontSize: 26, letterSpacing: '-0.03em',
                  lineHeight: 1.1, marginBottom: 8,
                }}>
                  {profile?.name ?? 'Usuario'}
                </h1>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 12, color: 'var(--text3)',
                  }}>
                    <MapPin size={11} style={{ flexShrink: 0 }} /> Costa Rica
                  </span>
                  {profile?.team && (
                    <>
                      <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: 12 }}>·</span>
                      <span style={{
                        fontSize: 12, padding: '3px 10px', borderRadius: 99,
                        background: 'var(--surface2)', color: 'var(--text3)',
                        border: '1px solid var(--border)',
                      }}>{profile.team}</span>
                    </>
                  )}
                  <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: 12 }}>·</span>
                  <span style={{ fontSize: 12, color: '#4ADE80', fontWeight: 600 }}>● En línea</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Link href="/perfil/editar" className="btn-edit" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 11, fontSize: 13, fontWeight: 600,
                background: 'rgba(255,255,255,0.04)', color: 'var(--text2)',
                border: '1px solid rgba(255,255,255,0.09)', textDecoration: 'none',
                transition: 'border-color 0.18s, color 0.18s',
              }}>
                <Edit2 size={12} /> Editar perfil
              </Link>
              <button onClick={handleLogout} className="btn-logout" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 11, fontSize: 13, fontWeight: 500,
                background: 'none', color: 'var(--text3)',
                border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer',
                transition: 'color 0.18s',
              }}>
                <LogOut size={12} /> Salir
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="container" style={{ padding: '28px 40px 64px' }}>
        <div style={{ display: 'grid', gap: 20, alignItems: 'start' }} className="profile-grid">

          {/* ── Left column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Stats card */}
            <div style={{
              borderRadius: 18, padding: '20px',
              background: 'linear-gradient(145deg, #141414, #0f0f0f)',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text3)', textTransform: 'uppercase' }}>
                  Estadísticas
                </p>
                <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500 }}>Temporada 25</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {STATS.map(s => {
                  const val = profile?.[s.key];
                  const pct = val ? Math.min(100, (val / 99) * 100) : 0;
                  const isHovered = hoveredStat === s.key;
                  return (
                    <div
                      key={s.key}
                      className="stat-tile"
                      onMouseEnter={() => setHoveredStat(s.key)}
                      onMouseLeave={() => setHoveredStat(null)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 12px', borderRadius: 12,
                        background: isHovered ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${isHovered ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}`,
                        cursor: 'default',
                        transition: 'all 0.18s',
                      }}>

                      {/* Icon */}
                      <div style={{
                        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: `${s.color}12`,
                        border: `1px solid ${s.color}22`,
                      }}>
                        <s.Icon size={14} color={s.color} />
                      </div>

                      {/* Label + bar */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)' }}>{s.label}</span>
                          <span style={{
                            fontSize: 13, fontWeight: 900,
                            color: val ? s.color : 'var(--text3)',
                            letterSpacing: '-0.01em',
                          }}>{val ?? '—'}</span>
                        </div>
                        {/* Progress bar */}
                        <div style={{
                          height: 3, borderRadius: 99,
                          background: 'rgba(255,255,255,0.06)',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%', borderRadius: 99,
                            width: `${pct}%`,
                            background: val
                              ? `linear-gradient(90deg, ${s.color}88, ${s.color})`
                              : 'transparent',
                            transition: 'width 0.6s cubic-bezier(0.25,0.46,0.45,0.94)',
                          }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Activity card */}
            <div style={{
              borderRadius: 18, padding: '20px',
              background: 'linear-gradient(145deg, #141414, #0f0f0f)',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 16 }}>
                Actividad
              </p>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {[
                  { label: 'Partidos jugados', val: '0',                    icon: '⚽', accent: false },
                  { label: 'Reservas totales', val: String(bookings.length), icon: '📅', accent: bookings.length > 0 },
                  { label: 'Cancha favorita',  val: '–',                    icon: '📍', accent: false },
                  { label: 'Equipo',           val: profile?.team || '–',   icon: '🏴', accent: !!profile?.team },
                ].map((r, i, arr) => (
                  <div key={r.label} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '11px 0',
                    borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 14, lineHeight: 1 }}>{r.icon}</span>
                      <span style={{ fontSize: 12, color: 'var(--text3)' }}>{r.label}</span>
                    </div>
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      color: r.accent ? 'var(--accent)' : 'var(--text2)',
                    }}>{r.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick CTA card */}
            <div style={{
              borderRadius: 18, padding: '18px 20px',
              background: 'linear-gradient(145deg, rgba(215,255,0,0.06), rgba(215,255,0,0.02))',
              border: '1px solid rgba(215,255,0,0.1)',
            }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>¿Listo para jugar?</p>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 14, lineHeight: 1.5 }}>
                Encontrá canchas disponibles y hacé una reserva hoy.
              </p>
              <Link href="/explorar" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 12, fontWeight: 700, color: '#000',
                background: 'var(--accent)', padding: '8px 16px',
                borderRadius: 9, textDecoration: 'none',
                letterSpacing: '-0.01em',
              }}>
                Explorar canchas →
              </Link>
            </div>

          </div>

          {/* ── Right column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Mis reservas */}
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 12,
              }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text3)', textTransform: 'uppercase' }}>
                  Mis Reservas
                </p>
                {bookings.length > 0 && (
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    padding: '3px 10px', borderRadius: 99,
                    background: 'rgba(215,255,0,0.08)',
                    color: 'var(--accent)',
                    border: '1px solid rgba(215,255,0,0.15)',
                  }}>{bookings.length}</span>
                )}
              </div>

              {bookings.length === 0 ? (
                <div style={{
                  borderRadius: 18, padding: '40px 24px', textAlign: 'center',
                  background: 'linear-gradient(145deg, #141414, #0f0f0f)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 16, margin: '0 auto 14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}>
                    <Calendar size={22} style={{ color: 'var(--text3)' }} />
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 5, letterSpacing: '-0.01em' }}>Sin reservas aún</p>
                  <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20, lineHeight: 1.5 }}>
                    Explorá canchas disponibles y hacé tu primera reserva.
                  </p>
                  <Link href="/explorar" className="btn-primary" style={{ padding: '9px 22px', fontSize: 12, borderRadius: 9 }}>
                    Explorar canchas →
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {bookings.map(b => {
                    const meta = STATUS[b.status] ?? STATUS.pending;
                    const isHov = hoveredBooking === b.id;
                    return (
                      <div
                        key={b.id}
                        className="booking-row"
                        onMouseEnter={() => setHoveredBooking(b.id)}
                        onMouseLeave={() => setHoveredBooking(null)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '14px 18px', borderRadius: 14,
                          background: isHov
                            ? 'linear-gradient(145deg, #181818, #121212)'
                            : 'linear-gradient(145deg, #141414, #0f0f0f)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          transition: 'all 0.18s',
                          boxShadow: isHov ? '0 8px 32px rgba(0,0,0,0.4)' : 'none',
                          cursor: 'default',
                          gap: 12,
                        }}>
                        {/* Left: icon + info */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 13, flex: 1, minWidth: 0 }}>
                          <div style={{
                            width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 17,
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.07)',
                          }}>⚽</div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{
                              fontWeight: 700, fontSize: 13,
                              marginBottom: 3,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>{b.court_name}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--text3)' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={9} /> {b.hours}h
                              </span>
                              <span style={{ color: 'rgba(255,255,255,0.12)' }}>·</span>
                              <span>{b.players ?? 10} jug.</span>
                            </div>
                          </div>
                        </div>

                        {/* Right: price + status */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{
                            fontWeight: 800, fontSize: 15,
                            color: 'var(--accent)',
                            letterSpacing: '-0.02em', marginBottom: 4,
                          }}>
                            ₡{Math.round(b.total_price ?? 0).toLocaleString('es-CR')}
                          </p>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
                            background: meta.bg, color: meta.color,
                            border: `1px solid ${meta.border}`,
                            letterSpacing: '0.02em',
                          }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: meta.dot, display: 'inline-block' }} />
                            {meta.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Historial de partidos */}
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 12 }}>
                Historial de Partidos
              </p>

              <div style={{
                borderRadius: 18, overflow: 'hidden',
                background: 'linear-gradient(145deg, #141414, #0f0f0f)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                {/* Decorative top gradient bar */}
                <div style={{
                  height: 3,
                  background: 'linear-gradient(90deg, rgba(215,255,0,0.0) 0%, rgba(215,255,0,0.35) 50%, rgba(215,255,0,0.0) 100%)',
                }} />

                <div style={{ padding: '36px 24px', textAlign: 'center' }}>
                  {/* Football field illustration */}
                  <div style={{
                    width: 64, height: 64, borderRadius: 20, margin: '0 auto 16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'linear-gradient(145deg, rgba(215,255,0,0.08), rgba(215,255,0,0.02))',
                    border: '1px solid rgba(215,255,0,0.12)',
                    fontSize: 28,
                    boxShadow: '0 0 40px rgba(215,255,0,0.06)',
                  }}>
                    ⚽
                  </div>

                  <p style={{
                    fontSize: 15, fontWeight: 800,
                    letterSpacing: '-0.02em', marginBottom: 6,
                  }}>Sin partidos aún</p>
                  <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6, lineHeight: 1.6, maxWidth: 260, margin: '0 auto 20px' }}>
                    Aceptá un reto o creá tu propio partido y tu historial aparecerá aquí.
                  </p>

                  {/* Stats preview row */}
                  <div style={{
                    display: 'flex', justifyContent: 'center', gap: 0,
                    marginBottom: 20,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 12, overflow: 'hidden',
                  }}>
                    {[
                      { label: 'Victorias', val: '0' },
                      { label: 'Empates',   val: '0' },
                      { label: 'Derrotas',  val: '0' },
                    ].map((s, i, arr) => (
                      <div key={s.label} style={{
                        flex: 1, padding: '12px 8px', textAlign: 'center',
                        borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      }}>
                        <p style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-0.02em', marginBottom: 2 }}>{s.val}</p>
                        <p style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500 }}>{s.label}</p>
                      </div>
                    ))}
                  </div>

                  <Link href="/juegos" className="btn-primary" style={{ padding: '9px 22px', fontSize: 12, borderRadius: 9 }}>
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

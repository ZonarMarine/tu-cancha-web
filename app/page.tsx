import Link from "next/link";
import { MapPin, Star, ChevronRight, Users, Zap, ArrowUp } from "lucide-react";
import { COURTS, GAMES, fmtColones } from "@/lib/data";
import LiveTicker from "@/components/LiveTicker";
import MatchCard from "@/components/MatchCard";

// ─── Static data ──────────────────────────────────────────────
const TOP_PLAYERS = [
  { rank: 1, name: 'Carlos Rodríguez', pos: 'Delantero',     rating: 4.9, goals: 23, badge: '🏆', trend: '+3' },
  { rank: 2, name: 'Marco Jiménez',    pos: 'Mediocampista',  rating: 4.8, goals: 14, badge: '⚡', trend: '+1' },
  { rank: 3, name: 'Diego Solano',     pos: 'Portero',        rating: 4.8, goals: 0,  badge: '🧤', trend: '–'  },
  { rank: 4, name: 'Kevin Pérez',      pos: 'Defensa',        rating: 4.7, goals: 3,  badge: '🛡', trend: '+2' },
  { rank: 5, name: 'Alejandro Mora',   pos: 'Delantero',      rating: 4.7, goals: 19, badge: '🔥', trend: '+5' },
];
const RANK_COLORS = ['var(--accent)', '#888', '#9b7340', 'var(--text3)', 'var(--text3)'];

const MATCH_FILLS = [
  { filled: 8, total: 10 },
  { filled: 9, total: 14 },
  { filled: 6, total: 10 },
];

const TOURNAMENTS = [
  { name: 'Liga Nocturna Santa Ana', format: '5v5', teams: '12 equipos', date: '15 Jun', prize: '₡200,000', spots: 4 },
  { name: 'Copa Escazú 2026',        format: '7v7', teams: '8 equipos',  date: '22 Jun', prize: '₡350,000', spots: 2 },
  { name: 'Torneo Heredia Abierto',  format: '5v5', teams: '16 equipos', date: '1 Jul',  prize: '₡500,000', spots: 8 },
];

const OWNER_FEATURES = [
  'Reservas 24/7', 'Analytics en tiempo real',
  'Precios dinámicos', 'Sin comisiones',
];

// Shared section header style
const S = {
  section: { padding: '80px 0' } as React.CSSProperties,
  sectionAlt: { padding: '80px 0', backgroundColor: 'var(--surface)' } as React.CSSProperties,
};

// ─────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div style={{ backgroundColor: 'var(--bg)' }}>

      {/* ══════════════════════════════════
          HERO
      ══════════════════════════════════ */}
      <section style={{
        position: 'relative',
        minHeight: '100svh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 64,
        paddingBottom: '14vh',  /* shifts visual center upward */
        overflow: 'hidden',
        textAlign: 'center',
      }}>

        {/* Background */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{
            position: 'absolute', top: '38%', left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 900, height: 900,
            background: 'radial-gradient(circle, rgba(215,255,0,0.05) 0%, transparent 62%)',
            animation: 'heroGlow 8s ease-in-out infinite',
          }} />
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.015,
            backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)',
            backgroundSize: '72px 72px',
          }} />
        </div>

        <style>{`
          @keyframes heroGlow {
            0%,100% { opacity:1; transform:translate(-50%,-50%) scale(1); }
            50%      { opacity:0.5; transform:translate(-50%,-50%) scale(1.07); }
          }
          @keyframes scrollCue {
            0%,100% { transform:translateY(0); opacity:1; }
            50%      { transform:translateY(6px); opacity:0.4; }
          }
        `}</style>

        {/* Hero content */}
        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 780, padding: '0 24px' }}>

          {/* Live badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '7px 16px', borderRadius: 99, marginBottom: 52,
            background: 'rgba(215,255,0,0.05)',
            border: '1px solid rgba(215,255,0,0.13)',
            fontSize: 11, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.08em',
          }}>
            <span className="pulse-live" style={{
              width: 6, height: 6, borderRadius: '50%',
              backgroundColor: 'var(--accent)', display: 'inline-block',
            }} />
            {GAMES.length} PARTIDOS ACTIVOS · COSTA RICA
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(50px, 7vw, 84px)',
            fontWeight: 900, lineHeight: 1.0,
            letterSpacing: '-0.03em',
            marginBottom: 28,
          }}>
            Jugá hoy.<br />
            <span style={{
              color: 'var(--accent)',
              textShadow: '0 0 80px rgba(215,255,0,0.15)',
            }}>Sin organizar</span><br />
            nada.
          </h1>

          {/* Subtitle */}
          <p style={{
            color: 'var(--text3)', fontSize: 17, lineHeight: 1.65,
            maxWidth: 420, margin: '0 auto', marginBottom: 44,
          }}>
            El sistema operativo del fútbol amateur en Costa Rica.
            Partidos, canchas y rivales. En segundos.
          </p>

          {/* CTAs */}
          <div style={{
            display: 'flex', flexWrap: 'wrap',
            alignItems: 'center', justifyContent: 'center',
            gap: 12, marginBottom: 64,
          }}>
            <Link href="/juegos" className="btn-primary"
              style={{ padding: '14px 32px', fontSize: 14, borderRadius: 14 }}>
              Ver partidos activos →
            </Link>
            <Link href="/explorar" style={{
              padding: '13px 28px', borderRadius: 14, fontSize: 14,
              fontWeight: 500, color: 'var(--text3)',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.02)',
              backdropFilter: 'blur(8px)',
              transition: 'border-color 0.18s',
              display: 'inline-block',
            }}>
              Explorar canchas
            </Link>
          </div>

          {/* Live stats */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 36 }}>
            {[
              { val: '24', label: 'jugadores activos' },
              { val: '6',  label: 'partidos abiertos' },
              { val: '3',  label: 'canchas disponibles' },
            ].map((s, i) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center' }}>
                {i > 0 && (
                  <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.07)', margin: '0 32px' }} />
                )}
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em', marginBottom: 3 }}>{s.val}</p>
                  <p style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.03em' }}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Ticker */}
          <div style={{ maxWidth: 340, margin: '0 auto' }}>
            <LiveTicker />
          </div>
        </div>

        {/* Scroll cue */}
        <div style={{
          position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          animation: 'scrollCue 2.5s ease-in-out infinite',
        }}>
          <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom,transparent,rgba(255,255,255,0.15))', margin: '0 auto' }} />
        </div>
      </section>

      {/* ══════════════════════════════════
          RETOS
      ══════════════════════════════════ */}
      <section style={{ ...S.section, borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 48 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span className="pulse-live" style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#FF6B35', display: 'inline-block' }} />
                <p className="eyebrow" style={{ color: '#FF6B35' }}>TRENDING ESTA NOCHE</p>
              </div>
              <h2 style={{ fontSize: 'clamp(26px, 3vw, 38px)', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 10 }}>
                Retos que se llenan ahora.
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text3)' }}>Equipos buscando rival esta noche. Cupo libre disponible.</p>
            </div>
            <Link href="/juegos" style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 13, color: 'var(--text3)', fontWeight: 500,
              whiteSpace: 'nowrap', opacity: 0.8,
            }}>
              Ver todos <ChevronRight size={13} />
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20 }}>
            {GAMES.slice(0, 3).map((g, i) => (
              <MatchCard key={g.id} g={g} filled={MATCH_FILLS[i].filled} total={MATCH_FILLS[i].total} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          STATS
      ══════════════════════════════════ */}
      <section style={{ ...S.sectionAlt, borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
            gap: 1, background: 'var(--border)',
            borderRadius: 16, overflow: 'hidden',
          }}>
            {[
              { val: '1,240+', label: 'Jugadores activos', Icon: Users },
              { val: '50+',    label: 'Canchas afiliadas', Icon: MapPin },
              { val: '320+',   label: 'Partidos este mes', Icon: Zap },
              { val: '4.9★',   label: 'Rating promedio',   Icon: Star },
            ].map(s => (
              <div key={s.label} style={{
                background: 'var(--surface)', textAlign: 'center',
                padding: '36px 20px',
              }}>
                <s.Icon size={14} style={{ color: 'var(--text3)', marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
                <p style={{ fontWeight: 900, fontSize: 'clamp(26px,3vw,36px)', letterSpacing: '-0.02em', marginBottom: 6 }}>{s.val}</p>
                <p style={{ fontSize: 12, color: 'var(--text3)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          TOP PLAYERS
      ══════════════════════════════════ */}
      <section style={S.section}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 48 }}>
            <div>
              <p className="eyebrow" style={{ marginBottom: 14 }}>RANKINGS</p>
              <h2 style={{ fontSize: 'clamp(26px, 3vw, 38px)', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 10 }}>
                Top jugadores esta semana.
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text3)' }}>Los más activos y mejor valorados de la plataforma.</p>
            </div>
            <Link href="/auth" style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 13, color: 'var(--text3)', fontWeight: 500, whiteSpace: 'nowrap', opacity: 0.8,
            }}>
              Ranking completo <ChevronRight size={13} />
            </Link>
          </div>

          {/* Column headers */}
          <div style={{
            display: 'grid', gridTemplateColumns: '36px 1fr 80px 64px 52px',
            gap: 16, padding: '0 20px 12px', alignItems: 'center',
          }}>
            {['#', 'Jugador', 'Rating', 'Goles', ''].map(h => (
              <p key={h} className="eyebrow">{h}</p>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {TOP_PLAYERS.map((p, i) => (
              <div key={p.name} style={{
                display: 'grid', gridTemplateColumns: '36px 1fr 80px 64px 52px',
                gap: 16, alignItems: 'center',
                padding: '14px 20px', borderRadius: 16,
                background: i === 0 ? 'rgba(215,255,0,0.035)' : 'var(--surface)',
                border: `1px solid ${i === 0 ? 'rgba(215,255,0,0.08)' : 'rgba(255,255,255,0.055)'}`,
                cursor: 'pointer',
                transition: 'border-color 0.18s',
              }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: RANK_COLORS[i] }}>{i + 1}</span>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800,
                    background: i === 0 ? 'rgba(215,255,0,0.1)' : 'var(--surface2)',
                    color: i === 0 ? 'var(--accent)' : 'var(--text2)',
                  }}>
                    {p.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <p style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                      <span style={{ fontSize: 12 }}>{p.badge}</span>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{p.pos}</p>
                  </div>
                </div>

                <p style={{ fontWeight: 700, fontSize: 14, color: i === 0 ? 'var(--accent)' : 'var(--text2)' }}>{p.rating}★</p>
                <p style={{ fontWeight: 500, fontSize: 14, color: 'var(--text2)' }}>{p.goals}</p>

                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  {p.trend !== '–' && <ArrowUp size={10} style={{ color: '#4ADE80' }} />}
                  <span style={{ fontSize: 12, color: p.trend !== '–' ? '#4ADE80' : 'var(--text3)' }}>{p.trend}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          CANCHAS
      ══════════════════════════════════ */}
      <section style={{ ...S.sectionAlt, borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 48 }}>
            <div>
              <p className="eyebrow" style={{ marginBottom: 14 }}>CANCHAS</p>
              <h2 style={{ fontSize: 'clamp(26px, 3vw, 38px)', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 10 }}>
                Las más reservadas.
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text3)' }}>Asegurá tu horario antes de que se llene.</p>
            </div>
            <Link href="/explorar" style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 13, color: 'var(--text3)', fontWeight: 500, whiteSpace: 'nowrap', opacity: 0.8,
            }}>
              Ver todas <ChevronRight size={13} />
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20 }}>
            {COURTS.slice(0, 3).map(c => {
              const urgency = c.slotsAvailable <= 2 ? 'Últimos cupos' : c.slotsAvailable <= 4 ? 'Se llena rápido' : null;
              return (
                <Link key={c.id} href={`/cancha/${c.id}`} style={{
                  display: 'block', borderRadius: 20, overflow: 'hidden',
                  background: 'linear-gradient(145deg, #121200 0%, #0d0d0d 100%)',
                  border: '1px solid rgba(255,255,255,0.055)',
                  transition: 'all 0.22s ease',
                  textDecoration: 'none', color: 'inherit',
                }}>
                  {/* Image */}
                  <div style={{
                    height: 172, position: 'relative',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'linear-gradient(135deg, #0c1800 0%, #060c00 100%)',
                  }}>
                    <div className="shimmer" />
                    <span style={{ fontSize: 40, position: 'relative', zIndex: 1 }}>⚽</span>
                    {urgency && (
                      <span style={{
                        position: 'absolute', top: 14, left: 14, zIndex: 2,
                        fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8,
                        background: 'rgba(255,107,53,0.12)', color: '#FF6B35',
                        border: '1px solid rgba(255,107,53,0.12)',
                      }}>{urgency}</span>
                    )}
                    <span style={{
                      position: 'absolute', top: 14, right: 14, zIndex: 2,
                      fontSize: 11, padding: '4px 10px', borderRadius: 8,
                      background: 'rgba(0,0,0,0.55)', color: 'var(--text3)',
                      backdropFilter: 'blur(6px)',
                    }}>{c.slotsAvailable} slots hoy</span>
                  </div>
                  {/* Info */}
                  <div style={{ padding: '20px 22px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <p style={{ fontWeight: 600, fontSize: 14 }}>{c.title}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0, marginLeft: 8, fontSize: 12, color: '#FACC15', fontWeight: 600 }}>
                        <Star size={10} fill="currentColor" />{c.rating}
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 18 }}>📍 {c.location}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontWeight: 900, fontSize: 17, color: 'var(--accent)' }}>{fmtColones(c.basePrice)}</span>
                        <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 4 }}>/ hora</span>
                      </div>
                      <span style={{
                        fontSize: 11, padding: '4px 10px', borderRadius: 8,
                        background: 'var(--surface2)', color: 'var(--text3)',
                      }}>{c.sport}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          TORNEOS
      ══════════════════════════════════ */}
      <section style={{ ...S.section, borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 48 }}>
            <div>
              <p className="eyebrow" style={{ marginBottom: 14, color: '#A78BFA' }}>TORNEOS</p>
              <h2 style={{ fontSize: 'clamp(26px, 3vw, 38px)', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 10 }}>
                Competí por algo.
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text3)' }}>Próximos torneos abiertos. Inscribí tu equipo.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}>
            {TOURNAMENTS.map(t => (
              <div key={t.name} style={{
                borderRadius: 20, padding: '26px',
                background: 'linear-gradient(145deg, #131313 0%, #0e0e0e 100%)',
                border: '1px solid rgba(255,255,255,0.055)',
                display: 'flex', flexDirection: 'column', gap: 0,
                transition: 'all 0.22s ease',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8,
                    background: 'rgba(167,139,250,0.1)', color: '#A78BFA',
                  }}>{t.format}</span>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>{t.date}</span>
                </div>

                <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 5 }}>{t.name}</p>
                <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>{t.teams}</p>

                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '16px 0', marginBottom: 20,
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>Premio</p>
                    <p style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-0.01em' }}>{t.prize}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>Cupos</p>
                    <p style={{ fontWeight: 700, fontSize: 15, color: t.spots <= 3 ? '#FF6B35' : 'var(--text2)' }}>
                      {t.spots} libres
                    </p>
                  </div>
                </div>

                <button style={{
                  width: '100%', padding: '12px', borderRadius: 12,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  background: 'rgba(167,139,250,0.07)',
                  color: '#A78BFA',
                  border: '1px solid rgba(167,139,250,0.14)',
                  transition: 'opacity 0.18s',
                }}>
                  Inscribir equipo
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          OWNER — 2-column premium
      ══════════════════════════════════ */}
      <section style={{ ...S.sectionAlt, borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}
            className="owner-grid">
            <style>{`
              @media (max-width: 900px) {
                .owner-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
              }
            `}</style>

            {/* Copy */}
            <div>
              <p className="eyebrow" style={{ marginBottom: 16, color: 'var(--accent)' }}>DUEÑOS DE CANCHA</p>
              <h2 style={{ fontSize: 'clamp(26px, 3vw, 40px)', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.18, marginBottom: 18 }}>
                Tu negocio merece<br />
                <span style={{ color: 'var(--accent)' }}>tecnología de primera.</span>
              </h2>
              <p style={{ fontSize: 16, color: 'var(--text3)', lineHeight: 1.7, marginBottom: 36, maxWidth: 400 }}>
                Reservas automáticas. Dashboard de ingresos. Analytics en tiempo real.
                El sistema operativo moderno para tu cancha.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', marginBottom: 40 }}>
                {OWNER_FEATURES.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 700 }}>✓</span>
                    <span style={{ fontSize: 13, color: 'var(--text2)' }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/auth?mode=signup&role=owner" className="btn-primary"
                style={{ padding: '14px 32px', fontSize: 14, borderRadius: 14, display: 'inline-flex' }}>
                Registrá tu cancha →
              </Link>
            </div>

            {/* Dashboard mockup */}
            <div style={{
              borderRadius: 24, overflow: 'hidden',
              background: 'rgba(12,12,12,0.85)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}>
              {/* Titlebar */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '14px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}>
                {['#FF5F57','#FEBC2E','#28C840'].map(c => (
                  <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                ))}
                <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8 }}>Dashboard · Complejo Fedefutbol</span>
              </div>

              <div style={{ padding: '24px' }}>
                {/* Revenue row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 5 }}>Ingresos este mes</p>
                    <p style={{ fontWeight: 900, fontSize: 28, color: 'var(--accent)', letterSpacing: '-0.02em' }}>₡485,000</p>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8,
                    background: 'rgba(74,222,128,0.1)', color: '#4ADE80',
                  }}>↑ 24%</span>
                </div>

                {/* Bar chart */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 64, marginBottom: 6 }}>
                  {[35, 48, 28, 65, 42, 100, 55].map((h, i) => (
                    <div key={i} style={{
                      flex: 1, borderRadius: '4px 4px 0 0',
                      height: `${h}%`,
                      background: i === 5 ? 'var(--accent)' : 'rgba(255,255,255,0.07)',
                      transition: 'height 0.3s',
                    }} />
                  ))}
                </div>
                <p style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 20 }}>L  M  X  J  V  S  D</p>

                {/* Mini stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
                  {[
                    { val: '28',  label: 'Reservas' },
                    { val: '94%', label: 'Ocupación' },
                    { val: '4.9★', label: 'Rating' },
                  ].map(s => (
                    <div key={s.label} style={{
                      background: 'rgba(255,255,255,0.04)', borderRadius: 10,
                      padding: '12px 8px', textAlign: 'center',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}>
                      <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{s.val}</p>
                      <p style={{ fontSize: 10, color: 'var(--text3)' }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Bookings */}
                <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10 }}>Próximas reservas</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { name: 'Carlos R.', time: '7:00 PM · Cancha A', status: 'Confirmada', ok: true },
                    { name: 'Alajuela FC', time: '8:30 PM · Cancha B', status: 'Pendiente', ok: false },
                  ].map(b => (
                    <div key={b.name} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 12px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 13 }}>{b.name}</p>
                        <p style={{ fontSize: 11, color: 'var(--text3)' }}>{b.time}</p>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 6,
                        background: b.ok ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.04)',
                        color: b.ok ? '#4ADE80' : 'var(--text3)',
                      }}>{b.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          FINAL CTA
      ══════════════════════════════════ */}
      <section style={{ position: 'relative', padding: '112px 40px', textAlign: 'center', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 55% 65% at 50% 50%, rgba(215,255,0,0.04) 0%, transparent 70%)',
        }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 560, margin: '0 auto' }}>
          <p className="eyebrow" style={{ marginBottom: 28 }}>EMPEZÁ HOY · GRATIS</p>
          <h2 style={{
            fontSize: 'clamp(38px, 5.5vw, 62px)',
            fontWeight: 900, lineHeight: 1.08, letterSpacing: '-0.03em', marginBottom: 20,
          }}>
            ¿Cuándo fue<br />
            la última vez<br />
            que <span style={{ color: 'var(--accent)', textShadow: '0 0 40px rgba(215,255,0,0.18)' }}>jugaste?</span>
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text3)', marginBottom: 44 }}>
            Tu próximo partido está a un tap de distancia.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
            <Link href="/auth?mode=signup" className="btn-primary"
              style={{ padding: '14px 36px', fontSize: 14, borderRadius: 14 }}>
              Jugá hoy gratis →
            </Link>
            <Link href="/juegos" style={{
              padding: '13px 28px', borderRadius: 14, fontSize: 14,
              fontWeight: 500, color: 'var(--text3)',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.02)',
              display: 'inline-block',
            }}>
              Ver partidos activos
            </Link>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text3)' }}>Sin tarjeta. Sin complicaciones. 30 segundos.</p>
        </div>
      </section>

    </div>
  );
}

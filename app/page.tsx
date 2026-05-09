import Link from "next/link";
import { MapPin, Star, ChevronRight, Trophy, Users, Zap, ArrowUp } from "lucide-react";
import { COURTS, GAMES, fmtColones } from "@/lib/data";
import LiveTicker from "@/components/LiveTicker";
import MatchCard from "@/components/MatchCard";

// ─────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────

const TOP_PLAYERS = [
  { rank: 1, name: 'Carlos Rodríguez', pos: 'Delantero',    rating: 4.9, goals: 23, badge: '🏆', trend: '+3' },
  { rank: 2, name: 'Marco Jiménez',    pos: 'Mediocampista', rating: 4.8, goals: 14, badge: '⚡', trend: '+1' },
  { rank: 3, name: 'Diego Solano',     pos: 'Portero',       rating: 4.8, goals: 0,  badge: '🧤', trend: '–'  },
  { rank: 4, name: 'Kevin Pérez',      pos: 'Defensa',       rating: 4.7, goals: 3,  badge: '🛡', trend: '+2' },
  { rank: 5, name: 'Alejandro Mora',   pos: 'Delantero',     rating: 4.7, goals: 19, badge: '🔥', trend: '+5' },
];

const PLAYER_COLORS = ['#D7FF00', '#A0A0A0', '#CD7F32', '#505050', '#505050'];

const MATCH_FILLS = [
  { filled: 8,  total: 10 },
  { filled: 9,  total: 14 },
  { filled: 6,  total: 10 },
];

const TOURNAMENTS = [
  { name: 'Liga Nocturna Santa Ana', format: '5v5', teams: '12 equipos', date: '15 Jun', prize: '₡200,000', spots: 4 },
  { name: 'Copa Escazú 2026',        format: '7v7', teams: '8 equipos',  date: '22 Jun', prize: '₡350,000', spots: 2 },
  { name: 'Torneo Heredia Abierto',  format: '5v5', teams: '16 equipos', date: '1 Jul',  prize: '₡500,000', spots: 8 },
];

// ─────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div>

      {/* ═══════════════════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-5 overflow-hidden"
        style={{ paddingTop: 64 }}>

        {/* Ambient glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(215,255,0,0.06) 0%, transparent 70%)',
              animation: 'pulse-glow 6s ease-in-out infinite',
            }} />
          <div className="absolute bottom-1/3 right-1/4 w-[300px] h-[300px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255,107,53,0.04) 0%, transparent 70%)',
              animation: 'pulse-glow 8s ease-in-out infinite 2s',
            }} />
          <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }} />
        </div>

        <style>{`
          @keyframes pulse-glow {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.5; }
          }
          @keyframes float-up {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
        `}</style>

        <div className="relative z-10 w-full max-w-4xl mx-auto">

          {/* Live badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-10 text-xs font-semibold"
            style={{
              backgroundColor: 'rgba(215,255,0,0.05)',
              border: '1px solid rgba(215,255,0,0.15)',
              color: 'var(--accent)',
              letterSpacing: '0.05em',
            }}>
            <span className="w-1.5 h-1.5 rounded-full pulse-live" style={{ backgroundColor: 'var(--accent)' }} />
            {GAMES.length} partidos activos · Costa Rica
          </div>

          {/* Headline */}
          <h1 className="font-black leading-none tracking-tighter mb-8"
            style={{ fontSize: 'clamp(52px, 9vw, 104px)', letterSpacing: '-0.03em' }}>
            Jugá hoy.<br />
            <span style={{
              color: 'var(--accent)',
              textShadow: '0 0 80px rgba(215,255,0,0.25)',
            }}>Sin organizar</span><br />
            nada.
          </h1>

          <p className="text-lg max-w-md mx-auto mb-12 leading-relaxed"
            style={{ color: 'var(--text3)', fontSize: 18 }}>
            El sistema operativo del fútbol amateur en Costa Rica.
            Partidos, canchas y rivales. En segundos.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
            <Link href="/juegos" className="btn-primary px-8 py-4 text-sm w-full sm:w-auto text-center"
              style={{ fontSize: 15, letterSpacing: '0.01em' }}>
              Ver partidos activos →
            </Link>
            <Link href="/explorar"
              className="px-8 py-4 rounded-2xl text-sm font-semibold w-full sm:w-auto text-center transition-all"
              style={{ border: '1px solid var(--border2)', color: 'var(--text2)', backgroundColor: 'transparent' }}>
              Explorar canchas
            </Link>
          </div>

          {/* Live stats — quieter */}
          <div className="flex flex-wrap items-center justify-center gap-6 mb-10">
            {[
              { val: '24', label: 'jugadores conectados' },
              { val: '6',  label: 'partidos llenándose'  },
              { val: '3',  label: 'canchas activas'       },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2">
                <span className="font-black text-sm" style={{ color: 'var(--accent)' }}>{s.val}</span>
                <span className="text-xs" style={{ color: 'var(--text3)' }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Live ticker */}
          <div className="max-w-xs mx-auto">
            <LiveTicker />
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2"
          style={{ animation: 'float-up 2.5s ease-in-out infinite' }}>
          <div className="w-px h-12 mx-auto" style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.15))' }} />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          TRENDING TONIGHT
      ═══════════════════════════════════════════════════════ */}
      <section className="py-32 px-5">
        <div className="max-w-7xl mx-auto">

          <div className="flex items-end justify-between mb-14">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1.5 h-1.5 rounded-full pulse-live" style={{ backgroundColor: '#FF6B35' }} />
                <p className="text-xs font-semibold tracking-widest" style={{ color: '#FF6B35', letterSpacing: '0.1em' }}>TRENDING ESTA NOCHE</p>
              </div>
              <h2 className="font-black leading-tight" style={{ fontSize: 'clamp(28px, 4vw, 44px)', letterSpacing: '-0.02em' }}>
                Retos que se llenan ahora.
              </h2>
            </div>
            <Link href="/juegos" className="hidden md:flex items-center gap-1 text-sm font-medium hover:opacity-60 transition-opacity"
              style={{ color: 'var(--text3)' }}>
              Ver todos <ChevronRight size={14} />
            </Link>
          </div>

          {/* 1 featured + 2 regular */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-1">
              <MatchCard g={GAMES[0]} filled={MATCH_FILLS[0].filled} total={MATCH_FILLS[0].total} featured />
            </div>
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5">
              {GAMES.slice(1, 3).map((g, i) => (
                <MatchCard key={g.id} g={g} filled={MATCH_FILLS[i + 1].filled} total={MATCH_FILLS[i + 1].total} />
              ))}
            </div>
          </div>

          <div className="mt-8 text-center md:hidden">
            <Link href="/juegos" className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
              Ver todos los partidos →
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SPORTS STRIP
      ═══════════════════════════════════════════════════════ */}
      <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-7xl mx-auto px-5 py-4 flex items-center gap-3 overflow-x-auto no-scrollbar">
          {[
            { emoji: '⚽', sport: 'Fútbol',   active: true  },
            { emoji: '🎾', sport: 'Pádel',    active: false },
            { emoji: '🏀', sport: 'Básquet',  active: false },
            { emoji: '🏐', sport: 'Voleibol', active: false },
            { emoji: '⛳', sport: 'Golf',     active: false },
          ].map(s => (
            <div key={s.sport}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl flex-shrink-0 transition-all"
              style={{
                backgroundColor: s.active ? 'var(--accent-dark)' : 'transparent',
                border: `1px solid ${s.active ? 'rgba(215,255,0,0.15)' : 'var(--border)'}`,
                opacity: s.active ? 1 : 0.4,
              }}>
              <span className="text-base">{s.emoji}</span>
              <div>
                <p className="text-xs font-semibold" style={{ color: s.active ? 'var(--accent)' : 'var(--text2)' }}>{s.sport}</p>
                {!s.active && <p className="text-xs" style={{ color: 'var(--text3)', fontSize: 10 }}>Próximamente</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          COMMUNITY STATS
      ═══════════════════════════════════════════════════════ */}
      <section className="py-28 px-5">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-px"
          style={{ backgroundColor: 'var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          {[
            { val: '1,240+', label: 'Jugadores activos', icon: <Users size={16} /> },
            { val: '50+',    label: 'Canchas afiliadas', icon: <MapPin size={16} /> },
            { val: '320+',   label: 'Partidos este mes', icon: <Zap size={16} />   },
            { val: '4.9★',   label: 'Rating promedio',   icon: <Star size={16} />  },
          ].map(s => (
            <div key={s.label} className="text-center py-10 px-6"
              style={{ backgroundColor: 'var(--surface)' }}>
              <div className="mb-1" style={{ color: 'var(--text3)' }}>{s.icon}</div>
              <p className="text-3xl font-black tracking-tight mb-1" style={{ letterSpacing: '-0.02em' }}>{s.val}</p>
              <p className="text-xs" style={{ color: 'var(--text3)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          TOP PLAYERS
      ═══════════════════════════════════════════════════════ */}
      <section className="py-28 px-5" style={{ backgroundColor: 'var(--surface)' }}>
        <div className="max-w-7xl mx-auto">

          <div className="flex items-end justify-between mb-14">
            <div>
              <p className="text-xs font-semibold tracking-widest mb-4" style={{ color: 'var(--text3)', letterSpacing: '0.1em' }}>RANKINGS</p>
              <h2 className="font-black leading-tight" style={{ fontSize: 'clamp(28px, 4vw, 44px)', letterSpacing: '-0.02em' }}>
                Top jugadores esta semana.
              </h2>
            </div>
            <Link href="/auth" className="hidden md:flex items-center gap-1 text-sm font-medium hover:opacity-60 transition-opacity"
              style={{ color: 'var(--text3)' }}>
              Ranking completo <ChevronRight size={14} />
            </Link>
          </div>

          <div className="space-y-1.5">
            {TOP_PLAYERS.map((p, i) => (
              <div key={p.name}
                className="flex items-center gap-5 px-5 py-4 rounded-2xl cursor-pointer transition-colors"
                style={{
                  backgroundColor: i === 0 ? 'rgba(215,255,0,0.04)' : 'var(--bg)',
                  border: `1px solid ${i === 0 ? 'rgba(215,255,0,0.1)' : 'var(--border)'}`,
                }}>

                {/* Rank */}
                <span className="w-6 text-center text-sm font-black flex-shrink-0"
                  style={{ color: PLAYER_COLORS[i] }}>
                  {i + 1}
                </span>

                {/* Avatar */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0"
                  style={{
                    backgroundColor: i === 0 ? 'rgba(215,255,0,0.12)' : 'var(--surface2)',
                    color: i === 0 ? 'var(--accent)' : 'var(--text2)',
                  }}>
                  {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>

                {/* Name + position */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">{p.name}</p>
                    <span className="text-xs">{p.badge}</span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>{p.pos}</p>
                </div>

                {/* Rating + goals */}
                <div className="hidden sm:flex items-center gap-8 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: i === 0 ? 'var(--accent)' : 'var(--text2)' }}>{p.rating}★</p>
                    <p className="text-xs" style={{ color: 'var(--text3)' }}>Rating</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{p.goals}</p>
                    <p className="text-xs" style={{ color: 'var(--text3)' }}>Goles</p>
                  </div>
                </div>

                {/* Trend */}
                <div className="flex items-center gap-1 w-8 justify-end flex-shrink-0">
                  {p.trend !== '–' && <ArrowUp size={11} style={{ color: '#4ADE80' }} />}
                  <span className="text-xs" style={{ color: p.trend !== '–' ? '#4ADE80' : 'var(--text3)' }}>{p.trend}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          POPULAR COURTS
      ═══════════════════════════════════════════════════════ */}
      <section className="py-32 px-5">
        <div className="max-w-7xl mx-auto">

          <div className="flex items-end justify-between mb-14">
            <div>
              <p className="text-xs font-semibold tracking-widest mb-4" style={{ color: 'var(--text3)', letterSpacing: '0.1em' }}>CANCHAS</p>
              <h2 className="font-black leading-tight" style={{ fontSize: 'clamp(28px, 4vw, 44px)', letterSpacing: '-0.02em' }}>
                Las más reservadas.
              </h2>
            </div>
            <Link href="/explorar" className="hidden md:flex items-center gap-1 text-sm font-medium hover:opacity-60 transition-opacity"
              style={{ color: 'var(--text3)' }}>
              Ver todas <ChevronRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {COURTS.slice(0, 3).map(c => {
              const urgencyText = c.slotsAvailable <= 2 ? 'Últimos cupos' : c.slotsAvailable <= 4 ? 'Se llena rápido' : null;
              return (
                <Link key={c.id} href={`/cancha/${c.id}`}
                  className="block rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5"
                  style={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    transition: 'all 0.2s ease',
                  }}>
                  <div className="h-44 relative flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #0a1600 0%, #060c00 100%)' }}>
                    <div className="absolute inset-0 shimmer opacity-50" />
                    <span className="text-4xl relative z-10">⚽</span>
                    {urgencyText && (
                      <div className="absolute top-4 left-4 z-10">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                          style={{ backgroundColor: 'rgba(255,107,53,0.15)', color: '#FF6B35', border: '1px solid rgba(255,107,53,0.15)' }}>
                          {urgencyText}
                        </span>
                      </div>
                    )}
                    <div className="absolute top-4 right-4 z-10">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-lg"
                        style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: 'var(--text3)' }}>
                        {c.slotsAvailable} slots hoy
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-1.5">
                      <h3 className="font-bold text-sm">{c.title}</h3>
                      <div className="flex items-center gap-1 text-xs font-semibold flex-shrink-0 ml-2" style={{ color: '#FACC15' }}>
                        <Star size={11} fill="currentColor" />{c.rating}
                      </div>
                    </div>
                    <p className="text-xs mb-5" style={{ color: 'var(--text3)' }}>
                      📍 {c.location}
                    </p>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-black" style={{ color: 'var(--accent)' }}>{fmtColones(c.basePrice)}</span>
                        <span className="text-xs ml-1" style={{ color: 'var(--text3)' }}>/ hora</span>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-lg"
                        style={{ backgroundColor: 'var(--surface2)', color: 'var(--text3)' }}>{c.sport}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          TOURNAMENTS
      ═══════════════════════════════════════════════════════ */}
      <section className="py-32 px-5" style={{ backgroundColor: 'var(--surface)' }}>
        <div className="max-w-7xl mx-auto">

          <div className="flex items-end justify-between mb-14">
            <div>
              <p className="text-xs font-semibold tracking-widest mb-4" style={{ color: '#A78BFA', letterSpacing: '0.1em' }}>TORNEOS</p>
              <h2 className="font-black leading-tight" style={{ fontSize: 'clamp(28px, 4vw, 44px)', letterSpacing: '-0.02em' }}>
                Competí por algo.
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TOURNAMENTS.map(t => (
              <div key={t.name} className="rounded-2xl p-7 flex flex-col gap-5 transition-all hover:-translate-y-0.5"
                style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', transition: 'all 0.2s ease' }}>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
                    style={{ backgroundColor: 'rgba(167,139,250,0.1)', color: '#A78BFA' }}>
                    {t.format}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text3)' }}>{t.date}</span>
                </div>

                <div>
                  <h3 className="font-bold mb-1">{t.name}</h3>
                  <p className="text-xs" style={{ color: 'var(--text3)' }}>{t.teams}</p>
                </div>

                <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid var(--border)' }}>
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: 'var(--text3)' }}>Premio</p>
                    <p className="font-black" style={{ color: 'var(--text)' }}>{t.prize}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs mb-0.5" style={{ color: 'var(--text3)' }}>Cupos</p>
                    <p className="text-sm font-bold" style={{ color: t.spots <= 3 ? '#FF6B35' : 'var(--text2)' }}>
                      {t.spots} libres
                    </p>
                  </div>
                </div>

                <button className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{ backgroundColor: 'rgba(167,139,250,0.08)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.15)' }}>
                  Inscribir equipo
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          OWNER CTA
      ═══════════════════════════════════════════════════════ */}
      <section className="py-28 px-5">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-3xl p-12 md:p-20 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0d1900 0%, #080808 70%)', border: '1px solid rgba(215,255,0,0.08)' }}>

            {/* Ambient glow */}
            <div className="absolute top-0 right-0 w-96 h-96 pointer-events-none"
              style={{
                background: 'radial-gradient(circle, rgba(215,255,0,0.07) 0%, transparent 70%)',
                transform: 'translate(20%, -20%)',
              }} />

            <div className="relative z-10 max-w-lg">
              <p className="text-xs font-semibold tracking-widest mb-5" style={{ color: 'var(--accent)', letterSpacing: '0.1em' }}>DUEÑOS DE CANCHA</p>
              <h2 className="font-black mb-5 leading-tight" style={{ fontSize: 'clamp(28px, 4vw, 44px)', letterSpacing: '-0.02em' }}>
                Tu negocio merece<br />
                <span style={{ color: 'var(--accent)' }}>tecnología de primera.</span>
              </h2>
              <p className="mb-8 leading-relaxed" style={{ color: 'var(--text3)', fontSize: 16 }}>
                Reservas automáticas. Dashboard de ingresos. Analytics en tiempo real.
              </p>
              <div className="flex flex-wrap gap-2 mb-10">
                {['Reservas 24/7', 'Analytics', 'Precios dinámicos', 'Sin comisiones'].map(f => (
                  <span key={f} className="text-xs font-medium px-3 py-1.5 rounded-lg"
                    style={{ backgroundColor: 'rgba(215,255,0,0.06)', color: 'var(--accent)', border: '1px solid rgba(215,255,0,0.1)' }}>
                    ✓ {f}
                  </span>
                ))}
              </div>
              <Link href="/auth?mode=signup&role=owner" className="btn-primary inline-block px-8 py-4 text-sm">
                Registrá tu cancha →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FINAL CTA
      ═══════════════════════════════════════════════════════ */}
      <section className="py-40 px-5 text-center relative overflow-hidden"
        style={{ backgroundColor: 'var(--surface)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(215,255,0,0.05) 0%, transparent 70%)',
        }} />
        <div className="relative z-10 max-w-xl mx-auto">
          <p className="text-xs font-semibold tracking-widest mb-8" style={{ color: 'var(--text3)', letterSpacing: '0.1em' }}>EMPEZÁ HOY · GRATIS</p>
          <h2 className="font-black leading-none tracking-tight mb-8"
            style={{ fontSize: 'clamp(40px, 6vw, 72px)', letterSpacing: '-0.03em' }}>
            ¿Cuándo fue<br />
            la última vez<br />
            que <span style={{ color: 'var(--accent)', textShadow: '0 0 40px rgba(215,255,0,0.25)' }}>jugaste?</span>
          </h2>
          <p className="text-base mb-12" style={{ color: 'var(--text3)' }}>
            Tu próximo partido está a un tap de distancia.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/auth?mode=signup" className="btn-primary px-10 py-4 text-sm w-full sm:w-auto text-center">
              Jugá hoy gratis →
            </Link>
            <Link href="/juegos"
              className="px-10 py-4 rounded-2xl text-sm font-medium w-full sm:w-auto text-center transition-colors"
              style={{ border: '1px solid var(--border2)', color: 'var(--text3)' }}>
              Ver partidos activos
            </Link>
          </div>
          <p className="mt-6 text-xs" style={{ color: 'var(--text3)' }}>
            Sin tarjeta. Sin complicaciones. 30 segundos.
          </p>
        </div>
      </section>

    </div>
  );
}

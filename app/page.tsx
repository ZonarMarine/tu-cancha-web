import Link from "next/link";
import { MapPin, Star, ChevronRight, Users, Zap, ArrowUp, TrendingUp } from "lucide-react";
import { COURTS, GAMES, fmtColones } from "@/lib/data";
import LiveTicker from "@/components/LiveTicker";
import MatchCard from "@/components/MatchCard";

// ─── Data ─────────────────────────────────────────────────────
const TOP_PLAYERS = [
  { rank: 1, name: 'Carlos Rodríguez', pos: 'Delantero',    rating: 4.9, goals: 23, badge: '🏆', trend: '+3' },
  { rank: 2, name: 'Marco Jiménez',    pos: 'Mediocampista', rating: 4.8, goals: 14, badge: '⚡', trend: '+1' },
  { rank: 3, name: 'Diego Solano',     pos: 'Portero',       rating: 4.8, goals: 0,  badge: '🧤', trend: '–'  },
  { rank: 4, name: 'Kevin Pérez',      pos: 'Defensa',       rating: 4.7, goals: 3,  badge: '🛡', trend: '+2' },
  { rank: 5, name: 'Alejandro Mora',   pos: 'Delantero',     rating: 4.7, goals: 19, badge: '🔥', trend: '+5' },
];

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

const OWNER_FEATURES = ['Reservas 24/7', 'Analytics en tiempo real', 'Precios dinámicos', 'Sin comisiones'];

// ─── Shared layout helpers ─────────────────────────────────────
// Container: max-w-[1200px] centered
// Section:   py-24 on desktop

export default function HomePage() {
  return (
    <div style={{ backgroundColor: 'var(--bg)' }}>

      {/* ══════════════════════════════════════════════
          1. HERO
      ══════════════════════════════════════════════ */}
      <section className="relative flex flex-col items-center justify-center text-center overflow-hidden"
        style={{ minHeight: '100svh', paddingTop: 64 }}>

        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none select-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: 800, height: 800,
              background: 'radial-gradient(circle, rgba(215,255,0,0.055) 0%, transparent 65%)',
              animation: 'heroGlow 7s ease-in-out infinite',
            }} />
          <div className="absolute inset-0 opacity-[0.018]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
          }} />
        </div>

        <style>{`
          @keyframes heroGlow {
            0%,100% { transform: translateX(-50%) translateY(-50%) scale(1); opacity: 1; }
            50%      { transform: translateX(-50%) translateY(-50%) scale(1.08); opacity: 0.55; }
          }
          @keyframes floatCue {
            0%,100% { transform: translateY(0); }
            50%      { transform: translateY(-6px); }
          }
        `}</style>

        {/* Content */}
        <div className="relative z-10 px-6 w-full" style={{ maxWidth: 680 }}>

          {/* Live badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full mb-14"
            style={{
              backgroundColor: 'rgba(215,255,0,0.05)',
              border: '1px solid rgba(215,255,0,0.14)',
              color: 'var(--accent)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
            }}>
            <span className="w-1.5 h-1.5 rounded-full pulse-live" style={{ backgroundColor: 'var(--accent)' }} />
            {GAMES.length} PARTIDOS ACTIVOS · COSTA RICA
          </div>

          {/* H1 */}
          <h1 className="font-black leading-none mb-8"
            style={{ fontSize: 'clamp(52px, 7.5vw, 90px)', letterSpacing: '-0.03em', lineHeight: 1.0 }}>
            Jugá hoy.<br />
            <span style={{ color: 'var(--accent)', textShadow: '0 0 60px rgba(215,255,0,0.18)' }}>
              Sin organizar
            </span><br />
            nada.
          </h1>

          {/* Subtitle */}
          <p className="mb-12 leading-relaxed"
            style={{ color: 'var(--text3)', fontSize: 17, maxWidth: 440, margin: '0 auto 3rem' }}>
            El sistema operativo del fútbol amateur en Costa Rica.
            Partidos, canchas y rivales. En segundos.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-20">
            <Link href="/juegos" className="btn-primary px-8 py-4 w-full sm:w-auto text-center"
              style={{ fontSize: 14 }}>
              Ver partidos activos →
            </Link>
            <Link href="/explorar"
              className="px-8 py-4 rounded-xl w-full sm:w-auto text-center font-medium transition-colors"
              style={{
                border: '1px solid var(--border2)',
                color: 'var(--text3)',
                fontSize: 14,
                backgroundColor: 'transparent',
              }}>
              Explorar canchas
            </Link>
          </div>

          {/* Live stats — 3 numbers, clean dividers */}
          <div className="flex items-center justify-center gap-0 mb-10">
            {[
              { val: '24', label: 'jugadores activos' },
              { val: '6',  label: 'partidos abiertos'  },
              { val: '3',  label: 'canchas disponibles' },
            ].map((s, i) => (
              <div key={s.label} className="flex items-center">
                {i > 0 && (
                  <div style={{ width: 1, height: 36, backgroundColor: 'var(--border)', margin: '0 36px' }} />
                )}
                <div className="text-center">
                  <p className="font-black mb-0.5" style={{ fontSize: 22, color: 'var(--text)', letterSpacing: '-0.02em' }}>{s.val}</p>
                  <p style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.02em' }}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Ticker */}
          <div style={{ maxWidth: 320, margin: '0 auto', opacity: 0.55 }}>
            <LiveTicker />
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2"
          style={{ animation: 'floatCue 2.5s ease-in-out infinite' }}>
          <div style={{ width: 1, height: 48, background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.12))', margin: '0 auto' }} />
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          2. RETOS QUE SE LLENAN AHORA
      ══════════════════════════════════════════════ */}
      <section style={{ padding: '96px 0', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>

          {/* Section header */}
          <div className="flex items-end justify-between mb-14">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1.5 h-1.5 rounded-full pulse-live" style={{ backgroundColor: '#FF6B35' }} />
                <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: '#FF6B35' }}>
                  TRENDING ESTA NOCHE
                </p>
              </div>
              <h2 className="font-black mb-3" style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                Retos que se llenan ahora.
              </h2>
              <p style={{ color: 'var(--text3)', fontSize: 15 }}>
                Equipos buscando rival esta noche. Cupo libre disponible.
              </p>
            </div>
            <Link href="/juegos"
              className="hidden md:flex items-center gap-1.5 font-medium transition-opacity hover:opacity-60"
              style={{ color: 'var(--text3)', fontSize: 14, whiteSpace: 'nowrap' }}>
              Ver todos <ChevronRight size={14} />
            </Link>
          </div>

          {/* 3-col grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {GAMES.slice(0, 3).map((g, i) => (
              <MatchCard key={g.id} g={g} filled={MATCH_FILLS[i].filled} total={MATCH_FILLS[i].total} />
            ))}
          </div>

          <div className="mt-8 md:hidden text-center">
            <Link href="/juegos" className="font-semibold" style={{ color: 'var(--accent)', fontSize: 14 }}>
              Ver todos los partidos →
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          3. ESTADÍSTICAS
      ══════════════════════════════════════════════ */}
      <section style={{ padding: '80px 0', backgroundColor: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-2xl overflow-hidden"
            style={{ backgroundColor: 'var(--border)' }}>
            {[
              { val: '1,240+', label: 'Jugadores activos',  icon: <Users size={14} /> },
              { val: '50+',    label: 'Canchas afiliadas',  icon: <MapPin size={14} /> },
              { val: '320+',   label: 'Partidos este mes',  icon: <Zap size={14} /> },
              { val: '4.9★',   label: 'Rating promedio',    icon: <Star size={14} /> },
            ].map(s => (
              <div key={s.label} className="text-center"
                style={{ backgroundColor: 'var(--surface)', padding: '40px 24px' }}>
                <div className="flex items-center justify-center gap-1.5 mb-3"
                  style={{ color: 'var(--text3)', fontSize: 11, letterSpacing: '0.06em' }}>
                  {s.icon}
                </div>
                <p className="font-black mb-1" style={{ fontSize: 'clamp(28px, 3vw, 38px)', letterSpacing: '-0.02em' }}>{s.val}</p>
                <p style={{ color: 'var(--text3)', fontSize: 12 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          4. TOP JUGADORES
      ══════════════════════════════════════════════ */}
      <section style={{ padding: '96px 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>

          <div className="flex items-end justify-between mb-14">
            <div>
              <p className="mb-4" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--text3)' }}>RANKINGS</p>
              <h2 className="font-black mb-3" style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', letterSpacing: '-0.02em' }}>
                Top jugadores esta semana.
              </h2>
              <p style={{ color: 'var(--text3)', fontSize: 15 }}>Los más activos y mejor valorados de la plataforma.</p>
            </div>
            <Link href="/auth"
              className="hidden md:flex items-center gap-1.5 font-medium transition-opacity hover:opacity-60"
              style={{ color: 'var(--text3)', fontSize: 14, whiteSpace: 'nowrap' }}>
              Ranking completo <ChevronRight size={14} />
            </Link>
          </div>

          {/* Table header */}
          <div className="grid gap-4 mb-3 px-5" style={{ gridTemplateColumns: '40px 1fr 80px 80px 60px' }}>
            {['#', 'Jugador', 'Rating', 'Goles', ''].map(h => (
              <p key={h} style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.06em', fontWeight: 600 }}>{h}</p>
            ))}
          </div>

          <div className="space-y-2">
            {TOP_PLAYERS.map((p, i) => (
              <div key={p.name}
                className="grid items-center gap-4 px-5 py-4 rounded-2xl cursor-pointer transition-colors"
                style={{
                  gridTemplateColumns: '40px 1fr 80px 80px 60px',
                  backgroundColor: i === 0 ? 'rgba(215,255,0,0.04)' : 'var(--surface)',
                  border: `1px solid ${i === 0 ? 'rgba(215,255,0,0.1)' : 'var(--border)'}`,
                }}>

                <span className="font-black text-sm"
                  style={{ color: i === 0 ? 'var(--accent)' : i === 1 ? '#888' : i === 2 ? '#9b6c39' : 'var(--text3)' }}>
                  {i + 1}
                </span>

                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0"
                    style={{
                      backgroundColor: i === 0 ? 'rgba(215,255,0,0.12)' : 'var(--surface2)',
                      color: i === 0 ? 'var(--accent)' : 'var(--text2)',
                    }}>
                    {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{p.name}</p>
                      <span className="text-xs">{p.badge}</span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text3)' }}>{p.pos}</p>
                  </div>
                </div>

                <p className="font-bold text-sm" style={{ color: i === 0 ? 'var(--accent)' : 'var(--text2)' }}>
                  {p.rating}★
                </p>

                <p className="font-medium text-sm" style={{ color: 'var(--text2)' }}>{p.goals}</p>

                <div className="flex items-center gap-1">
                  {p.trend !== '–' && <ArrowUp size={11} style={{ color: '#4ADE80' }} />}
                  <span className="text-xs" style={{ color: p.trend !== '–' ? '#4ADE80' : 'var(--text3)' }}>
                    {p.trend}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          5. CANCHAS MÁS RESERVADAS
      ══════════════════════════════════════════════ */}
      <section style={{ padding: '96px 0', backgroundColor: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>

          <div className="flex items-end justify-between mb-14">
            <div>
              <p className="mb-4" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--text3)' }}>CANCHAS</p>
              <h2 className="font-black mb-3" style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', letterSpacing: '-0.02em' }}>
                Las más reservadas.
              </h2>
              <p style={{ color: 'var(--text3)', fontSize: 15 }}>Asegurá tu horario antes de que se llene.</p>
            </div>
            <Link href="/explorar"
              className="hidden md:flex items-center gap-1.5 font-medium transition-opacity hover:opacity-60"
              style={{ color: 'var(--text3)', fontSize: 14, whiteSpace: 'nowrap' }}>
              Ver todas <ChevronRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {COURTS.slice(0, 3).map(c => {
              const urgency = c.slotsAvailable <= 2 ? 'Últimos cupos' : c.slotsAvailable <= 4 ? 'Se llena rápido' : null;
              return (
                <Link key={c.id} href={`/cancha/${c.id}`}
                  className="block rounded-2xl overflow-hidden group"
                  style={{
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--border)',
                    transition: 'all 0.2s ease',
                  }}>
                  {/* Image area */}
                  <div className="relative flex items-center justify-center"
                    style={{ height: 180, background: 'linear-gradient(135deg, #0a1700 0%, #050d00 100%)' }}>
                    <div className="absolute inset-0 shimmer opacity-40" />
                    <span className="text-5xl relative z-10">⚽</span>
                    {urgency && (
                      <span className="absolute top-4 left-4 z-10 text-xs font-medium px-2.5 py-1 rounded-lg"
                        style={{ backgroundColor: 'rgba(255,107,53,0.12)', color: '#FF6B35', border: '1px solid rgba(255,107,53,0.12)' }}>
                        {urgency}
                      </span>
                    )}
                    <span className="absolute top-4 right-4 z-10 text-xs px-2.5 py-1 rounded-lg"
                      style={{ backgroundColor: 'rgba(0,0,0,0.55)', color: 'var(--text3)', backdropFilter: 'blur(6px)' }}>
                      {c.slotsAvailable} slots hoy
                    </span>
                  </div>
                  {/* Info */}
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold text-sm">{c.title}</h3>
                      <div className="flex items-center gap-1 shrink-0 ml-2"
                        style={{ fontSize: 12, color: '#FACC15', fontWeight: 600 }}>
                        <Star size={11} fill="currentColor" />{c.rating}
                      </div>
                    </div>
                    <p className="mb-5" style={{ fontSize: 12, color: 'var(--text3)' }}>📍 {c.location}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-black" style={{ color: 'var(--accent)', fontSize: 16 }}>{fmtColones(c.basePrice)}</span>
                        <span className="ml-1" style={{ fontSize: 12, color: 'var(--text3)' }}>/ hora</span>
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

      {/* ══════════════════════════════════════════════
          6. TORNEOS
      ══════════════════════════════════════════════ */}
      <section style={{ padding: '96px 0', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>

          <div className="flex items-end justify-between mb-14">
            <div>
              <p className="mb-4" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: '#A78BFA' }}>TORNEOS</p>
              <h2 className="font-black mb-3" style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', letterSpacing: '-0.02em' }}>
                Competí por algo.
              </h2>
              <p style={{ color: 'var(--text3)', fontSize: 15 }}>Próximos torneos abiertos. Inscribí tu equipo.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {TOURNAMENTS.map(t => (
              <div key={t.name}
                className="rounded-2xl flex flex-col"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '28px' }}>

                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
                    style={{ backgroundColor: 'rgba(167,139,250,0.1)', color: '#A78BFA' }}>
                    {t.format}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>{t.date}</span>
                </div>

                <h3 className="font-semibold mb-1" style={{ fontSize: 15 }}>{t.name}</h3>
                <p className="mb-6" style={{ fontSize: 12, color: 'var(--text3)' }}>{t.teams}</p>

                <div className="flex items-center justify-between mb-6 pt-4"
                  style={{ borderTop: '1px solid var(--border)' }}>
                  <div>
                    <p className="mb-0.5" style={{ fontSize: 11, color: 'var(--text3)' }}>Premio</p>
                    <p className="font-black" style={{ fontSize: 18 }}>{t.prize}</p>
                  </div>
                  <div className="text-right">
                    <p className="mb-0.5" style={{ fontSize: 11, color: 'var(--text3)' }}>Cupos</p>
                    <p className="font-bold" style={{ fontSize: 15, color: t.spots <= 3 ? '#FF6B35' : 'var(--text2)' }}>
                      {t.spots} libres
                    </p>
                  </div>
                </div>

                <button className="w-full rounded-xl font-semibold mt-auto transition-opacity hover:opacity-80"
                  style={{
                    backgroundColor: 'rgba(167,139,250,0.08)',
                    color: '#A78BFA',
                    border: '1px solid rgba(167,139,250,0.15)',
                    fontSize: 13,
                    padding: '12px 0',
                  }}>
                  Inscribir equipo
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          7. DUEÑOS DE CANCHA — 2-column layout
      ══════════════════════════════════════════════ */}
      <section style={{ padding: '96px 0', backgroundColor: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">

            {/* Left: Copy */}
            <div>
              <p className="mb-5" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--accent)' }}>
                DUEÑOS DE CANCHA
              </p>
              <h2 className="font-black mb-5 leading-tight"
                style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', letterSpacing: '-0.02em' }}>
                Tu negocio merece<br />
                <span style={{ color: 'var(--accent)' }}>tecnología de primera.</span>
              </h2>
              <p className="mb-10 leading-relaxed" style={{ color: 'var(--text3)', fontSize: 16, maxWidth: 420 }}>
                Reservas automáticas. Dashboard de ingresos. Analytics en tiempo real.
                El sistema operativo moderno para tu cancha.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-10">
                {OWNER_FEATURES.map(f => (
                  <div key={f} className="flex items-center gap-2.5">
                    <span style={{ color: 'var(--accent)', fontSize: 14 }}>✓</span>
                    <span style={{ fontSize: 13, color: 'var(--text2)' }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/auth?mode=signup&role=owner" className="btn-primary inline-block px-8 py-4"
                style={{ fontSize: 14 }}>
                Registrá tu cancha →
              </Link>
            </div>

            {/* Right: Dashboard mockup */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="mb-1" style={{ fontSize: 11, color: 'var(--text3)' }}>Ingresos este mes</p>
                  <p className="font-black" style={{ fontSize: 28, color: 'var(--accent)', letterSpacing: '-0.02em' }}>₡485,000</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                  style={{ backgroundColor: 'rgba(74,222,128,0.1)', color: '#4ADE80' }}>
                  ↑ 24%
                </span>
              </div>

              {/* Bar chart */}
              <div className="flex items-end gap-1.5 mb-6" style={{ height: 72 }}>
                {[38, 52, 34, 68, 48, 100, 58].map((h, i) => (
                  <div key={i} className="flex-1 rounded-sm"
                    style={{
                      height: `${h}%`,
                      backgroundColor: i === 5 ? 'var(--accent)' : 'var(--surface2)',
                      transition: 'all 0.2s',
                    }} />
                ))}
              </div>
              <p className="mb-5" style={{ fontSize: 11, color: 'var(--text3)' }}>Últimos 7 días</p>

              {/* Mini stats */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { val: '28',  label: 'Reservas' },
                  { val: '94%', label: 'Ocupación' },
                  { val: '4.9★', label: 'Rating' },
                ].map(s => (
                  <div key={s.label} className="text-center rounded-xl py-3"
                    style={{ backgroundColor: 'var(--surface2)' }}>
                    <p className="font-bold mb-0.5" style={{ fontSize: 15 }}>{s.val}</p>
                    <p style={{ fontSize: 10, color: 'var(--text3)' }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Booking list */}
              <div className="space-y-2">
                {[
                  { name: 'Carlos R.', time: '7:00 PM', status: 'Confirmada' },
                  { name: 'Alajuela FC', time: '8:30 PM', status: 'Pendiente' },
                ].map(b => (
                  <div key={b.name} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                    style={{ backgroundColor: 'var(--surface2)' }}>
                    <div>
                      <p className="font-medium" style={{ fontSize: 12 }}>{b.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text3)' }}>{b.time}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-lg"
                      style={{
                        backgroundColor: b.status === 'Confirmada' ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)',
                        color: b.status === 'Confirmada' ? '#4ADE80' : 'var(--text3)',
                      }}>
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          8. FINAL CTA
      ══════════════════════════════════════════════ */}
      <section className="text-center relative overflow-hidden"
        style={{ padding: '120px 32px', backgroundColor: 'var(--bg)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 60% 70% at 50% 50%, rgba(215,255,0,0.045) 0%, transparent 70%)',
        }} />
        <div className="relative z-10" style={{ maxWidth: 600, margin: '0 auto' }}>
          <p className="mb-8" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--text3)' }}>
            EMPEZÁ HOY · GRATIS
          </p>
          <h2 className="font-black mb-6 leading-none"
            style={{ fontSize: 'clamp(40px, 6vw, 68px)', letterSpacing: '-0.03em' }}>
            ¿Cuándo fue<br />
            la última vez<br />
            que <span style={{ color: 'var(--accent)', textShadow: '0 0 40px rgba(215,255,0,0.2)' }}>jugaste?</span>
          </h2>
          <p className="mb-12" style={{ color: 'var(--text3)', fontSize: 16 }}>
            Tu próximo partido está a un tap de distancia.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/auth?mode=signup" className="btn-primary w-full sm:w-auto text-center px-10 py-4"
              style={{ fontSize: 14 }}>
              Jugá hoy gratis →
            </Link>
            <Link href="/juegos"
              className="w-full sm:w-auto text-center px-10 py-4 rounded-xl font-medium transition-colors"
              style={{ border: '1px solid var(--border2)', color: 'var(--text3)', fontSize: 14 }}>
              Ver partidos activos
            </Link>
          </div>
          <p className="mt-6" style={{ fontSize: 12, color: 'var(--text3)' }}>
            Sin tarjeta. Sin complicaciones. 30 segundos.
          </p>
        </div>
      </section>

    </div>
  );
}

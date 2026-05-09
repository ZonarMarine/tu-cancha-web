import Link from "next/link";
import { MapPin, Star, ChevronRight, Trophy, Users, TrendingUp, Zap, Shield, ArrowUp } from "lucide-react";
import { COURTS, GAMES, fmtColones } from "@/lib/data";
import LiveTicker from "@/components/LiveTicker";
import MatchCard from "@/components/MatchCard";

// ─────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────

const TOP_PLAYERS = [
  { rank: 1,  name: 'Carlos Rodríguez', pos: 'Delantero',   mvp: 8,  goals: 23, rating: 4.9, badge: '🏆', trend: '+3' },
  { rank: 2,  name: 'Marco Jiménez',    pos: 'Mediocampista',mvp: 6,  goals: 14, rating: 4.8, badge: '⚡', trend: '+1' },
  { rank: 3,  name: 'Diego Solano',     pos: 'Portero',      mvp: 5,  goals: 0,  rating: 4.8, badge: '🧤', trend: '–'  },
  { rank: 4,  name: 'Kevin Pérez',      pos: 'Defensa',      mvp: 4,  goals: 3,  rating: 4.7, badge: '🛡', trend: '+2' },
  { rank: 5,  name: 'Alejandro Mora',   pos: 'Delantero',    mvp: 4,  goals: 19, rating: 4.7, badge: '🔥', trend: '+5' },
];

const PLAYER_COLORS = ['#4ADE80','#60A5FA','#F87171','#A78BFA','#FACC15'];

const MATCH_FILLS = [
  { filled: 8, total: 10 },
  { filled: 9, total: 14 },
  { filled: 6, total: 10 },
  { filled: 10, total: 22 },
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

        {/* Animated ambient layers */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Primary glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(215,255,0,0.07) 0%, transparent 70%)',
              animation: 'pulse-glow 6s ease-in-out infinite',
            }} />
          {/* Secondary glow — offset */}
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(251,146,60,0.04) 0%, transparent 70%)',
              animation: 'pulse-glow 8s ease-in-out infinite 2s',
            }} />
          {/* Blue live glow */}
          <div className="absolute bottom-1/3 right-1/4 w-[300px] h-[300px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(96,165,250,0.04) 0%, transparent 70%)',
              animation: 'pulse-glow 7s ease-in-out infinite 1s',
            }} />
          {/* Grid */}
          <div className="absolute inset-0 opacity-[0.025]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }} />
        </div>

        <style>{`
          @keyframes pulse-glow {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.6; }
          }
          @keyframes float-up {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
          }
        `}</style>

        <div className="relative z-10 w-full max-w-5xl mx-auto">
          {/* Live pill */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-xs font-bold"
            style={{
              backgroundColor: 'rgba(215,255,0,0.06)',
              border: '1px solid rgba(215,255,0,0.2)',
              color: 'var(--accent)',
            }}>
            <span className="w-1.5 h-1.5 rounded-full pulse-live" style={{ backgroundColor: 'var(--accent)' }} />
            {GAMES.length} partidos activos · Costa Rica
          </div>

          {/* Headline */}
          <h1 className="font-black leading-none tracking-tighter mb-6"
            style={{ fontSize: 'clamp(56px, 9vw, 108px)', letterSpacing: '-0.03em' }}>
            Jugá hoy.<br />
            <span style={{
              color: 'var(--accent)',
              textShadow: '0 0 60px rgba(215,255,0,0.3), 0 0 120px rgba(215,255,0,0.1)',
            }}>
              Sin organizar
            </span><br />
            nada.
          </h1>

          <p className="text-lg md:text-xl max-w-lg mx-auto mb-10 leading-relaxed"
            style={{ color: 'var(--text2)' }}>
            El sistema operativo del fútbol amateur en Costa Rica.
            Partidos, canchas y rivales. En segundos.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <Link href="/juegos"
              className="btn-primary px-8 py-4 text-base w-full sm:w-auto text-center"
              style={{ fontSize: 16 }}>
              Ver partidos activos →
            </Link>
            <Link href="/explorar"
              className="px-8 py-4 rounded-2xl text-base font-semibold w-full sm:w-auto text-center transition-all hover:border-white/20"
              style={{ border: '1px solid var(--border2)', color: 'var(--text2)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
              Explorar canchas
            </Link>
          </div>

          {/* Live stats row */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
            {[
              { icon: '👥', val: '24', label: 'jugadores conectados', color: '#60A5FA' },
              { icon: '⚽', val: '6',  label: 'partidos llenándose',  color: 'var(--accent)' },
              { icon: '🏟',  val: '3',  label: 'canchas activas',      color: '#4ADE80' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
                <span>{s.icon}</span>
                <span className="font-black text-sm" style={{ color: s.color }}>{s.val}</span>
                <span className="text-xs" style={{ color: 'var(--text3)' }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Live ticker */}
          <div className="max-w-sm mx-auto">
            <LiveTicker />
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2"
          style={{ animation: 'float-up 2s ease-in-out infinite' }}>
          <div className="w-px h-10 mx-auto" style={{ background: 'linear-gradient(to bottom, transparent, var(--text3))' }} />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          TRENDING TONIGHT
      ═══════════════════════════════════════════════════════ */}
      <section className="py-20 px-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full pulse-live" style={{ backgroundColor: '#FF6B35' }} />
                <p className="text-xs font-bold tracking-widest" style={{ color: '#FF6B35' }}>TRENDING ESTA NOCHE</p>
              </div>
              <h2 className="text-3xl md:text-4xl font-black leading-tight">
                Retos que se<br />
                <span style={{ color: 'var(--accent)' }}>llenan ahora.</span>
              </h2>
            </div>
            <Link href="/juegos" className="hidden md:flex items-center gap-1 text-sm font-semibold hover:opacity-70"
              style={{ color: 'var(--accent)' }}>
              Ver todos <ChevronRight size={16} />
            </Link>
          </div>

          {/* Featured + 3 cards */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Featured — full height left */}
            <div className="lg:col-span-1">
              <MatchCard g={GAMES[0]} filled={MATCH_FILLS[0].filled} total={MATCH_FILLS[0].total} featured />
            </div>
            {/* 3 smaller right */}
            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {GAMES.slice(1, 4).map((g, i) => (
                <MatchCard key={g.id} g={g} filled={MATCH_FILLS[i+1].filled} total={MATCH_FILLS[i+1].total} />
              ))}
            </div>
          </div>

          <div className="mt-6 text-center md:hidden">
            <Link href="/juegos" className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
              Ver todos los partidos →
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SPORTS STRIP
      ═══════════════════════════════════════════════════════ */}
      <section className="py-6 overflow-hidden" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-center gap-4 overflow-x-auto no-scrollbar px-5">
          {[
            { emoji: '⚽', sport: 'Fútbol',   status: 'Activo',         active: true  },
            { emoji: '🎾', sport: 'Pádel',    status: 'Próximamente',   active: false },
            { emoji: '🏀', sport: 'Básquet',  status: 'Próximamente',   active: false },
            { emoji: '🏐', sport: 'Voleibol', status: 'Próximamente',   active: false },
            { emoji: '⛳', sport: 'Golf',     status: 'Próximamente',   active: false },
          ].map(s => (
            <div key={s.sport} className="flex items-center gap-3 px-5 py-3 rounded-xl flex-shrink-0 transition-all"
              style={{
                backgroundColor: s.active ? 'var(--accent-dark)' : 'var(--surface)',
                border: `1px solid ${s.active ? 'rgba(215,255,0,0.2)' : 'var(--border)'}`,
                opacity: s.active ? 1 : 0.5,
              }}>
              <span className="text-xl">{s.emoji}</span>
              <div>
                <p className="text-sm font-bold" style={{ color: s.active ? 'var(--accent)' : 'var(--text2)' }}>{s.sport}</p>
                <p className="text-xs" style={{ color: s.active ? 'rgba(215,255,0,0.6)' : 'var(--text3)' }}>{s.status}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          COMMUNITY STATS (social proof bar)
      ═══════════════════════════════════════════════════════ */}
      <section className="py-16 px-5" style={{ background: 'radial-gradient(ellipse 100% 60% at 50% 50%, rgba(215,255,0,0.03) 0%, transparent 70%)' }}>
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { val: '1,240+', label: 'Jugadores activos', icon: <Users size={20} />,      color: '#60A5FA' },
            { val: '50+',    label: 'Canchas afiliadas', icon: <MapPin size={20} />,      color: 'var(--accent)' },
            { val: '320+',   label: 'Partidos este mes', icon: <Zap size={20} />,         color: '#4ADE80' },
            { val: '4.9★',   label: 'Rating promedio',   icon: <Star size={20} />,        color: '#FACC15' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-6 text-center"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: s.color + '15', color: s.color }}>
                {s.icon}
              </div>
              <p className="text-3xl font-black mb-1" style={{ color: s.color }}>{s.val}</p>
              <p className="text-xs" style={{ color: 'var(--text3)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          TOP PLAYERS THIS WEEK
      ═══════════════════════════════════════════════════════ */}
      <section className="py-20 px-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-bold tracking-widest mb-2" style={{ color: '#FACC15' }}>🏆 RANKINGS</p>
              <h2 className="text-3xl md:text-4xl font-black leading-tight">
                Top jugadores<br />
                <span style={{ color: 'var(--text2)' }}>esta semana.</span>
              </h2>
            </div>
            <Link href="/auth" className="hidden md:flex items-center gap-1 text-sm font-semibold hover:opacity-70"
              style={{ color: 'var(--accent)' }}>
              Ver ranking completo <ChevronRight size={16} />
            </Link>
          </div>

          <div className="space-y-2">
            {TOP_PLAYERS.map((p, i) => (
              <div key={p.name}
                className="flex items-center gap-4 p-4 rounded-2xl transition-all cursor-pointer"
                style={{
                  backgroundColor: i === 0 ? 'rgba(215,255,0,0.05)' : 'var(--surface)',
                  border: `1px solid ${i === 0 ? 'rgba(215,255,0,0.15)' : 'var(--border)'}`,
                }}>
                {/* Rank */}
                <div className="w-8 text-center flex-shrink-0">
                  <span className={`font-black text-sm ${i < 3 ? '' : ''}`}
                    style={{ color: i === 0 ? 'var(--accent)' : i === 1 ? '#A0A0A0' : i === 2 ? '#CD7F32' : 'var(--text3)' }}>
                    {i + 1}
                  </span>
                </div>
                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0"
                  style={{ backgroundColor: PLAYER_COLORS[i] + '20', color: PLAYER_COLORS[i], border: `1px solid ${PLAYER_COLORS[i]}30` }}>
                  {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm truncate">{p.name}</p>
                    <span className="text-sm">{p.badge}</span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text3)' }}>{p.pos}</p>
                </div>
                {/* Stats */}
                <div className="hidden sm:flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-sm font-black" style={{ color: 'var(--accent)' }}>{p.mvp}</p>
                    <p className="text-xs" style={{ color: 'var(--text3)' }}>MVP</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black">{p.goals}</p>
                    <p className="text-xs" style={{ color: 'var(--text3)' }}>Goles</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black" style={{ color: '#FACC15' }}>{p.rating}★</p>
                    <p className="text-xs" style={{ color: 'var(--text3)' }}>Rating</p>
                  </div>
                </div>
                {/* Trend */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {p.trend !== '–' && <ArrowUp size={12} style={{ color: '#4ADE80' }} />}
                  <span className="text-xs font-bold" style={{ color: p.trend !== '–' ? '#4ADE80' : 'var(--text3)' }}>
                    {p.trend}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          POPULAR COURTS
      ═══════════════════════════════════════════════════════ */}
      <section className="py-20 px-5" style={{ backgroundColor: 'var(--surface)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-bold tracking-widest mb-2" style={{ color: 'var(--accent)' }}>CANCHAS</p>
              <h2 className="text-3xl md:text-4xl font-black leading-tight">
                Las más reservadas.<br />
                <span style={{ color: 'var(--text2)' }}>Asegurá tu horario.</span>
              </h2>
            </div>
            <Link href="/explorar" className="hidden md:flex items-center gap-1 text-sm font-semibold hover:opacity-70"
              style={{ color: 'var(--accent)' }}>
              Ver todas <ChevronRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {COURTS.slice(0, 3).map(c => {
              const urgencyText = c.slotsAvailable <= 2 ? 'Últimos cupos' : c.slotsAvailable <= 4 ? 'Se llena rápido' : null;
              return (
                <Link key={c.id} href={`/cancha/${c.id}`}
                  className="block rounded-2xl overflow-hidden card-hover"
                  style={{ backgroundColor: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <div className="h-48 relative flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #0f1f00 0%, #081000 100%)' }}>
                    <div className="absolute inset-0 shimmer" />
                    <span className="text-5xl relative z-10">⚽</span>
                    <div className="absolute top-3 left-3 flex gap-2 z-10">
                      {c.tag && <span className="text-xs font-black px-2.5 py-1 rounded-lg" style={{ backgroundColor: 'var(--accent)', color: '#000' }}>{c.tag}</span>}
                      {urgencyText && <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ backgroundColor: 'rgba(255,107,53,0.2)', color: '#FF6B35', border: '1px solid rgba(255,107,53,0.2)' }}>{urgencyText}</span>}
                    </div>
                    <div className="absolute bottom-3 right-3 z-10">
                      <span className="text-xs px-2.5 py-1 rounded-lg font-semibold"
                        style={{ backgroundColor: 'rgba(0,0,0,0.8)', color: 'var(--text2)' }}>
                        {c.slotsAvailable} slots hoy
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-bold">{c.title}</h3>
                      <div className="flex items-center gap-1 text-xs font-bold flex-shrink-0" style={{ color: '#FACC15' }}>
                        <Star size={12} fill="currentColor" />{c.rating}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs mb-4" style={{ color: 'var(--text2)' }}>
                      <MapPin size={11} />{c.location}
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-black text-base" style={{ color: 'var(--accent)' }}>{fmtColones(c.basePrice)}</span>
                        <span className="text-xs ml-1.5" style={{ color: 'var(--text3)' }}>/ hora</span>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                        style={{ backgroundColor: 'var(--surface3)', color: 'var(--text2)' }}>{c.sport}</span>
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
      <section className="py-20 px-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-bold tracking-widest mb-2" style={{ color: '#A78BFA' }}>🏆 TORNEOS</p>
              <h2 className="text-3xl md:text-4xl font-black leading-tight">
                Competí por algo.<br />
                <span style={{ color: 'var(--text2)' }}>Próximos torneos.</span>
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TOURNAMENTS.map(t => (
              <div key={t.name} className="rounded-2xl p-6 card-hover"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-black px-2.5 py-1 rounded-lg"
                    style={{ backgroundColor: 'rgba(167,139,250,0.15)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.2)' }}>
                    {t.format}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: 'var(--text3)' }}>{t.date}</span>
                </div>
                <h3 className="font-bold mb-1">{t.name}</h3>
                <p className="text-xs mb-4" style={{ color: 'var(--text2)' }}>{t.teams}</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text3)' }}>Premio</p>
                    <p className="font-black" style={{ color: '#FACC15' }}>{t.prize}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs" style={{ color: 'var(--text3)' }}>Cupos</p>
                    <p className="text-sm font-bold" style={{ color: t.spots <= 3 ? '#FF6B35' : 'var(--accent)' }}>
                      {t.spots} disponibles
                    </p>
                  </div>
                </div>
                <button className="mt-4 w-full py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                  style={{ backgroundColor: 'rgba(167,139,250,0.1)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.2)' }}>
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
      <section className="py-10 px-5" style={{ backgroundColor: 'var(--surface)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="rounded-3xl p-8 md:p-14 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0f1f00 0%, #080808 60%)', border: '1px solid rgba(215,255,0,0.1)' }}>
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl"
              style={{ background: 'radial-gradient(circle, rgba(215,255,0,0.08) 0%, transparent 70%)', transform: 'translate(20%,-20%)' }} />
            <div className="relative z-10 max-w-xl">
              <p className="text-xs font-bold tracking-widest mb-3" style={{ color: 'var(--accent)' }}>DUEÑOS DE CANCHA</p>
              <h2 className="text-3xl md:text-4xl font-black mb-4 leading-tight">
                Tu negocio merece<br />
                <span style={{ color: 'var(--accent)' }}>tecnología de primera.</span>
              </h2>
              <p className="mb-8 leading-relaxed" style={{ color: 'var(--text2)' }}>
                Reservas automáticas. Dashboard de ingresos. Analytics en tiempo real. El sistema operativo moderno para tu cancha.
              </p>
              <div className="flex flex-wrap gap-2 mb-8">
                {['Reservas 24/7', 'Analytics de ingresos', 'Precios dinámicos', 'Sin comisiones'].map(f => (
                  <span key={f} className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                    style={{ backgroundColor: 'rgba(215,255,0,0.08)', color: 'var(--accent)', border: '1px solid rgba(215,255,0,0.12)' }}>
                    ✓ {f}
                  </span>
                ))}
              </div>
              <Link href="/auth?mode=signup&role=owner" className="btn-primary inline-block px-7 py-3.5 text-sm">
                Registrá tu cancha →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FINAL CTA
      ═══════════════════════════════════════════════════════ */}
      <section className="py-28 px-5 text-center relative overflow-hidden">
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(215,255,0,0.06) 0%, transparent 70%)',
        }} />
        <div className="relative z-10 max-w-2xl mx-auto">
          <p className="text-xs font-bold tracking-widest mb-6" style={{ color: 'var(--accent)' }}>EMPEZÁ HOY · GRATIS</p>
          <h2 className="font-black leading-none tracking-tight mb-6"
            style={{ fontSize: 'clamp(40px, 6vw, 72px)', letterSpacing: '-0.03em' }}>
            ¿Cuándo fue<br />
            la última vez<br />
            que <span style={{ color: 'var(--accent)', textShadow: '0 0 40px rgba(215,255,0,0.3)' }}>jugaste?</span>
          </h2>
          <p className="text-lg mb-10" style={{ color: 'var(--text2)' }}>
            Tu próximo partido está a un tap de distancia.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/auth?mode=signup" className="btn-primary px-10 py-4 text-base w-full sm:w-auto text-center">
              Jugá hoy gratis →
            </Link>
            <Link href="/juegos"
              className="px-10 py-4 rounded-2xl text-base font-semibold w-full sm:w-auto text-center transition-all"
              style={{ border: '1px solid var(--border2)', color: 'var(--text2)' }}>
              Ver partidos activos
            </Link>
          </div>
          <p className="mt-5 text-sm" style={{ color: 'var(--text3)' }}>
            Sin tarjeta. Sin complicaciones. 30 segundos.
          </p>
        </div>
      </section>
    </div>
  );
}

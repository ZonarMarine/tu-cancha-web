import Link from "next/link";
import { Star, ChevronRight, Zap } from "lucide-react";
import { GAMES, fmtColones } from "@/lib/data";
import LiveTicker from "@/components/LiveTicker";
import MatchCard from "@/components/MatchCard";
import MasReservadas from "@/components/MasReservadas";
import RetoCard from "@/components/RetoCard";
import StatsCounter from "@/components/StatsCounter";
import HeroSearch from "@/components/HeroSearch";
import HeroStats from "@/components/HeroStats";
import HeroLiveStrip from "@/components/HeroLiveStrip";
import { createClient } from "@supabase/supabase-js";

// Always fetch fresh data — retos are live
export const revalidate = 0;

// Shared no-cache Supabase client for server components
function makeSB() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { fetch: (url, opts) => fetch(url, { ...opts, cache: 'no-store' }) } },
  );
}

async function fetchRetos() {
  try {
    const sb    = makeSB();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const { data, error } = await sb
      .from('retos')
      .select('*')
      .eq('status', 'open')
      .gte('date', today)          // exclude past-date retos at DB level
      .order('created_at', { ascending: false })
      .limit(10);
    if (!error && data) {
      const now = new Date();
      return data.filter(r => {
        if (!r.date || r.date > today) return true; // future date → always show
        // Same day: parse time to check if match already started
        if (!r.time) return true;
        const m = String(r.time).match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (!m) return true;
        let h = parseInt(m[1]);
        const p = m[3]?.toUpperCase();
        if (p === 'PM' && h !== 12) h += 12;
        if (p === 'AM' && h === 12) h = 0;
        const t = new Date(`${r.date}T00:00:00`);
        t.setHours(h, parseInt(m[2]), 0, 0);
        return t > now;
      }).slice(0, 6);
    }
  } catch (_) {}
  return [];
}



async function fetchTopPlayers() {
  try {
    const sb = makeSB();
    const { data, error } = await sb
      .from('profiles')
      .select('id, name, avatar_url, created_at')
      .not('name', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5);
    if (!error && data && data.length > 0) {
      return data.map((p: Record<string,any>, i: number) => ({
        rank:       i + 1,
        id:         p.id,
        name:       (p.name as string) ?? 'Jugador',
        avatarUrl:  p.avatar_url ?? null,
      }));
    }
  } catch (_) {}
  return [];
}

// ─── Field preview (CSS-drawn courts by sport) ────────────────
function FieldPreview({ sport, tag }: { sport: string; tag: string | null }) {
  const isPadel     = sport === 'Pádel';
  const isFutsal    = sport === 'Fútsal';

  if (isPadel) {
    /* ── Pádel court — blue hard court with service boxes ── */
    return (
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, #0d1f3a 0%, #0a1828 100%)',
        overflow: 'hidden',
      }}>
        {/* Court surface */}
        <div style={{ position: 'absolute', inset: '14px 20px', border: '1.5px solid rgba(255,255,255,0.30)', borderRadius: 2 }}>
          {/* Left service line */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '20%', width: 1.5, background: 'rgba(255,255,255,0.22)' }} />
          {/* Right service line */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, right: '20%', width: 1.5, background: 'rgba(255,255,255,0.22)' }} />
          {/* Center horizontal line */}
          <div style={{ position: 'absolute', top: '50%', left: '20%', right: '20%', height: 1.5, background: 'rgba(255,255,255,0.22)' }} />
          {/* Net */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 2, background: 'rgba(255,255,255,0.50)', boxShadow: '0 0 6px rgba(255,255,255,0.20)' }} />
        </div>
        {/* Corner glass walls suggestion */}
        <div style={{ position: 'absolute', inset: '14px 20px', boxShadow: 'inset 0 0 20px rgba(100,160,255,0.06)', borderRadius: 2, pointerEvents: 'none' }} />
        {/* Tag badge */}
        {tag && (
          <div style={{
            position: 'absolute', bottom: 14, left: 14, zIndex: 2,
            fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 5,
            background: 'rgba(96,165,250,0.15)', color: '#60A5FA',
            border: '1px solid rgba(96,165,250,0.22)', letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>{tag}</div>
        )}
      </div>
    );
  }

  /* ── Fútbol / Fútsal — top-down green pitch ── */
  const lineColor = 'rgba(255,255,255,0.28)';
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: isFutsal
        ? 'linear-gradient(160deg, #0a1f0a 0%, #061406 100%)'
        : 'linear-gradient(160deg, #0b200b 0%, #071507 100%)',
      overflow: 'hidden',
    }}>
      {/* Pitch stripes */}
      {[0,1,2,3,4,5].map(i => (
        <div key={i} style={{
          position: 'absolute', top: 0, bottom: 0,
          left: `${i * 16.67}%`, width: '16.67%',
          background: i % 2 === 0 ? 'rgba(255,255,255,0.012)' : 'transparent',
        }} />
      ))}
      {/* Outer boundary */}
      <div style={{ position: 'absolute', inset: '12px 18px', border: `1.5px solid ${lineColor}`, borderRadius: 2 }}>
        {/* Center line */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1.5, background: lineColor }} />
        {/* Center circle */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 56, height: 56, borderRadius: '50%',
          border: `1.5px solid ${lineColor}`,
          transform: 'translate(-50%, -50%)',
        }} />
        {/* Center dot */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 5, height: 5, borderRadius: '50%',
          background: lineColor,
          transform: 'translate(-50%, -50%)',
        }} />
        {/* Left penalty box */}
        <div style={{
          position: 'absolute', top: '28%', left: 0,
          width: 38, height: '44%',
          border: `1.5px solid ${lineColor}`, borderLeft: 'none',
        }} />
        {/* Left small box */}
        <div style={{
          position: 'absolute', top: '38%', left: 0,
          width: 16, height: '24%',
          border: `1.5px solid ${lineColor}`, borderLeft: 'none',
        }} />
        {/* Right penalty box */}
        <div style={{
          position: 'absolute', top: '28%', right: 0,
          width: 38, height: '44%',
          border: `1.5px solid ${lineColor}`, borderRight: 'none',
        }} />
        {/* Right small box */}
        <div style={{
          position: 'absolute', top: '38%', right: 0,
          width: 16, height: '24%',
          border: `1.5px solid ${lineColor}`, borderRight: 'none',
        }} />
      </div>
      {/* Subtle floodlight bloom from top */}
      <div style={{
        position: 'absolute', top: '-30%', left: '50%', transform: 'translateX(-50%)',
        width: '120%', height: '80%',
        background: 'radial-gradient(ellipse, rgba(215,255,0,0.04) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      {/* Tag badge */}
      {tag && (
        <div style={{
          position: 'absolute', bottom: 14, left: 14, zIndex: 2,
          fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 5,
          background: 'rgba(215,255,0,0.10)', color: 'rgba(215,255,0,0.70)',
          border: '1px solid rgba(215,255,0,0.18)', letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>{tag}</div>
      )}
    </div>
  );
}

// ─── Static data ──────────────────────────────────────────────
const RANK_COLORS = ['var(--accent)', '#888', '#9b7340', 'var(--text3)', 'var(--text3)'];

// Tournament data with days-to-go (server-computed)
function daysUntil(dateStr: string) {
  const [d, mon] = dateStr.split(' ');
  const months: Record<string,number> = { Ene:0,Feb:1,Mar:2,Abr:3,May:4,Jun:5,Jul:6,Ago:7,Sep:8,Oct:9,Nov:10,Dic:11 };
  const now = new Date();
  const target = new Date(now.getFullYear(), months[mon] ?? 5, parseInt(d));
  if (target < now) target.setFullYear(target.getFullYear() + 1);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

const TOURNAMENTS = [
  { name: 'Liga Nocturna Santa Ana', format: '5v5', teams: 12, maxTeams: 12, date: '15 Jun', prize: '₡200,000', spots: 4, spotsTotal: 12 },
  { name: 'Copa Escazú 2026',        format: '7v7', teams: 6,  maxTeams: 8,  date: '22 Jun', prize: '₡350,000', spots: 2, spotsTotal: 8  },
  { name: 'Torneo Heredia Abierto',  format: '5v5', teams: 8,  maxTeams: 16, date: '1 Jul',  prize: '₡500,000', spots: 8, spotsTotal: 16 },
];

const OWNER_FEATURES = [
  'Reservas 24/7', 'Analytics en tiempo real',
  'Precios dinámicos', 'Notificaciones instantáneas',
];

// Shared section spacing
const S = {
  section:    { padding: '60px 0' } as React.CSSProperties,
  sectionAlt: { padding: '60px 0', backgroundColor: 'var(--surface)' } as React.CSSProperties,
};

// ─── Dark breathing divider ────────────────────────────────────
function DarkBreath() {
  return (
    <div style={{
      height: 1,
      background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.04) 30%, rgba(255,255,255,0.04) 70%, transparent)',
    }} />
  );
}

// ─────────────────────────────────────────────────────────────
export default async function HomePage() {
  const [RETOS, TOP_PLAYERS] = await Promise.all([
    fetchRetos(),
    fetchTopPlayers(),
  ]);
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
        paddingTop: 80,
        paddingBottom: '18vh',
        overflow: 'hidden',
        textAlign: 'center',
      }}>

        {/* Background */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>

          {/* Primary lime glow — slightly warmer, slower breath */}
          <div style={{
            position: 'absolute', top: '36%', left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 1040, height: 1040,
            background: 'radial-gradient(circle, rgba(215,255,0,0.042) 0%, rgba(215,255,0,0.008) 38%, transparent 62%)',
            animation: 'heroGlow 10s ease-in-out infinite',
          }} />

          {/* Floodlight bloom — top left corner */}
          <div style={{
            position: 'absolute', top: '-8%', left: '8%',
            width: 480, height: 680,
            background: 'radial-gradient(ellipse 60% 80% at 30% 0%, rgba(215,255,0,0.026) 0%, transparent 65%)',
            filter: 'blur(36px)',
            animation: 'floodDrift 13s ease-in-out infinite',
          }} />

          {/* Floodlight bloom — top right corner */}
          <div style={{
            position: 'absolute', top: '-8%', right: '8%',
            width: 480, height: 680,
            background: 'radial-gradient(ellipse 60% 80% at 70% 0%, rgba(215,255,0,0.020) 0%, transparent 65%)',
            filter: 'blur(36px)',
            animation: 'floodDriftR 16s ease-in-out infinite',
          }} />

          {/* Stadium haze — warm dark pooling at base */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '38%',
            background: 'linear-gradient(to top, rgba(5,4,0,0.62) 0%, rgba(5,4,0,0.18) 50%, transparent 100%)',
          }} />

          {/* Cinematic vignette — darkened edges */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse 80% 75% at 50% 40%, transparent 38%, rgba(0,0,0,0.38) 100%)',
          }} />

          {/* Field geometry — barely-visible pitch ellipse at bottom */}
          <div style={{
            position: 'absolute', bottom: '4%', left: '50%',
            transform: 'translateX(-50%)',
            width: 420, height: 210,
            border: '1px solid rgba(255,255,255,0.016)',
            borderRadius: '50%',
            pointerEvents: 'none',
          }} />
          {/* Center dot */}
          <div style={{
            position: 'absolute', bottom: 'calc(4% + 101px)', left: '50%',
            transform: 'translateX(-50%)',
            width: 6, height: 6, borderRadius: '50%',
            background: 'rgba(255,255,255,0.018)',
          }} />

          {/* Grid — environmental, not decorative */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.008,
            backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)',
            backgroundSize: '92px 92px',
          }} />
        </div>

        <style>{`
          @keyframes heroGlow {
            0%,100% { opacity:1;   transform:translate(-50%,-50%) scale(1); }
            50%      { opacity:0.55; transform:translate(-50%,-50%) scale(1.08); }
          }
          @keyframes floodDrift {
            0%,100% { opacity:1;   transform:rotate(-14deg) translateY(0); }
            55%      { opacity:0.55; transform:rotate(-14deg) translateY(-22px); }
          }
          @keyframes floodDriftR {
            0%,100% { opacity:1;   transform:rotate(14deg) translateY(0); }
            45%      { opacity:0.45; transform:rotate(14deg) translateY(-16px); }
          }
          @keyframes scrollCue {
            0%,100% { transform:translateY(0); opacity:1; }
            50%      { transform:translateY(6px); opacity:0.3; }
          }
          @keyframes slotPulse {
            0%,100% { opacity:1; }
            50%      { opacity:0.45; }
          }
          @keyframes barGlow {
            0%,100% { box-shadow: 0 0 8px rgba(215,255,0,0.25); }
            50%      { box-shadow: 0 0 18px rgba(215,255,0,0.45); }
          }
          @keyframes liveDot {
            0%,100% { opacity:1; transform:scale(1); }
            50%      { opacity:0.4; transform:scale(0.7); }
          }
          @keyframes rankRise {
            from { transform:translateY(4px); opacity:0; }
            to   { transform:translateY(0);   opacity:1; }
          }
          @media (max-width: 640px) {
            .hero-cta-group { flex-direction: column !important; align-items: stretch !important; }
            .hero-cta-group a { text-align: center; }
          }
          .scroll-row { scrollbar-width: none; -ms-overflow-style: none; }
          .scroll-row::-webkit-scrollbar { display: none; }
        `}</style>

        {/* Hero content */}
        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 860, padding: '0 28px' }}>

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
            marginBottom: 40,
          }}>
            Tu Cancha.<br />
            <span style={{
              color: 'var(--accent)',
              textShadow: '0 0 100px rgba(215,255,0,0.18)',
            }}>Tu Partido.</span>
          </h1>

          {/* Subtitle */}
          <p style={{
            color: 'var(--text3)', fontSize: 17, lineHeight: 1.7,
            maxWidth: 400, margin: '0 auto', marginBottom: 32,
          }}>
            El sistema operativo del fútbol amateur en Costa Rica.
            Partidos, canchas y rivales. En segundos.
          </p>

          {/* Search bar */}
          <div style={{ width: '100%', marginBottom: 20 }}>
            <HeroSearch />
          </div>

          {/* CTAs */}
          <div className="hero-cta-group" style={{
            display: 'flex', flexWrap: 'wrap',
            alignItems: 'center', justifyContent: 'center',
            gap: 12, marginBottom: 88,
          }}>
            <Link href="/juegos" className="btn-primary"
              style={{
                padding: '16px 44px', fontSize: 14.5, borderRadius: 15,
                fontWeight: 800, letterSpacing: '-0.01em',
                boxShadow: '0 6px 28px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.18) inset, 0 0 0 1px rgba(215,255,0,0.10)',
              }}>
              Ver partidos activos →
            </Link>
            <Link href="/explorar" style={{
              padding: '15px 30px', borderRadius: 15, fontSize: 14,
              fontWeight: 500, color: 'rgba(255,255,255,0.46)',
              border: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(255,255,255,0.025)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              transition: 'border-color 0.18s, color 0.18s',
              display: 'inline-block',
              letterSpacing: '-0.01em',
            }}>
              Explorar canchas
            </Link>
          </div>

          {/* Live activity strip — rotating signals */}
          <div style={{ marginBottom: 28 }}>
            <HeroLiveStrip />
          </div>

          {/* Live stats — animated count-up */}
          <HeroStats />

          {/* Ticker */}
          <div style={{ maxWidth: 400, margin: '0 auto' }}>
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

      <DarkBreath />

      {/* ══════════════════════════════════
          RETOS ACTIVOS (live from DB)
      ══════════════════════════════════ */}
      <section style={{ ...S.section }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 48 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span className="pulse-live" style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#FF6B35', display: 'inline-block' }} />
                <p className="eyebrow" style={{ color: '#FF6B35' }}>BUSCANDO RIVAL AHORA</p>
              </div>
              <h2 style={{ fontSize: 'clamp(26px, 3vw, 38px)', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 10 }}>
                Retos activos esta noche.
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text3)' }}>
                {RETOS.length > 0
                  ? `${RETOS.length} equipo${RETOS.length > 1 ? 's' : ''} esperando rival. Aceptá el reto.`
                  : 'Equipos buscando rival esta noche. Cupo libre disponible.'}
              </p>
            </div>
            <Link href="/juegos" style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 13, color: 'var(--text3)', fontWeight: 500,
              whiteSpace: 'nowrap', opacity: 0.8,
            }}>
              Ver todos <ChevronRight size={13} />
            </Link>
          </div>

          {RETOS.length > 0 ? (
            /* ── Live retos from DB — horizontal carousel ── */
            <div className="scroll-row" style={{
              overflowX: 'auto',
              marginLeft: -24, marginRight: -24,
              paddingLeft: 24, paddingRight: 24,
              WebkitOverflowScrolling: 'touch' as any,
            }}>
              <div style={{ display: 'flex', gap: 20, width: 'max-content', paddingBottom: 8 }}>
                {RETOS.map((r: any) => (
                  <div key={r.id} style={{ width: 310, flexShrink: 0 }}>
                    <RetoCard reto={r} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ── Empty state: first mover CTA ── */
            <div style={{
              borderRadius: 20,
              border: '1px dashed rgba(255,107,53,0.22)',
              background: 'linear-gradient(145deg, rgba(255,107,53,0.04) 0%, transparent 60%)',
              padding: '56px 40px',
              textAlign: 'center',
              maxWidth: 560,
              margin: '0 auto',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16, margin: '0 auto 20px',
                background: 'rgba(255,107,53,0.09)', border: '1px solid rgba(255,107,53,0.20)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22,
              }}>⚡</div>
              <p style={{ fontWeight: 900, fontSize: 20, letterSpacing: '-0.03em', marginBottom: 8 }}>
                Sé el primero en lanzar un reto esta noche.
              </p>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', lineHeight: 1.65, marginBottom: 28, maxWidth: 360, margin: '0 auto 28px' }}>
                Reservá tu cancha y publicá el reto — los equipos de la zona lo verán aquí en tiempo real.
              </p>
              <Link href="/explorar" style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '12px 28px', borderRadius: 12, textDecoration: 'none',
                background: 'var(--accent)', color: '#000',
                fontSize: 13, fontWeight: 800, letterSpacing: '-0.01em',
                boxShadow: '0 0 24px rgba(215,255,0,0.20)',
              }}>
                <Zap size={14} fill="#000" /> Reservar cancha →
              </Link>
            </div>
          )}
        </div>
      </section>

      <DarkBreath />

      {/* ══════════════════════════════════
          STATS
      ══════════════════════════════════ */}
      <section style={{ ...S.sectionAlt }}>
        <div className="container">
          <StatsCounter />
        </div>
      </section>

      {TOP_PLAYERS.length > 0 && <DarkBreath />}

      {/* ══════════════════════════════════
          TOP PLAYERS
      ══════════════════════════════════ */}
      {TOP_PLAYERS.length > 0 && (
      <section style={S.section}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 40 }}>
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
            display: 'grid', gridTemplateColumns: '36px 1fr 80px',
            gap: 16, padding: '0 20px 12px', alignItems: 'center',
          }}>
            {['#', 'Jugador', 'Miembro'].map(h => (
              <p key={h} className="eyebrow">{h}</p>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {TOP_PLAYERS.map((p, i) => {
              const initials = p.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div key={p.id} style={{
                  display: 'grid', gridTemplateColumns: '32px 1fr 80px',
                  gap: 16, alignItems: 'center',
                  padding: '13px 20px', borderRadius: 14,
                  background: i === 0
                    ? 'linear-gradient(to right, rgba(215,255,0,0.04), rgba(215,255,0,0.02) 60%, transparent)'
                    : 'var(--surface)',
                  border: `1px solid ${i === 0 ? 'rgba(215,255,0,0.09)' : 'rgba(255,255,255,0.05)'}`,
                  animation: `rankRise 0.35s ease ${i * 0.06}s both`,
                }}>
                  {/* Rank */}
                  <span style={{ fontWeight: 900, fontSize: 13, color: RANK_COLORS[i] ?? 'var(--text3)', letterSpacing: '-0.02em' }}>{i + 1}</span>

                  {/* Player info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                    {p.avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={p.avatarUrl} alt={p.name} style={{
                        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                        objectFit: 'cover',
                        border: i === 0 ? '1.5px solid rgba(215,255,0,0.20)' : '1.5px solid rgba(255,255,255,0.06)',
                      }} />
                    ) : (
                      <div style={{
                        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10.5, fontWeight: 800,
                        background: i === 0 ? 'rgba(215,255,0,0.12)' : 'var(--surface2)',
                        color: i === 0 ? 'var(--accent)' : 'var(--text2)',
                      }}>
                        {initials}
                      </div>
                    )}
                    <p style={{ fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                    </p>
                  </div>

                  {/* Member badge */}
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 6, textAlign: 'center',
                    background: i === 0 ? 'rgba(215,255,0,0.07)' : 'rgba(255,255,255,0.04)',
                    color: i === 0 ? 'var(--accent)' : 'var(--text3)',
                    border: `1px solid ${i === 0 ? 'rgba(215,255,0,0.12)' : 'rgba(255,255,255,0.05)'}`,
                  }}>Activo</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      )}

      <DarkBreath />

      {/* ══════════════════════════════════
          CANCHAS — live client component
      ══════════════════════════════════ */}
      <section style={{ ...S.sectionAlt, position: 'relative', overflow: 'hidden' }}>
        {/* Ambient lime glow */}
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: 900, height: 400, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(215,255,0,0.028) 0%, transparent 70%)',
        }} />
        <div className="container">
          {/* MasReservadas handles its own header, cards, skeleton, realtime */}
          <MasReservadas />
        </div>
      </section>

      <DarkBreath />

      {/* ══════════════════════════════════
          TORNEOS
      ══════════════════════════════════ */}
      <section style={{ ...S.section, position: 'relative', overflow: 'hidden' }}>
        {/* Ambient purple glow */}
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: 800, height: 360, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 55% 45% at 50% 0%, rgba(139,92,246,0.04) 0%, transparent 70%)',
        }} />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 52 }}>
            <div>
              <p className="eyebrow" style={{ marginBottom: 14, color: '#A78BFA' }}>TORNEOS</p>
              <h2 style={{ fontSize: 'clamp(26px, 3vw, 38px)', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 10 }}>
                Competí por algo.
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text3)' }}>Próximos torneos. Inscribí tu equipo antes de que se llene.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
            {TOURNAMENTS.map(t => {
              const days = daysUntil(t.date);
              const spotsLeft = t.spots;
              const isCritical = spotsLeft <= 2;
              const filledPct = Math.round(((t.spotsTotal - spotsLeft) / t.spotsTotal) * 100);
              return (
                <div key={t.name} style={{
                  borderRadius: 20, overflow: 'hidden',
                  background: 'linear-gradient(155deg, #0f0f0f 0%, #0b0b0b 100%)',
                  border: `1px solid ${isCritical ? 'rgba(167,139,250,0.14)' : 'rgba(255,255,255,0.055)'}`,
                  display: 'flex', flexDirection: 'column',
                  boxShadow: isCritical ? '0 0 0 1px rgba(167,139,250,0.05) inset' : 'none',
                }}>
                  {/* Top accent bar */}
                  <div style={{
                    height: 3,
                    background: isCritical
                      ? 'linear-gradient(to right, rgba(167,139,250,0.8), rgba(139,92,246,0.4))'
                      : 'rgba(167,139,250,0.18)',
                  }} />

                  <div style={{ padding: '22px 24px 24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    {/* Header row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 7,
                        background: 'rgba(167,139,250,0.1)', color: '#A78BFA',
                        letterSpacing: '0.06em', border: '1px solid rgba(167,139,250,0.14)',
                      }}>{t.format}</span>
                      <span style={{
                        fontSize: 10.5, fontWeight: 600, color: days <= 7 ? '#FF6B6B' : 'var(--text3)',
                        letterSpacing: '0.02em',
                      }}>
                        {days <= 1 ? 'Mañana' : `${days} días`}
                      </span>
                    </div>

                    {/* Name */}
                    <p style={{ fontWeight: 700, fontSize: 15.5, marginBottom: 4, lineHeight: 1.3 }}>{t.name}</p>
                    <p style={{ fontSize: 11.5, color: 'var(--text3)', marginBottom: 20 }}>{t.teams} equipos · {t.date}</p>

                    {/* Prize */}
                    <div style={{
                      padding: '14px 16px', borderRadius: 12, marginBottom: 18,
                      background: 'rgba(215,255,0,0.025)',
                      border: '1px solid rgba(215,255,0,0.07)',
                    }}>
                      <p style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Premio</p>
                      <p style={{
                        fontWeight: 900, fontSize: 22, letterSpacing: '-0.025em',
                        color: 'var(--accent)',
                        textShadow: '0 0 28px rgba(215,255,0,0.18)',
                      }}>{t.prize}</p>
                    </div>

                    {/* Occupancy bar */}
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 10.5, color: 'var(--text3)' }}>{t.spotsTotal - spotsLeft} de {t.spotsTotal} equipos</span>
                        <span style={{
                          fontSize: 10.5, fontWeight: 700,
                          color: isCritical ? '#FF6B6B' : 'var(--text2)',
                          animation: isCritical ? 'slotPulse 2s ease-in-out infinite' : undefined,
                        }}>
                          {isCritical ? '⚡ ' : ''}{spotsLeft} cupos libres
                        </span>
                      </div>
                      <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                        <div style={{
                          height: '100%', width: `${filledPct}%`, borderRadius: 2,
                          background: isCritical
                            ? 'linear-gradient(to right, #A78BFA, #7C3AED)'
                            : 'rgba(167,139,250,0.45)',
                        }} />
                      </div>
                    </div>

                    {/* CTA */}
                    <button style={{
                      width: '100%', padding: '11px', borderRadius: 11, marginTop: 'auto',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      background: isCritical ? 'rgba(167,139,250,0.12)' : 'rgba(167,139,250,0.06)',
                      color: '#A78BFA',
                      border: `1px solid ${isCritical ? 'rgba(167,139,250,0.22)' : 'rgba(167,139,250,0.12)'}`,
                    }}>
                      Inscribir equipo →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <DarkBreath />

      {/* ══════════════════════════════════
          OWNER — 2-column premium
      ══════════════════════════════════ */}
      <section style={{ ...S.sectionAlt }}>
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
              borderRadius: 20, overflow: 'hidden',
              background: '#0a0a0a',
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: '0 0 0 1px rgba(215,255,0,0.03) inset, 0 40px 100px rgba(0,0,0,0.65)',
            }}>
              {/* Titlebar */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '12px 18px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                background: 'rgba(255,255,255,0.015)',
              }}>
                {['#FF5F57','#FEBC2E','#28C840'].map(c => (
                  <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c, opacity: 0.85 }} />
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 10 }}>
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%', background: '#4ADE80', display: 'inline-block',
                    animation: 'liveDot 1.8s ease-in-out infinite',
                  }} />
                  <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)' }}>Dashboard · Twelve Academy</span>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 9.5, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.04em' }}>LIVE</span>
              </div>

              <div style={{ padding: '20px' }}>
                {/* Revenue row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                  <div>
                    <p style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Ingresos este mes</p>
                    <p style={{ fontWeight: 900, fontSize: 26, color: 'var(--accent)', letterSpacing: '-0.03em', lineHeight: 1 }}>₡485,000</p>
                    <p style={{ fontSize: 10, color: 'rgba(74,222,128,0.7)', marginTop: 4 }}>↑ 24% vs. mes anterior</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Hoy</p>
                    <p style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em' }}>₡75,000</p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>3 reservas</p>
                  </div>
                </div>

                {/* Bar chart */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 56, marginBottom: 4 }}>
                  {[28, 44, 22, 58, 36, 100, 62].map((h, i) => (
                    <div key={i} style={{
                      flex: 1, borderRadius: '3px 3px 0 0',
                      height: `${h}%`,
                      background: i === 5
                        ? 'var(--accent)'
                        : i === 6
                        ? 'rgba(215,255,0,0.30)'
                        : 'rgba(255,255,255,0.06)',
                      boxShadow: i === 5 ? '0 0 12px rgba(215,255,0,0.35), 0 0 4px rgba(215,255,0,0.6)' : 'none',
                      animation: i === 5 ? 'barGlow 3s ease-in-out infinite' : 'none',
                    }} />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
                  {['L','M','X','J','V','S','D'].map((d, i) => (
                    <span key={d} style={{ fontSize: 8.5, color: i === 5 ? 'var(--accent)' : 'rgba(255,255,255,0.18)', flex: 1, textAlign: 'center', fontWeight: i===5 ? 700 : 400 }}>{d}</span>
                  ))}
                </div>

                {/* Mini stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 16 }}>
                  {[
                    { val: '28',   label: 'Reservas', sub: 'este mes' },
                    { val: '94%',  label: 'Ocupación', sub: 'promedio' },
                    { val: '5.0★', label: 'Rating', sub: 'plataforma' },
                  ].map(s => (
                    <div key={s.label} style={{
                      background: 'rgba(255,255,255,0.03)', borderRadius: 9,
                      padding: '10px 8px', textAlign: 'center',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}>
                      <p style={{ fontWeight: 800, fontSize: 14, marginBottom: 1, letterSpacing: '-0.02em' }}>{s.val}</p>
                      <p style={{ fontSize: 9, color: 'var(--text3)' }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Bookings */}
                <p style={{ fontSize: 9.5, color: 'var(--text3)', marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Reservas esta noche</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[
                    { name: 'Los Clavos FC',  time: '7:00 PM · Cancha A', status: 'Confirmada', ok: true,  live: true  },
                    { name: 'Herradura FC',    time: '8:30 PM · Cancha B', status: 'Pendiente',  ok: false, live: false },
                    { name: 'Alajuela United', time: '9:00 PM · Cancha A', status: 'Confirmada', ok: true,  live: false },
                  ].map(b => (
                    <div key={b.name} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '9px 11px', borderRadius: 9,
                      background: b.live ? 'rgba(74,222,128,0.04)' : 'rgba(255,255,255,0.025)',
                      border: `1px solid ${b.live ? 'rgba(74,222,128,0.10)' : 'rgba(255,255,255,0.04)'}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {b.live && (
                          <span style={{
                            width: 5, height: 5, borderRadius: '50%', background: '#4ADE80',
                            display: 'inline-block', flexShrink: 0,
                            animation: 'liveDot 1.8s ease-in-out infinite',
                          }} />
                        )}
                        <div>
                          <p style={{ fontWeight: 600, fontSize: 12 }}>{b.name}</p>
                          <p style={{ fontSize: 10, color: 'var(--text3)' }}>{b.time}</p>
                        </div>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 5,
                        background: b.ok ? 'rgba(74,222,128,0.09)' : 'rgba(255,255,255,0.04)',
                        color: b.ok ? '#4ADE80' : 'rgba(255,255,255,0.28)',
                      }}>{b.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <DarkBreath />

      {/* ══════════════════════════════════
          FINAL CTA
      ══════════════════════════════════ */}
      <section style={{ position: 'relative', padding: '80px 40px', textAlign: 'center', overflow: 'hidden' }}>
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
              style={{
                padding: '16px 44px', fontSize: 14.5, borderRadius: 15,
                fontWeight: 800, letterSpacing: '-0.01em',
                boxShadow: '0 6px 28px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.18) inset, 0 0 0 1px rgba(215,255,0,0.10)',
              }}>
              Registrate ahora →
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

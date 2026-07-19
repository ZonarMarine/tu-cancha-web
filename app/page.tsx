import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { deriveProgress } from "@/lib/game";
import LiveTicker from "@/components/LiveTicker";
import MasReservadas from "@/components/MasReservadas";
import HomeRetosSection from "@/components/HomeRetosSection";
import DescubriDeporte from "@/components/DescubriDeporte";
import SportSelector from "@/components/SportSelector";
import StatsCounter from "@/components/StatsCounter";
import HeroSearch from "@/components/HeroSearch";
import HeroStats from "@/components/HeroStats";
import HeroLiveStrip from "@/components/HeroLiveStrip";
import HeroLiveBadge from "@/components/HeroLiveBadge";
import SportHeroCTAs from "@/components/SportHeroCTAs";
import HomeAdvancedSearch from "@/components/HomeAdvancedSearch";
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




async function fetchTopPlayers() {
  try {
    const sb = makeSB();
    // Real XP leaderboard (same source as the mobile app). Granted to anon.
    const { data, error } = await sb.rpc('get_leaderboard', { lim: 5 });
    if (!error && data && data.length > 0) {
      return (data as Record<string, any>[]).map((p, i) => {
        const prog = deriveProgress({ bookings: Number(p.bookings) || 0, retos: Number(p.retos) || 0 });
        return {
          rank:      i + 1,
          id:        p.id,
          name:      (p.name as string) ?? 'Jugador',
          avatarUrl: p.avatar_url ?? null,
          level:     prog.level,
          xp:        prog.xp,
          rankName:  prog.rank.name,
          rankSolid: prog.rank.solid,
        };
      });
    }
  } catch (_) {}
  return [];
}

async function fetchNearbyCourts() {
  try {
    const sb = makeSB();
    // Use real schema columns: name, base_price, active, deleted_at
    const { data, error } = await sb
      .from('owner_courts')
      .select('id, name, sport, location, base_price, slots')
      .eq('active', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(6);
    if (!error && data && data.length > 0) {
      // Normalise to the shape the homepage card expects
      return data.map((c: Record<string, any>) => ({
        id:             c.id,
        court_name:     c.name ?? 'Cancha',
        sport:          c.sport ?? 'Fútbol',
        location:       c.location ?? null,
        price_per_hour: c.base_price ?? null,
        slots:          Array.isArray(c.slots) ? c.slots : [],
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
  const [TOP_PLAYERS, NEARBY_COURTS] = await Promise.all([
    fetchTopPlayers(),
    fetchNearbyCourts(),
  ]);
  return (
    <div style={{
      // FC-style depth: cool navy pools in the corners + a faint lime top glow,
      // layered over near-black. Gives the lower sections dimension instead of flat black.
      background: `
        radial-gradient(1100px 620px at 88% 2%, rgba(56,86,110,0.10) 0%, transparent 55%),
        radial-gradient(1000px 700px at 6% 22%, rgba(34,46,64,0.10) 0%, transparent 55%),
        radial-gradient(900px 500px at 50% 100%, rgba(40,54,40,0.08) 0%, transparent 60%),
        var(--bg)
      `,
    }}>

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

          {/* Bottom fade-out — blends into the overlapping search card */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 160,
            background: 'linear-gradient(to top, var(--bg) 0%, transparent 100%)',
            pointerEvents: 'none',
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
          .court-card-link .court-card { transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s; }
          .court-card-link:hover .court-card {
            border-color: rgba(215,255,0,0.28) !important;
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.07),
              0 0 0 1px rgba(215,255,0,0.10),
              0 0 34px rgba(215,255,0,0.07),
              0 24px 48px rgba(0,0,0,0.5) !important;
            transform: translateY(-3px);
          }
        `}</style>

        {/* Hero content */}
        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 860, padding: '0 28px' }}>

          {/* Live badge */}
          <HeroLiveBadge />

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
            maxWidth: 420, margin: '0 auto', marginBottom: 24,
          }}>
            El sistema operativo del fútbol y pádel amateur en Costa Rica.
            Reservá canchas, encontrá rivales y jugá en minutos.
          </p>

          {/* Sport selector */}
          <div style={{ marginBottom: 24 }}>
            <SportSelector size="lg" />
          </div>

          {/* Search bar */}
          <div style={{ width: '100%', marginBottom: 20 }}>
            <HeroSearch />
          </div>

          {/* CTAs — sport-aware, reads global SportContext */}
          <SportHeroCTAs />

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

      {/* ══════════════════════════════════
          ADVANCED SEARCH
      ══════════════════════════════════ */}
      <HomeAdvancedSearch />

      {/* ══════════════════════════════════
          CANCHAS DESTACADAS — real data only
      ══════════════════════════════════ */}
      {NEARBY_COURTS.length > 0 && (
        <section style={{ padding: '8px 0 64px' }}>
          <div className="container">
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 36 }}>
              <div>
                <p className="eyebrow eyebrow-bar" style={{ marginBottom: 12 }}>CANCHAS DESTACADAS</p>
                <h2 style={{ fontSize: 'clamp(22px, 2.6vw, 34px)', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 8 }}>
                  Canchas destacadas.
                </h2>
                <p style={{ fontSize: 14, color: 'var(--text3)' }}>Canchas activas en la plataforma.</p>
              </div>
              <Link href="/explorar" style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 13, color: 'var(--text3)', fontWeight: 500, whiteSpace: 'nowrap', opacity: 0.8,
              }}>
                Ver todas <ChevronRight size={13} />
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {NEARBY_COURTS.map(court => {
                // Normalise sport for FieldPreview
                const sportLower = court.sport?.toLowerCase() ?? '';
                const isPadel = sportLower === 'padel' || sportLower === 'pádel';
                const isFutsal = sportLower === 'futsal' || sportLower === 'fútsal';
                const fieldSport = isPadel ? 'Pádel' : isFutsal ? 'Fútsal' : 'Fútbol';
                // Sport display label — use exactly what's in the DB, capitalised
                const sportLabel = court.sport
                  ? court.sport.charAt(0).toUpperCase() + court.sport.slice(1)
                  : null;
                return (
                  <Link key={court.id} href="/explorar" className="court-card-link" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                    <div className="court-card" style={{
                      position: 'relative',
                      borderRadius: 18, overflow: 'hidden',
                      background: 'linear-gradient(160deg, #16171b 0%, #0d0e10 62%, #0a0b0d 100%)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 26px rgba(0,0,0,0.35)',
                      transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s',
                    }}>
                      {/* Field preview — no tag badge inside, sport shown in info row */}
                      <div style={{ position: 'relative', height: 110, overflow: 'hidden' }}>
                        <FieldPreview sport={fieldSport} tag={null} />
                        {/* Bottom gradient scrim so the preview reads as depth, not flat */}
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 45%, rgba(8,9,11,0.55) 100%)', pointerEvents: 'none' }} />
                      </div>

                      {/* Info */}
                      <div style={{ padding: '14px 16px 16px' }}>
                        {/* Name */}
                        <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {court.court_name}
                        </p>

                        {/* Location — real DB value only */}
                        {court.location && (
                          <p style={{ fontSize: 11.5, color: 'var(--text3)', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            📍 {court.location}
                          </p>
                        )}

                        {/* Bottom row: price (real) + sport badge (real) */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          {/* Price — only if set in DB */}
                          {court.price_per_hour != null ? (
                            <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.02em', flexShrink: 0 }}>
                              ₡{court.price_per_hour.toLocaleString('es-CR')}
                              <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text3)', marginLeft: 3 }}>/hr</span>
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--text3)' }}>Precio a consultar</span>
                          )}

                          {/* Sport — real DB value, no availability implied */}
                          {sportLabel && (
                            <span style={{
                              fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 6,
                              background: isPadel ? 'rgba(96,165,250,0.08)' : 'rgba(215,255,0,0.07)',
                              color: isPadel ? 'rgba(96,165,250,0.75)' : 'rgba(215,255,0,0.65)',
                              border: `1px solid ${isPadel ? 'rgba(96,165,250,0.14)' : 'rgba(215,255,0,0.12)'}`,
                              flexShrink: 0,
                              textTransform: 'capitalize',
                            }}>
                              {sportLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <DarkBreath />

      {/* ══════════════════════════════════
          RETOS — live, sport-filtered client component
      ══════════════════════════════════ */}
      <HomeRetosSection />

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
              <p className="eyebrow eyebrow-bar" style={{ marginBottom: 14 }}>RANKINGS</p>
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
            {['#', 'Jugador', 'Nivel'].map(h => (
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
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </p>
                      <p style={{ fontSize: 10.5, fontWeight: 700, color: p.rankSolid, marginTop: 1, letterSpacing: '0.02em' }}>
                        {p.rankName?.toUpperCase()} · {p.xp?.toLocaleString('es-CR')} XP
                      </p>
                    </div>
                  </div>

                  {/* Level badge */}
                  <span style={{
                    fontSize: 12, fontWeight: 900, padding: '4px 9px', borderRadius: 8, textAlign: 'center',
                    background: i === 0 ? 'rgba(215,255,0,0.10)' : 'rgba(255,255,255,0.05)',
                    color: i === 0 ? 'var(--accent)' : 'var(--text)',
                    border: `1px solid ${i === 0 ? 'rgba(215,255,0,0.16)' : 'rgba(255,255,255,0.06)'}`,
                  }}>Nv {p.level}</span>
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
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: 900, height: 400, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(215,255,0,0.024) 0%, transparent 70%)',
        }} />
        <div className="container">
          <MasReservadas />
        </div>
      </section>

      <DarkBreath />

      {/* ══════════════════════════════════
          DESCUBRÍ TU DEPORTE
      ══════════════════════════════════ */}
      <DescubriDeporte />

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
            <SportHeroCTAs variant="secondary" />
          </div>
          <p style={{ fontSize: 12, color: 'var(--text3)' }}>Sin tarjeta. Sin complicaciones. 30 segundos.</p>
        </div>
      </section>

    </div>
  );
}

"use client";
import { useState, useEffect } from "react";
import { MapPin, Clock, Plus } from "lucide-react";
import Link from "next/link";
import { GAMES, fmtColones } from "@/lib/data";
import { createClient } from "@supabase/supabase-js";

/* ─── Supabase client ─────────────────────────────────────── */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

/* ─── Transform reto DB row → GAMES shape ─────────────────── */
const TEAM_COLORS = ['#D7FF00','#4ADE80','#60A5FA','#F97316','#A78BFA','#FF6B6B','#FACC15'];
function teamColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return TEAM_COLORS[Math.abs(h) % TEAM_COLORS.length];
}
function deriveFormat(players: number) {
  if (players >= 18) return '11v11';
  if (players >= 12) return '7v7';
  return '5v5';
}
function retoToGame(r: any) {
  const players   = r.players ?? 10;
  const postedMin = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 60000);
  return {
    id:          r.id,
    format:      deriveFormat(players),
    sport:       'Fútbol',
    location:    r.court_name ?? '–',
    venue:       r.court_name ?? '–',
    time:        r.time ?? '–',
    pricePerTeam: r.price ?? 0,
    level:       'Intermedio',
    tag:         postedMin <= 10 ? '⚡ Urgente' : null,
    postedMin,
    challenger:  {
      name:   r.team_name ?? 'Equipo',
      record: `${r.players ?? 10}J`,
      color:  teamColor(r.team_name ?? ''),
    },
  };
}

/* ─── constants ──────────────────────────────────────────── */

const FORMATS = ['Todos', '5v5', '7v7', '11v11'];
const LEVELS  = ['Todos', 'Principiante', 'Intermedio', 'Avanzado'];

const TICKER_ITEMS = [
  'Heredia Kicks encontró rival hace 2 min',
  '2 equipos armándose en Escazú',
  'Últimos cupos en Alajuela FC',
  'Partido nuevo creado en Santa Ana',
  'Los Clavos FC aceptó un reto',
  'Actividad alta en San José',
  '3 jugadores buscando equipo en Heredia',
  'Furati Sports — 2 canchas disponibles esta noche',
];

// Dynamic in component — defined below
const BASE_LIVE_SIGNALS = [
  { text: '3 equipos necesitan 1 jugador más',  color: '#F97316' },
  { text: 'Actividad alta en San José esta noche', color: '#FACC15' },
];

/* ─── helpers ────────────────────────────────────────────── */

/** Minutes until game starts. Returns null if game has passed or is >8h away. */
function minutesUntil(timeStr: string): number | null {
  try {
    const m = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!m) return null;
    let h = parseInt(m[1]), min = parseInt(m[2]);
    if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12;
    if (m[3].toUpperCase() === 'AM' && h === 12)  h  = 0;
    const now  = new Date();
    const diff = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, min).getTime() - now.getTime()) / 60000);
    return diff > 0 && diff < 480 ? diff : null;
  } catch { return null; }
}

function fmtCountdown(mins: number): string {
  if (mins < 60) return `${mins}min`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

/** Derive a personality label from win/loss record + recency */
function getTeamPersonality(record: string, postedMin: number): { label: string; color: string } | null {
  const parts  = record.split(' · ');
  const wins   = parseInt(parts[0]) || 0;
  const losses = parseInt(parts[1]) || 0;
  const total  = wins + losses;
  if (!total) return null;
  const wr = wins / total;
  if (wr >= 0.80 && wins >= 7)  return { label: '🔥 En racha',      color: '#FACC15' };
  if (wr >= 0.65 && wins >= 5)  return { label: '★ Favorito',       color: '#4ADE80' };
  if (postedMin <= 3)            return { label: '⚡ Activo ahora',   color: '#4ADE80' };
  if (wr < 0.35 && total > 5)   return { label: 'Buscando rival',   color: 'rgba(255,255,255,0.28)' };
  return null;
}

/* ─── MatchCard ──────────────────────────────────────────── */

function MatchCard({ g }: { g: typeof GAMES[0] }) {
  const [hov, setHov] = useState(false);

  const isUrgent   = g.tag?.includes('Urgente') || g.postedMin <= 3;
  const isPopular  = g.tag?.includes('Popular');
  const mins       = minutesUntil(g.time);
  const isImminent = mins !== null && mins < 60;
  const personality = getTeamPersonality(g.challenger.record, g.postedMin);

  /* Card accent: urgent = red, popular = lime, neutral = none */
  const accentColor = isUrgent ? '#FF6B6B' : isPopular ? 'rgba(215,255,0,0.85)' : null;
  const borderColor = isUrgent
    ? hov ? 'rgba(255,107,107,0.28)' : 'rgba(255,107,107,0.16)'
    : isPopular
    ? hov ? 'rgba(215,255,0,0.18)'   : 'rgba(215,255,0,0.11)'
    : hov ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)';

  const shadow = hov
    ? isUrgent
      ? '0 0 0 1px rgba(255,107,107,0.08), 0 24px 60px rgba(0,0,0,0.80), 0 1px 0 rgba(255,255,255,0.05) inset'
      : isPopular
      ? '0 0 0 1px rgba(215,255,0,0.05), 0 24px 60px rgba(0,0,0,0.80), 0 1px 0 rgba(255,255,255,0.05) inset'
      : '0 0 0 1px rgba(255,255,255,0.04), 0 20px 52px rgba(0,0,0,0.76), 0 1px 0 rgba(255,255,255,0.05) inset'
    : '0 1px 0 rgba(255,255,255,0.045) inset, 0 2px 8px rgba(0,0,0,0.4), 0 10px 36px rgba(0,0,0,0.52)';

  return (
    <div
      className="match-card"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 20, overflow: 'hidden',
        background: 'linear-gradient(145deg, rgba(255,255,255,0.026) 0%, transparent 52%), linear-gradient(155deg, #161616 0%, #0d0d0d 58%, #0b0b0b 100%)',
        border: `1px solid ${borderColor}`,
        boxShadow: shadow,
        transform: hov ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'transform 0.28s cubic-bezier(0.22,0.61,0.36,1), border-color 0.20s, box-shadow 0.28s',
        display: 'flex', flexDirection: 'column',
      }}>

      {/* ── Urgency accent line (top edge) ── */}
      {accentColor && (
        <div style={{
          height: 2,
          background: isUrgent
            ? 'linear-gradient(90deg, #FF6B6B 0%, rgba(255,107,107,0.20) 70%, transparent 100%)'
            : 'linear-gradient(90deg, rgba(215,255,0,0.70) 0%, rgba(215,255,0,0.12) 70%, transparent 100%)',
        }} />
      )}

      <div style={{ padding: '16px 18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        {/* Format + level badges */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 9.5, fontWeight: 900, padding: '3px 9px', borderRadius: 7, background: 'var(--accent)', color: '#000', letterSpacing: '0.04em' }}>
            {g.format}
          </span>
          <span style={{ fontSize: 9.5, fontWeight: 600, padding: '3px 9px', borderRadius: 7, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.48)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {g.level}
          </span>
          {isUrgent && (
            <span style={{ fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 7, background: 'rgba(255,107,107,0.12)', color: '#FF8080', border: '1px solid rgba(255,107,107,0.20)', letterSpacing: '0.03em' }}>
              ⚡ URGENTE
            </span>
          )}
        </div>
        {/* Posted time */}
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', letterSpacing: '-0.01em', flexShrink: 0 }}>
          hace {g.postedMin}min
        </span>
      </div>

      {/* ── VS composition — the emotional core ── */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 18px', gap: 8, marginBottom: 14 }}>

        {/* Challenger */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div className="team-avatar" style={{
            width: 56, height: 56, borderRadius: 15, margin: '0 auto 7px',
            background: `${g.challenger.color}18`,
            border: `1.5px solid ${g.challenger.color}38`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 900, color: g.challenger.color,
            boxShadow: hov ? `0 0 18px ${g.challenger.color}18` : 'none',
            transition: 'box-shadow 0.28s ease',
          }}>
            {g.challenger.name[0]}
          </div>
          <p style={{ fontSize: 11.5, fontWeight: 800, color: 'rgba(255,255,255,0.90)', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 2 }}>
            {g.challenger.name}
          </p>
          <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.30)', fontWeight: 600, letterSpacing: '0.02em', marginBottom: 3 }}>
            {g.challenger.record}
          </p>
          {/* Personality label */}
          {personality && (
            <span style={{
              display: 'inline-block', fontSize: 8.5, fontWeight: 700,
              padding: '2px 7px', borderRadius: 5,
              color: personality.color,
              background: `${personality.color}12`,
              border: `1px solid ${personality.color}22`,
              letterSpacing: '-0.005em',
            }}>
              {personality.label}
            </span>
          )}
        </div>

        {/* VS + countdown */}
        <div style={{ flexShrink: 0, textAlign: 'center', padding: '0 2px' }}>
          <p style={{ fontSize: 26, fontWeight: 900, color: 'var(--accent)', letterSpacing: '-0.06em', lineHeight: 1 }}>
            VS
          </p>
          {/* Time until game */}
          {mins !== null ? (
            <div style={{
              marginTop: 5, display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 9, fontWeight: 700,
              color: isImminent ? '#FF8080' : '#FACC15',
              letterSpacing: '-0.01em',
            }}>
              {isImminent && <span className="live-dot" style={{ width: 4, height: 4, borderRadius: '50%', background: '#FF8080', display: 'inline-block', flexShrink: 0 }} />}
              {fmtCountdown(mins)}
            </div>
          ) : (
            <p style={{ marginTop: 4, fontSize: 9, color: 'rgba(255,255,255,0.22)', fontWeight: 500 }}>
              {g.time}
            </p>
          )}
        </div>

        {/* Open slot */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div className={isImminent ? 'slot-pulse' : ''} style={{
            width: 56, height: 56, borderRadius: 15, margin: '0 auto 7px',
            background: 'rgba(255,255,255,0.03)',
            border: '1.5px dashed rgba(255,255,255,0.14)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, color: 'rgba(255,255,255,0.20)',
            transition: 'border-color 0.28s',
          }}>
            ?
          </div>
          <p style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.36)', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 2 }}>
            ¿Tu equipo?
          </p>
          <p style={{ fontSize: 9.5, color: 'rgba(215,255,0,0.55)', fontWeight: 600, letterSpacing: '0.01em' }}>
            Cupo libre
          </p>
        </div>
      </div>

      {/* ── Meta row ── */}
      <div style={{
        margin: '0 14px 14px', padding: '10px 13px', borderRadius: 11,
        background: 'rgba(255,255,255,0.028)',
        border: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', flexDirection: 'column', gap: 5,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: 'rgba(255,255,255,0.42)', letterSpacing: '-0.01em' }}>
          <MapPin size={9} style={{ color: 'rgba(215,255,0,0.55)', flexShrink: 0 }} />
          <span style={{ fontWeight: 600 }}>{g.venue}</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>{g.location}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: 'rgba(255,255,255,0.42)', letterSpacing: '-0.01em' }}>
          <Clock size={9} style={{ color: 'rgba(215,255,0,0.55)', flexShrink: 0 }} />
          <span>Hoy <strong style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 700 }}>{g.time}</strong></span>
          {mins !== null && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <span style={{ color: isImminent ? '#FF8080' : '#FACC15', fontWeight: 700 }}>
                en {fmtCountdown(mins)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── Price + CTA ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 14px 16px',
      }}>
        <div>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.24)', marginBottom: 1, letterSpacing: '-0.01em' }}>por equipo</p>
          <p style={{ fontSize: 17, fontWeight: 900, color: 'var(--accent)', letterSpacing: '-0.04em', lineHeight: 1 }}>
            {fmtColones(g.pricePerTeam)}
          </p>
        </div>
        <button className="btn-primary" style={{
          padding: '8px 15px', fontSize: 11.5, borderRadius: 10,
          letterSpacing: '-0.01em', fontWeight: 800,
        }}>
          {isUrgent ? '⚡ Entrar ya' : 'Aceptar reto →'}
        </button>
      </div>
    </div>
  );
}

/* ─── JuegosPage ─────────────────────────────────────────── */

export default function JuegosPage() {
  const [format,      setFormat]      = useState('Todos');
  const [level,       setLevel]       = useState('Todos');
  const [onlineDot,   setOnlineDot]   = useState(true);
  const [liveRetos,   setLiveRetos]   = useState<typeof GAMES>([]);
  const [loading,     setLoading]     = useState(true);

  /* Fetch live retos from DB */
  useEffect(() => {
    supabase
      .from('retos')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data && data.length > 0) setLiveRetos(data.map(retoToGame));
        setLoading(false);
      });
  }, []);

  /* Combine: live retos first, then static fallback padded to fill grid */
  const allGames = liveRetos.length > 0 ? liveRetos : GAMES;
  const activeTeams = allGames.length;

  /* Oscillate active team count to feel alive */
  const [displayTeams, setDisplayTeams] = useState(activeTeams);
  useEffect(() => {
    setDisplayTeams(activeTeams);
    const id = setInterval(() => {
      setDisplayTeams(n => n === activeTeams ? activeTeams + 1 : activeTeams);
    }, 7000);
    return () => clearInterval(id);
  }, [activeTeams]);

  /* Online indicator blink */
  useEffect(() => {
    const id = setInterval(() => setOnlineDot(v => !v), 2800);
    return () => clearInterval(id);
  }, []);

  const filtered = allGames.filter(g =>
    (format === 'Todos' || g.format === format) &&
    (level  === 'Todos' || g.level  === level)
  );

  /* Sort: urgent/popular first, then by posted time */
  const sorted = [...filtered].sort((a, b) => {
    const aScore = (a.tag?.includes('Urgente') ? 3 : 0) + (a.tag?.includes('Popular') ? 2 : 0) + (10 - Math.min(a.postedMin, 10));
    const bScore = (b.tag?.includes('Urgente') ? 3 : 0) + (b.tag?.includes('Popular') ? 2 : 0) + (10 - Math.min(b.postedMin, 10));
    return bScore - aScore;
  });

  return (
    <div style={{ paddingTop: 60, minHeight: '100svh', background: 'linear-gradient(160deg, #090909 0%, #070707 48%, #080807 100%)', position: 'relative' }}>

      <style>{`
        /* ── Live signals ── */
        @keyframes live-dot { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.35;transform:scale(0.65);} }
        .live-dot    { animation: live-dot 2.2s ease-in-out infinite; }
        .section-dot { animation: live-dot 2.8s ease-in-out infinite; }

        /* ── Slot pulse (for imminent matches) ── */
        @keyframes slot-pulse {
          0%,100% { border-color: rgba(255,255,255,0.14); }
          50%     { border-color: rgba(255,107,107,0.40); }
        }
        .slot-pulse { animation: slot-pulse 1.8s ease-in-out infinite; }

        /* ── Card hover ── */
        .match-card { will-change: transform; }

        /* ── Pill transitions ── */
        .pill { transition: background 0.14s, color 0.14s, box-shadow 0.16s, border-color 0.14s, transform 0.12s; }
        .pill:hover { transform: translateY(-1px); }

        /* ── Floodlight sweep (hero) ── */
        @keyframes floodlight {
          0%   { transform: translateX(-120%) skewX(-8deg); }
          100% { transform: translateX(320%)  skewX(-8deg); }
        }
        .floodlight-beam {
          animation: floodlight 20s cubic-bezier(0.4,0,0.6,1) infinite;
          animation-delay: -7s;
        }

        /* ── Ambient drift ── */
        @keyframes orb-a { 0%,100%{transform:translate(0,0) scale(1); opacity:.78;} 40%{transform:translate(24px,-14px) scale(1.05); opacity:.90;} 70%{transform:translate(-10px,10px) scale(.97); opacity:.72;} }
        @keyframes orb-b { 0%,100%{transform:translate(0,0) scale(1); opacity:.65;} 35%{transform:translate(-18px,12px) scale(1.04); opacity:.80;} 68%{transform:translate(14px,-8px) scale(.98); opacity:.60;} }
        .orb-a { animation: orb-a 15s ease-in-out infinite; }
        .orb-b { animation: orb-b 12s ease-in-out infinite; }

        /* ── Live ticker ── */
        @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .ticker-track { animation: ticker 38s linear infinite; display: flex; white-space: nowrap; will-change: transform; }
        .ticker-wrap:hover .ticker-track { animation-play-state: paused; }
        .ticker-wrap {
          -webkit-mask-image: linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%);
          mask-image: linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%);
        }

        /* ── Responsive hero grid ── */
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .cta-panel { display: none; }
          .hero-mobile-cta { display: flex !important; }
        }
        @media (min-width: 901px) {
          .hero-mobile-cta { display: none !important; }
        }

        /* ── Responsive cards ── */
        @media (max-width: 640px)  { .cards-grid { grid-template-columns: 1fr !important; gap: 12px !important; } }
        @media (min-width: 641px) and (max-width: 1024px) { .cards-grid { grid-template-columns: repeat(2,1fr) !important; } }
        @media (min-width: 1025px) and (max-width: 1279px) { .cards-grid { grid-template-columns: repeat(3,1fr) !important; } }
        @media (min-width: 1280px) { .cards-grid { grid-template-columns: repeat(4,1fr) !important; } }

        /* ── Wider screens: tighter avatars ── */
        @media (min-width: 1280px) {
          .team-avatar { width: 50px !important; height: 50px !important; border-radius: 13px !important; font-size: 18px !important; }
        }

        /* ── Mobile pill size ── */
        @media (max-width: 500px) {
          .filter-pills { gap: 5px !important; }
        }

        /* ── Active teams counter transition ── */
        .active-teams-num { transition: color 0.5s ease; }

        /* ── Loading skeleton pulse ── */
        @keyframes pulse {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.45; }
        }
      `}</style>

      {/* ── Fixed ambient ── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div className="orb-a" style={{ position: 'absolute', top: '-10%', right: '-5%', width: 720, height: 720, background: 'radial-gradient(circle, rgba(215,255,0,0.020) 0%, transparent 58%)', filter: 'blur(2px)' }} />
        <div className="orb-b" style={{ position: 'absolute', bottom: '-18%', left: '-8%', width: 640, height: 640, background: 'radial-gradient(circle, rgba(215,255,0,0.011) 0%, transparent 60%)', filter: 'blur(2px)' }} />
      </div>

      {/* ──────────────────────────────────────────────────────
          HERO — two columns: left (headline + filters) / right (CTA panel)
      ──────────────────────────────────────────────────── */}
      <div style={{
        position: 'relative', zIndex: 1, overflow: 'hidden',
        background: 'linear-gradient(180deg, rgba(215,255,0,0.034) 0%, rgba(215,255,0,0.008) 60%, transparent 100%)',
        padding: '40px 0 36px',
      }}>
        {/* Floodlight */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <div className="floodlight-beam" style={{
            position: 'absolute', top: '-20%', bottom: '-20%', width: '18%',
            background: 'linear-gradient(90deg, transparent 0%, rgba(215,255,0,0.018) 50%, transparent 100%)',
            filter: 'blur(18px)',
          }} />
        </div>

        {/* Pitch geometry — ultra subtle stadium atmosphere */}
        <div style={{ position: 'absolute', right: '2%', top: '6%', width: 280, height: 200, opacity: 0.022, pointerEvents: 'none', zIndex: 0 }}>
          {/* Outer border */}
          <div style={{ position: 'absolute', inset: 0, border: '1px solid rgba(255,255,255,1)' }} />
          {/* Center line */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'rgba(255,255,255,1)' }} />
          {/* Center circle */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: 80, height: 80, transform: 'translate(-50%,-50%)', borderRadius: '50%', border: '1px solid rgba(255,255,255,1)' }} />
          {/* Center dot */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: 5, height: 5, transform: 'translate(-50%,-50%)', borderRadius: '50%', background: 'rgba(255,255,255,1)' }} />
          {/* Left penalty arc suggestion */}
          <div style={{ position: 'absolute', top: '22%', left: '-1%', width: 40, height: '56%', border: '1px solid rgba(255,255,255,1)', borderLeft: 'none', borderRadius: '0 50px 50px 0' }} />
          {/* Right penalty arc suggestion */}
          <div style={{ position: 'absolute', top: '22%', right: '-1%', width: 40, height: '56%', border: '1px solid rgba(255,255,255,1)', borderRight: 'none', borderRadius: '50px 0 0 50px' }} />
        </div>

        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 40, alignItems: 'start' }}>

            {/* ── Left: headline + filters ── */}
            <div>
              {/* Live label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16 }}>
                <span className="live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: 'var(--accent)', textTransform: 'uppercase' }}>
                  En vivo
                </span>
              </div>

              {/* Headline */}
              <h1 style={{ fontWeight: 900, fontSize: 'clamp(30px, 3.8vw, 52px)', letterSpacing: '-0.044em', lineHeight: 1.03, marginBottom: 8 }}>
                Retos activos.
              </h1>
              <h2 style={{ fontWeight: 900, fontSize: 'clamp(26px, 3.2vw, 44px)', letterSpacing: '-0.040em', lineHeight: 1.03, color: 'rgba(255,255,255,0.18)', marginBottom: 18 }}>
                Entrá ya.
              </h2>

              {/* Sub copy */}
              <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.36)', marginBottom: 28, letterSpacing: '-0.01em', lineHeight: 1.5, maxWidth: 420 }}>
                <span style={{ color: 'rgba(255,255,255,0.72)', fontWeight: 700 }}>{allGames.length} equipo{allGames.length !== 1 ? 's' : ''}</span> buscando rival ahora mismo en Costa Rica.
              </p>

              {/* Format pills */}
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.24)', textTransform: 'uppercase', marginBottom: 8 }}>
                  Formato
                </p>
                <div className="filter-pills" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {FORMATS.map(f => {
                    const active = format === f;
                    return (
                      <button key={f} onClick={() => setFormat(f)} className="pill" style={{
                        padding: '7px 16px', borderRadius: 99, cursor: 'pointer', border: 'none',
                        fontSize: 12, fontWeight: 700, letterSpacing: '-0.01em',
                        background: active ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                        color:      active ? '#000'          : 'rgba(255,255,255,0.42)',
                        outline:    active ? 'none'          : '1px solid rgba(255,255,255,0.08)',
                        boxShadow:  active ? '0 0 18px rgba(215,255,0,0.18), 0 0 0 1px rgba(215,255,0,0.18)' : 'none',
                      }}>{f}</button>
                    );
                  })}
                </div>
              </div>

              {/* Level pills */}
              <div>
                <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.24)', textTransform: 'uppercase', marginBottom: 8 }}>
                  Nivel
                </p>
                <div className="filter-pills" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {LEVELS.map(l => {
                    const active = level === l;
                    return (
                      <button key={l} onClick={() => setLevel(l)} className="pill" style={{
                        padding: '6px 14px', borderRadius: 99, cursor: 'pointer', border: 'none',
                        fontSize: 11.5, fontWeight: 600, letterSpacing: '-0.01em',
                        background: active ? 'rgba(215,255,0,0.10)' : 'transparent',
                        color:      active ? 'var(--accent)'        : 'rgba(255,255,255,0.34)',
                        outline:    active ? '1px solid rgba(215,255,0,0.22)' : '1px solid rgba(255,255,255,0.06)',
                      }}>{l}</button>
                    );
                  })}
                </div>
              </div>

              {/* Mobile CTA */}
              <Link href="/crear-partido" className="btn-primary hero-mobile-cta" style={{
                marginTop: 28, padding: '13px 28px', fontSize: 14, borderRadius: 13,
                gap: 8, letterSpacing: '-0.01em',
              }}>
                <Plus size={16} /> Crear partido
              </Link>
            </div>

            {/* ── Right: CTA panel ── */}
            <div className="cta-panel" style={{
              borderRadius: 20, overflow: 'hidden',
              background: 'linear-gradient(145deg, rgba(215,255,0,0.055) 0%, rgba(215,255,0,0.016) 55%), linear-gradient(160deg, #181818 0%, #0f0f0f 100%)',
              border: '1px solid rgba(215,255,0,0.14)',
              boxShadow: '0 1px 0 rgba(255,255,255,0.05) inset, 0 12px 48px rgba(0,0,0,0.55)',
              padding: '26px 24px 24px',
            }}>
              {/* Label + online indicator */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase' }}>
                  Esta noche
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: '#4ADE80',
                    opacity: onlineDot ? 1 : 0.28,
                    transition: 'opacity 0.6s ease',
                    boxShadow: onlineDot ? '0 0 5px rgba(74,222,128,0.7)' : 'none',
                  }} />
                  <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.24)', letterSpacing: '-0.01em' }}>
                    en vivo
                  </span>
                </div>
              </div>

              {/* Headline */}
              <h3 style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.038em', lineHeight: 1.15, marginBottom: 6, color: 'rgba(255,255,255,0.94)' }}>
                ¿Armás el partido?
              </h3>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.36)', lineHeight: 1.55, marginBottom: 22, letterSpacing: '-0.01em' }}>
                Publicá tu reto. Los equipos te encuentran solos.
              </p>

              {/* CTA button */}
              <Link href="/crear-partido" className="btn-primary" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, padding: '13px 0', width: '100%', fontSize: 13.5,
                borderRadius: 13, letterSpacing: '-0.01em', fontWeight: 800,
                animation: 'cta-pulse 4s ease-in-out infinite',
              }}>
                <Plus size={15} /> Crear partido
              </Link>

              {/* Social proof — live counter */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 }}>
                <span className="active-teams-num" style={{
                  fontSize: 13, fontWeight: 900, letterSpacing: '-0.03em',
                  color: displayTeams > activeTeams ? 'rgba(215,255,0,0.70)' : 'rgba(255,255,255,0.36)',
                }}>
                  {displayTeams}
                </span>
                <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.22)', letterSpacing: '-0.01em' }}>
                  equipos activos ahora
                </span>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />

              {/* Live signals */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { text: `${allGames.length} equipo${allGames.length !== 1 ? 's' : ''} buscando rival ahora`, color: '#4ADE80' },
                  ...BASE_LIVE_SIGNALS,
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="live-dot" style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: s.color, display: 'inline-block', flexShrink: 0,
                      animationDelay: `${i * 0.4}s`,
                    }} />
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.44)', letterSpacing: '-0.01em', fontWeight: 500 }}>
                      {s.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────
          LIVE ACTIVITY TICKER
      ──────────────────────────────────────────────────── */}
      <div className="ticker-wrap" style={{
        overflow: 'hidden', position: 'relative', zIndex: 2,
        height: 36,
        borderTop: '1px solid rgba(255,255,255,0.038)',
        borderBottom: '1px solid rgba(255,255,255,0.038)',
        background: 'rgba(0,0,0,0.22)',
        display: 'flex', alignItems: 'center',
      }}>
        <div className="ticker-track">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
              <span style={{
                fontSize: 10.5, color: 'rgba(255,255,255,0.30)',
                fontWeight: 500, padding: '0 22px', letterSpacing: '-0.01em',
              }}>
                {item}
              </span>
              <span style={{ color: 'rgba(215,255,0,0.22)', fontSize: 6 }}>◆</span>
            </span>
          ))}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────
          RESULTS
      ──────────────────────────────────────────────────── */}
      <div className="container" style={{ padding: '28px 40px 96px', position: 'relative', zIndex: 1 }}>

        {/* Count + sort label */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.26)', fontWeight: 500, letterSpacing: '-0.01em' }}>
              <span style={{ fontWeight: 800, color: 'rgba(255,255,255,0.68)', fontSize: 13.5 }}>{filtered.length}</span>{' '}
              reto{filtered.length !== 1 ? 's' : ''} activo{filtered.length !== 1 ? 's' : ''}
            </p>
            {(format !== 'Todos' || level !== 'Todos') && (
              <button onClick={() => { setFormat('Todos'); setLevel('Todos'); }} style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.26)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '-0.01em' }}>
                Limpiar filtros
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="section-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ADE80', display: 'inline-block' }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', color: 'rgba(255,255,255,0.26)', textTransform: 'uppercase' }}>
              Urgentes primero
            </span>
          </div>
        </div>

        {/* Loading skeleton */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 16 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{
                borderRadius: 20, height: 280,
                background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.015) 100%)',
                border: '1px solid rgba(255,255,255,0.06)',
                animation: 'pulse 1.6s ease-in-out infinite',
              }} />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '88px 24px' }}>
            <div style={{ width: 72, height: 72, borderRadius: 22, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', fontSize: 32 }}>⚽</div>
            <p style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.025em' }}>No hay retos con esos filtros</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)', marginBottom: 24 }}>Intentá con otro formato o nivel</p>
            <button onClick={() => { setFormat('Todos'); setLevel('Todos'); }} className="btn-primary" style={{ padding: '10px 24px', fontSize: 13, borderRadius: 10 }}>
              Ver todos los retos
            </button>
          </div>
        ) : (
          <div className="cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {sorted.map(g => <MatchCard key={g.id} g={g} />)}
          </div>
        )}
      </div>
    </div>
  );
}

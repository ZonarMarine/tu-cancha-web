"use client";
import { useState } from "react";
import { MapPin, Clock, Plus, Users, Zap } from "lucide-react";
import Link from "next/link";
import { GAMES, fmtColones } from "@/lib/data";

/* ─── constants ──────────────────────────────────────────── */

const FORMATS = ['Todos', '5v5', '7v7', '11v11'];
const LEVELS  = ['Todos', 'Principiante', 'Intermedio', 'Avanzado'];

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

/* ─── live ecosystem data ────────────────────────────────── */

const LIVE_SIGNALS = [
  { text: `${GAMES.length} equipos buscando rival ahora`, color: '#4ADE80' },
  { text: '3 equipos necesitan 1 jugador más',            color: '#F97316' },
  { text: 'Actividad alta en San José esta noche',        color: '#FACC15' },
];

/* ─── MatchCard ──────────────────────────────────────────── */

function MatchCard({ g }: { g: typeof GAMES[0] }) {
  const [hov, setHov] = useState(false);

  const isUrgent  = g.tag?.includes('Urgente') || g.postedMin <= 3;
  const isPopular = g.tag?.includes('Popular');
  const mins      = minutesUntil(g.time);
  const isImminent = mins !== null && mins < 60;

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

      <div style={{ padding: '16px 18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        {/* Format + level badges */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
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
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', letterSpacing: '-0.01em' }}>
          hace {g.postedMin}min
        </span>
      </div>

      {/* ── VS composition — the emotional core ── */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 18px', gap: 10, marginBottom: 16 }}>

        {/* Challenger */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16, margin: '0 auto 8px',
            background: `${g.challenger.color}18`,
            border: `1.5px solid ${g.challenger.color}38`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 900, color: g.challenger.color,
            boxShadow: hov ? `0 0 20px ${g.challenger.color}18` : 'none',
            transition: 'box-shadow 0.28s ease',
          }}>
            {g.challenger.name[0]}
          </div>
          <p style={{ fontSize: 12.5, fontWeight: 800, color: 'rgba(255,255,255,0.90)', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 3 }}>
            {g.challenger.name}
          </p>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', fontWeight: 600, letterSpacing: '0.02em' }}>
            {g.challenger.record}
          </p>
        </div>

        {/* VS + countdown */}
        <div style={{ flexShrink: 0, textAlign: 'center', padding: '0 4px' }}>
          <p style={{ fontSize: 28, fontWeight: 900, color: 'var(--accent)', letterSpacing: '-0.06em', lineHeight: 1 }}>
            VS
          </p>
          {/* Time until game */}
          {mins !== null ? (
            <div style={{
              marginTop: 6, display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 9.5, fontWeight: 700,
              color: isImminent ? '#FF8080' : '#FACC15',
              letterSpacing: '-0.01em',
            }}>
              {isImminent && <span className="live-dot" style={{ width: 4, height: 4, borderRadius: '50%', background: '#FF8080', display: 'inline-block', flexShrink: 0 }} />}
              {fmtCountdown(mins)}
            </div>
          ) : (
            <p style={{ marginTop: 5, fontSize: 9.5, color: 'rgba(255,255,255,0.22)', fontWeight: 500 }}>
              {g.time}
            </p>
          )}
        </div>

        {/* Open slot */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div className={isImminent ? 'slot-pulse' : ''} style={{
            width: 60, height: 60, borderRadius: 16, margin: '0 auto 8px',
            background: 'rgba(255,255,255,0.03)',
            border: '1.5px dashed rgba(255,255,255,0.14)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, color: 'rgba(255,255,255,0.20)',
            transition: 'border-color 0.28s',
          }}>
            ?
          </div>
          <p style={{ fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.36)', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 3 }}>
            ¿Tu equipo?
          </p>
          <p style={{ fontSize: 10, color: 'rgba(215,255,0,0.55)', fontWeight: 600, letterSpacing: '0.01em' }}>
            Cupo libre
          </p>
        </div>
      </div>

      {/* ── Meta row ── */}
      <div style={{
        margin: '0 14px 14px', padding: '11px 14px', borderRadius: 12,
        background: 'rgba(255,255,255,0.028)',
        border: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', flexDirection: 'column', gap: 5,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'rgba(255,255,255,0.42)', letterSpacing: '-0.01em' }}>
          <MapPin size={9.5} style={{ color: 'rgba(215,255,0,0.55)', flexShrink: 0 }} />
          <span style={{ fontWeight: 600 }}>{g.venue}</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>{g.location}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'rgba(255,255,255,0.42)', letterSpacing: '-0.01em' }}>
          <Clock size={9.5} style={{ color: 'rgba(215,255,0,0.55)', flexShrink: 0 }} />
          <span>Hoy <strong style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 700 }}>{g.time}</strong></span>
          {mins !== null && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <span style={{ color: isImminent ? '#FF8080' : '#FACC15', fontWeight: 700 }}>
                Empieza en {fmtCountdown(mins)}
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
          <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.24)', marginBottom: 1, letterSpacing: '-0.01em' }}>por equipo</p>
          <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--accent)', letterSpacing: '-0.04em', lineHeight: 1 }}>
            {fmtColones(g.pricePerTeam)}
          </p>
        </div>
        <button className="btn-primary" style={{
          padding: '9px 18px', fontSize: 12, borderRadius: 11,
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
  const [format, setFormat] = useState('Todos');
  const [level,  setLevel]  = useState('Todos');

  const filtered = GAMES.filter(g =>
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
        @media (max-width: 1024px) { .cards-grid { grid-template-columns: repeat(2,1fr) !important; } }

        /* ── Mobile pill size ── */
        @media (max-width: 500px) {
          .filter-pills { gap: 5px !important; }
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
                <span style={{ color: 'rgba(255,255,255,0.72)', fontWeight: 700 }}>{GAMES.length} equipos</span> buscando rival ahora mismo en Costa Rica.
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
              <Link href="/auth" className="btn-primary hero-mobile-cta" style={{
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
              {/* Label */}
              <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', marginBottom: 8 }}>
                Esta noche
              </p>

              {/* Headline */}
              <h3 style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.038em', lineHeight: 1.15, marginBottom: 6, color: 'rgba(255,255,255,0.94)' }}>
                ¿Armás el partido?
              </h3>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.36)', lineHeight: 1.55, marginBottom: 22, letterSpacing: '-0.01em' }}>
                Publicá tu reto. Los equipos te encuentran solos.
              </p>

              {/* CTA button */}
              <Link href="/auth" className="btn-primary" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, padding: '13px 0', width: '100%', fontSize: 13.5,
                borderRadius: 13, letterSpacing: '-0.01em', fontWeight: 800,
                animation: 'cta-pulse 4s ease-in-out infinite',
              }}>
                <Plus size={15} /> Crear partido
              </Link>

              {/* Social proof */}
              <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.22)', textAlign: 'center', marginTop: 12, letterSpacing: '-0.01em' }}>
                {GAMES.length} equipos activos esta semana
              </p>

              {/* Divider */}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />

              {/* Live signals */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {LIVE_SIGNALS.map((s, i) => (
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

        {/* Empty state */}
        {sorted.length === 0 ? (
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

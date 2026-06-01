"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useSport } from "@/context/SportContext";
import { Search, MapPin, Star, SlidersHorizontal, X, Clock, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fmtColones, COURTS as STATIC_COURTS } from "@/lib/data";

/* ─── types ──────────────────────────────────────────────── */

export type Court = {
  id:              number | string;
  title:           string;
  location:        string;
  basePrice:       number;
  includedPlayers: number;
  sport:           string;
  rating:          number;
  tag:             string | null;
  slotsAvailable:  number;
  imageUrl?:       string | null;
  slots:           string[];
};

export type CourtWithLive = Court & {
  bookingsToday:     number;
  slotsLeft:         number | null;
  bookedTimesForDate: string[];   // actual booked slot strings for the queried date
};

function normalise(row: Record<string, any>): Court {
  return {
    id:              row.id,
    title:           row.title   ?? row.name   ?? 'Sin nombre',
    location:        row.location ?? row.zona   ?? '–',
    basePrice:       row.base_price  ?? row.basePrice  ?? row.precio_hora ?? 0,
    includedPlayers: row.included_players ?? row.includedPlayers ?? row.jugadores ?? 10,
    sport:           row.sport   ?? row.deporte ?? 'Fútbol',
    rating:          row.rating  ?? row.calificacion ?? 0,
    tag:             row.tag     ?? null,
    slotsAvailable:  row.slots_available ?? row.slotsAvailable ?? 0,
    slots:           Array.isArray(row.slots) ? row.slots : [],
    imageUrl:        row.image_url ?? row.imageUrl ?? row.photo_url ?? row.photo
                 ?? row.cover_image ?? row.cover_url ?? row.thumbnail_url ?? row.thumbnail
                 ?? row.picture_url ?? row.picture ?? row.img_url ?? row.img
                 ?? row.banner_url ?? row.banner ?? row.media_url
                 ?? (Array.isArray(row.photos) ? row.photos[0] : row.photos)
                 ?? (Array.isArray(row.images) ? row.images[0] : row.images)
                 ?? null,
  };
}

function attachLive(court: Court, bookedTimesToday: string[]): CourtWithLive {
  const bookingsToday = bookedTimesToday.length;
  const totalSlots    = court.slots.length > 0 ? court.slots.length : null;
  const slotsLeft     = totalSlots !== null ? Math.max(0, totalSlots - bookingsToday) : null;
  return { ...court, bookingsToday, slotsLeft, bookedTimesForDate: bookedTimesToday };
}

/* ─── filters ────────────────────────────────────────────── */

const SPORT_PILLS = [
  { label: 'Todo',   icon: '🏟', val: 'Todo'   },
  { label: 'Fútbol', icon: '⚽', val: 'Fútbol' },
  { label: 'Pádel',  icon: '🏓', val: 'Pádel'  },
];

const SPORT_ACCENT: Record<string, { bg: string; border: string; color: string; glow: string }> = {
  Todo:   { bg: 'rgba(255,255,255,0.07)', border: 'rgba(255,255,255,0.13)', color: 'rgba(255,255,255,0.72)', glow: 'rgba(255,255,255,0.04)' },
  Fútbol: { bg: 'rgba(215,255,0,0.08)',   border: 'rgba(215,255,0,0.20)',   color: 'rgba(215,255,0,0.82)',   glow: 'rgba(215,255,0,0.06)'   },
  Pádel:  { bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.20)',  color: 'rgba(96,165,250,0.82)',  glow: 'rgba(96,165,250,0.06)'  },
};

const SPORT_SOLID: Record<string, { bg: string; text: string; glow: string; icon: string }> = {
  Todo:   { bg: 'rgba(255,255,255,0.14)', text: '#fff',  glow: 'rgba(255,255,255,0.12)', icon: '🏟' },
  Fútbol: { bg: '#D7FF00',               text: '#000',  glow: 'rgba(215,255,0,0.28)',   icon: '⚽' },
  Pádel:  { bg: '#60A5FA',               text: '#000',  glow: 'rgba(96,165,250,0.28)',  icon: '🏓' },
};

const PLACEHOLDERS = [
  'Cancha, zona, deporte...',
  'Escazú · Fútbol · Esta noche',
  '¿Dónde jugás esta semana?',
  'Pinares · Fútsal · 8PM',
  'Buscá cancha en tu zona...',
];

const ZONES  = ['Todas', 'Santa Ana', 'Escazú', 'Heredia', 'Alajuela', 'San José'];
const PRICES = ['Cualquiera', 'Menos de ₡12k', '₡12k – ₡18k', 'Más de ₡18k'];

function priceMatch(base: number, range: string) {
  if (range === 'Cualquiera') return true;
  if (range === 'Menos de ₡12k') return base < 12000;
  if (range === '₡12k – ₡18k') return base >= 12000 && base <= 18000;
  return base > 18000;
}

/* ─── field backgrounds ──────────────────────────────────── */

const FIELD_STYLE: Record<string, React.CSSProperties> = {
  Fútbol: {
    background: [
      'radial-gradient(ellipse 90% 44% at 50% -4%, rgba(255,200,60,0.09) 0%, transparent 56%)',
      'radial-gradient(ellipse 48% 34% at 50% 56%, rgba(60,180,60,0.05) 0%, transparent 50%)',
      'linear-gradient(168deg, #163d08 0%, #0c2405 42%, #070f02 100%)',
    ].join(', '),
  },
  Pádel: {
    background: [
      'radial-gradient(ellipse 80% 38% at 50% -2%, rgba(70,140,255,0.08) 0%, transparent 54%)',
      'linear-gradient(162deg, #0a2448 0%, #061530 46%, #040b1c 100%)',
    ].join(', '),
  },
  Básquet: {
    background: [
      'radial-gradient(ellipse 70% 44% at 50% -4%, rgba(255,155,40,0.09) 0%, transparent 56%)',
      'linear-gradient(162deg, #381900 0%, #200c00 46%, #130700 100%)',
    ].join(', '),
  },
  Tenis: {
    background: [
      'radial-gradient(ellipse 80% 38% at 50% -2%, rgba(50,160,255,0.06) 0%, transparent 54%)',
      'linear-gradient(162deg, #0b2748 0%, #061530 100%)',
    ].join(', '),
  },
};

const SPORT_BADGE: Record<string, { bg: string; color: string; border: string }> = {
  Fútbol:  { bg: 'rgba(215,255,0,0.05)',  color: 'rgba(215,255,0,0.45)',  border: 'rgba(215,255,0,0.09)'  },
  Pádel:   { bg: 'rgba(96,165,250,0.05)', color: 'rgba(96,165,250,0.45)', border: 'rgba(96,165,250,0.09)' },
  Básquet: { bg: 'rgba(249,115,22,0.05)', color: 'rgba(249,115,22,0.45)', border: 'rgba(249,115,22,0.09)' },
  Tenis:   { bg: 'rgba(56,189,248,0.05)', color: 'rgba(56,189,248,0.45)', border: 'rgba(56,189,248,0.09)' },
};

type CardMood = { label: string; color: string; bg: string; border: string; pulse: boolean };

function getCardMood(c: CourtWithLive): CardMood {
  if (c.slotsLeft === 1)
    return { label: 'Último horario', color: '#FF6B6B', bg: 'rgba(255,107,107,0.12)', border: 'rgba(255,107,107,0.24)', pulse: true  };
  if (c.slotsLeft !== null && c.slotsLeft > 0 && c.slotsLeft <= 3)
    return { label: 'Se llena rápido', color: '#FACC15', bg: 'rgba(250,204,21,0.10)', border: 'rgba(250,204,21,0.22)', pulse: true  };
  if (c.bookingsToday >= 3)
    return { label: 'Muy popular hoy', color: '#F97316', bg: 'rgba(249,115,22,0.10)', border: 'rgba(249,115,22,0.22)', pulse: false };
  if (c.tag === 'Popular')
    return { label: 'Popular',         color: '#F97316', bg: 'rgba(249,115,22,0.10)', border: 'rgba(249,115,22,0.22)', pulse: false };
  if (c.tag === 'Premium')
    return { label: 'Premium',         color: '#FACC15', bg: 'rgba(250,204,21,0.10)', border: 'rgba(250,204,21,0.22)', pulse: false };
  if (c.tag === 'Nuevo')
    return { label: 'Recién agregada', color: '#60A5FA', bg: 'rgba(96,165,250,0.10)', border: 'rgba(96,165,250,0.22)', pulse: false };
  if (c.rating >= 4.5)
    return { label: 'Top valorada',    color: '#FACC15', bg: 'rgba(250,204,21,0.08)', border: 'rgba(250,204,21,0.18)', pulse: false };
  return { label: '', color: '', bg: 'transparent', border: 'transparent', pulse: false };
}

type LiveSignal = { text: string; dot: boolean; dotColor: string };

function getCourtSignal(c: CourtWithLive): { signal: LiveSignal | null; slotsText: string } {
  if (c.bookingsToday > 0 && c.slotsLeft !== null && c.slotsLeft > 0) {
    return {
      signal:    { text: `${c.bookingsToday} reservada${c.bookingsToday !== 1 ? 's' : ''} hoy`, dot: true, dotColor: '#4ADE80' },
      slotsText: `${c.slotsLeft} libre${c.slotsLeft !== 1 ? 's' : ''}`,
    };
  }
  if (c.bookingsToday > 0) {
    return {
      signal:    { text: `${c.bookingsToday} reservada${c.bookingsToday !== 1 ? 's' : ''} hoy`, dot: true, dotColor: '#4ADE80' },
      slotsText: c.slotsLeft === 0 ? 'Sin horarios hoy' : '',
    };
  }
  if (c.slotsLeft !== null && c.slotsLeft > 0) {
    return {
      signal:    { text: `${c.slotsLeft} horario${c.slotsLeft !== 1 ? 's' : ''} disponible${c.slotsLeft !== 1 ? 's' : ''}`, dot: false, dotColor: '' },
      slotsText: '',
    };
  }
  return { signal: null, slotsText: '' };
}

/* ─── SportPill ─────────────────────────────────────────── */

function SportPill({ p, active, onClick }: { p: typeof SPORT_PILLS[0]; active: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  const acc   = SPORT_ACCENT[p.val] ?? SPORT_ACCENT.Todo;
  const solid = SPORT_SOLID[p.val]  ?? SPORT_SOLID.Todo;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className={`sport-pill${active ? ' sport-pill-active' : ''}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '8px 18px', borderRadius: 99, cursor: 'pointer', border: 'none',
        fontSize: 12, fontWeight: 700, letterSpacing: '-0.01em',
        background: active ? solid.bg  : hov ? acc.bg : 'rgba(255,255,255,0.048)',
        color:      active ? solid.text : hov ? acc.color : 'rgba(255,255,255,0.38)',
        outline: 'none',
        boxShadow: active
          ? `0 0 24px ${solid.glow}, 0 0 0 1px ${solid.glow}`
          : hov
          ? `0 0 14px ${acc.glow}, 0 0 0 1px ${acc.border}`
          : '0 0 0 1px rgba(255,255,255,0.07)',
        transition: 'background 0.16s ease, color 0.16s ease, box-shadow 0.20s ease, transform 0.16s ease',
      }}
    >
      <span style={{
        fontSize: 13, transition: 'transform 0.18s ease',
        display: 'inline-block',
        transform: hov && !active ? 'scale(1.18)' : 'scale(1)',
      }}>{p.icon}</span>
      {p.label}
    </button>
  );
}

/* ─── CourtCard ──────────────────────────────────────────── */

function CourtCard({ c, hero = false }: { c: CourtWithLive; hero?: boolean }) {
  const [hov, setHov] = useState(false);
  const glowRef    = useRef<HTMLDivElement>(null);
  const imgWrapRef = useRef<HTMLDivElement>(null);

  const mood       = getCardMood(c);
  const fieldStyle = FIELD_STYLE[c.sport] ?? FIELD_STYLE.Fútbol;
  const sportBadge = SPORT_BADGE[c.sport] ?? { bg: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.24)', border: 'rgba(255,255,255,0.055)' };
  const imgHeight  = hero ? 218 : 178;
  const { signal, slotsText } = getCourtSignal(c);

  const handleImgMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!glowRef.current || !imgWrapRef.current) return;
    const r = imgWrapRef.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width)  * 100;
    const y = ((e.clientY - r.top)  / r.height) * 100;
    glowRef.current.style.background =
      `radial-gradient(ellipse 55% 45% at ${x}% ${y}%, rgba(215,255,0,0.08) 0%, transparent 68%)`;
  };
  const handleImgLeave = () => {
    if (glowRef.current) glowRef.current.style.background = 'none';
  };

  return (
    <Link
      href={`/cancha/${c.id}`}
      className="court-card"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); handleImgLeave(); }}
      style={{
        display: 'flex', flexDirection: 'column', textDecoration: 'none',
        borderRadius: 22, overflow: 'hidden',
        backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
        background: 'linear-gradient(145deg, rgba(255,255,255,0.026) 0%, transparent 52%), linear-gradient(155deg, #161616 0%, #0d0d0d 58%, #0b0b0b 100%)',
        border: `1px solid ${hov ? 'rgba(215,255,0,0.13)' : 'rgba(255,255,255,0.08)'}`,
        boxShadow: hov
          ? '0 0 0 1px rgba(215,255,0,0.05), 0 24px 60px rgba(0,0,0,0.82), 0 1px 0 rgba(255,255,255,0.055) inset'
          : '0 1px 0 rgba(255,255,255,0.048) inset, 0 2px 8px rgba(0,0,0,0.40), 0 12px 40px rgba(0,0,0,0.55)',
        transform: hov ? 'translate3d(0,-4px,0)' : 'translate3d(0,0,0)',
        transition: 'transform 0.30s cubic-bezier(0.22,0.61,0.36,1), border-color 0.22s, box-shadow 0.30s',
      }}>

      {/* ── Image ── */}
      <div
        ref={imgWrapRef}
        className={`court-card-img${hero ? ' img-featured' : ''}`}
        onMouseMove={handleImgMove}
        onMouseLeave={handleImgLeave}
        style={{ position: 'relative', overflow: 'hidden', height: imgHeight, flexShrink: 0, marginBottom: -1, ...(c.imageUrl ? {} : fieldStyle) }}>

        {c.imageUrl ? (
          <img
            src={c.imageUrl} alt={c.title}
            className="court-img"
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              filter: 'contrast(1.22) brightness(0.68) saturate(1.05)',
            }}
          />
        ) : (
          <>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `linear-gradient(to right,rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,0.04) 1px,transparent 1px)`,
              backgroundSize: '33.33% 50%',
              opacity: c.sport === 'Fútbol' ? 0.45 : 0.22,
            }} />
            {(c.sport === 'Fútbol' || c.sport === 'Fútsal') && (<>
              <div style={{ position:'absolute', inset:'8% 6%', border:'1.5px solid rgba(255,255,255,0.10)', borderRadius:2 }} />
              <div style={{ position:'absolute', top:'8%', bottom:'8%', left:'50%', width:1, background:'rgba(255,255,255,0.09)' }} />
              <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:56, height:56, borderRadius:'50%', border:'1.5px solid rgba(255,255,255,0.10)' }} />
              <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:4, height:4, borderRadius:'50%', background:'rgba(255,255,255,0.18)' }} />
              <div style={{ position:'absolute', top:'28%', bottom:'28%', left:'6%', width:'18%', border:'1.5px solid rgba(255,255,255,0.08)', borderLeft:'none' }} />
              <div style={{ position:'absolute', top:'28%', bottom:'28%', right:'6%', width:'18%', border:'1.5px solid rgba(255,255,255,0.08)', borderRight:'none' }} />
              <div style={{ position:'absolute', top:-20, left:-20, width:120, height:120, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,250,220,0.07) 0%, transparent 70%)', pointerEvents:'none' }} />
              <div style={{ position:'absolute', top:-20, right:-20, width:120, height:120, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,250,220,0.07) 0%, transparent 70%)', pointerEvents:'none' }} />
            </>)}
            {c.sport === 'Pádel' && (<>
              <div style={{ position:'absolute', inset:'7% 8%', border:'1.5px solid rgba(100,180,255,0.18)', borderRadius:2 }} />
              <div style={{ position:'absolute', top:'7%', bottom:'7%', left:'50%', width:2, background:'rgba(100,180,255,0.22)', boxShadow:'0 0 6px rgba(100,180,255,0.22)' }} />
              <div style={{ position:'absolute', top:'7%', bottom:'7%', left:'25%', width:1, background:'rgba(100,180,255,0.11)' }} />
              <div style={{ position:'absolute', top:'7%', bottom:'7%', right:'25%', width:1, background:'rgba(100,180,255,0.11)' }} />
              <div style={{ position:'absolute', top:'50%', left:'8%', width:'42%', height:1, background:'rgba(100,180,255,0.10)' }} />
              <div style={{ position:'absolute', top:'50%', right:'8%', width:'42%', height:1, background:'rgba(100,180,255,0.10)' }} />
            </>)}
          </>
        )}

        {/* Cinematic layers */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 20%, rgba(0,0,0,0.74) 100%)' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 88, background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 100%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 150, background: 'linear-gradient(to top, rgba(5,2,0,0.96) 0%, rgba(4,2,0,0.60) 38%, transparent 100%)' }} />
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.28, mixBlendMode: 'overlay',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '180px 180px',
        }} />
        <div ref={glowRef} style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', opacity: hov ? 1 : 0, transition: 'opacity 0.28s ease' }} />

        {mood.label && (
          <div style={{ position: 'absolute', top: 13, left: 13, zIndex: 4 }}>
            <span className={mood.pulse ? 'urgency-badge' : ''} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 9, fontWeight: 700, padding: '3px 9px', borderRadius: 7,
              background: mood.bg, color: mood.color, border: `1px solid ${mood.border}`,
              letterSpacing: '0.03em', backdropFilter: 'blur(8px)',
            }}>
              {mood.pulse && (
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: mood.color, display: 'inline-block', flexShrink: 0, animation: 'live-dot 2s ease-in-out infinite' }} />
              )}
              {mood.label}
            </span>
          </div>
        )}

        {signal && (
          <div style={{
            position: 'absolute', bottom: 12, left: 13, zIndex: 4,
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 8,
            background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(14px)',
            color: 'rgba(255,255,255,0.70)', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            {signal.dot && (
              <span className="live-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: signal.dotColor, display: 'inline-block', flexShrink: 0 }} />
            )}
            {signal.text}
          </div>
        )}

        {slotsText && (
          <div style={{
            position: 'absolute', bottom: 12, right: 13, zIndex: 4,
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 8,
            background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(14px)',
            color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <Clock size={8.5} color="rgba(255,255,255,0.38)" />
            {slotsText}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '18px 22px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4, gap: 10 }}>
          <h3 style={{ fontWeight: 900, fontSize: hero ? 20 : 17, letterSpacing: '-0.036em', lineHeight: 1.14, color: 'rgba(255,255,255,0.95)' }}>
            {c.title}
          </h3>
          {c.rating > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 800, color: '#FACC15', flexShrink: 0, marginTop: 3, opacity: 0.90 }}>
              <Star size={9} fill="currentColor" /> {c.rating}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 15, fontSize: 11, color: 'rgba(255,255,255,0.30)', letterSpacing: '-0.01em', fontWeight: 500 }}>
          <MapPin size={8.5} style={{ flexShrink: 0, opacity: 0.55 }} />
          {c.location}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 13, borderTop: '1px solid rgba(255,255,255,0.045)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
            <span style={{ fontWeight: 800, fontSize: 16, color: 'rgba(215,255,0,0.58)', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {fmtColones(c.basePrice)}
            </span>
            <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.13)', letterSpacing: '-0.01em' }}>/ hr</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {c.includedPlayers > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10.5, color: 'rgba(255,255,255,0.22)', letterSpacing: '-0.01em', fontWeight: 500 }}>
                <Users size={8} style={{ opacity: 0.50 }} /> {c.includedPlayers}
              </span>
            )}
            <span style={{
              fontSize: 8.5, fontWeight: 700, padding: '2.5px 8px', borderRadius: 5,
              background: sportBadge.bg, color: sportBadge.color,
              border: `1px solid ${sportBadge.border}`,
              letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>
              {c.sport}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ─── CardSkeleton ───────────────────────────────────────── */

function CardSkeleton() {
  return (
    <div style={{ borderRadius: 22, overflow: 'hidden', background: 'linear-gradient(160deg, #141414, #0c0c0c)', border: '1px solid rgba(255,255,255,0.055)' }}>
      <div className="court-card-img" style={{ background: 'rgba(255,255,255,0.020)', animation: 'skel-pulse 1.8s ease-in-out infinite' }} />
      <div style={{ padding: '18px 22px 22px' }}>
        <div style={{ height: 15, width: '60%', borderRadius: 7, background: 'rgba(255,255,255,0.052)', marginBottom: 8, animation: 'skel-pulse 1.8s ease-in-out infinite' }} />
        <div style={{ height: 11, width: '36%', borderRadius: 7, background: 'rgba(255,255,255,0.030)', marginBottom: 18, animation: 'skel-pulse 1.8s ease-in-out infinite' }} />
        <div style={{ height: 11, width: '26%', borderRadius: 7, background: 'rgba(255,255,255,0.030)', animation: 'skel-pulse 1.8s ease-in-out infinite' }} />
      </div>
    </div>
  );
}

/* ─── ExplorarPage ───────────────────────────────────────── */

export default function ExplorarPage() {
  const { sport: globalSport, setSport: setGlobalSport } = useSport();

  const [courts,      setCourts]  = useState<CourtWithLive[]>([]);
  const [loading,     setLoading] = useState(true);
  const [dbError,     setDbError] = useState('');
  const [search,      setSearch]  = useState('');
  const [sport,       setSport]   = useState<string>('Fútbol');
  const [zone,        setZone]    = useState('Todas');
  const [price,       setPrice]   = useState('Cualquiera');
  const [horaFilter,  setHoraFilter] = useState('');      // from ?hora= param
  const [dateFilter,  setDateFilter] = useState('');      // from ?date= param
  const [showFilters, setShow]    = useState(false);
  const [totalBookingsToday, setTotalBookingsToday] = useState(0);
  const [sigIdx,      setSigIdx]  = useState(0);
  const [phIdx,       setPhIdx]   = useState(0);
  const [searchFocused, setSearchFocused] = useState(false);
  const [rawOpenRetos,  setRawOpenRetos]  = useState<any[]>([]);
  const [recentBookingText, setRecentBookingText] = useState('');
  const [activeCourts, setActiveCourts] = useState(0);

  /* ── Sport-reactive design tokens ── */
  const isPadel         = sport === 'Pádel';
  const pageSolid       = SPORT_SOLID[sport] ?? SPORT_SOLID.Fútbol;
  const heroGradientTop = isPadel ? 'rgba(96,165,250,0.038)' : 'rgba(215,255,0,0.034)';
  const heroGradientMid = isPadel ? 'rgba(96,165,250,0.010)' : 'rgba(215,255,0,0.010)';
  const orbA            = isPadel ? 'rgba(96,165,250,0.024)' : 'rgba(215,255,0,0.022)';
  const orbB            = isPadel ? 'rgba(96,165,250,0.014)' : 'rgba(215,255,0,0.012)';
  const liveDotColor    = isPadel ? '#60A5FA' : '#4ADE80';
  const focusBorder     = isPadel ? 'rgba(96,165,250,0.34)' : 'rgba(215,255,0,0.34)';
  const focusShadow     = isPadel
    ? '0 0 0 4px rgba(96,165,250,0.07), 0 0 40px rgba(96,165,250,0.06)'
    : '0 0 0 4px rgba(215,255,0,0.07), 0 0 40px rgba(215,255,0,0.06)';
  const focusIconColor  = isPadel ? 'rgba(96,165,250,0.65)' : 'rgba(215,255,0,0.65)';
  const filterActive    = showFilters || (zone !== 'Todas' || price !== 'Cualquiera');
  const filterBg        = filterActive ? (isPadel ? 'rgba(96,165,250,0.09)' : 'rgba(215,255,0,0.09)') : 'rgba(255,255,255,0.042)';
  const filterBorder    = filterActive ? (isPadel ? 'rgba(96,165,250,0.22)' : 'rgba(215,255,0,0.22)') : 'rgba(255,255,255,0.09)';

  /* ── Sport-filtered live signals (derived from real data) ── */
  const liveSignals = useMemo(() => {
    const sigs: string[] = [];

    const filtered = rawOpenRetos.filter(r => {
      const rSport = (r.sport ?? r.deporte ?? '').toLowerCase().trim();
      const fmt    = (r.format ?? '').toLowerCase();
      const isPadelReto = rSport.includes('padel') || rSport.includes('pádel') || fmt.includes('padel');
      if (sport === 'Pádel')  return isPadelReto;
      if (sport === 'Fútbol') return rSport === '' || !isPadelReto;
      return true;
    });

    for (const r of filtered.slice(0, 3)) {
      if (!r.team_name) continue;
      const emoji = isPadel ? '🏓' : '⚽';
      const parts = [`${emoji} ${r.team_name} busca rival`];
      if (r.location) parts.push(r.location);
      if (r.time)     parts.push(r.time);
      sigs.push(parts.join(' · '));
    }

    if (recentBookingText) sigs.push(recentBookingText);

    return sigs;
  }, [rawOpenRetos, sport, recentBookingText, isPadel]);

  /* ── Sync all URL params from advanced search on mount ── */
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);

    // sport
    const urlSport = p.get('sport');
    if (urlSport === 'padel') {
      setSport('Pádel');
      setGlobalSport('padel');
    } else if (urlSport === 'futbol' || urlSport === 'football') {
      setSport('Fútbol');
      setGlobalSport('futbol');
    } else if (urlSport === 'todos' || urlSport === 'todo' || urlSport === 'all') {
      setSport('Todo');
    } else {
      setSport(globalSport === 'padel' ? 'Pádel' : 'Fútbol');
    }

    // location → zone (match explorar's ZONES list)
    const urlLoc = p.get('location');
    if (urlLoc) {
      const matched = ZONES.find(z => z.toLowerCase() === urlLoc.toLowerCase());
      if (matched) setZone(matched);
    }

    // date filter
    const urlDate = p.get('date');
    if (urlDate) setDateFilter(urlDate);

    // hora filter
    const urlHora = p.get('hora');
    if (urlHora) setHoraFilter(urlHora);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSportChange = (val: string) => {
    setSport(val);
    if (val === 'Pádel')  setGlobalSport('padel');
    if (val === 'Fútbol') setGlobalSport('futbol');
  };

  /* ── Load courts + bookings for selected date (or today) ── */
  async function loadData() {
    const today       = new Date().toISOString().split('T')[0];
    const queryDate   = dateFilter || today;

    const [courtsRes, bookingsRes, retosRes] = await Promise.all([
      supabase.from('owner_courts').select('*').eq('active', true).is('deleted_at', null),
      supabase.from('bookings').select('court_name, time, created_at').in('status', ['confirmed', 'paid', 'completed']).eq('date', queryDate),
      supabase.from('retos').select('team_name, location, time, format, sport, deporte').in('status', ['open', 'looking_for_rival', 'active']).gte('date', today).order('created_at', { ascending: false }).limit(8),
    ]);

    const rawCourts     = courtsRes.data   ?? [];
    const todayBookings = bookingsRes.data ?? [];
    const openRetos     = retosRes.data    ?? [];

    const byCourtName: Record<string, string[]> = {};
    for (const b of todayBookings) {
      if (!b.court_name) continue;
      if (!byCourtName[b.court_name]) byCourtName[b.court_name] = [];
      byCourtName[b.court_name].push(b.time ?? '');
    }

    const baseCourts: Court[] = rawCourts.length > 0
      ? rawCourts.map(normalise)
      : STATIC_COURTS.map(r => ({ ...normalise(r), slots: [] }));

    const liveCourts: CourtWithLive[] = baseCourts.map(c =>
      attachLive(c, byCourtName[c.title] ?? [])
    );

    liveCourts.sort((a, b) => (b.bookingsToday - a.bookingsToday) || (b.rating - a.rating));

    setCourts(liveCourts);
    setActiveCourts(liveCourts.length);
    setTotalBookingsToday(todayBookings.length);
    setRawOpenRetos(openRetos);

    /* Most recent booking text for ticker */
    const sorted = [...todayBookings].sort((a, b) =>
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
    if (sorted[0]?.court_name && sorted[0]?.created_at) {
      const diffMin = Math.round((Date.now() - new Date(sorted[0].created_at).getTime()) / 60000);
      if (diffMin < 120) {
        setRecentBookingText(`🏟 Nueva reserva en ${sorted[0].court_name} · hace ${diffMin} min`);
      } else {
        setRecentBookingText('');
      }
    }

    setLoading(false);
  }

  useEffect(() => { loadData(); }, [dateFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const ch = supabase
      .channel('explorar-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' },     loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'retos'    },     loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'owner_courts' }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = courts.filter(c => {
    if (sport !== 'Todo' && c.sport !== sport) return false;
    if (zone !== 'Todas' && !c.location.toLowerCase().includes(zone.toLowerCase())) return false;
    if (!priceMatch(c.basePrice, price)) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !c.location.toLowerCase().includes(search.toLowerCase())) return false;
    // Hora filter: court must have the slot AND it must not already be booked
    if (horaFilter && horaFilter !== 'Cualquier hora') {
      const norm = (s: string) => s.trim().toLowerCase();
      // If the court has a known schedule, the requested hour must be in it
      if (c.slots.length > 0 && !c.slots.some(s => norm(s) === norm(horaFilter))) return false;
      // The requested hour must not already be confirmed/booked for the selected date
      if (c.bookedTimesForDate.some(t => norm(t) === norm(horaFilter))) return false;
    }
    return true;
  });

  const activeFilters = [zone !== 'Todas' && zone, price !== 'Cualquiera' && price].filter(Boolean);

  /* Count-up animation */
  const [countBookings, setCountBookings] = useState(0);
  useEffect(() => {
    if (totalBookingsToday === 0) return;
    let frame = 0; const frames = 48;
    const id = setInterval(() => {
      frame++;
      const eased = 1 - Math.pow(1 - frame / frames, 3);
      setCountBookings(Math.round(eased * totalBookingsToday));
      if (frame >= frames) { setCountBookings(totalBookingsToday); clearInterval(id); }
    }, 20);
    return () => clearInterval(id);
  }, [totalBookingsToday]);

  /* Signal rotation */
  useEffect(() => {
    if (liveSignals.length < 2) return;
    const id = setInterval(() => setSigIdx(i => (i + 1) % liveSignals.length), 4000);
    return () => clearInterval(id);
  }, [liveSignals.length]);

  /* Placeholder rotation */
  useEffect(() => {
    if (searchFocused || search) return;
    const id = setInterval(() => setPhIdx(i => (i + 1) % PLACEHOLDERS.length), 4200);
    return () => clearInterval(id);
  }, [searchFocused, search]);

  const safeIdx = liveSignals.length > 0 ? sigIdx % liveSignals.length : 0;

  return (
    <div style={{ paddingTop: 60, minHeight: '100svh', background: '#080808', position: 'relative' }}>

      <style>{`
        /* ── Base ── */
        @keyframes skel-pulse { 0%,100%{opacity:1;} 50%{opacity:0.40;} }

        /* ── Live dots ── */
        @keyframes live-dot { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.35;transform:scale(0.65);} }
        .live-dot    { animation: live-dot 2.4s ease-in-out infinite; }
        .section-dot { animation: live-dot 2.8s ease-in-out infinite; }

        /* ── Ambient orb drift ── */
        @keyframes orb-a {
          0%,100% { transform: translate(0,0)        scale(1);    opacity: 0.80; }
          40%     { transform: translate(28px,-18px)  scale(1.06); opacity: 0.95; }
          70%     { transform: translate(-12px,14px)  scale(0.97); opacity: 0.72; }
        }
        @keyframes orb-b {
          0%,100% { transform: translate(0,0)        scale(1);    opacity: 0.68; }
          35%     { transform: translate(-22px,16px)  scale(1.04); opacity: 0.84; }
          68%     { transform: translate(18px,-10px)  scale(0.97); opacity: 0.62; }
        }
        .orb-a { animation: orb-a 16s ease-in-out infinite; }
        .orb-b { animation: orb-b 13s ease-in-out infinite; }

        /* ── Floodlight ── */
        @keyframes floodlight {
          0%   { transform: translateX(-120%) skewX(-8deg); }
          100% { transform: translateX(320%)  skewX(-8deg); }
        }
        .floodlight-beam {
          animation: floodlight 18s cubic-bezier(0.4,0,0.6,1) infinite;
          animation-delay: -5s;
        }

        /* ── Cards ── */
        .court-card { will-change: transform; }
        .court-img  { transform: scale(1.02); transition: transform 0.60s cubic-bezier(0.22,0.61,0.36,1); }
        .court-card:hover .court-img { transform: scale(1.08); }
        .court-card-img              { height: 178px; }
        .court-card-img.img-featured { height: 210px; }

        /* ── Signal fade ── */
        @keyframes sigFade {
          from { opacity:0; transform: translateY(4px); }
          to   { opacity:1; transform: translateY(0);   }
        }
        .live-signal { animation: sigFade 0.42s cubic-bezier(0.22,0.61,0.36,1) both; }

        /* ── Search ── */
        .search-wrap {
          transition: border-color 0.22s, box-shadow 0.22s, background 0.22s;
        }
        .search-wrap:focus-within {
          border-color: ${focusBorder} !important;
          background: rgba(255,255,255,0.056) !important;
          box-shadow: ${focusShadow} !important;
        }
        .search-icon { transition: color 0.22s; }
        .search-wrap:focus-within .search-icon { color: ${focusIconColor} !important; }

        /* ── Sport pills ── */
        .sport-pill { transition: background 0.16s, color 0.16s, box-shadow 0.20s, transform 0.18s; }
        .sport-pill:hover  { transform: translateY(-1.5px) scale(1.025); }
        .sport-pill:active { transform: scale(0.94) translateY(0) !important; transition: transform 0.09s ease !important; }
        .sport-pill-active { transform: scale(1.03); }

        /* ── Urgency badge ── */
        @keyframes urgencyPulse { 0%,100%{opacity:1;} 50%{opacity:0.68;} }
        .urgency-badge { animation: urgencyPulse 2.6s ease-in-out infinite; }

        /* ── Filter btn ── */
        .filter-btn { transition: background 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s; }

        /* ── Ticker entry ── */
        @keyframes tickerIn {
          from { opacity:0; transform: translateX(-8px); }
          to   { opacity:1; transform: translateX(0); }
        }
        .ticker-item { animation: tickerIn 0.38s cubic-bezier(0.22,0.61,0.36,1) both; }

        /* ── Glassmorphism empty card ── */
        .empty-state-card {
          background: linear-gradient(145deg, rgba(255,255,255,0.030) 0%, rgba(255,255,255,0.008) 60%, transparent 100%);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
        }

        /* ── Grid breakpoints ── */
        @media (max-width:700px)  { .cards-grid { grid-template-columns: 1fr !important; gap: 12px !important; } }
        @media (max-width:1000px) { .cards-grid { grid-template-columns: repeat(2,1fr) !important; } }

        /* ── Mobile ── */
        @media (max-width:700px) {
          .court-card-img              { height: 178px; }
          .court-card-img.img-featured { height: 200px; }
          .hero-title  { font-size: clamp(24px, 7vw, 36px) !important; letter-spacing: -0.038em !important; }
          .filter-label   { display: none !important; }
          .activity-extra { display: none !important; }
          .results-container { padding-left: 20px !important; padding-right: 20px !important; }
        }
        @media (max-width: 600px) {
          .search-row { flex-wrap: wrap; }
          .search-row > div { min-width: 100% !important; }
        }
      `}</style>

      {/* ── Sport-reactive ambient orbs ── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div className="orb-a" style={{
          position: 'absolute', top: '-10%', right: '-8%', width: 820, height: 820,
          background: `radial-gradient(circle at center, ${orbA} 0%, transparent 56%)`,
          filter: 'blur(3px)',
          transition: 'background 0.70s ease',
        }} />
        <div className="orb-b" style={{
          position: 'absolute', bottom: '-18%', left: '-12%', width: 700, height: 700,
          background: `radial-gradient(circle at center, ${orbB} 0%, transparent 58%)`,
          filter: 'blur(3px)',
          transition: 'background 0.70s ease',
        }} />
        {/* Subtle grid overlay for depth */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.018,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
      </div>

      {/* ────────────────────────────────────────────────────────
          HERO — compact, sport-reactive
      ──────────────────────────────────────────────────────── */}
      <div style={{
        position: 'relative', zIndex: 1, overflow: 'hidden',
        background: `linear-gradient(180deg, ${heroGradientTop} 0%, ${heroGradientMid} 55%, transparent 100%)`,
        padding: '26px 0 18px',
        transition: 'background 0.60s ease',
      }}>
        {/* Floodlight beam */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
          <div className="floodlight-beam" style={{
            position: 'absolute', top: '-20%', bottom: '-20%', width: '22%',
            background: `linear-gradient(90deg, transparent 0%, ${heroGradientTop} 50%, transparent 100%)`,
            filter: 'blur(18px)',
          }} />
        </div>

        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <h1 className="hero-title" style={{
            fontWeight: 900,
            fontSize: 'clamp(28px, 3.4vw, 44px)',
            letterSpacing: '-0.042em',
            lineHeight: 1.04,
            marginBottom: 4,
          }}>
            Encontrá tu cancha.
          </h1>
          <p style={{
            fontWeight: 700,
            fontSize: 'clamp(17px, 2vw, 27px)',
            letterSpacing: '-0.028em',
            color: 'rgba(255,255,255,0.26)',
            marginBottom: 18,
            lineHeight: 1.1,
          }}>
            Reservá en segundos.
          </p>

          {/* Search bar */}
          <div className="search-row" style={{ display: 'flex', gap: 10, maxWidth: 620, marginBottom: 14 }}>
            <div className="search-wrap" style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 14,
              padding: '0 22px', height: 60, borderRadius: 18,
              background: 'rgba(255,255,255,0.044)',
              border: '1px solid rgba(255,255,255,0.088)',
              backdropFilter: 'blur(24px)',
            }}>
              <Search size={15} className="search-icon" style={{ color: 'rgba(255,255,255,0.26)', flexShrink: 0 }} />
              <input
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14.5, color: 'var(--text)', letterSpacing: '-0.015em' }}
                placeholder={PLACEHOLDERS[phIdx]}
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ color: 'rgba(255,255,255,0.26)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                  <X size={13} />
                </button>
              )}
            </div>

            <button onClick={() => setShow(!showFilters)} className="filter-btn" style={{
              display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0,
              padding: '0 22px', height: 60, borderRadius: 18, cursor: 'pointer',
              fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em',
              backdropFilter: 'blur(20px)',
              background: filterBg,
              color:   filterActive ? pageSolid.bg : 'rgba(255,255,255,0.48)',
              border:  `1px solid ${filterBorder}`,
              boxShadow: filterActive ? `0 0 18px ${pageSolid.glow}40` : 'none',
            }}>
              <SlidersHorizontal size={14} />
              <span className="filter-label">Filtros</span>
              {activeFilters.length > 0 && (
                <span style={{ width: 17, height: 17, borderRadius: '50%', background: pageSolid.bg, color: pageSolid.text, fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {activeFilters.length}
                </span>
              )}
            </button>
          </div>

          {/* Sport pills */}
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {SPORT_PILLS.map(p => (
              <SportPill key={p.val} p={p} active={sport === p.val} onClick={() => handleSportChange(p.val)} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Filter panel ── */}
      {showFilters && (
        <div style={{ position: 'relative', zIndex: 1, padding: '14px 0 16px' }}>
          <div className="container">
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24,
              padding: '18px 22px', borderRadius: 16,
              background: 'linear-gradient(145deg, rgba(255,255,255,0.022) 0%, transparent 50%), #121212',
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 32px rgba(0,0,0,0.5)',
            }}>
              <div>
                <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.22)', marginBottom: 10, textTransform: 'uppercase' }}>Zona</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ZONES.map(z => (
                    <button key={z} onClick={() => setZone(z)} style={{ padding: '5px 12px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: zone === z ? pageSolid.bg : 'rgba(255,255,255,0.05)', color: zone === z ? pageSolid.text : 'rgba(255,255,255,0.42)', border: zone === z ? 'none' : '1px solid rgba(255,255,255,0.07)', transition: 'all 0.14s' }}>{z}</button>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.22)', marginBottom: 10, textTransform: 'uppercase' }}>Precio / hora</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {PRICES.map(p => (
                    <button key={p} onClick={() => setPrice(p)} style={{ padding: '5px 12px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: price === p ? pageSolid.bg : 'rgba(255,255,255,0.05)', color: price === p ? pageSolid.text : 'rgba(255,255,255,0.42)', border: price === p ? 'none' : '1px solid rgba(255,255,255,0.07)', transition: 'all 0.14s' }}>{p}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          SLIM REALTIME ACTIVITY TICKER
          — dark glass strip, no colored bands
      ──────────────────────────────────────────────────────── */}
      {!loading && liveSignals.length > 0 && (
        <div style={{
          position: 'relative', zIndex: 1,
          borderTop:    '1px solid rgba(255,255,255,0.048)',
          borderBottom: '1px solid rgba(255,255,255,0.048)',
          background:   'rgba(255,255,255,0.016)',
          backdropFilter: 'blur(16px)',
          padding: '9px 0',
        }}>
          <div className="container">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="live-dot" style={{
                width: 5, height: 5, borderRadius: '50%',
                background: liveDotColor, display: 'inline-block', flexShrink: 0,
                boxShadow: `0 0 7px ${liveDotColor}`,
              }} />
              <span
                key={safeIdx}
                className="ticker-item"
                style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.34)', letterSpacing: '-0.01em', lineHeight: 1 }}
              >
                {liveSignals[safeIdx]}
              </span>
              {totalBookingsToday > 0 && (
                <span className="activity-extra" style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.18)', letterSpacing: '-0.01em' }}>
                  {countBookings} reserva{countBookings !== 1 ? 's' : ''} hoy
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          RESULTS
      ──────────────────────────────────────────────────────── */}
      <div className="container results-container" style={{ padding: '24px 40px 96px', position: 'relative', zIndex: 1 }}>

        {dbError && (
          <div style={{ padding: '14px 18px', borderRadius: 12, marginBottom: 24, background: 'rgba(255,59,59,0.07)', color: '#FF6B6B', border: '1px solid rgba(255,59,59,0.14)', fontSize: 13 }}>
            Error cargando canchas: {dbError}
          </div>
        )}

        {/* Results count + active filter chips */}
        {!loading && !dbError && filtered.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.26)', fontWeight: 500, letterSpacing: '-0.01em' }}>
                <span style={{ fontWeight: 800, color: 'rgba(255,255,255,0.68)', fontSize: 13.5 }}>{filtered.length}</span>{' '}
                cancha{filtered.length !== 1 ? 's' : ''} disponible{filtered.length !== 1 ? 's' : ''}
              </p>
              {activeFilters.map(f => (
                <span key={f as string} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 99, background: isPadel ? 'rgba(96,165,250,0.07)' : 'rgba(215,255,0,0.07)', color: pageSolid.bg, border: `1px solid ${isPadel ? 'rgba(96,165,250,0.14)' : 'rgba(215,255,0,0.14)'}` }}>
                  {f}
                  <button onClick={() => { if (f === zone) setZone('Todas'); else setPrice('Cualquiera'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}>
                    <X size={9} />
                  </button>
                </span>
              ))}
            </div>
            {(activeFilters.length > 0 || sport !== 'Todo' || search || horaFilter || dateFilter) && (
              <button onClick={() => { setSport('Todo'); setZone('Todas'); setPrice('Cualquiera'); setSearch(''); setHoraFilter(''); setDateFilter(''); }} style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.24)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '-0.01em' }}>
                Limpiar filtros
              </button>
            )}
          </div>
        )}

        {/* Skeleton loading */}
        {loading && (
          <div className="cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {[1,2,3].map(i => <CardSkeleton key={i} />)}
          </div>
        )}

        {/* ── Empty state: no courts in DB at all ── */}
        {!loading && !dbError && courts.length === 0 && (() => {
          const s = SPORT_SOLID[sport] ?? SPORT_SOLID.Fútbol;
          return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 24px' }}>
              <div className="empty-state-card" style={{
                maxWidth: 420, width: '100%',
                padding: '52px 40px',
                borderRadius: 28,
                border: `1px solid ${s.bg}2a`,
                boxShadow: `0 0 100px ${s.glow}16, 0 32px 80px rgba(0,0,0,0.55)`,
                textAlign: 'center',
              }}>
                <div style={{
                  width: 88, height: 88, borderRadius: 26, margin: '0 auto 24px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${s.bg}18`, border: `1px solid ${s.bg}2e`,
                  fontSize: 38, boxShadow: `0 0 36px ${s.glow}20`,
                }}>{s.icon}</div>
                <p style={{ fontSize: 19, fontWeight: 800, marginBottom: 10, letterSpacing: '-0.028em', lineHeight: 1.25 }}>
                  {sport === 'Pádel'
                    ? 'Todavía no hay canchas de pádel activas.'
                    : 'Aún no hay canchas registradas.'}
                </p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.30)', marginBottom: 32, lineHeight: 1.6 }}>
                  Las primeras canchas aparecerán aquí automáticamente.
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {sport !== 'Fútbol' && (
                    <button
                      onClick={() => handleSportChange('Fútbol')}
                      style={{ padding: '11px 24px', fontSize: 13, borderRadius: 11, cursor: 'pointer', border: 'none', fontWeight: 700, background: 'rgba(215,255,0,0.10)', color: '#D7FF00', boxShadow: '0 0 0 1px rgba(215,255,0,0.18)', letterSpacing: '-0.01em' }}
                    >
                      Ver fútbol
                    </button>
                  )}
                  <button
                    onClick={() => { setSport('Todo'); setZone('Todas'); setPrice('Cualquiera'); setSearch(''); setHoraFilter(''); setDateFilter(''); }}
                    style={{ padding: '11px 24px', fontSize: 13, borderRadius: 11, cursor: 'pointer', fontWeight: 700, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.38)', border: '1px solid rgba(255,255,255,0.09)', letterSpacing: '-0.01em' }}
                  >
                    Limpiar filtros
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Empty state: courts exist but none match filters ── */}
        {!loading && !dbError && courts.length > 0 && filtered.length === 0 && (() => {
          const s = SPORT_SOLID[sport] ?? SPORT_SOLID.Fútbol;
          return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 24px' }}>
              <div className="empty-state-card" style={{
                maxWidth: 420, width: '100%',
                padding: '52px 40px',
                borderRadius: 28,
                border: `1px solid ${s.bg}2a`,
                boxShadow: `0 0 100px ${s.glow}16, 0 32px 80px rgba(0,0,0,0.55)`,
                textAlign: 'center',
              }}>
                <div style={{
                  width: 88, height: 88, borderRadius: 26, margin: '0 auto 24px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${s.bg}18`, border: `1px solid ${s.bg}2e`,
                  fontSize: 38, boxShadow: `0 0 36px ${s.glow}20`,
                }}>{s.icon}</div>
                <p style={{ fontSize: 19, fontWeight: 800, marginBottom: 10, letterSpacing: '-0.028em', lineHeight: 1.25 }}>
                  No encontramos canchas disponibles con esos filtros.
                </p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.30)', marginBottom: 32, lineHeight: 1.6 }}>
                  {horaFilter
                    ? `No hay canchas disponibles a las ${horaFilter}${dateFilter ? ' para esa fecha' : ''}. Intentá con otro horario o zona.`
                    : dateFilter
                    ? 'No hay canchas disponibles para esa fecha. Probá con otra fecha o zona.'
                    : 'Intentá con otro deporte, zona o precio.'}
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {sport !== 'Fútbol' && (
                    <button
                      onClick={() => handleSportChange('Fútbol')}
                      style={{ padding: '11px 24px', fontSize: 13, borderRadius: 11, cursor: 'pointer', border: 'none', fontWeight: 700, background: 'rgba(215,255,0,0.10)', color: '#D7FF00', boxShadow: '0 0 0 1px rgba(215,255,0,0.18)', letterSpacing: '-0.01em' }}
                    >
                      Ver fútbol
                    </button>
                  )}
                  <button
                    onClick={() => { setSport('Todo'); setZone('Todas'); setPrice('Cualquiera'); setSearch(''); setHoraFilter(''); setDateFilter(''); }}
                    style={{ padding: '11px 24px', fontSize: 13, borderRadius: 11, cursor: 'pointer', fontWeight: 700, background: s.bg, color: s.text, boxShadow: `0 0 20px ${s.glow}`, border: 'none', letterSpacing: '-0.01em' }}
                  >
                    Limpiar filtros
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Courts grid ── */}
        {!loading && !dbError && filtered.length > 0 && (
          <>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
              <span className="section-dot" style={{
                width: 5, height: 5, borderRadius: '50%',
                background: liveDotColor, display: 'inline-block', flexShrink: 0,
                boxShadow: `0 0 7px ${liveDotColor}`,
              }} />
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.09em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase' }}>
                Más reservadas esta semana
              </span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)', marginLeft: 4 }} />
            </div>

            <div className="cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {filtered.map((c, i) => {
                const isHero = i === 0 && filtered.length >= 2;
                return (
                  <div key={c.id} style={{ gridColumn: isHero ? 'span 2' : 'span 1' }}>
                    <CourtCard c={c} hero={isHero} />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

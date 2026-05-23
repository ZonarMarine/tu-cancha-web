"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
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
  /* raw slots array from owner_courts — used to calculate availability */
  slots:           string[];
};

/* Extended with live booking data computed after fetching today's bookings */
export type CourtWithLive = Court & {
  bookingsToday: number;   // confirmed bookings for this court today
  slotsLeft:     number | null; // null = no slot schedule defined
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

/* Attach live booking data to a base court */
function attachLive(court: Court, bookedTimesToday: string[]): CourtWithLive {
  const bookingsToday = bookedTimesToday.length;
  const totalSlots    = court.slots.length > 0 ? court.slots.length : null;
  const slotsLeft     = totalSlots !== null ? Math.max(0, totalSlots - bookingsToday) : null;
  return { ...court, bookingsToday, slotsLeft };
}

/* ─── filters ────────────────────────────────────────────── */

const SPORT_PILLS = [
  { label: 'Todo',    icon: '🏟', val: 'Todo'    },
  { label: 'Fútbol',  icon: '⚽', val: 'Fútbol'  },
  { label: 'Pádel',   icon: '🎾', val: 'Pádel'   },
  { label: 'Básquet', icon: '🏀', val: 'Básquet' },
  { label: 'Tenis',   icon: '🎾', val: 'Tenis'   },
];

/* Sport-specific hover accents — each discipline has its own energy */
const SPORT_ACCENT: Record<string, { bg: string; border: string; color: string; glow: string }> = {
  Todo:    { bg: 'rgba(255,255,255,0.07)',  border: 'rgba(255,255,255,0.13)',  color: 'rgba(255,255,255,0.72)', glow: 'rgba(255,255,255,0.04)' },
  Fútbol:  { bg: 'rgba(215,255,0,0.08)',    border: 'rgba(215,255,0,0.20)',    color: 'rgba(215,255,0,0.82)',   glow: 'rgba(215,255,0,0.06)'   },
  Pádel:   { bg: 'rgba(96,165,250,0.08)',   border: 'rgba(96,165,250,0.20)',   color: 'rgba(96,165,250,0.82)',  glow: 'rgba(96,165,250,0.06)'  },
  Básquet: { bg: 'rgba(249,115,22,0.08)',   border: 'rgba(249,115,22,0.20)',   color: 'rgba(249,115,22,0.82)',  glow: 'rgba(249,115,22,0.06)'  },
  Tenis:   { bg: 'rgba(56,189,248,0.08)',   border: 'rgba(56,189,248,0.20)',   color: 'rgba(56,189,248,0.82)',  glow: 'rgba(56,189,248,0.06)'  },
};

/* Live signals — populated from real retos data, falls back to empty */
let LIVE_SIGNALS: string[] = [];

/* Search placeholders — rotates when idle */
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

/* ─── field backgrounds — cooler, deeper, cinematic ──────── */

const FIELD_STYLE: Record<string, React.CSSProperties> = {
  Fútbol: {
    background: [
      /* Stadium floodlight top — warm amber */
      'radial-gradient(ellipse 90% 44% at 50% -4%, rgba(255,200,60,0.09) 0%, transparent 56%)',
      /* Pitch centre glow — cooler green */
      'radial-gradient(ellipse 48% 34% at 50% 56%, rgba(60,180,60,0.05) 0%, transparent 50%)',
      /* Deep cool-green base */
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
      'radial-gradient(ellipse 38% 20% at 50% 88%, rgba(255,120,24,0.06) 0%, transparent 100%)',
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

const TAG_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  Popular: { bg: 'var(--accent)',         color: '#000',    border: 'transparent'          },
  Premium: { bg: 'rgba(250,204,21,0.12)', color: '#FACC15', border: 'rgba(250,204,21,0.24)' },
  Nuevo:   { bg: 'rgba(96,165,250,0.12)', color: '#60A5FA', border: 'rgba(96,165,250,0.24)' },
};

/* Sport-specific badge tints — sport identity in the card footer */
const SPORT_BADGE: Record<string, { bg: string; color: string; border: string }> = {
  Fútbol:  { bg: 'rgba(215,255,0,0.05)',  color: 'rgba(215,255,0,0.45)',  border: 'rgba(215,255,0,0.09)'  },
  Pádel:   { bg: 'rgba(96,165,250,0.05)', color: 'rgba(96,165,250,0.45)', border: 'rgba(96,165,250,0.09)' },
  Básquet: { bg: 'rgba(249,115,22,0.05)', color: 'rgba(249,115,22,0.45)', border: 'rgba(249,115,22,0.09)' },
  Tenis:   { bg: 'rgba(56,189,248,0.05)', color: 'rgba(56,189,248,0.45)', border: 'rgba(56,189,248,0.09)' },
};

/* ─── Card mood system — editorial variety per card ─────────
   Each card gets a distinct identity signal rather than a
   generic tag. Priority: scarcity → tag → deterministic mood.
─────────────────────────────────────────────────────────── */

type CardMood = { label: string; color: string; bg: string; border: string; pulse: boolean };

function getCardMood(c: CourtWithLive): CardMood {
  /* Real data — scarcity signals first */
  if (c.slotsLeft === 1)
    return { label: 'Último horario', color: '#FF6B6B', bg: 'rgba(255,107,107,0.12)', border: 'rgba(255,107,107,0.24)', pulse: true  };
  if (c.slotsLeft !== null && c.slotsLeft > 0 && c.slotsLeft <= 3)
    return { label: 'Se llena rápido', color: '#FACC15', bg: 'rgba(250,204,21,0.10)', border: 'rgba(250,204,21,0.22)', pulse: true  };
  if (c.bookingsToday >= 3)
    return { label: 'Muy popular hoy', color: '#F97316', bg: 'rgba(249,115,22,0.10)', border: 'rgba(249,115,22,0.22)', pulse: false };

  /* Owner-set tags */
  if (c.tag === 'Popular')
    return { label: 'Popular',         color: '#F97316', bg: 'rgba(249,115,22,0.10)', border: 'rgba(249,115,22,0.22)', pulse: false };
  if (c.tag === 'Premium')
    return { label: 'Premium',         color: '#FACC15', bg: 'rgba(250,204,21,0.10)', border: 'rgba(250,204,21,0.22)', pulse: false };
  if (c.tag === 'Nuevo')
    return { label: 'Recién agregada', color: '#60A5FA', bg: 'rgba(96,165,250,0.10)', border: 'rgba(96,165,250,0.22)', pulse: false };

  /* Rating signals */
  if (c.rating >= 4.5)
    return { label: 'Top valorada',    color: '#FACC15', bg: 'rgba(250,204,21,0.08)', border: 'rgba(250,204,21,0.18)', pulse: false };

  /* Default: no mood badge if no real signal */
  return { label: '', color: '', bg: 'transparent', border: 'transparent', pulse: false };
}

/* Social signals — populated from real open retos, empty if none */
let SOCIAL_SIGNALS: string[] = [];

/* ─── live football ecosystem ────────────────────────────────
   5 distinct signal types — each tells a different part of
   "football is happening right now in Costa Rica"
─────────────────────────────────────────────────────────── */

type LiveSignal = { text: string; dot: boolean; dotColor: string };

/* Real live signal derived from actual booking data */
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
  /* No real data — show nothing */
  return { signal: null, slotsText: '' };
}

/* ─── SportPill ─────────────────────────────────────────── */

function SportPill({ p, active, onClick }: { p: typeof SPORT_PILLS[0]; active: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  const acc = SPORT_ACCENT[p.val] ?? SPORT_ACCENT.Todo;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className={`sport-pill${active ? ' sport-pill-active' : ''}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '7px 16px', borderRadius: 99, cursor: 'pointer', border: 'none',
        fontSize: 12, fontWeight: 700, letterSpacing: '-0.01em',
        background: active ? 'var(--accent)' : hov ? acc.bg : 'rgba(255,255,255,0.048)',
        color:      active ? '#000'          : hov ? acc.color : 'rgba(255,255,255,0.38)',
        outline: 'none',
        boxShadow: active
          ? '0 0 20px rgba(215,255,0,0.22), 0 0 0 1px rgba(215,255,0,0.22)'
          : hov
          ? `0 0 14px ${acc.glow}, 0 0 0 1px ${acc.border}`
          : '0 0 0 1px rgba(255,255,255,0.07)',
        transition: 'background 0.16s ease, color 0.16s ease, box-shadow 0.20s ease, transform 0.16s ease',
      }}
    >
      <span style={{
        fontSize: 13, transition: 'transform 0.18s ease',
        display: 'inline-block',
        transform: hov && !active ? 'scale(1.15)' : 'scale(1)',
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

  /* Spotlight: mouse tracks within image — direct DOM, 60fps */
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
              /* Cinematic grade: deeper shadows, cooler, less saturated surroundings */
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
            {/* ── Fútbol / Fútsal field lines ── */}
            {(c.sport === 'Fútbol' || c.sport === 'Fútsal') && (<>
              {/* Outer boundary */}
              <div style={{ position:'absolute', inset:'8% 6%', border:'1.5px solid rgba(255,255,255,0.10)', borderRadius:2 }} />
              {/* Centre line */}
              <div style={{ position:'absolute', top:'8%', bottom:'8%', left:'50%', width:1, background:'rgba(255,255,255,0.09)' }} />
              {/* Centre circle */}
              <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:56, height:56, borderRadius:'50%', border:'1.5px solid rgba(255,255,255,0.10)' }} />
              {/* Centre dot */}
              <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:4, height:4, borderRadius:'50%', background:'rgba(255,255,255,0.18)' }} />
              {/* Left penalty box */}
              <div style={{ position:'absolute', top:'28%', bottom:'28%', left:'6%', width:'18%', border:'1.5px solid rgba(255,255,255,0.08)', borderLeft:'none' }} />
              {/* Right penalty box */}
              <div style={{ position:'absolute', top:'28%', bottom:'28%', right:'6%', width:'18%', border:'1.5px solid rgba(255,255,255,0.08)', borderRight:'none' }} />
              {/* Floodlight bloom top-left */}
              <div style={{ position:'absolute', top:-20, left:-20, width:120, height:120, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,250,220,0.07) 0%, transparent 70%)', pointerEvents:'none' }} />
              {/* Floodlight bloom top-right */}
              <div style={{ position:'absolute', top:-20, right:-20, width:120, height:120, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,250,220,0.07) 0%, transparent 70%)', pointerEvents:'none' }} />
            </>)}

            {/* ── Pádel court lines ── */}
            {c.sport === 'Pádel' && (<>
              {/* Outer boundary */}
              <div style={{ position:'absolute', inset:'7% 8%', border:'1.5px solid rgba(100,180,255,0.18)', borderRadius:2 }} />
              {/* Net (vertical centre) */}
              <div style={{ position:'absolute', top:'7%', bottom:'7%', left:'50%', width:2, background:'rgba(100,180,255,0.22)', boxShadow:'0 0 6px rgba(100,180,255,0.22)' }} />
              {/* Left service line */}
              <div style={{ position:'absolute', top:'7%', bottom:'7%', left:'25%', width:1, background:'rgba(100,180,255,0.11)' }} />
              {/* Right service line */}
              <div style={{ position:'absolute', top:'7%', bottom:'7%', right:'25%', width:1, background:'rgba(100,180,255,0.11)' }} />
              {/* Horizontal mid left */}
              <div style={{ position:'absolute', top:'50%', left:'8%', width:'42%', height:1, background:'rgba(100,180,255,0.10)' }} />
              {/* Horizontal mid right */}
              <div style={{ position:'absolute', top:'50%', right:'8%', width:'42%', height:1, background:'rgba(100,180,255,0.10)' }} />
            </>)}
          </>
        )}

        {/* ── Cinematic layers ── */}
        {/* Deep vignette — tight, dark */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 20%, rgba(0,0,0,0.74) 100%)' }} />
        {/* Top shadow — badge legibility */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 88,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 100%)' }} />
        {/* Bottom fade — warm night atmosphere */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 150,
          background: 'linear-gradient(to top, rgba(5,2,0,0.96) 0%, rgba(4,2,0,0.60) 38%, transparent 100%)' }} />
        {/* Film grain */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.28, mixBlendMode: 'overlay',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '180px 180px',
        }} />

        {/* Mouse-tracking spotlight — reduced intensity */}
        <div ref={glowRef} style={{
          position: 'absolute', inset: 0, zIndex: 3,
          pointerEvents: 'none',
          opacity: hov ? 1 : 0,
          transition: 'opacity 0.28s ease',
        }} />

        {/* Mood badge — only shown when there's a real signal */}
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

        {/* Bottom-left: real live signal — hidden when no data */}
        {signal && (
          <div style={{
            position: 'absolute', bottom: 12, left: 13, zIndex: 4,
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 8,
            background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(14px)',
            color: 'rgba(255,255,255,0.70)', border: '1px solid rgba(255,255,255,0.06)',
            letterSpacing: '-0.01em',
          }}>
            {signal.dot && (
              <span className="live-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: signal.dotColor, display: 'inline-block', flexShrink: 0 }} />
            )}
            {signal.text}
          </div>
        )}

        {/* Bottom-right: real slots left — hidden when no data */}
        {slotsText && (
          <div style={{
            position: 'absolute', bottom: 12, right: 13, zIndex: 4,
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 8,
            background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(14px)',
            color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.06)',
            letterSpacing: '-0.01em',
          }}>
            <Clock size={8.5} color="rgba(255,255,255,0.38)" />
            {slotsText}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '18px 22px 20px' }}>

        {/* Venue name + rating */}
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

        {/* Location */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 15, fontSize: 11, color: 'rgba(255,255,255,0.30)', letterSpacing: '-0.01em', fontWeight: 500 }}>
          <MapPin size={8.5} style={{ flexShrink: 0, opacity: 0.55 }} />
          {c.location}
        </div>

        {/* Footer: price · meta */}
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

/* ─── Skeleton ───────────────────────────────────────────── */

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
  const [courts,      setCourts]  = useState<CourtWithLive[]>([]);
  const [loading,     setLoading] = useState(true);
  const [dbError,     setDbError] = useState('');
  const [search,      setSearch]  = useState('');
  const [sport,       setSport]   = useState('Todo');
  const [zone,        setZone]    = useState('Todas');
  const [price,       setPrice]   = useState('Cualquiera');
  const [showFilters, setShow]    = useState(false);
  const [totalBookingsToday, setTotalBookingsToday] = useState(0);
  const [sigIdx,      setSigIdx]    = useState(0);
  const [phIdx,       setPhIdx]     = useState(0);
  const [socialIdx,   setSocialIdx] = useState(0);
  const [searchFocused, setSearchFocused] = useState(false);
  const countedRef = useRef(false);

  /* ── Load courts + today's bookings ── */
  async function loadData() {
    const today = new Date().toISOString().split('T')[0];

    const [courtsRes, bookingsRes, retosRes] = await Promise.all([
      supabase.from('owner_courts').select('*').eq('active', true).is('deleted_at', null),
      supabase.from('bookings').select('court_name, time').in('status', ['confirmed', 'paid', 'completed']).eq('date', today),
      supabase.from('retos').select('team_name, location, time, format').eq('status', 'open').gte('date', today).order('created_at', { ascending: false }).limit(6),
    ]);

    const rawCourts = courtsRes.data ?? [];
    const todayBookings = bookingsRes.data ?? [];
    const openRetos     = retosRes.data   ?? [];

    /* Group today's bookings by court name */
    const byCourtName: Record<string, string[]> = {};
    for (const b of todayBookings) {
      if (!b.court_name) continue;
      if (!byCourtName[b.court_name]) byCourtName[b.court_name] = [];
      byCourtName[b.court_name].push(b.time ?? '');
    }

    /* Build courts with live data */
    const baseCourts: Court[] = rawCourts.length > 0
      ? rawCourts.map(normalise)
      : STATIC_COURTS.map(r => ({ ...normalise(r), slots: [] }));

    const liveCourts: CourtWithLive[] = baseCourts.map(c =>
      attachLive(c, byCourtName[c.title] ?? [])
    );

    /* Sort: most booked today first, then by rating */
    liveCourts.sort((a, b) => (b.bookingsToday - a.bookingsToday) || (b.rating - a.rating));

    setCourts(liveCourts);
    setTotalBookingsToday(todayBookings.length);

    /* Build real live signals from open retos */
    LIVE_SIGNALS = openRetos
      .filter(r => r.team_name)
      .map(r => {
        const parts = [`⚽ ${r.team_name} busca rival`];
        if (r.location) parts.push(r.location);
        if (r.time)     parts.push(r.time);
        return parts.join(' · ');
      });
    if (LIVE_SIGNALS.length === 0) LIVE_SIGNALS = ['⚽ Canchas disponibles para reservar esta semana'];

    SOCIAL_SIGNALS = openRetos.slice(0, 4)
      .filter(r => r.team_name)
      .map(r => `${r.team_name} busca rival${r.location ? ` · ${r.location}` : ''}`);
    if (SOCIAL_SIGNALS.length === 0) SOCIAL_SIGNALS = [];

    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  /* Realtime: re-fetch when a booking is created/updated */
  useEffect(() => {
    const ch = supabase
      .channel('explorar-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'retos'    }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = courts.filter(c =>
    (sport === 'Todo'  || c.sport === sport) &&
    (zone  === 'Todas' || c.location.toLowerCase().includes(zone.toLowerCase())) &&
    priceMatch(c.basePrice, price) &&
    (!search || c.title.toLowerCase().includes(search.toLowerCase()) || c.location.toLowerCase().includes(search.toLowerCase()))
  );

  const activeFilters = [zone !== 'Todas' && zone, price !== 'Cualquiera' && price].filter(Boolean);
  const featured      = filtered[0] ?? null;  // already sorted: most booked → highest rated
  const rest          = featured ? filtered.filter(c => c.id !== featured.id) : filtered;
  const activeCourts  = courts.length;

  /* Count-up animation driven by real totalBookingsToday */
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

  /* Live signal rotation — 3.8s per signal */
  useEffect(() => {
    const id = setInterval(() => setSigIdx(i => (i + 1) % LIVE_SIGNALS.length), 3800);
    return () => clearInterval(id);
  }, []);

  /* Placeholder rotation — only when not focused and no text */
  useEffect(() => {
    if (searchFocused || search) return;
    const id = setInterval(() => setPhIdx(i => (i + 1) % PLACEHOLDERS.length), 4200);
    return () => clearInterval(id);
  }, [searchFocused, search]);

  /* Social signal rotation */
  useEffect(() => {
    const id = setInterval(() => setSocialIdx(i => (i + 1) % SOCIAL_SIGNALS.length), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    /* Charcoal depth — very subtle warm-dark gradient, never flat black */
    <div style={{ paddingTop: 60, minHeight: '100svh', background: 'linear-gradient(160deg, #090909 0%, #070707 48%, #080807 100%)', position: 'relative' }}>

      <style>{`
        /* ── Base ── */
        @keyframes skel-pulse { 0%,100%{opacity:1;} 50%{opacity:0.40;} }

        /* ── Live signals ── */
        @keyframes live-dot { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.35;transform:scale(0.65);} }
        .live-dot    { animation: live-dot 2.4s ease-in-out infinite; }
        .section-dot { animation: live-dot 2.8s ease-in-out infinite; }

        /* ── Signature: stadium floodlight (restrained — 20% dimmer) ── */
        @keyframes floodlight {
          0%   { transform: translateX(-120%) skewX(-8deg); }
          100% { transform: translateX(320%)  skewX(-8deg); }
        }
        .floodlight-beam {
          animation: floodlight 18s cubic-bezier(0.4,0,0.6,1) infinite;
          animation-delay: -5s;
        }

        /* ── Signature: ambient orb drift ── */
        @keyframes orb-a {
          0%,100% { transform: translate(0,0)      scale(1);    opacity: 0.78; }
          40%     { transform: translate(26px,-16px) scale(1.06); opacity: 0.92; }
          70%     { transform: translate(-10px,12px) scale(0.97); opacity: 0.72; }
        }
        @keyframes orb-b {
          0%,100% { transform: translate(0,0)      scale(1);    opacity: 0.68; }
          35%     { transform: translate(-20px,14px) scale(1.04); opacity: 0.82; }
          68%     { transform: translate(16px,-8px)  scale(0.98); opacity: 0.62; }
        }
        .orb-a { animation: orb-a 15s ease-in-out infinite; }
        .orb-b { animation: orb-b 12s ease-in-out infinite; }

        /* ── Card ── */
        .court-card { will-change: transform; }
        .court-img  { transform: scale(1.02); transition: transform 0.60s cubic-bezier(0.22,0.61,0.36,1); }
        .court-card:hover .court-img { transform: scale(1.08); }

        /* ── Card image height — matches homepage cards ── */
        .court-card-img          { height: 178px; }
        .court-card-img.img-featured { height: 210px; }

        /* ── Live signal fade-in ── */
        @keyframes sigFade {
          from { opacity:0; transform: translateY(5px); }
          to   { opacity:1; transform: translateY(0);   }
        }
        .live-signal { animation: sigFade 0.45s cubic-bezier(0.22,0.61,0.36,1) both; }

        /* ── Search idle breathing — signature landmark ── */
        @keyframes searchIdle {
          0%,100% { box-shadow: 0 0 0 0 transparent, 0 2px 16px rgba(0,0,0,0.20); }
          50%      { box-shadow: 0 0 0 1px rgba(215,255,0,0.07), 0 2px 24px rgba(215,255,0,0.05); }
        }
        .search-wrap {
          animation: searchIdle 5.5s ease-in-out infinite;
          transition: border-color 0.22s, box-shadow 0.22s, background 0.22s;
        }
        .search-wrap:focus-within {
          animation: none;
          border-color: rgba(215,255,0,0.34) !important;
          background: rgba(255,255,255,0.056) !important;
          box-shadow: 0 0 0 4px rgba(215,255,0,0.07), 0 0 40px rgba(215,255,0,0.07) !important;
        }
        .search-icon { transition: color 0.22s; }
        .search-wrap:focus-within .search-icon { color: rgba(215,255,0,0.65) !important; }

        /* ── Sport pills ── */
        .sport-pill { transition: background 0.16s, color 0.16s, box-shadow 0.20s, transform 0.18s; }
        .sport-pill:hover  { transform: translateY(-1.5px) scale(1.025); }
        .sport-pill:active { transform: scale(0.94) translateY(0) !important; transition: transform 0.09s ease !important; }
        .sport-pill-active { transform: scale(1.03); }

        /* ── Urgency badge pulse ── */
        @keyframes urgencyPulse { 0%,100%{opacity:1;} 50%{opacity:0.68;} }
        .urgency-badge { animation: urgencyPulse 2.6s ease-in-out infinite; }

        /* ── Filter ── */
        .filter-btn { transition: background 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s; }

        /* ── Grid ── */
        @media (max-width:700px)  { .cards-grid { grid-template-columns: 1fr !important; gap: 12px !important; } }
        @media (max-width:1000px) { .cards-grid { grid-template-columns: repeat(2,1fr) !important; } }

        /* ── Mobile image heights ── */
        @media (max-width:700px) {
          .court-card-img          { height: 178px; }
          .court-card-img.img-featured { height: 200px; }
        }

        /* ── Mobile typography & spacing ── */
        @media (max-width:700px) {
          .hero-title { letter-spacing: -0.038em !important; }
          .filter-label { display: none !important; }
          .activity-extra { display: none !important; }
          .results-container { padding-left: 20px !important; padding-right: 20px !important; }
        }
        @media (max-width: 600px) {
          .search-row { flex-wrap: wrap; }
          .search-row > div { min-width: 100% !important; }
        }
      `}</style>

      {/* ── Ambient: drifting stadium orbs (fixed, restrained) ── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div className="orb-a" style={{
          position: 'absolute', top: '-12%', right: '-6%', width: 780, height: 780,
          background: 'radial-gradient(circle at center, rgba(215,255,0,0.022) 0%, transparent 58%)',
          filter: 'blur(2px)',
        }} />
        <div className="orb-b" style={{
          position: 'absolute', bottom: '-20%', left: '-10%', width: 680, height: 680,
          background: 'radial-gradient(circle at center, rgba(215,255,0,0.012) 0%, transparent 60%)',
          filter: 'blur(2px)',
        }} />
      </div>

      {/* ──────────────────────────────────────────────────────
          HERO — seamless fade, no border, floodlight sweep
      ──────────────────────────────────────────────────── */}
      <div style={{
        position: 'relative', zIndex: 1, overflow: 'hidden',
        /* Reduced hero glow — lime is now a whisper, not a shout */
        background: 'linear-gradient(180deg, rgba(215,255,0,0.036) 0%, rgba(215,255,0,0.010) 58%, transparent 100%)',
        padding: '36px 0 32px',
      }}>

        {/* Floodlight beam — more subtle */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
          <div className="floodlight-beam" style={{
            position: 'absolute', top: '-20%', bottom: '-20%', width: '20%',
            background: 'linear-gradient(90deg, transparent 0%, rgba(215,255,0,0.020) 50%, transparent 100%)',
            filter: 'blur(16px)',
          }} />
        </div>

        <div className="container" style={{ position: 'relative', zIndex: 1 }}>

          <h1 className="hero-title" style={{ fontWeight: 900, fontSize: 'clamp(28px, 3.4vw, 44px)', letterSpacing: '-0.042em', lineHeight: 1.04, marginBottom: 6 }}>
            Encontrá tu cancha.
          </h1>
          <p style={{ fontWeight: 700, fontSize: 'clamp(18px, 2.2vw, 29px)', letterSpacing: '-0.028em', color: 'rgba(255,255,255,0.28)', marginBottom: 16, lineHeight: 1.1 }}>
            Reservá en segundos.
          </p>

          {/* ── Live signal ticker ── */}
          <div style={{ height: 26, marginBottom: 22, display: 'flex', alignItems: 'center', gap: 7 }}>
            <span className="live-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ADE80', display: 'inline-block', flexShrink: 0 }} />
            <span
              key={sigIdx}
              className="live-signal"
              style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.32)', fontWeight: 600, letterSpacing: '-0.01em' }}
            >
              {LIVE_SIGNALS.length > 0 ? LIVE_SIGNALS[sigIdx % LIVE_SIGNALS.length] : ''}
            </span>
          </div>

          {/* Search + filter */}
          <div className="search-row" style={{ display: 'flex', gap: 10, maxWidth: 640, marginBottom: 16 }}>
            <div className="search-wrap" style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 14,
              padding: '0 22px', height: 64, borderRadius: 18,
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
              padding: '0 22px', height: 64, borderRadius: 18, cursor: 'pointer',
              fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em',
              backdropFilter: 'blur(20px)',
              background: showFilters || activeFilters.length > 0 ? 'rgba(215,255,0,0.09)' : 'rgba(255,255,255,0.042)',
              color:      showFilters || activeFilters.length > 0 ? 'var(--accent)' : 'rgba(255,255,255,0.48)',
              border:     `1px solid ${showFilters || activeFilters.length > 0 ? 'rgba(215,255,0,0.22)' : 'rgba(255,255,255,0.09)'}`,
              boxShadow:  showFilters || activeFilters.length > 0 ? '0 0 16px rgba(215,255,0,0.08)' : 'none',
            }}>
              <SlidersHorizontal size={14} />
              <span className="filter-label">Filtros</span>
              {activeFilters.length > 0 && (
                <span style={{ width: 17, height: 17, borderRadius: '50%', background: 'var(--accent)', color: '#000', fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {activeFilters.length}
                </span>
              )}
            </button>
          </div>

          {/* Sport pills — sport-specific hover energy */}
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {SPORT_PILLS.map(p => (
              <SportPill key={p.val} p={p} active={sport === p.val} onClick={() => setSport(p.val)} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Filter panel ── */}
      {showFilters && (
        <div style={{ position: 'relative', zIndex: 1, padding: '18px 0 20px' }}>
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
                    <button key={z} onClick={() => setZone(z)} style={{ padding: '5px 12px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: zone === z ? 'var(--accent)' : 'rgba(255,255,255,0.05)', color: zone === z ? '#000' : 'rgba(255,255,255,0.42)', border: zone === z ? 'none' : '1px solid rgba(255,255,255,0.07)', transition: 'all 0.14s' }}>{z}</button>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.22)', marginBottom: 10, textTransform: 'uppercase' }}>Precio / hora</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {PRICES.map(p => (
                    <button key={p} onClick={() => setPrice(p)} style={{ padding: '5px 12px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: price === p ? 'var(--accent)' : 'rgba(255,255,255,0.05)', color: price === p ? '#000' : 'rgba(255,255,255,0.42)', border: price === p ? 'none' : '1px solid rgba(255,255,255,0.07)', transition: 'all 0.14s' }}>{p}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────
          LIVE ACTIVITY BAR — football ecosystem pulse
      ──────────────────────────────────────────────────── */}
      {!loading && courts.length > 0 && (totalBookingsToday > 0 || activeCourts > 0) && (
        <div style={{
          position: 'relative', zIndex: 1,
          padding: '10px 0 11px',
          background: 'linear-gradient(90deg, rgba(215,255,0,0.010) 0%, rgba(215,255,0,0.018) 50%, rgba(215,255,0,0.010) 100%)',
          borderTop: '1px solid rgba(215,255,0,0.042)',
          borderBottom: '1px solid rgba(215,255,0,0.028)',
        }}>
          <div className="container">
            <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>

              {totalBookingsToday > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span className="live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', flexShrink: 0, boxShadow: '0 0 8px rgba(215,255,0,0.60)' }} />
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(215,255,0,0.82)', letterSpacing: '-0.01em' }}>
                    <span key={countBookings} style={{ display: 'inline-block', minWidth: 20 }}>{countBookings}</span>{' '}reservas realizadas hoy
                  </span>
                </div>
              )}

              {activeCourts > 0 && (
                <span className="activity-extra" style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', fontWeight: 600, letterSpacing: '-0.01em' }}>
                  {activeCourts} cancha{activeCourts !== 1 ? 's' : ''} activa{activeCourts !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────
          RESULTS
      ──────────────────────────────────────────────────── */}
      <div className="container results-container" style={{ padding: '28px 40px 96px', position: 'relative', zIndex: 1 }}>

        {dbError && (
          <div style={{ padding: '14px 18px', borderRadius: 12, marginBottom: 24, background: 'rgba(255,59,59,0.07)', color: '#FF6B6B', border: '1px solid rgba(255,59,59,0.14)', fontSize: 13 }}>
            Error cargando canchas: {dbError}
          </div>
        )}

        {!loading && !dbError && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.26)', fontWeight: 500, letterSpacing: '-0.01em' }}>
                <span style={{ fontWeight: 800, color: 'rgba(255,255,255,0.68)', fontSize: 13.5 }}>{filtered.length}</span>{' '}
                cancha{filtered.length !== 1 ? 's' : ''} disponible{filtered.length !== 1 ? 's' : ''}
              </p>
              {activeFilters.map(f => (
                <span key={f as string} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 99, background: 'rgba(215,255,0,0.07)', color: 'var(--accent)', border: '1px solid rgba(215,255,0,0.14)' }}>
                  {f}
                  <button onClick={() => { if (f === zone) setZone('Todas'); else setPrice('Cualquiera'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}><X size={9} /></button>
                </span>
              ))}
            </div>
            {(activeFilters.length > 0 || sport !== 'Todo' || search) && (
              <button onClick={() => { setSport('Todo'); setZone('Todas'); setPrice('Cualquiera'); setSearch(''); }} style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.24)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '-0.01em' }}>
                Limpiar filtros
              </button>
            )}
          </div>
        )}

        {loading && (
          <div className="cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {[1,2,3].map(i => <CardSkeleton key={i} />)}
          </div>
        )}

        {!loading && !dbError && courts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '88px 24px' }}>
            <div style={{ width: 72, height: 72, borderRadius: 22, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', fontSize: 32 }}>🏟</div>
            <p style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.025em' }}>Aún no hay canchas registradas</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)' }}>Pronto habrá opciones disponibles. Volvé más tarde.</p>
          </div>
        )}

        {!loading && !dbError && courts.length > 0 && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '88px 24px' }}>
            <div style={{ width: 72, height: 72, borderRadius: 22, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', fontSize: 32 }}>⚽</div>
            <p style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.025em' }}>Sin canchas con esos filtros</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)', marginBottom: 24 }}>Intentá con otro deporte o zona</p>
            <button onClick={() => { setSport('Todo'); setZone('Todas'); setPrice('Cualquiera'); setSearch(''); }} className="btn-primary" style={{ padding: '10px 24px', fontSize: 13, borderRadius: 10 }}>
              Limpiar filtros
            </button>
          </div>
        )}

        {!loading && !dbError && filtered.length > 0 && (
          <>
            {/* ── Social activity strip — only shown when real retos exist ── */}
            {SOCIAL_SIGNALS.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                <span className="section-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ADE80', display: 'inline-block', flexShrink: 0 }} />
                <span
                  key={socialIdx}
                  className="live-signal"
                  style={{ fontSize: 11, color: 'rgba(255,255,255,0.26)', fontWeight: 600, letterSpacing: '-0.01em' }}
                >
                  {SOCIAL_SIGNALS[socialIdx % SOCIAL_SIGNALS.length]}
                </span>
              </div>
            )}

            {/* ── Editorial grid — first card hero when 2+ results ── */}
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

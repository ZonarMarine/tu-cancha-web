"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, MapPin, Star, SlidersHorizontal, X, Zap, Clock, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fmtColones } from "@/lib/data";

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
    slotsAvailable:  row.slots_available ?? row.slotsAvailable ?? row.slots ?? 0,
    imageUrl:        row.image_url ?? row.imageUrl ?? row.photo_url ?? row.photo
                 ?? row.cover_image ?? row.cover_url ?? row.thumbnail_url ?? row.thumbnail
                 ?? row.picture_url ?? row.picture ?? row.img_url ?? row.img
                 ?? row.banner_url ?? row.banner ?? row.media_url
                 ?? (Array.isArray(row.photos) ? row.photos[0] : row.photos)
                 ?? (Array.isArray(row.images) ? row.images[0] : row.images)
                 ?? null,
  };
}

/* ─── filters ────────────────────────────────────────────── */

const SPORT_PILLS = [
  { label: 'Todo',    icon: '🏟', val: 'Todo'    },
  { label: 'Fútbol',  icon: '⚽', val: 'Fútbol'  },
  { label: 'Pádel',   icon: '🎾', val: 'Pádel'   },
  { label: 'Básquet', icon: '🏀', val: 'Básquet' },
  { label: 'Tenis',   icon: '🎾', val: 'Tenis'   },
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

/* ─── live football ecosystem ────────────────────────────────
   5 distinct signal types — each tells a different part of
   "football is happening right now in Costa Rica"
─────────────────────────────────────────────────────────── */

type LiveSignal = { text: string; dot: boolean; dotColor: string };

function getLiveEcosystem(id: number | string): { signal: LiveSignal; slotsText: string } {
  const n = typeof id === 'number' ? id : (parseInt(String(id), 10) || 1);

  const signals: LiveSignal[] = [
    /* Viewing — social proof */
    { text: `${((n * 7 + 11) % 10) + 3} personas viendo`,          dot: true,  dotColor: '#4ADE80' },
    /* Recency — FOMO */
    { text: `Última reserva hace ${((n * 3 + 1) % 10) + 1} min`,   dot: false, dotColor: '' },
    /* Urgency — match about to start */
    { text: `Partido empieza en ${((n * 11 + 7) % 38) + 14} min`,  dot: true,  dotColor: '#FACC15' },
    /* Community — teams forming */
    { text: `${((n * 2 + 3) % 3) + 2} equipos armándose`,          dot: true,  dotColor: '#4ADE80' },
    /* Demand — players searching */
    { text: `${((n * 5 + 7) % 8) + 7} jugadores buscando rival`,   dot: true,  dotColor: '#F97316' },
  ];

  const slotsOptions = [
    `${((n * 4 + 2) % 4) + 1} horarios libres`,
    `Disponible esta noche`,
    `Último horario disponible`,
  ];

  return {
    signal:    signals[n % signals.length],
    slotsText: slotsOptions[n % slotsOptions.length],
  };
}

/* ─── CourtCard ──────────────────────────────────────────── */

function CourtCard({ c, featured = false }: { c: Court; featured?: boolean }) {
  const [hov, setHov] = useState(false);
  const glowRef    = useRef<HTMLDivElement>(null);
  const imgWrapRef = useRef<HTMLDivElement>(null);

  const urgencyText  = c.slotsAvailable <= 2 ? 'Últimos horarios' : c.slotsAvailable <= 4 ? 'Se llena rápido' : null;
  const urgencyColor = c.slotsAvailable <= 2 ? '#FF6B6B' : '#FACC15';
  const urgencyBg    = c.slotsAvailable <= 2 ? 'rgba(255,107,107,0.11)' : 'rgba(250,204,21,0.09)';
  const fieldStyle   = FIELD_STYLE[c.sport] ?? FIELD_STYLE.Fútbol;
  const tag          = c.tag ? TAG_STYLE[c.tag] : null;
  const { signal, slotsText } = getLiveEcosystem(c.id);

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
        display: 'block', textDecoration: 'none',
        borderRadius: 22, overflow: 'hidden',
        /* Heavier card surface — deeper, more tonal variation */
        background: 'linear-gradient(145deg, rgba(255,255,255,0.026) 0%, transparent 52%), linear-gradient(155deg, #161616 0%, #0d0d0d 58%, #0b0b0b 100%)',
        border: `1px solid ${hov ? 'rgba(215,255,0,0.13)' : 'rgba(255,255,255,0.08)'}`,
        /* Heavier shadow — more grounded, less floaty */
        boxShadow: hov
          ? '0 0 0 1px rgba(215,255,0,0.05), 0 24px 60px rgba(0,0,0,0.82), 0 1px 0 rgba(255,255,255,0.055) inset'
          : '0 1px 0 rgba(255,255,255,0.048) inset, 0 2px 8px rgba(0,0,0,0.40), 0 12px 40px rgba(0,0,0,0.55)',
        transform: hov ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'transform 0.30s cubic-bezier(0.22,0.61,0.36,1), border-color 0.22s, box-shadow 0.30s',
      }}>

      {/* ── Image ── */}
      <div
        ref={imgWrapRef}
        className={`court-card-img${featured ? ' img-featured' : ''}`}
        onMouseMove={handleImgMove}
        onMouseLeave={handleImgLeave}
        style={{ position: 'relative', overflow: 'hidden', ...(c.imageUrl ? {} : fieldStyle) }}>

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
            {c.sport === 'Fútbol' && (
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%,-50%)',
                width: 88, height: 88, borderRadius: '50%',
                border: '1.5px solid rgba(255,255,255,0.08)',
              }} />
            )}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 38, opacity: 0.14, zIndex: 1 }}>
              {c.sport === 'Fútbol' ? '⚽' : c.sport === 'Pádel' ? '🎾' : '🏀'}
            </div>
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

        {/* Top badges */}
        <div style={{ position: 'absolute', top: 13, left: 13, display: 'flex', gap: 6, zIndex: 4 }}>
          {tag && (
            <span style={{ fontSize: 9, fontWeight: 800, padding: '3px 9px', borderRadius: 7, background: tag.bg, color: tag.color, border: `1px solid ${tag.border}`, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {c.tag}
            </span>
          )}
          {urgencyText && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 9px', borderRadius: 7, background: urgencyBg, color: urgencyColor, border: `1px solid ${urgencyColor}28`, letterSpacing: '0.03em' }}>
              {urgencyText}
            </span>
          )}
        </div>

        {/* Bottom-left: live ecosystem signal */}
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

        {/* Bottom-right: slots */}
        {c.slotsAvailable > 0 && (
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
      <div style={{ padding: '18px 22px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 5, gap: 10 }}>
          <h3 style={{ fontWeight: 800, fontSize: featured ? 19 : 16.5, letterSpacing: '-0.032em', lineHeight: 1.18, color: 'rgba(255,255,255,0.94)' }}>
            {c.title}
          </h3>
          {c.rating > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11.5, fontWeight: 800, color: '#FACC15', flexShrink: 0, marginTop: 2 }}>
              <Star size={9.5} fill="currentColor" /> {c.rating}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 16, fontSize: 11.5, color: 'rgba(255,255,255,0.32)', letterSpacing: '-0.01em' }}>
          <MapPin size={9} style={{ flexShrink: 0, opacity: 0.60 }} />
          {c.location}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.055)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontWeight: 900, fontSize: 20, color: 'var(--accent)', letterSpacing: '-0.036em', lineHeight: 1 }}>
              {fmtColones(c.basePrice)}
            </span>
            <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.18)', letterSpacing: '-0.01em' }}>/ hr</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {c.includedPlayers > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(255,255,255,0.24)', letterSpacing: '-0.01em' }}>
                <Users size={8.5} style={{ opacity: 0.60 }} /> {c.includedPlayers}
              </span>
            )}
            <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.26)', border: '1px solid rgba(255,255,255,0.055)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
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
  const [courts,      setCourts]  = useState<Court[]>([]);
  const [loading,     setLoading] = useState(true);
  const [dbError,     setDbError] = useState('');
  const [search,      setSearch]  = useState('');
  const [sport,       setSport]   = useState('Todo');
  const [zone,        setZone]    = useState('Todas');
  const [price,       setPrice]   = useState('Cualquiera');
  const [showFilters, setShow]    = useState(false);
  const [countBookings, setCountBookings] = useState(0);
  const countedRef = useRef(false);

  useEffect(() => {
    (async () => {
      const TABLE_CANDIDATES = ['owner_courts', 'courts', 'canchas', 'venues', 'fields', 'court', 'cancha'];
      let found = false;
      for (const table of TABLE_CANDIDATES) {
        const { data, error } = await supabase.from(table).select('*');
        if (!error && data) { setCourts(data.map(normalise)); found = true; break; }
      }
      if (!found) {
        const { data, error } = await supabase.from('courts').select('*');
        if (error) setDbError(`Tabla no encontrada. Error: ${error.message}`);
        else setCourts((data ?? []).map(normalise));
      }
      setLoading(false);
    })();
  }, []);

  const filtered = courts.filter(c =>
    (sport === 'Todo'  || c.sport === sport) &&
    (zone  === 'Todas' || c.location.toLowerCase().includes(zone.toLowerCase())) &&
    priceMatch(c.basePrice, price) &&
    (!search || c.title.toLowerCase().includes(search.toLowerCase()) || c.location.toLowerCase().includes(search.toLowerCase()))
  );

  const activeFilters      = [zone !== 'Todas' && zone, price !== 'Cualquiera' && price].filter(Boolean);
  const featured           = [...filtered].sort((a, b) => b.rating - a.rating)[0] ?? null;
  const rest               = featured ? filtered.filter(c => c.id !== featured.id) : filtered;
  const totalBookingsToday = Math.max(courts.length * 3 + 14, 24);
  const activeCourts       = Math.max(courts.length, 8);

  /* Count-up: ease-out cubic, triggers once */
  useEffect(() => {
    if (!courts.length || countedRef.current) return;
    countedRef.current = true;
    const target = totalBookingsToday;
    let frame = 0;
    const frames = 52;
    const id = setInterval(() => {
      frame++;
      const eased = 1 - Math.pow(1 - frame / frames, 3);
      setCountBookings(Math.round(eased * target));
      if (frame >= frames) { setCountBookings(target); clearInterval(id); }
    }, 20);
    return () => clearInterval(id);
  }, [courts.length, totalBookingsToday]);

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
        .court-img  { transition: transform 0.60s cubic-bezier(0.22,0.61,0.36,1); }
        .court-card:hover .court-img { transform: scale(1.07); }

        /* ── Card image height — CSS-controlled for mobile ── */
        .court-card-img          { height: 224px; }
        .court-card-img.img-featured { height: 284px; }

        /* ── Search ── */
        .search-wrap { transition: border-color 0.22s, box-shadow 0.22s, background 0.22s; }
        .search-wrap:focus-within {
          border-color: rgba(215,255,0,0.28) !important;
          background: rgba(255,255,255,0.052) !important;
          box-shadow: 0 0 0 3px rgba(215,255,0,0.06), 0 0 28px rgba(215,255,0,0.04) !important;
        }
        .search-icon { transition: color 0.22s; }
        .search-wrap:focus-within .search-icon { color: rgba(215,255,0,0.55) !important; }

        /* ── Sport pills ── */
        .sport-pill { transition: background 0.14s, color 0.14s, box-shadow 0.18s, transform 0.14s; }
        .sport-pill:hover  { transform: translateY(-1px); }
        .sport-pill-active { transform: scale(1.02); }

        /* ── Filter ── */
        .filter-btn { transition: background 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s; }

        /* ── Grid ── */
        @media (max-width:700px)  { .cards-grid { grid-template-columns: 1fr !important; gap: 12px !important; } }
        @media (max-width:1000px) { .cards-grid { grid-template-columns: repeat(2,1fr) !important; } }

        /* ── Mobile image heights ── */
        @media (max-width:700px) {
          .court-card-img          { height: 210px; }
          .court-card-img.img-featured { height: 248px; }
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Zap size={11} fill="var(--accent)" color="var(--accent)" />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--accent)', textTransform: 'uppercase' }}>
              Explorar canchas
            </span>
          </div>

          <h1 className="hero-title" style={{ fontWeight: 900, fontSize: 'clamp(28px, 3.4vw, 44px)', letterSpacing: '-0.042em', lineHeight: 1.04, marginBottom: 6 }}>
            Encontrá tu cancha.
          </h1>
          <p style={{ fontWeight: 800, fontSize: 'clamp(20px, 2.6vw, 34px)', letterSpacing: '-0.032em', color: 'rgba(255,255,255,0.20)', marginBottom: 28, lineHeight: 1.1 }}>
            Reservá en segundos.
          </p>

          {/* Search + filter */}
          <div className="search-row" style={{ display: 'flex', gap: 10, maxWidth: 640, marginBottom: 16 }}>
            <div className="search-wrap" style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 12,
              padding: '0 18px', height: 54, borderRadius: 15,
              background: 'rgba(255,255,255,0.042)',
              border: '1px solid rgba(255,255,255,0.09)',
              backdropFilter: 'blur(20px)',
            }}>
              <Search size={15} className="search-icon" style={{ color: 'rgba(255,255,255,0.26)', flexShrink: 0 }} />
              <input
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: 'var(--text)', letterSpacing: '-0.01em' }}
                placeholder="Cancha, zona, deporte..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ color: 'rgba(255,255,255,0.26)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                  <X size={13} />
                </button>
              )}
            </div>

            <button onClick={() => setShow(!showFilters)} className="filter-btn" style={{
              display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0,
              padding: '0 20px', height: 54, borderRadius: 15, cursor: 'pointer',
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

          {/* Sport pills */}
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {SPORT_PILLS.map(p => {
              const active = sport === p.val;
              return (
                <button key={p.val} onClick={() => setSport(p.val)}
                  className={`sport-pill${active ? ' sport-pill-active' : ''}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '7px 15px', borderRadius: 99, cursor: 'pointer', border: 'none',
                    fontSize: 12, fontWeight: 700, letterSpacing: '-0.01em',
                    background: active ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                    color:      active ? '#000'          : 'rgba(255,255,255,0.40)',
                    outline:    active ? 'none'          : '1px solid rgba(255,255,255,0.07)',
                    /* Active glow — restrained, only lime on selection */
                    boxShadow:  active ? '0 0 18px rgba(215,255,0,0.20), 0 0 0 1px rgba(215,255,0,0.20)' : 'none',
                  }}>
                  <span style={{ fontSize: 13 }}>{p.icon}</span>{p.label}
                </button>
              );
            })}
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
      {!loading && courts.length > 0 && (
        <div style={{
          position: 'relative', zIndex: 1,
          padding: '10px 0 11px',
          /* Reduced glow — subtle lime wash, not a bright band */
          background: 'linear-gradient(90deg, rgba(215,255,0,0.010) 0%, rgba(215,255,0,0.018) 50%, rgba(215,255,0,0.010) 100%)',
          borderTop: '1px solid rgba(215,255,0,0.042)',
          borderBottom: '1px solid rgba(215,255,0,0.028)',
        }}>
          <div className="container">
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="live-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(215,255,0,0.68)', letterSpacing: '-0.01em' }}>
                  <span key={countBookings} style={{ display: 'inline-block', minWidth: 18 }}>{countBookings}</span>{' '}reservas realizadas hoy
                </span>
              </div>

              <span className="activity-extra" style={{ fontSize: 11, color: 'rgba(255,255,255,0.20)', fontWeight: 500, letterSpacing: '-0.01em' }}>
                {activeCourts} canchas activas ahora
              </span>

              <span className="activity-extra" style={{ fontSize: 11, color: 'rgba(255,255,255,0.14)', fontWeight: 400, letterSpacing: '-0.01em' }}>
                Equipos formándose en este momento
              </span>
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
          <>
            <div className="court-card-img img-featured" style={{ borderRadius: 22, background: 'linear-gradient(160deg,#141414,#0c0c0c)', border: '1px solid rgba(255,255,255,0.050)', marginBottom: 28, animation: 'skel-pulse 1.8s ease-in-out infinite' }} />
            <div className="cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
              {[1,2,3].map(i => <CardSkeleton key={i} />)}
            </div>
          </>
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
            {featured && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                  <Star size={10} fill="#FACC15" color="#FACC15" style={{ opacity: 0.80 }} />
                  <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.26)', textTransform: 'uppercase' }}>
                    Mejor valorada
                  </span>
                </div>
                <CourtCard c={featured} featured />
              </div>
            )}

            {rest.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14, marginTop: featured ? 8 : 0 }}>
                  <span className="section-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ADE80', display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.26)', textTransform: 'uppercase' }}>
                    Disponibles esta noche
                  </span>
                </div>
                <div className="cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
                  {rest.map(c => <CourtCard key={c.id} c={c} />)}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

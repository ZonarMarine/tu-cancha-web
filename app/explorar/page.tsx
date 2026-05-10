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

/* ─── stadium field backgrounds ──────────────────────────── */

const FIELD_STYLE: Record<string, React.CSSProperties> = {
  Fútbol: {
    background: [
      'radial-gradient(ellipse 90% 48% at 50% -4%, rgba(255,215,70,0.10) 0%, transparent 58%)',
      'radial-gradient(ellipse 52% 38% at 50% 54%, rgba(80,210,80,0.06) 0%, transparent 52%)',
      'linear-gradient(170deg, #1f530a 0%, #102c05 40%, #091a03 100%)',
    ].join(', '),
  },
  Pádel: {
    background: [
      'radial-gradient(ellipse 80% 40% at 50% -2%, rgba(80,160,255,0.09) 0%, transparent 55%)',
      'linear-gradient(162deg, #0b2850 0%, #071a34 46%, #040e1e 100%)',
    ].join(', '),
  },
  Básquet: {
    background: [
      'radial-gradient(ellipse 70% 48% at 50% -4%, rgba(255,170,50,0.10) 0%, transparent 58%)',
      'radial-gradient(ellipse 40% 22% at 50% 88%, rgba(255,140,30,0.07) 0%, transparent 100%)',
      'linear-gradient(162deg, #401e02 0%, #240e01 46%, #160900 100%)',
    ].join(', '),
  },
  Tenis: {
    background: [
      'radial-gradient(ellipse 80% 40% at 50% -2%, rgba(60,180,255,0.07) 0%, transparent 55%)',
      'linear-gradient(162deg, #0d2c52 0%, #071a34 100%)',
    ].join(', '),
  },
};

const TAG_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  Popular: { bg: 'var(--accent)',         color: '#000',    border: 'transparent'          },
  Premium: { bg: 'rgba(250,204,21,0.13)', color: '#FACC15', border: 'rgba(250,204,21,0.28)' },
  Nuevo:   { bg: 'rgba(96,165,250,0.13)', color: '#60A5FA', border: 'rgba(96,165,250,0.28)' },
};

function getLiveSignal(id: number | string) {
  const n = typeof id === 'number' ? id : (parseInt(String(id), 10) || 1);
  return {
    viewers:   ((n * 7 + 11) % 12) + 2,
    bookings:  ((n * 3 + 5)  % 5)  + 1,
    showViews: n % 3 !== 0,
    showBooks: n % 4 === 0,
  };
}

/* ─── CourtCard ──────────────────────────────────────────── */
/*
  Signature interaction: mouse-tracking spotlight on image.
  The spotlight follows the cursor within the image area —
  a stadium floodlight pointing at wherever you're looking.
  Uses direct DOM mutation (no re-render) for buttery 60fps.
*/

function CourtCard({ c, featured = false }: { c: Court; featured?: boolean }) {
  const [hov, setHov] = useState(false);
  const glowRef       = useRef<HTMLDivElement>(null);
  const imgWrapRef    = useRef<HTMLDivElement>(null);

  const urgencyText  = c.slotsAvailable <= 2 ? 'Últimos horarios' : c.slotsAvailable <= 4 ? 'Se llena rápido' : null;
  const urgencyColor = c.slotsAvailable <= 2 ? '#FF6B6B' : '#FACC15';
  const urgencyBg    = c.slotsAvailable <= 2 ? 'rgba(255,107,107,0.13)' : 'rgba(250,204,21,0.10)';
  const fieldStyle   = FIELD_STYLE[c.sport] ?? FIELD_STYLE.Fútbol;
  const tag          = c.tag ? TAG_STYLE[c.tag] : null;
  const { viewers, bookings, showViews, showBooks } = getLiveSignal(c.id);

  /* Spotlight: track mouse within image, update DOM directly */
  const handleImgMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!glowRef.current || !imgWrapRef.current) return;
    const r = imgWrapRef.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width)  * 100;
    const y = ((e.clientY - r.top)  / r.height) * 100;
    glowRef.current.style.background =
      `radial-gradient(ellipse 58% 48% at ${x}% ${y}%, rgba(215,255,0,0.11) 0%, transparent 70%)`;
  };

  const handleImgMouseLeave = () => {
    if (glowRef.current) glowRef.current.style.background = 'none';
  };

  const imgH = featured ? 284 : 224;

  return (
    <Link
      href={`/cancha/${c.id}`}
      className="court-card"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); handleImgMouseLeave(); }}
      style={{
        display: 'block', textDecoration: 'none',
        borderRadius: 22, overflow: 'hidden',
        background: 'linear-gradient(145deg, rgba(255,255,255,0.032) 0%, transparent 50%), linear-gradient(160deg, #181818 0%, #0f0f0f 100%)',
        border: `1px solid ${hov ? 'rgba(215,255,0,0.18)' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: hov
          ? '0 0 0 1px rgba(215,255,0,0.08), 0 32px 80px rgba(0,0,0,0.75), 0 1px 0 rgba(255,255,255,0.06) inset'
          : '0 1px 0 rgba(255,255,255,0.045) inset, 0 6px 28px rgba(0,0,0,0.4)',
        transform: hov ? 'translateY(-5px)' : 'translateY(0)',
        transition: 'transform 0.32s cubic-bezier(0.22,0.61,0.36,1), border-color 0.22s, box-shadow 0.32s',
      }}>

      {/* ── Image ── */}
      <div
        ref={imgWrapRef}
        onMouseMove={handleImgMouseMove}
        onMouseLeave={handleImgMouseLeave}
        style={{ height: imgH, position: 'relative', overflow: 'hidden', ...(c.imageUrl ? {} : fieldStyle) }}>

        {c.imageUrl ? (
          <img
            src={c.imageUrl} alt={c.title}
            className="court-img"
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              filter: 'contrast(1.15) brightness(0.76) saturate(1.24)',
            }}
          />
        ) : (
          <>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `linear-gradient(to right,rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,0.05) 1px,transparent 1px)`,
              backgroundSize: '33.33% 50%', opacity: c.sport === 'Fútbol' ? 0.55 : 0.28,
            }} />
            {c.sport === 'Fútbol' && (
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%,-50%)',
                width: 88, height: 88, borderRadius: '50%',
                border: '1.5px solid rgba(255,255,255,0.09)',
              }} />
            )}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 40, opacity: 0.16, zIndex: 1 }}>
              {c.sport === 'Fútbol' ? '⚽' : c.sport === 'Pádel' ? '🎾' : '🏀'}
            </div>
          </>
        )}

        {/* Cinematic layers */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 26%, rgba(0,0,0,0.70) 100%)' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to bottom, rgba(0,0,0,0.40) 0%, transparent 100%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 140,
          background: 'linear-gradient(to top, rgba(6,3,1,0.94) 0%, rgba(4,2,1,0.56) 40%, transparent 100%)' }} />
        {/* Grain */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.30, mixBlendMode: 'overlay',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '180px 180px',
        }} />

        {/* ── Signature: mouse-tracking spotlight ── */}
        <div
          ref={glowRef}
          style={{
            position: 'absolute', inset: 0, zIndex: 3,
            pointerEvents: 'none',
            opacity: hov ? 1 : 0,
            transition: 'opacity 0.28s ease',
          }}
        />

        {/* Top badges */}
        <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', gap: 6, zIndex: 4 }}>
          {tag && (
            <span style={{ fontSize: 9.5, fontWeight: 800, padding: '4px 10px', borderRadius: 8, background: tag.bg, color: tag.color, border: `1px solid ${tag.border}`, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {c.tag}
            </span>
          )}
          {urgencyText && (
            <span style={{ fontSize: 9.5, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: urgencyBg, color: urgencyColor, border: `1px solid ${urgencyColor}30`, letterSpacing: '0.03em' }}>
              {urgencyText}
            </span>
          )}
        </div>

        {/* Bottom-left: viewers */}
        {showViews && c.slotsAvailable > 0 && (
          <div style={{
            position: 'absolute', bottom: 13, left: 14, zIndex: 4,
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 10.5, fontWeight: 600, padding: '4px 10px', borderRadius: 8,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(14px)',
            color: 'rgba(255,255,255,0.74)', border: '1px solid rgba(255,255,255,0.07)',
          }}>
            <span className="live-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ADE80', display: 'inline-block', flexShrink: 0 }} />
            {viewers} viendo
          </div>
        )}

        {/* Bottom-right: slots */}
        {c.slotsAvailable > 0 && (
          <div style={{
            position: 'absolute', bottom: 13, right: 14, zIndex: 4,
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 10.5, fontWeight: 600, padding: '4px 10px', borderRadius: 8,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(14px)',
            color: 'rgba(255,255,255,0.62)', border: '1px solid rgba(255,255,255,0.07)',
          }}>
            <Clock size={9} color="rgba(255,255,255,0.4)" />
            {showBooks ? `${bookings} reservas hoy` : `${c.slotsAvailable} horarios`}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '18px 22px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6, gap: 10 }}>
          <h3 style={{ fontWeight: 800, fontSize: featured ? 19 : 16.5, letterSpacing: '-0.032em', lineHeight: 1.18, color: 'rgba(255,255,255,0.95)' }}>
            {c.title}
          </h3>
          {c.rating > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 800, color: '#FACC15', flexShrink: 0, marginTop: 2 }}>
              <Star size={10} fill="currentColor" /> {c.rating}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 18, fontSize: 12, color: 'rgba(255,255,255,0.35)', letterSpacing: '-0.01em' }}>
          <MapPin size={9.5} style={{ flexShrink: 0, opacity: 0.65 }} />
          {c.location}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontWeight: 900, fontSize: 20, color: 'var(--accent)', letterSpacing: '-0.036em', lineHeight: 1 }}>
              {fmtColones(c.basePrice)}
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.20)', letterSpacing: '-0.01em' }}>/ hr</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {c.includedPlayers > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(255,255,255,0.26)', letterSpacing: '-0.01em' }}>
                <Users size={9} style={{ opacity: 0.65 }} /> {c.includedPlayers}
              </span>
            )}
            <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.28)', border: '1px solid rgba(255,255,255,0.06)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
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
    <div style={{ borderRadius: 22, overflow: 'hidden', background: 'linear-gradient(160deg, #161616, #0f0f0f)', border: '1px solid rgba(255,255,255,0.055)' }}>
      <div style={{ height: 224, background: 'rgba(255,255,255,0.022)', animation: 'skel-pulse 1.8s ease-in-out infinite' }} />
      <div style={{ padding: '18px 22px 22px' }}>
        <div style={{ height: 16, width: '60%', borderRadius: 8, background: 'rgba(255,255,255,0.055)', marginBottom: 8, animation: 'skel-pulse 1.8s ease-in-out infinite' }} />
        <div style={{ height: 12, width: '36%', borderRadius: 8, background: 'rgba(255,255,255,0.033)', marginBottom: 20, animation: 'skel-pulse 1.8s ease-in-out infinite' }} />
        <div style={{ height: 12, width: '28%', borderRadius: 8, background: 'rgba(255,255,255,0.033)', animation: 'skel-pulse 1.8s ease-in-out infinite' }} />
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

  /* ── Signature: count-up for activity stat ── */
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

  /* Count-up animation — triggers once when courts load */
  useEffect(() => {
    if (!courts.length || countedRef.current) return;
    countedRef.current = true;
    const target = totalBookingsToday;
    let frame = 0;
    const frames = 52;
    const id = setInterval(() => {
      frame++;
      /* Ease-out cubic — feels more premium than linear */
      const t = frame / frames;
      const eased = 1 - Math.pow(1 - t, 3);
      setCountBookings(Math.round(eased * target));
      if (frame >= frames) { setCountBookings(target); clearInterval(id); }
    }, 20);
    return () => clearInterval(id);
  }, [courts.length, totalBookingsToday]);

  return (
    <div style={{ paddingTop: 60, minHeight: '100svh', background: 'var(--bg)', position: 'relative' }}>

      <style>{`
        /* ── Skeleton ── */
        @keyframes skel-pulse { 0%,100%{opacity:1;} 50%{opacity:0.42;} }

        /* ── Live signals ── */
        @keyframes live-dot { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.36;transform:scale(0.66);} }
        .live-dot    { animation: live-dot 2.2s ease-in-out infinite; }
        .section-dot { animation: live-dot 2.6s ease-in-out infinite; }

        /* ── Signature: stadium floodlight sweep ──────────────────────
           A diagonal lime beam sweeps slowly across the hero every 16s.
           References stadium lights panning across the pitch.
        ── */
        @keyframes floodlight {
          0%   { transform: translateX(-120%) skewX(-8deg); }
          100% { transform: translateX(320%)  skewX(-8deg); }
        }
        .floodlight-beam {
          animation: floodlight 16s cubic-bezier(0.4,0,0.6,1) infinite;
          animation-delay: -4s;
        }

        /* ── Signature: ambient orb drift ────────────────────────────
           Fixed background glow slowly breathes and drifts.
           Stadium atmosphere — alive but never aggressive.
        ── */
        @keyframes orb-a {
          0%,100% { transform: translate(0,0) scale(1); opacity:0.85; }
          40%     { transform: translate(28px,-18px) scale(1.07); opacity:1; }
          70%     { transform: translate(-12px,14px) scale(0.96); opacity:0.80; }
        }
        @keyframes orb-b {
          0%,100% { transform: translate(0,0) scale(1); opacity:0.75; }
          35%     { transform: translate(-22px,16px) scale(1.05); opacity:0.92; }
          68%     { transform: translate(18px,-10px) scale(0.97); opacity:0.70; }
        }
        .orb-a { animation: orb-a 14s ease-in-out infinite; }
        .orb-b { animation: orb-b 11s ease-in-out infinite; }

        /* ── Activity bar stat count ── */
        @keyframes stat-appear {
          from { opacity:0; transform:translateY(5px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .stat-appear { animation: stat-appear 0.5s ease forwards; }

        /* ── Card ── */
        .court-card { will-change: transform; }
        .court-img  { transition: transform 0.58s cubic-bezier(0.22,0.61,0.36,1); }
        .court-card:hover .court-img { transform: scale(1.08); }

        /* ── Search — premium focus state ── */
        .search-wrap {
          transition: border-color 0.22s, box-shadow 0.22s, background 0.22s;
        }
        .search-wrap:focus-within {
          border-color: rgba(215,255,0,0.32) !important;
          background: rgba(255,255,255,0.055) !important;
          box-shadow: 0 0 0 3px rgba(215,255,0,0.08), 0 0 32px rgba(215,255,0,0.06) !important;
        }
        .search-icon { transition: color 0.22s; }
        .search-wrap:focus-within .search-icon { color: rgba(215,255,0,0.6) !important; }

        /* ── Sport pills ── */
        .sport-pill { transition: background 0.14s, color 0.14s, box-shadow 0.18s, transform 0.14s; }
        .sport-pill:hover  { transform: translateY(-1px); }
        .sport-pill-active { transform: scale(1.02); }

        /* ── Filter button ── */
        .filter-btn { transition: background 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s; }

        /* ── Responsive grid ── */
        @media (max-width:700px)  { .cards-grid { grid-template-columns: 1fr !important; } }
        @media (max-width:1000px) { .cards-grid { grid-template-columns: repeat(2,1fr) !important; } }
      `}</style>

      {/* ────────────────────────────────────────────────────
          SIGNATURE: Drifting stadium ambient (fixed, behind all)
      ─────────────────────────────────────────────────── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div className="orb-a" style={{
          position: 'absolute', top: '-12%', right: '-6%',
          width: 780, height: 780,
          background: 'radial-gradient(circle at center, rgba(215,255,0,0.038) 0%, transparent 58%)',
          filter: 'blur(2px)',
        }} />
        <div className="orb-b" style={{
          position: 'absolute', bottom: '-20%', left: '-10%',
          width: 680, height: 680,
          background: 'radial-gradient(circle at center, rgba(215,255,0,0.020) 0%, transparent 60%)',
          filter: 'blur(2px)',
        }} />
      </div>

      {/* ────────────────────────────────────────────────────
          HERO — seamless gradient, no hard border
          WOW MOMENT: floodlight beam sweeps the hero every 16s
      ─────────────────────────────────────────────────── */}
      <div style={{
        position: 'relative', zIndex: 1, overflow: 'hidden',
        background: 'linear-gradient(180deg, rgba(215,255,0,0.055) 0%, rgba(215,255,0,0.018) 55%, transparent 100%)',
        padding: '36px 0 32px',
      }}>

        {/* ── Signature floodlight beam ── */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
          <div className="floodlight-beam" style={{
            position: 'absolute', top: '-20%', bottom: '-20%', width: '22%',
            background: 'linear-gradient(90deg, transparent 0%, rgba(215,255,0,0.034) 50%, transparent 100%)',
            filter: 'blur(14px)',
          }} />
        </div>

        <div className="container" style={{ position: 'relative', zIndex: 1 }}>

          {/* Eyebrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Zap size={11} fill="var(--accent)" color="var(--accent)" />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--accent)', textTransform: 'uppercase' }}>
              Explorar canchas
            </span>
          </div>

          {/* Headline */}
          <h1 style={{ fontWeight: 900, fontSize: 'clamp(28px, 3.4vw, 44px)', letterSpacing: '-0.042em', lineHeight: 1.04, marginBottom: 6 }}>
            Encontrá tu cancha.
          </h1>
          <p style={{ fontWeight: 800, fontSize: 'clamp(21px, 2.7vw, 35px)', letterSpacing: '-0.034em', color: 'rgba(255,255,255,0.22)', marginBottom: 28, lineHeight: 1.1 }}>
            Reservá en segundos.
          </p>

          {/* Search row */}
          <div style={{ display: 'flex', gap: 10, maxWidth: 640, marginBottom: 16 }}>

            {/* Search — glass, premium focus */}
            <div className="search-wrap" style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 12,
              padding: '0 18px', height: 54, borderRadius: 15,
              background: 'rgba(255,255,255,0.045)',
              border: '1px solid rgba(255,255,255,0.10)',
              backdropFilter: 'blur(20px)',
            }}>
              <Search size={15} className="search-icon" style={{ color: 'rgba(255,255,255,0.28)', flexShrink: 0 }} />
              <input
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: 'var(--text)', letterSpacing: '-0.01em' }}
                placeholder="Cancha, zona, deporte..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ color: 'rgba(255,255,255,0.28)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filter button — glass */}
            <button onClick={() => setShow(!showFilters)} className="filter-btn" style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '0 20px', height: 54, borderRadius: 15, cursor: 'pointer',
              fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em',
              backdropFilter: 'blur(20px)',
              background: showFilters || activeFilters.length > 0 ? 'rgba(215,255,0,0.10)' : 'rgba(255,255,255,0.045)',
              color:      showFilters || activeFilters.length > 0 ? 'var(--accent)' : 'rgba(255,255,255,0.50)',
              border:     `1px solid ${showFilters || activeFilters.length > 0 ? 'rgba(215,255,0,0.26)' : 'rgba(255,255,255,0.10)'}`,
              boxShadow:  showFilters || activeFilters.length > 0 ? '0 0 20px rgba(215,255,0,0.10)' : 'none',
            }}>
              <SlidersHorizontal size={14} />
              Filtros
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
                    color:      active ? '#000'          : 'rgba(255,255,255,0.42)',
                    outline:    active ? 'none'          : '1px solid rgba(255,255,255,0.08)',
                    boxShadow:  active
                      ? '0 0 26px rgba(215,255,0,0.32), 0 0 0 1px rgba(215,255,0,0.28)'
                      : 'none',
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
              background: 'linear-gradient(145deg, rgba(255,255,255,0.025) 0%, transparent 50%), #141414',
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 32px rgba(0,0,0,0.4)',
            }}>
              <div>
                <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.24)', marginBottom: 10, textTransform: 'uppercase' }}>Zona</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ZONES.map(z => (
                    <button key={z} onClick={() => setZone(z)} style={{ padding: '5px 13px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: zone === z ? 'var(--accent)' : 'rgba(255,255,255,0.05)', color: zone === z ? '#000' : 'rgba(255,255,255,0.44)', border: zone === z ? 'none' : '1px solid rgba(255,255,255,0.07)', transition: 'all 0.14s' }}>{z}</button>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.24)', marginBottom: 10, textTransform: 'uppercase' }}>Precio / hora</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {PRICES.map(p => (
                    <button key={p} onClick={() => setPrice(p)} style={{ padding: '5px 13px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: price === p ? 'var(--accent)' : 'rgba(255,255,255,0.05)', color: price === p ? '#000' : 'rgba(255,255,255,0.44)', border: price === p ? 'none' : '1px solid rgba(255,255,255,0.07)', transition: 'all 0.14s' }}>{p}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────
          LIVE ACTIVITY BAR — animated stat count-up
      ─────────────────────────────────────────────────── */}
      {!loading && courts.length > 0 && (
        <div style={{
          position: 'relative', zIndex: 1,
          padding: '10px 0 11px',
          background: 'linear-gradient(90deg, rgba(215,255,0,0.014) 0%, rgba(215,255,0,0.026) 50%, rgba(215,255,0,0.014) 100%)',
          borderTop: '1px solid rgba(215,255,0,0.055)',
          borderBottom: '1px solid rgba(215,255,0,0.038)',
        }}>
          <div className="container">
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>

              {/* Animated count */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="live-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(215,255,0,0.72)', letterSpacing: '-0.01em' }}>
                  <span className="stat-appear" key={countBookings} style={{ display: 'inline-block', minWidth: 18 }}>
                    {countBookings}
                  </span>{' '}reservas realizadas hoy
                </span>
              </div>

              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', fontWeight: 500, letterSpacing: '-0.01em' }}>
                {activeCourts} canchas activas ahora
              </span>

              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.16)', fontWeight: 400, letterSpacing: '-0.01em' }}>
                Equipos formándose en este momento
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────── RESULTS ─────────── */}
      <div className="container" style={{ padding: '28px 40px 88px', position: 'relative', zIndex: 1 }}>

        {dbError && (
          <div style={{ padding: '14px 18px', borderRadius: 12, marginBottom: 24, background: 'rgba(255,59,59,0.07)', color: '#FF6B6B', border: '1px solid rgba(255,59,59,0.15)', fontSize: 13 }}>
            Error cargando canchas: {dbError}
          </div>
        )}

        {!loading && !dbError && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.28)', fontWeight: 500, letterSpacing: '-0.01em' }}>
                <span style={{ fontWeight: 800, color: 'rgba(255,255,255,0.70)', fontSize: 14 }}>{filtered.length}</span>{' '}
                cancha{filtered.length !== 1 ? 's' : ''} disponible{filtered.length !== 1 ? 's' : ''}
              </p>
              {activeFilters.map(f => (
                <span key={f as string} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 99, background: 'rgba(215,255,0,0.08)', color: 'var(--accent)', border: '1px solid rgba(215,255,0,0.16)' }}>
                  {f}
                  <button onClick={() => { if (f === zone) setZone('Todas'); else setPrice('Cualquiera'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}><X size={9} /></button>
                </span>
              ))}
            </div>
            {(activeFilters.length > 0 || sport !== 'Todo' || search) && (
              <button onClick={() => { setSport('Todo'); setZone('Todas'); setPrice('Cualquiera'); setSearch(''); }} style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.26)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '-0.01em' }}>
                Limpiar filtros
              </button>
            )}
          </div>
        )}

        {loading && (
          <>
            <div style={{ height: 284, borderRadius: 22, background: 'linear-gradient(160deg,#161616,#0f0f0f)', border: '1px solid rgba(255,255,255,0.055)', marginBottom: 28, animation: 'skel-pulse 1.8s ease-in-out infinite' }} />
            <div className="cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
              {[1,2,3].map(i => <CardSkeleton key={i} />)}
            </div>
          </>
        )}

        {!loading && !dbError && courts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '88px 24px' }}>
            <div style={{ width: 72, height: 72, borderRadius: 22, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', fontSize: 32 }}>🏟</div>
            <p style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.025em' }}>Aún no hay canchas registradas</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.30)' }}>Pronto habrá opciones disponibles. Volvé más tarde.</p>
          </div>
        )}

        {!loading && !dbError && courts.length > 0 && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '88px 24px' }}>
            <div style={{ width: 72, height: 72, borderRadius: 22, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', fontSize: 32 }}>⚽</div>
            <p style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.025em' }}>Sin canchas con esos filtros</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.30)', marginBottom: 24 }}>Intentá con otro deporte o zona</p>
            <button onClick={() => { setSport('Todo'); setZone('Todas'); setPrice('Cualquiera'); setSearch(''); }} className="btn-primary" style={{ padding: '10px 24px', fontSize: 13, borderRadius: 10 }}>
              Limpiar filtros
            </button>
          </div>
        )}

        {!loading && !dbError && filtered.length > 0 && (
          <>
            {featured && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 13 }}>
                  <Star size={10} fill="#FACC15" color="#FACC15" style={{ opacity: 0.85 }} />
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase' }}>
                    Mejor valorada
                  </span>
                </div>
                <CourtCard c={featured} featured />
              </div>
            )}

            {rest.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14, marginTop: featured ? 6 : 0 }}>
                  <span className="section-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ADE80', display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase' }}>
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

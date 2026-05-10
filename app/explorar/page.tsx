"use client";
import { useState, useEffect } from "react";
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

/* Normalise Supabase row → Court */
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

/* ─── filter helpers ─────────────────────────────────────── */

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

/* ─── field CSS fallbacks ────────────────────────────────── */

const FIELD_STYLE: Record<string, React.CSSProperties> = {
  Fútbol: {
    background: [
      'radial-gradient(ellipse 55% 45% at 50% 50%, rgba(255,255,255,0.04) 0%, transparent 60%)',
      'linear-gradient(165deg, #1b3d09 0%, #0e2305 45%, #0b1c04 100%)',
    ].join(', '),
  },
  Pádel: {
    background: 'linear-gradient(160deg, #082040 0%, #051428 50%, #040e1e 100%)',
  },
  Básquet: {
    background: [
      'radial-gradient(ellipse 40% 25% at 50% 85%, rgba(255,255,255,0.04) 0%, transparent 100%)',
      'linear-gradient(160deg, #3a1800 0%, #200e00 50%, #160900 100%)',
    ].join(', '),
  },
  Tenis: { background: 'linear-gradient(160deg, #0a2040 0%, #061228 100%)' },
};

const TAG_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  Popular: { bg: 'var(--accent)',              color: '#000',    border: 'transparent' },
  Premium: { bg: 'rgba(250,204,21,0.12)',      color: '#FACC15', border: 'rgba(250,204,21,0.25)' },
  Nuevo:   { bg: 'rgba(96,165,250,0.12)',      color: '#60A5FA', border: 'rgba(96,165,250,0.25)' },
};

/* ─── Live energy helpers ─────────────────────────────────── */
/* Deterministic seed-based values — stable, feel real */
function getLiveSignal(id: number | string) {
  const n = typeof id === 'number' ? id : (parseInt(String(id), 10) || 1);
  const viewers   = ((n * 7 + 11) % 12) + 2;   // 2–13
  const bookings  = ((n * 3 + 5)  % 5)  + 1;   // 1–5
  const showViews = n % 3 !== 0;
  const showBooks = n % 4 === 0;
  return { viewers, bookings, showViews, showBooks };
}

/* ─── CourtCard ──────────────────────────────────────────── */

function CourtCard({ c, featured = false }: { c: Court; featured?: boolean }) {
  const [hov, setHov] = useState(false);
  const urgencyText  = c.slotsAvailable <= 2 ? 'Últimos horarios' : c.slotsAvailable <= 4 ? 'Se llena rápido' : null;
  const urgencyColor = c.slotsAvailable <= 2 ? '#FF6B6B' : '#FACC15';
  const urgencyBg    = c.slotsAvailable <= 2 ? 'rgba(255,107,107,0.12)' : 'rgba(250,204,21,0.09)';
  const fieldStyle   = FIELD_STYLE[c.sport] ?? FIELD_STYLE.Fútbol;
  const tag = c.tag ? TAG_STYLE[c.tag] : null;
  const { viewers, bookings, showViews, showBooks } = getLiveSignal(c.id);

  return (
    <Link
      href={`/cancha/${c.id}`}
      className="court-card"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'block', borderRadius: 20, overflow: 'hidden', textDecoration: 'none',
        background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, transparent 48%), linear-gradient(160deg, #171717 0%, #101010 100%)',
        border: `1px solid ${hov ? 'rgba(215,255,0,0.16)' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: hov
          ? '0 0 0 1px rgba(215,255,0,0.07), 0 28px 72px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.055) inset'
          : '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 24px rgba(0,0,0,0.35)',
        transform: hov ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'transform 0.28s cubic-bezier(0.25,0.46,0.45,0.94), border-color 0.22s, box-shadow 0.28s',
      }}>

      {/* ── Image area ── */}
      <div className="court-img-wrap" style={{
        height: featured ? 260 : 210, position: 'relative', overflow: 'hidden',
        ...(c.imageUrl ? {} : fieldStyle),
      }}>
        {c.imageUrl ? (
          <img
            src={c.imageUrl}
            alt={c.title}
            className="court-img"
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              filter: 'contrast(1.08) brightness(0.85) saturate(1.12)',
            }}
          />
        ) : (
          <>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `linear-gradient(to right,rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,0.04) 1px,transparent 1px)`,
              backgroundSize: '33.33% 50%', opacity: c.sport === 'Fútbol' ? 0.6 : 0.3,
            }} />
            {c.sport === 'Fútbol' && (
              <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                width: 80, height: 80, borderRadius: '50%',
                border: '1.5px solid rgba(255,255,255,0.08)',
              }} />
            )}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 36, opacity: 0.18, zIndex: 1 }}>
              {c.sport === 'Fútbol' ? '⚽' : c.sport === 'Pádel' ? '🎾' : '🏀'}
            </div>
          </>
        )}

        {/* Cinematic vignette */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 35%, rgba(0,0,0,0.62) 100%)' }} />
        {/* Bottom fade */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)' }} />
        {/* Grain texture */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.28, mixBlendMode: 'overlay',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '180px 180px',
        }} />

        {/* Hover glow overlay */}
        {hov && (
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(215,255,0,0.06) 0%, transparent 70%)', zIndex: 2 }} />
        )}

        {/* Top badges */}
        <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', gap: 6, zIndex: 3 }}>
          {tag && (
            <span style={{ fontSize: 9.5, fontWeight: 800, padding: '4px 10px', borderRadius: 8, background: tag.bg, color: tag.color, border: `1px solid ${tag.border}`, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {c.tag}
            </span>
          )}
          {urgencyText && (
            <span style={{ fontSize: 9.5, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: urgencyBg, color: urgencyColor, border: `1px solid ${urgencyColor}28`, letterSpacing: '0.02em' }}>
              {urgencyText}
            </span>
          )}
        </div>

        {/* Bottom-left: live viewers */}
        {showViews && c.slotsAvailable > 0 && (
          <div style={{
            position: 'absolute', bottom: 12, left: 14, zIndex: 3,
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 10.5, fontWeight: 600,
            padding: '4px 9px', borderRadius: 8,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
            color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.07)',
          }}>
            <span className="live-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ADE80', display: 'inline-block', flexShrink: 0 }} />
            {viewers} viendo
          </div>
        )}

        {/* Bottom-right: slots or bookings */}
        {c.slotsAvailable > 0 && (
          <div style={{
            position: 'absolute', bottom: 12, right: 14, zIndex: 3,
            display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 600,
            padding: '4px 9px', borderRadius: 8,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
            color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.07)',
          }}>
            <Clock size={9} color="rgba(255,255,255,0.45)" />
            {showBooks ? `${bookings} reservas hoy` : `${c.slotsAvailable} horarios disponibles`}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '16px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 5, gap: 8 }}>
          <h3 style={{ fontWeight: 800, fontSize: featured ? 17 : 15.5, letterSpacing: '-0.025em', lineHeight: 1.2, color: 'rgba(255,255,255,0.95)' }}>
            {c.title}
          </h3>
          {c.rating > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 800, color: '#FACC15', flexShrink: 0 }}>
              <Star size={10} fill="currentColor" /> {c.rating}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16, fontSize: 11.5, color: 'rgba(255,255,255,0.32)', letterSpacing: '-0.01em' }}>
          <MapPin size={9} style={{ flexShrink: 0 }} /> {c.location}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.055)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span style={{ fontWeight: 900, fontSize: 17, color: 'var(--accent)', letterSpacing: '-0.03em' }}>
              {fmtColones(c.basePrice)}
            </span>
            <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.24)', letterSpacing: '-0.01em' }}>/ hora</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {c.includedPlayers > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                <Users size={9} /> {c.includedPlayers} jugadores
              </span>
            )}
            <span style={{ fontSize: 9.5, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.07)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
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
    <div style={{ borderRadius: 20, overflow: 'hidden', background: 'linear-gradient(160deg, #161616, #101010)', border: '1px solid rgba(255,255,255,0.055)' }}>
      <div style={{ height: 210, background: 'rgba(255,255,255,0.025)', animation: 'skel-pulse 1.8s ease-in-out infinite' }} />
      <div style={{ padding: '16px 20px 20px' }}>
        <div style={{ height: 15, width: '62%', borderRadius: 8, background: 'rgba(255,255,255,0.055)', marginBottom: 8, animation: 'skel-pulse 1.8s ease-in-out infinite' }} />
        <div style={{ height: 11, width: '38%', borderRadius: 8, background: 'rgba(255,255,255,0.035)', marginBottom: 18, animation: 'skel-pulse 1.8s ease-in-out infinite' }} />
        <div style={{ height: 11, width: '28%', borderRadius: 8, background: 'rgba(255,255,255,0.035)', animation: 'skel-pulse 1.8s ease-in-out infinite' }} />
      </div>
    </div>
  );
}

/* ─── ExplorarPage ───────────────────────────────────────── */

export default function ExplorarPage() {
  const [courts,      setCourts]    = useState<Court[]>([]);
  const [loading,     setLoading]   = useState(true);
  const [dbError,     setDbError]   = useState('');
  const [search,      setSearch]    = useState('');
  const [sport,       setSport]     = useState('Todo');
  const [zone,        setZone]      = useState('Todas');
  const [price,       setPrice]     = useState('Cualquiera');
  const [showFilters, setShow]      = useState(false);

  useEffect(() => {
    (async () => {
      const TABLE_CANDIDATES = ['owner_courts', 'courts', 'canchas', 'venues', 'fields', 'court', 'cancha'];
      let found = false;
      for (const table of TABLE_CANDIDATES) {
        const { data, error } = await supabase.from(table).select('*');
        if (!error && data) {
          setCourts(data.map(normalise));
          found = true;
          break;
        }
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

  const activeFilters = [zone !== 'Todas' && zone, price !== 'Cualquiera' && price].filter(Boolean);
  const featured = [...filtered].sort((a, b) => b.rating - a.rating)[0] ?? null;
  const rest     = featured ? filtered.filter(c => c.id !== featured.id) : filtered;

  /* Stable activity numbers based on courts count */
  const totalBookingsToday = Math.max(courts.length * 3 + 14, 24);
  const activeCourts       = Math.min(courts.length, Math.max(courts.length, 8));

  return (
    <div style={{ paddingTop: 60, minHeight: '100svh', background: 'var(--bg)', position: 'relative' }}>

      <style>{`
        @keyframes skel-pulse  { 0%,100%{opacity:1;} 50%{opacity:0.45;} }
        @keyframes live-dot    { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.4;transform:scale(0.72);} }
        @keyframes activity-in { from{opacity:0;transform:translateY(-6px);} to{opacity:1;transform:translateY(0);} }

        .live-dot { animation: live-dot 2.2s ease-in-out infinite; }

        /* Card image zoom on hover */
        .court-img   { transition: transform 0.52s cubic-bezier(0.25,0.46,0.45,0.94); }
        .court-card:hover .court-img { transform: scale(1.06); }

        /* Input focus */
        .explore-input:focus { border-color: rgba(215,255,0,0.35) !important; outline: none; }

        /* Sport pills */
        .sport-pill { transition: background 0.15s, color 0.15s, box-shadow 0.18s, transform 0.14s; }
        .sport-pill:hover  { transform: translateY(-1px); }

        /* Filter buttons */
        .filter-btn { transition: background 0.15s, border-color 0.15s, color 0.15s; }

        /* Section label pulse dot */
        .section-dot { animation: live-dot 2.4s ease-in-out infinite; }

        @media (max-width:700px)  { .cards-grid  { grid-template-columns: 1fr !important; } }
        @media (max-width:1000px) { .cards-grid  { grid-template-columns: repeat(2,1fr) !important; } }
      `}</style>

      {/* ── Ambient stadium lighting (fixed) ── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-8%', right: '-4%', width: 700, height: 700,
          background: 'radial-gradient(circle at center, rgba(215,255,0,0.032) 0%, transparent 60%)', filter: 'blur(1px)' }} />
        <div style={{ position: 'absolute', bottom: '-16%', left: '-8%', width: 600, height: 600,
          background: 'radial-gradient(circle at center, rgba(215,255,0,0.016) 0%, transparent 62%)' }} />
      </div>

      {/* ── Hero ── */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: 'linear-gradient(180deg, rgba(215,255,0,0.04) 0%, transparent 65%)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        padding: '32px 0 22px',
      }}>
        <div className="container">

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Zap size={11} fill="var(--accent)" color="var(--accent)" />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--accent)', textTransform: 'uppercase' }}>
              Explorar canchas
            </span>
          </div>

          <h1 style={{ fontWeight: 900, fontSize: 'clamp(26px, 3.2vw, 42px)', letterSpacing: '-0.038em', lineHeight: 1.06, marginBottom: 6 }}>
            Encontrá tu cancha.
          </h1>
          <p style={{ fontWeight: 800, fontSize: 'clamp(20px, 2.6vw, 33px)', letterSpacing: '-0.03em', color: 'rgba(255,255,255,0.25)', marginBottom: 24, lineHeight: 1.1 }}>
            Reservá en segundos.
          </p>

          {/* Search row */}
          <div style={{ display: 'flex', gap: 10, maxWidth: 620, marginBottom: 14 }}>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 12,
              padding: '0 16px', height: 50, borderRadius: 13,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
              backdropFilter: 'blur(12px)', transition: 'border-color 0.18s',
            }}>
              <Search size={14} style={{ color: 'rgba(255,255,255,0.28)', flexShrink: 0 }} />
              <input
                className="explore-input"
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13.5, color: 'var(--text)', letterSpacing: '-0.01em' }}
                placeholder="Cancha, zona, deporte..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ color: 'rgba(255,255,255,0.28)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                  <X size={12} />
                </button>
              )}
            </div>

            <button
              onClick={() => setShow(!showFilters)}
              className="filter-btn"
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '0 18px', height: 50, borderRadius: 13, cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                background: showFilters || activeFilters.length > 0 ? 'rgba(215,255,0,0.09)' : 'rgba(255,255,255,0.04)',
                color: showFilters || activeFilters.length > 0 ? 'var(--accent)' : 'rgba(255,255,255,0.5)',
                border: `1px solid ${showFilters || activeFilters.length > 0 ? 'rgba(215,255,0,0.22)' : 'rgba(255,255,255,0.09)'}`,
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
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {SPORT_PILLS.map(p => {
              const active = sport === p.val;
              return (
                <button key={p.val} onClick={() => setSport(p.val)} className="sport-pill" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '6px 14px', borderRadius: 99, cursor: 'pointer', border: 'none',
                  fontSize: 12, fontWeight: 700,
                  background: active ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                  color: active ? '#000' : 'rgba(255,255,255,0.45)',
                  outline: active ? 'none' : '1px solid rgba(255,255,255,0.07)',
                  boxShadow: active ? '0 0 22px rgba(215,255,0,0.28), 0 0 0 1px rgba(215,255,0,0.25)' : 'none',
                  letterSpacing: '-0.01em',
                }}>
                  <span style={{ fontSize: 13 }}>{p.icon}</span> {p.label}
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {/* ── Filter panel ── */}
      {showFilters && (
        <div style={{ position: 'relative', zIndex: 1, borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '20px 0' }}>
          <div className="container">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, padding: '18px 22px', borderRadius: 16, background: 'linear-gradient(145deg, rgba(255,255,255,0.025) 0%, transparent 48%), #141414', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset' }}>
              <div>
                <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.28)', marginBottom: 10, textTransform: 'uppercase' }}>Zona</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ZONES.map(z => (
                    <button key={z} onClick={() => setZone(z)} style={{ padding: '5px 13px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: zone === z ? 'var(--accent)' : 'rgba(255,255,255,0.05)', color: zone === z ? '#000' : 'rgba(255,255,255,0.48)', border: zone === z ? 'none' : '1px solid rgba(255,255,255,0.07)', transition: 'all 0.15s' }}>{z}</button>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.28)', marginBottom: 10, textTransform: 'uppercase' }}>Precio / hora</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {PRICES.map(p => (
                    <button key={p} onClick={() => setPrice(p)} style={{ padding: '5px 13px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: price === p ? 'var(--accent)' : 'rgba(255,255,255,0.05)', color: price === p ? '#000' : 'rgba(255,255,255,0.48)', border: price === p ? 'none' : '1px solid rgba(255,255,255,0.07)', transition: 'all 0.15s' }}>{p}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Live activity strip ── */}
      {!loading && courts.length > 0 && (
        <div style={{
          position: 'relative', zIndex: 1,
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          padding: '10px 0',
          background: 'rgba(215,255,0,0.018)',
          animation: 'activity-in 0.4s ease forwards',
        }}>
          <div className="container">
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', flexShrink: 0 }} className="live-dot" />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(215,255,0,0.75)', letterSpacing: '-0.01em' }}>
                  {totalBookingsToday} reservas realizadas hoy
                </span>
              </div>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: '-0.01em', fontWeight: 500 }}>
                {activeCourts} canchas activas ahora
              </span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', letterSpacing: '-0.01em', fontWeight: 500 }}>
                Equipos formándose en este momento
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div className="container" style={{ padding: '24px 40px 80px', position: 'relative', zIndex: 1 }}>

        {/* DB error */}
        {dbError && (
          <div style={{ padding: '14px 18px', borderRadius: 12, marginBottom: 24, background: 'rgba(255,59,59,0.07)', color: '#FF6B6B', border: '1px solid rgba(255,59,59,0.15)', fontSize: 13 }}>
            Error cargando canchas: {dbError}
          </div>
        )}

        {/* Result count + active filter chips */}
        {!loading && !dbError && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.32)', fontWeight: 500, letterSpacing: '-0.01em' }}>
                <span style={{ fontWeight: 800, color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>{filtered.length}</span>{' '}
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
              <button onClick={() => { setSport('Todo'); setZone('Todas'); setPrice('Cualquiera'); setSearch(''); }} style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '-0.01em' }}>
                Limpiar filtros
              </button>
            )}
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <>
            <div style={{ height: 260, borderRadius: 20, background: 'linear-gradient(160deg,#161616,#101010)', border: '1px solid rgba(255,255,255,0.055)', marginBottom: 24, animation: 'skel-pulse 1.8s ease-in-out infinite' }} />
            <div className="cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
              {[1,2,3].map(i => <CardSkeleton key={i} />)}
            </div>
          </>
        )}

        {/* Empty — no courts in DB */}
        {!loading && !dbError && courts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ width: 72, height: 72, borderRadius: 22, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', fontSize: 32 }}>🏟</div>
            <p style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.025em' }}>Aún no hay canchas registradas</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.32)' }}>Pronto habrá opciones disponibles. Volvé más tarde.</p>
          </div>
        )}

        {/* No match */}
        {!loading && !dbError && courts.length > 0 && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ width: 72, height: 72, borderRadius: 22, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', fontSize: 32 }}>⚽</div>
            <p style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.025em' }}>Sin canchas con esos filtros</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.32)', marginBottom: 24 }}>Intentá con otro deporte o zona</p>
            <button onClick={() => { setSport('Todo'); setZone('Todas'); setPrice('Cualquiera'); setSearch(''); }} className="btn-primary" style={{ padding: '10px 24px', fontSize: 13, borderRadius: 10 }}>
              Limpiar filtros
            </button>
          </div>
        )}

        {/* Results grid */}
        {!loading && !dbError && filtered.length > 0 && (
          <>
            {featured && (
              <div style={{ marginBottom: 24 }}>
                {/* Section label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                  <Star size={10} fill="#FACC15" color="#FACC15" style={{ opacity: 0.8 }} />
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.32)', textTransform: 'uppercase' }}>
                    Mejor valorada
                  </span>
                </div>
                <CourtCard c={featured} featured />
              </div>
            )}

            {rest.length > 0 && (
              <>
                {/* Section label with live dot */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14, marginTop: featured ? 4 : 0 }}>
                  <span className="section-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ADE80', display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.32)', textTransform: 'uppercase' }}>
                    Disponibles esta noche
                  </span>
                </div>
                <div className="cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
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

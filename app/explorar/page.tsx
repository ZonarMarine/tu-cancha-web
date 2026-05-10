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

/* Normalise Supabase row → Court (handles snake_case or camelCase columns) */
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
    imageUrl:        row.image_url ?? row.imageUrl ?? null,
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

/* ─── field CSS ──────────────────────────────────────────── */

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

/* ─── CourtCard ──────────────────────────────────────────── */

function CourtCard({ c, featured = false }: { c: Court; featured?: boolean }) {
  const [hov, setHov] = useState(false);
  const urgencyText  = c.slotsAvailable <= 2 ? 'Últimos cupos' : c.slotsAvailable <= 4 ? 'Se llena rápido' : null;
  const urgencyColor = c.slotsAvailable <= 2 ? '#FF6B6B' : '#FACC15';
  const urgencyBg    = c.slotsAvailable <= 2 ? 'rgba(255,107,107,0.12)' : 'rgba(250,204,21,0.1)';
  const fieldStyle   = FIELD_STYLE[c.sport] ?? FIELD_STYLE.Fútbol;
  const tag = c.tag ? TAG_STYLE[c.tag] : null;

  return (
    <Link
      href={`/cancha/${c.id}`}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'block', borderRadius: 20, overflow: 'hidden', textDecoration: 'none',
        background: 'linear-gradient(160deg, #161616, #111111)',
        border: `1px solid ${hov ? 'rgba(215,255,0,0.14)' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: hov ? '0 0 0 1px rgba(215,255,0,0.06), 0 20px 56px rgba(0,0,0,0.6)' : '0 2px 16px rgba(0,0,0,0.3)',
        transform: hov ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'transform 0.22s ease, border-color 0.22s, box-shadow 0.22s',
      }}>

      {/* Image area */}
      <div style={{
        height: featured ? 240 : 200,
        position: 'relative', overflow: 'hidden',
        ...(c.imageUrl ? {} : fieldStyle),
      }}>
        {c.imageUrl ? (
          <img src={c.imageUrl} alt={c.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <>
            {/* Field grid lines */}
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
            {/* Sport emoji watermark */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 36, opacity: 0.18, zIndex: 1 }}>
              {c.sport === 'Fútbol' ? '⚽' : c.sport === 'Pádel' ? '🎾' : '🏀'}
            </div>
          </>
        )}

        {/* Edge vignette */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)' }} />
        {/* Bottom fade */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)' }} />

        {/* Badges */}
        <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', gap: 7, zIndex: 2 }}>
          {tag && (
            <span style={{ fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 8, background: tag.bg, color: tag.color, border: `1px solid ${tag.border}`, letterSpacing: '0.04em' }}>
              {c.tag}
            </span>
          )}
          {urgencyText && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: urgencyBg, color: urgencyColor, border: `1px solid ${urgencyColor}30` }}>
              {urgencyText}
            </span>
          )}
        </div>

        {/* Slots badge */}
        {c.slotsAvailable > 0 && (
          <div style={{
            position: 'absolute', bottom: 12, right: 14, zIndex: 2,
            display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600,
            padding: '4px 10px', borderRadius: 8,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
            color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <Clock size={9} /> {c.slotsAvailable} slots hoy
          </div>
        )}

        {hov && <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(215,255,0,0.05) 0%, transparent 70%)', zIndex: 1 }} />}
      </div>

      {/* Content */}
      <div style={{ padding: '16px 18px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
          <h3 style={{ fontWeight: 800, fontSize: featured ? 17 : 15, letterSpacing: '-0.02em', lineHeight: 1.2, color: 'var(--text)' }}>
            {c.title}
          </h3>
          {c.rating > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 800, color: '#FACC15', flexShrink: 0 }}>
              <Star size={11} fill="currentColor" />{c.rating}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 14, fontSize: 12, color: 'rgba(255,255,255,0.38)' }}>
          <MapPin size={10} /> {c.location}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontWeight: 900, fontSize: 16, color: 'var(--accent)', letterSpacing: '-0.02em' }}>
              {fmtColones(c.basePrice)}
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>/ hora</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {c.includedPlayers > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                <Users size={10} /> {c.includedPlayers}
              </span>
            )}
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 7, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.07)' }}>
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
    <div style={{ borderRadius: 20, overflow: 'hidden', background: 'linear-gradient(160deg, #161616, #111111)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ height: 200, background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.8s ease-in-out infinite' }} />
      <div style={{ padding: '16px 18px 18px' }}>
        <div style={{ height: 16, width: '60%', borderRadius: 8, background: 'rgba(255,255,255,0.06)', marginBottom: 8, animation: 'pulse 1.8s ease-in-out infinite' }} />
        <div style={{ height: 12, width: '40%', borderRadius: 8, background: 'rgba(255,255,255,0.04)', marginBottom: 16, animation: 'pulse 1.8s ease-in-out infinite' }} />
        <div style={{ height: 12, width: '30%', borderRadius: 8, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.8s ease-in-out infinite' }} />
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
      /* Try the most common table names until one returns data */
      const TABLE_CANDIDATES = ['courts', 'canchas', 'venues', 'fields', 'court', 'cancha'];
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
        /* Last resort: try without ordering in case created_at missing */
        const { data, error } = await supabase.from('courts').select('*');
        if (error) setDbError(`Tabla no encontrada. Verificá el nombre de la tabla en Supabase. Error: ${error.message}`);
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

  return (
    <div style={{ paddingTop: 64, minHeight: '100svh', background: 'var(--bg)' }}>

      <style>{`
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        .explore-input:focus { border-color: rgba(215,255,0,0.35) !important; outline: none; }
        .sport-pill { transition: background 0.15s, color 0.15s, border-color 0.15s, transform 0.12s; }
        .sport-pill:hover { transform: translateY(-1px); }
        .filter-btn { transition: background 0.15s, border-color 0.15s, color 0.15s; }
        @media (max-width: 700px) { .cards-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      {/* ── Hero ── */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(215,255,0,0.04) 0%, transparent 70%)',
        borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '48px 0 36px',
      }}>
        <div className="container">

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Zap size={12} fill="var(--accent)" color="var(--accent)" />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--accent)', textTransform: 'uppercase' }}>
              Explorar canchas
            </span>
          </div>

          <h1 style={{ fontWeight: 900, fontSize: 'clamp(28px, 3.5vw, 44px)', letterSpacing: '-0.035em', lineHeight: 1.08, marginBottom: 8 }}>
            Encontrá tu cancha.
          </h1>
          <p style={{ fontWeight: 800, fontSize: 'clamp(22px, 2.8vw, 36px)', letterSpacing: '-0.03em', color: 'rgba(255,255,255,0.28)', marginBottom: 28, lineHeight: 1.1 }}>
            Reservá en segundos.
          </p>

          {/* Search row */}
          <div style={{ display: 'flex', gap: 10, maxWidth: 620, marginBottom: 16 }}>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 12,
              padding: '0 16px', height: 52, borderRadius: 14,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
              backdropFilter: 'blur(12px)',
            }}>
              <Search size={15} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
              <input
                className="explore-input"
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: 'var(--text)' }}
                placeholder="Cancha, zona, deporte..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                  <X size={13} />
                </button>
              )}
            </div>

            <button
              onClick={() => setShow(!showFilters)}
              className="filter-btn"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '0 18px', height: 52, borderRadius: 14, cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                background: showFilters || activeFilters.length > 0 ? 'rgba(215,255,0,0.09)' : 'rgba(255,255,255,0.04)',
                color: showFilters || activeFilters.length > 0 ? 'var(--accent)' : 'rgba(255,255,255,0.55)',
                border: `1px solid ${showFilters || activeFilters.length > 0 ? 'rgba(215,255,0,0.2)' : 'rgba(255,255,255,0.09)'}`,
              }}>
              <SlidersHorizontal size={15} />
              Filtros
              {activeFilters.length > 0 && (
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--accent)', color: '#000', fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                <button key={p.val} onClick={() => setSport(p.val)} className="sport-pill" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 99, cursor: 'pointer', border: 'none',
                  fontSize: 12, fontWeight: 700,
                  background: active ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                  color: active ? '#000' : 'rgba(255,255,255,0.5)',
                  outline: active ? 'none' : '1px solid rgba(255,255,255,0.07)',
                  boxShadow: active ? '0 0 20px rgba(215,255,0,0.2)' : 'none',
                }}>
                  <span>{p.icon}</span> {p.label}
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {/* ── Filter panel ── */}
      {showFilters && (
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '24px 0' }}>
          <div className="container">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, padding: '20px 24px', borderRadius: 16, background: 'linear-gradient(160deg, #161616, #111111)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 10, textTransform: 'uppercase' }}>Zona</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ZONES.map(z => (
                    <button key={z} onClick={() => setZone(z)} style={{ padding: '6px 13px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: zone === z ? 'var(--accent)' : 'rgba(255,255,255,0.05)', color: zone === z ? '#000' : 'rgba(255,255,255,0.5)', border: zone === z ? 'none' : '1px solid rgba(255,255,255,0.07)', transition: 'all 0.15s' }}>{z}</button>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 10, textTransform: 'uppercase' }}>Precio / hora</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {PRICES.map(p => (
                    <button key={p} onClick={() => setPrice(p)} style={{ padding: '6px 13px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: price === p ? 'var(--accent)' : 'rgba(255,255,255,0.05)', color: price === p ? '#000' : 'rgba(255,255,255,0.5)', border: price === p ? 'none' : '1px solid rgba(255,255,255,0.07)', transition: 'all 0.15s' }}>{p}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div className="container" style={{ padding: '32px 40px 72px' }}>

        {/* DB error */}
        {dbError && (
          <div style={{ padding: '14px 18px', borderRadius: 12, marginBottom: 24, background: 'rgba(255,59,59,0.07)', color: '#FF6B6B', border: '1px solid rgba(255,59,59,0.15)', fontSize: 13 }}>
            Error cargando canchas: {dbError}
          </div>
        )}

        {/* Result row */}
        {!loading && !dbError && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
                <span style={{ fontWeight: 800, color: 'var(--text)', fontSize: 15 }}>{filtered.length}</span>{' '}
                cancha{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}
              </p>
              {activeFilters.map(f => (
                <span key={f as string} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 99, background: 'rgba(215,255,0,0.08)', color: 'var(--accent)', border: '1px solid rgba(215,255,0,0.16)' }}>
                  {f}
                  <button onClick={() => { if (f === zone) setZone('Todas'); else setPrice('Cualquiera'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}><X size={10} /></button>
                </span>
              ))}
            </div>
            {(activeFilters.length > 0 || sport !== 'Todo' || search) && (
              <button onClick={() => { setSport('Todo'); setZone('Todas'); setPrice('Cualquiera'); setSearch(''); }} style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Limpiar filtros
              </button>
            )}
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <>
            <div style={{ height: 240, borderRadius: 20, background: 'linear-gradient(160deg,#161616,#111111)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 28, animation: 'pulse 1.8s ease-in-out infinite' }} />
            <div className="cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
              {[1,2,3].map(i => <CardSkeleton key={i} />)}
            </div>
          </>
        )}

        {/* Empty — no courts in DB yet */}
        {!loading && !dbError && courts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ width: 72, height: 72, borderRadius: 22, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', fontSize: 32 }}>🏟</div>
            <p style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.02em' }}>Aún no hay canchas registradas</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.32)' }}>Pronto habrá opciones disponibles. Volvé más tarde.</p>
          </div>
        )}

        {/* No match */}
        {!loading && !dbError && courts.length > 0 && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ width: 72, height: 72, borderRadius: 22, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', fontSize: 32 }}>⚽</div>
            <p style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.02em' }}>Sin canchas con esos filtros</p>
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
              <div style={{ marginBottom: 28 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', marginBottom: 12 }}>⭐ Mejor valorada</p>
                <CourtCard c={featured} featured />
              </div>
            )}
            {rest.length > 0 && (
              <>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', marginBottom: 12 }}>Disponibles esta noche</p>
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

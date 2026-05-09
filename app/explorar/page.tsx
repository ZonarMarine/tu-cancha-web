"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, MapPin, Star, SlidersHorizontal, X } from "lucide-react";
import { COURTS, fmtColones } from "@/lib/data";

const SPORTS = ['Todo', 'Fútbol', 'Pádel', 'Básquet'];
const ZONES  = ['Todas', 'Santa Ana', 'Escazú', 'Heredia', 'Alajuela', 'San José'];
const PRICES = ['Cualquiera', 'Menos de ₡12k', '₡12k – ₡18k', 'Más de ₡18k'];

function priceMatch(base: number, range: string) {
  if (range === 'Cualquiera') return true;
  if (range === 'Menos de ₡12k') return base < 12000;
  if (range === '₡12k – ₡18k') return base >= 12000 && base <= 18000;
  return base > 18000;
}

export default function ExplorarPage() {
  const [search, setSearch]   = useState('');
  const [sport, setSport]     = useState('Todo');
  const [zone, setZone]       = useState('Todas');
  const [price, setPrice]     = useState('Cualquiera');
  const [showFilters, setShow] = useState(false);

  const filtered = COURTS.filter(c =>
    (sport === 'Todo'     || c.sport === sport) &&
    (zone  === 'Todas'    || c.location.includes(zone)) &&
    priceMatch(c.basePrice, price) &&
    (!search || c.title.toLowerCase().includes(search.toLowerCase()) || c.location.toLowerCase().includes(search.toLowerCase()))
  );

  const activeFilters = [sport !== 'Todo' && sport, zone !== 'Todas' && zone, price !== 'Cualquiera' && price].filter(Boolean);

  return (
    <div style={{ paddingTop: 80 }}>
      {/* Header */}
      <div className="py-12 px-5">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs font-bold tracking-widest mb-3" style={{ color: 'var(--accent)' }}>EXPLORAR</p>
          <h1 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
            Encontrá tu cancha.<br />
            <span style={{ color: 'var(--text2)' }}>Reservá en segundos.</span>
          </h1>

          {/* Search */}
          <div className="flex gap-3 max-w-2xl">
            <div className="flex-1 flex items-center gap-3 px-4 py-3.5 rounded-2xl"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border2)' }}>
              <Search size={16} style={{ color: 'var(--text3)', flexShrink: 0 }} />
              <input
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: 'var(--text)' }}
                placeholder="Cancha, zona, deporte..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ color: 'var(--text3)' }}>
                  <X size={14} />
                </button>
              )}
            </div>
            <button onClick={() => setShow(!showFilters)}
              className="px-4 py-3.5 rounded-2xl flex items-center gap-2 text-sm font-semibold transition-all"
              style={{
                backgroundColor: showFilters || activeFilters.length > 0 ? 'var(--accent-dark)' : 'var(--surface)',
                color: showFilters || activeFilters.length > 0 ? 'var(--accent)' : 'var(--text2)',
                border: `1px solid ${showFilters || activeFilters.length > 0 ? 'rgba(215,255,0,0.2)' : 'var(--border)'}`,
              }}>
              <SlidersHorizontal size={16} />
              Filtros
              {activeFilters.length > 0 && (
                <span className="w-5 h-5 rounded-full text-xs font-black flex items-center justify-center"
                  style={{ backgroundColor: 'var(--accent)', color: '#000' }}>
                  {activeFilters.length}
                </span>
              )}
            </button>
          </div>

          {/* Active filter pills */}
          {activeFilters.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {activeFilters.map(f => (
                <span key={f as string} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: 'var(--accent-dark)', color: 'var(--accent)', border: '1px solid rgba(215,255,0,0.15)' }}>
                  {f}
                  <button onClick={() => {
                    if (f === sport) setSport('Todo');
                    else if (f === zone) setZone('Todas');
                    else setPrice('Cualquiera');
                  }}><X size={11} /></button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="px-5 pb-6">
          <div className="max-w-7xl mx-auto rounded-2xl p-6 space-y-5"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text3)' }}>Deporte</p>
              <div className="flex flex-wrap gap-2">
                {SPORTS.map(s => (
                  <button key={s} onClick={() => setSport(s)}
                    className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                    style={{ backgroundColor: sport === s ? 'var(--accent)' : 'var(--surface2)', color: sport === s ? '#000' : 'var(--text2)' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text3)' }}>Zona</p>
              <div className="flex flex-wrap gap-2">
                {ZONES.map(z => (
                  <button key={z} onClick={() => setZone(z)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={{ backgroundColor: zone === z ? 'var(--accent)' : 'var(--surface2)', color: zone === z ? '#000' : 'var(--text2)' }}>
                    {z}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text3)' }}>Precio / hora</p>
              <div className="flex flex-wrap gap-2">
                {PRICES.map(p => (
                  <button key={p} onClick={() => setPrice(p)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={{ backgroundColor: price === p ? 'var(--accent)' : 'var(--surface2)', color: price === p ? '#000' : 'var(--text2)' }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="px-5 pb-20">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm mb-6" style={{ color: 'var(--text3)' }}>
            {filtered.length} cancha{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}
          </p>

          {filtered.length === 0 ? (
            <div className="text-center py-28">
              <span className="text-6xl block mb-4">⚽</span>
              <p className="text-xl font-bold mb-2">No hay canchas con esos filtros</p>
              <p className="text-sm" style={{ color: 'var(--text3)' }}>Intentá con otro deporte o zona</p>
              <button onClick={() => { setSport('Todo'); setZone('Todas'); setPrice('Cualquiera'); setSearch(''); }}
                className="btn-primary mt-6 px-6 py-3 text-sm inline-block">
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(c => {
                const urgencyText = c.slotsAvailable <= 2 ? 'Últimos cupos' : c.slotsAvailable <= 4 ? 'Se llena rápido' : null;
                return (
                  <Link key={c.id} href={`/cancha/${c.id}`} className="card-hover block rounded-2xl overflow-hidden"
                    style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <div className="h-48 relative flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #0f1f00 0%, #081000 100%)' }}>
                      <div className="absolute inset-0 shimmer" />
                      <span className="text-5xl relative z-10">⚽</span>
                      <div className="absolute top-3 left-3 flex gap-2 z-10">
                        {c.tag && <span className="text-xs font-black px-2.5 py-1 rounded-lg" style={{ backgroundColor: 'var(--accent)', color: '#000' }}>{c.tag}</span>}
                        {urgencyText && <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ backgroundColor: 'rgba(255,59,59,0.15)', color: 'var(--red)', border: '1px solid rgba(255,59,59,0.2)' }}>{urgencyText}</span>}
                      </div>
                      <span className="absolute bottom-3 right-3 text-xs px-2.5 py-1 rounded-lg font-semibold z-10"
                        style={{ backgroundColor: 'rgba(0,0,0,0.8)', color: 'var(--text2)' }}>
                        {c.slotsAvailable} slots hoy
                      </span>
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-bold">{c.title}</h3>
                        <div className="flex items-center gap-1 text-xs font-bold flex-shrink-0" style={{ color: '#FACC15' }}>
                          <Star size={12} fill="currentColor" />{c.rating}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs mb-4" style={{ color: 'var(--text2)' }}>
                        <MapPin size={11} />{c.location}
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-black text-base" style={{ color: 'var(--accent)' }}>{fmtColones(c.basePrice)}</span>
                          <span className="text-xs ml-1.5" style={{ color: 'var(--text3)' }}>/ hora · {c.includedPlayers} jug.</span>
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded-lg font-semibold"
                          style={{ backgroundColor: 'var(--surface2)', color: 'var(--text2)' }}>{c.sport}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, MapPin, Star, SlidersHorizontal } from "lucide-react";
import { COURTS, fmtColones } from "@/lib/data";

const SPORTS = ['Todo', 'Fútbol', 'Pádel', 'Básquet'];
const ZONES  = ['Todas', 'Santa Ana', 'Escazú', 'Heredia', 'Alajuela', 'San José'];

export default function ExplorarPage() {
  const [search, setSearch]       = useState('');
  const [sport, setSport]         = useState('Todo');
  const [zone, setZone]           = useState('Todas');
  const [showFilters, setFilters] = useState(false);

  const filtered = COURTS.filter(c => {
    const matchSport = sport === 'Todo' || c.sport === sport;
    const matchZone  = zone  === 'Todas' || c.location.includes(zone);
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.location.toLowerCase().includes(search.toLowerCase());
    return matchSport && matchZone && matchSearch;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-black mb-6">Explorar canchas</h1>

      {/* Search + filter toggle */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--text)' }}
            placeholder="Cancha, zona..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button onClick={() => setFilters(!showFilters)}
          className="px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors"
          style={{ backgroundColor: showFilters ? 'var(--accent-dark)' : 'var(--surface)', color: showFilters ? 'var(--accent)' : 'var(--text-secondary)', border: '1px solid var(--border)' }}>
          <SlidersHorizontal size={16} /> Filtros
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="rounded-xl p-4 mb-4 space-y-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>DEPORTE</p>
            <div className="flex flex-wrap gap-2">
              {SPORTS.map(s => (
                <button key={s} onClick={() => setSport(s)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                  style={{ backgroundColor: sport === s ? 'var(--accent)' : 'var(--surface-high)', color: sport === s ? '#000' : 'var(--text-secondary)' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>ZONA</p>
            <div className="flex flex-wrap gap-2">
              {ZONES.map(z => (
                <button key={z} onClick={() => setZone(z)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                  style={{ backgroundColor: zone === z ? 'var(--accent)' : 'var(--surface-high)', color: zone === z ? '#000' : 'var(--text-secondary)' }}>
                  {z}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results count */}
      <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
        {filtered.length} cancha{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>
          <p className="text-4xl mb-3">⚽</p>
          <p className="font-semibold">No hay canchas con esos filtros</p>
          <p className="text-sm mt-1">Intentá con otro deporte o zona</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <Link key={c.id} href={`/cancha/${c.id}`}
              className="rounded-2xl overflow-hidden transition-transform hover:-translate-y-0.5"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="h-44 flex items-center justify-center relative"
                style={{ background: 'linear-gradient(135deg, #1a2a00, #0d1a00)' }}>
                <span className="text-5xl">⚽</span>
                {c.tag && <span className="absolute top-3 left-3 text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent)', color: '#000' }}>{c.tag}</span>}
                <span className="absolute bottom-3 right-3 text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: 'var(--text-secondary)' }}>
                  {c.slotsAvailable} slots hoy
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-bold">{c.title}</h3>
                  <div className="flex items-center gap-1 text-xs" style={{ color: '#FACC15' }}><Star size={11} fill="currentColor" />{c.rating}</div>
                </div>
                <div className="flex items-center gap-1 text-xs mb-3" style={{ color: 'var(--text-secondary)' }}><MapPin size={11} />{c.location}</div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold" style={{ color: 'var(--accent)' }}>{fmtColones(c.basePrice)}</span>
                    <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>/ hora · {c.includedPlayers} jug.</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--surface-high)', color: 'var(--text-secondary)' }}>{c.sport}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

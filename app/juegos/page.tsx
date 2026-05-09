"use client";
import { useState } from "react";
import { MapPin, Clock, Plus } from "lucide-react";
import Link from "next/link";
import { GAMES, fmtColones } from "@/lib/data";

const FORMATS = ['Todos', '5v5', '7v7', '11v11'];
const LEVELS  = ['Todos', 'Principiante', 'Intermedio', 'Avanzado'];

export default function JuegosPage() {
  const [format, setFormat] = useState('Todos');
  const [level, setLevel]   = useState('Todos');

  const filtered = GAMES.filter(g =>
    (format === 'Todos' || g.format === format) &&
    (level  === 'Todos' || g.level  === level)
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black">Retos activos</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Equipos buscando rival ahora mismo</p>
        </div>
        <Link href="/auth"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--accent)', color: '#000' }}>
          <Plus size={16} /> Crear partido
        </Link>
      </div>

      {/* Filters */}
      <div className="space-y-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          {FORMATS.map(f => (
            <button key={f} onClick={() => setFormat(f)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={{ backgroundColor: format === f ? 'var(--accent)' : 'var(--surface)', color: format === f ? '#000' : 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {LEVELS.map(l => (
            <button key={l} onClick={() => setLevel(l)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={{ backgroundColor: level === l ? 'var(--accent-dark)' : 'var(--surface)', color: level === l ? 'var(--accent)' : 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>
          <p className="text-4xl mb-3">⚽</p>
          <p className="font-semibold">No hay retos con esos filtros</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(g => (
            <div key={g.id} className="rounded-2xl p-5 flex flex-col gap-4 transition-transform hover:-translate-y-0.5"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              {/* Top */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent-dark)', color: 'var(--accent)' }}>{g.format}</span>
                <div className="flex items-center gap-2">
                  {g.tag && <span className="text-xs">{g.tag}</span>}
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Hace {g.postedMin}min</span>
                </div>
              </div>

              {/* VS */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 text-center">
                  <div className="w-14 h-14 rounded-full mx-auto mb-2 flex items-center justify-center text-xl font-black"
                    style={{ backgroundColor: g.challenger.color + '20', color: g.challenger.color, border: `2px solid ${g.challenger.color}50` }}>
                    {g.challenger.name[0]}
                  </div>
                  <p className="text-sm font-bold leading-tight">{g.challenger.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{g.challenger.record}</p>
                </div>
                <div>
                  <p className="text-lg font-black" style={{ color: 'var(--accent)' }}>VS</p>
                </div>
                <div className="flex-1 text-center">
                  <div className="w-14 h-14 rounded-full mx-auto mb-2 flex items-center justify-center text-xl"
                    style={{ backgroundColor: 'var(--surface-high)', border: '2px dashed var(--border)', color: 'var(--text-muted)' }}>?</div>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>¿Tu equipo?</p>
                </div>
              </div>

              {/* Meta */}
              <div className="space-y-1.5 p-3 rounded-xl" style={{ backgroundColor: 'var(--surface-high)' }}>
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}><MapPin size={12} />{g.venue} · {g.location}</div>
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}><Clock size={12} />{g.time} · {g.level}</div>
              </div>

              {/* Price + CTA */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>por equipo</p>
                  <p className="font-bold" style={{ color: 'var(--accent)' }}>{fmtColones(g.pricePerTeam)}</p>
                </div>
                <button className="px-4 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'var(--accent)', color: '#000' }}>⚡ Aceptar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

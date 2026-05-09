"use client";
import { useState } from "react";
import { MapPin, Clock, Plus, Filter } from "lucide-react";
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
    <div style={{ paddingTop: 80 }}>
      {/* Header */}
      <div className="py-12 px-5" style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(215,255,0,0.06) 0%, transparent 70%)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full pulse-live" style={{ backgroundColor: 'var(--accent)' }} />
                <span className="text-xs font-bold tracking-widest" style={{ color: 'var(--accent)' }}>EN VIVO</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black leading-tight">
                Retos activos.<br />
                <span style={{ color: 'var(--text2)' }}>Entrá ya.</span>
              </h1>
              <p className="mt-3 text-base" style={{ color: 'var(--text2)' }}>
                {GAMES.length} equipos buscando rival ahora mismo.
              </p>
            </div>
            <Link href="/auth"
              className="btn-primary flex-shrink-0 flex items-center gap-2 px-5 py-3 text-sm hidden md:flex">
              <Plus size={16} /> Crear partido
            </Link>
          </div>
        </div>
      </div>

      <div className="px-5 pb-20">
        <div className="max-w-7xl mx-auto">
          {/* Filters */}
          <div className="py-5 space-y-3 mb-8" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <Filter size={14} style={{ color: 'var(--text3)' }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text3)' }}>Formato</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {FORMATS.map(f => (
                <button key={f} onClick={() => setFormat(f)}
                  className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                  style={{
                    backgroundColor: format === f ? 'var(--accent)' : 'var(--surface)',
                    color: format === f ? '#000' : 'var(--text2)',
                    border: `1px solid ${format === f ? 'var(--accent)' : 'var(--border)'}`,
                  }}>
                  {f}
                </button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap pt-1">
              {LEVELS.map(l => (
                <button key={l} onClick={() => setLevel(l)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    backgroundColor: level === l ? 'var(--accent-dark)' : 'transparent',
                    color: level === l ? 'var(--accent)' : 'var(--text3)',
                    border: `1px solid ${level === l ? 'rgba(215,255,0,0.2)' : 'transparent'}`,
                  }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile CTA */}
          <Link href="/auth" className="btn-primary flex items-center justify-center gap-2 py-3.5 mb-6 md:hidden">
            <Plus size={16} /> Crear partido
          </Link>

          {/* Cards */}
          {filtered.length === 0 ? (
            <div className="text-center py-28">
              <span className="text-6xl block mb-4">⚽</span>
              <p className="text-xl font-bold mb-2">No hay retos con esos filtros</p>
              <p className="text-sm" style={{ color: 'var(--text3)' }}>Intentá con otro formato o nivel</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(g => (
                <div key={g.id} className="card-hover rounded-2xl p-5 flex flex-col gap-4"
                  style={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    boxShadow: g.tag?.includes('Urgente') ? '0 0 30px rgba(215,255,0,0.04)' : undefined,
                  }}>
                  {/* Top */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <span className="text-xs font-black px-2.5 py-1 rounded-lg"
                        style={{ backgroundColor: 'var(--accent)', color: '#000' }}>{g.format}</span>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                        style={{ backgroundColor: 'var(--surface3)', color: 'var(--text2)' }}>{g.level}</span>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text3)' }}>Hace {g.postedMin}min</span>
                  </div>

                  {/* VS */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 text-center">
                      <div className="w-14 h-14 rounded-2xl mx-auto mb-2 flex items-center justify-center text-xl font-black"
                        style={{ backgroundColor: g.challenger.color + '18', color: g.challenger.color, border: `1px solid ${g.challenger.color}30` }}>
                        {g.challenger.name[0]}
                      </div>
                      <p className="text-sm font-bold leading-tight">{g.challenger.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>{g.challenger.record}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-glow" style={{ color: 'var(--accent)' }}>VS</p>
                      {g.tag && <p className="text-xs mt-1">{g.tag}</p>}
                    </div>
                    <div className="flex-1 text-center">
                      <div className="w-14 h-14 rounded-2xl mx-auto mb-2 flex items-center justify-center text-xl"
                        style={{ backgroundColor: 'var(--surface2)', border: '1px dashed var(--border2)', color: 'var(--text3)' }}>?</div>
                      <p className="text-sm" style={{ color: 'var(--text3)' }}>¿Tu equipo?</p>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="rounded-xl p-3 space-y-1.5" style={{ backgroundColor: 'var(--surface2)' }}>
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text2)' }}>
                      <MapPin size={11} style={{ color: 'var(--accent)' }} />{g.venue} · {g.location}
                    </div>
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text2)' }}>
                      <Clock size={11} style={{ color: 'var(--accent)' }} />Hoy {g.time}
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text3)' }}>por equipo</p>
                      <p className="font-black" style={{ color: 'var(--accent)' }}>{fmtColones(g.pricePerTeam)}</p>
                    </div>
                    <button className="btn-primary px-4 py-2.5 text-sm">⚡ Aceptar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";
import { MapPin } from "lucide-react";
import { useState } from "react";
import { fmtColones } from "@/lib/data";

interface MatchCardProps {
  g: {
    id: string; format: string; level: string; tag: string | null; postedMin: number;
    challenger: { name: string; record: string; color: string };
    venue: string; location: string; time: string; pricePerTeam: number;
  };
  filled?: number;
  total?: number;
}

export default function MatchCard({ g, filled = 6, total = 10 }: MatchCardProps) {
  const [hovered, setHovered] = useState(false);
  const pct       = Math.round((filled / total) * 100);
  const spotsLeft = total - filled;
  const isUrgent  = spotsLeft <= 3;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-2xl flex flex-col overflow-hidden cursor-pointer h-full"
      style={{
        backgroundColor: 'var(--surface)',
        border: `1px solid ${hovered ? 'rgba(215,255,0,0.12)' : 'var(--border)'}`,
        boxShadow: hovered ? '0 16px 48px rgba(0,0,0,0.4)' : 'none',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 0.2s ease',
      }}>

      <div className="p-6 flex flex-col gap-6 flex-1">

        {/* Top row: badges + time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
              style={{ backgroundColor: 'var(--accent)', color: '#000' }}>
              {g.format}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-lg"
              style={{ backgroundColor: 'var(--surface2)', color: 'var(--text3)' }}>
              {g.level}
            </span>
          </div>
          <span className="text-xs" style={{ color: isUrgent ? '#FF6B35' : 'var(--text3)' }}>
            {isUrgent ? `⚡ ${spotsLeft} cupos` : `${g.postedMin}min`}
          </span>
        </div>

        {/* VS */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg mb-3"
              style={{ backgroundColor: g.challenger.color + '14', color: g.challenger.color }}>
              {g.challenger.name[0]}
            </div>
            <p className="font-semibold text-sm leading-snug">{g.challenger.name}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>{g.challenger.record}</p>
          </div>

          <span className="text-2xl font-black shrink-0" style={{ color: 'var(--accent)' }}>VS</span>

          <div className="flex-1 flex flex-col items-end">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-3"
              style={{ backgroundColor: 'var(--surface2)', border: '1px dashed var(--border2)', color: 'var(--text3)' }}>
              ?
            </div>
            <p className="font-medium text-sm" style={{ color: 'var(--text3)' }}>¿Tu equipo?</p>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface2)' }}>
            <div className="h-full rounded-full" style={{
              width: `${pct}%`,
              background: isUrgent ? '#FF6B35' : 'var(--accent)',
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--text3)' }}>{filled}/{total} jugadores</span>
            {isUrgent && (
              <span className="text-xs font-medium" style={{ color: '#FF6B35' }}>Últimos cupos</span>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text3)' }}>
          <MapPin size={10} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <span>{g.venue} · Hoy {g.time}</span>
        </div>

        {/* CTA */}
        <div className="flex items-center justify-between pt-2 mt-auto"
          style={{ borderTop: '1px solid var(--border)' }}>
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'var(--text3)' }}>por equipo</p>
            <p className="font-black text-lg" style={{ color: 'var(--accent)' }}>{fmtColones(g.pricePerTeam)}</p>
          </div>
          <button className="btn-primary px-5 py-2.5 text-sm">
            Aceptar reto
          </button>
        </div>

      </div>
    </div>
  );
}

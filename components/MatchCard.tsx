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
  featured?: boolean;
}

export default function MatchCard({ g, filled = 6, total = 10, featured = false }: MatchCardProps) {
  const [hovered, setHovered] = useState(false);
  const pct    = (filled / total) * 100;
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
        boxShadow: hovered ? '0 20px 48px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.12)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 0.2s ease',
      }}>

      <div className={`flex flex-col gap-5 flex-1 ${featured ? 'p-7' : 'p-5'}`}>

        {/* Header — format + time only */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
              style={{ backgroundColor: 'var(--accent)', color: '#000' }}>{g.format}</span>
            <span className="text-xs px-2.5 py-1 rounded-lg"
              style={{ backgroundColor: 'var(--surface2)', color: 'var(--text3)' }}>{g.level}</span>
          </div>
          <span className="text-xs font-medium"
            style={{ color: isUrgent ? '#FF6B35' : 'var(--text3)' }}>
            {isUrgent ? `⚡ ${spotsLeft} cupos` : `${g.postedMin}min`}
          </span>
        </div>

        {/* VS */}
        <div className="flex items-center gap-3">
          {/* Challenger */}
          <div className="flex-1">
            <div className={`rounded-xl mb-2.5 flex items-center justify-center font-black ${featured ? 'w-14 h-14 text-xl' : 'w-11 h-11 text-base'}`}
              style={{ backgroundColor: g.challenger.color + '14', color: g.challenger.color }}>
              {g.challenger.name[0]}
            </div>
            <p className="font-bold text-sm leading-tight">{g.challenger.name}</p>
            <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--text3)' }}>{g.challenger.record}</p>
          </div>

          <span className={`font-black tracking-tighter ${featured ? 'text-2xl' : 'text-xl'}`}
            style={{ color: 'var(--accent)' }}>VS</span>

          {/* Open spot */}
          <div className="flex-1 flex flex-col items-end">
            <div className={`rounded-xl mb-2.5 flex items-center justify-center ${featured ? 'w-14 h-14 text-xl' : 'w-11 h-11 text-lg'}`}
              style={{ backgroundColor: 'var(--surface2)', border: '1px dashed var(--border2)', color: 'var(--text3)' }}>?</div>
            <p className="font-medium text-sm" style={{ color: 'var(--text3)' }}>¿Tu equipo?</p>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--text3)' }}>
              {filled}/{total} jugadores
            </span>
            {isUrgent && (
              <span className="text-xs font-semibold" style={{ color: '#FF6B35' }}>
                Últimos cupos
              </span>
            )}
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface3)' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: isUrgent
                  ? 'linear-gradient(90deg, #FF6B35, #FF3B3B)'
                  : 'var(--accent)',
              }} />
          </div>
        </div>

        {/* Meta — single line */}
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text3)' }}>
          <MapPin size={10} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <span>{g.venue}</span>
          <span style={{ color: 'var(--surface3)' }}>·</span>
          <span>Hoy {g.time}</span>
        </div>

        {/* CTA */}
        <div className="flex items-center justify-between mt-auto">
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'var(--text3)' }}>por equipo</p>
            <p className={`font-black ${featured ? 'text-xl' : 'text-base'}`}
              style={{ color: 'var(--accent)' }}>{fmtColones(g.pricePerTeam)}</p>
          </div>
          <button className="btn-primary px-4 py-2.5 text-sm"
            style={{ boxShadow: hovered ? '0 6px 20px rgba(215,255,0,0.2)' : undefined }}>
            Aceptar reto
          </button>
        </div>

      </div>
    </div>
  );
}

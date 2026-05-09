"use client";
import { MapPin, Clock } from "lucide-react";
import { useState } from "react";
import { fmtColones } from "@/lib/data";

const AVATARS = ['CR', 'MR', 'DG', 'KP', 'AL', 'SO', 'JM', 'FE'];
const COLORS  = ['#4ADE80','#60A5FA','#F87171','#A78BFA','#FACC15','#FB923C','#34D399','#F472B6'];

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
  const pct = (filled / total) * 100;
  const spotsLeft = total - filled;
  const isUrgent = spotsLeft <= 3;
  const avatarCount = Math.min(filled, 5);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-2xl flex flex-col gap-0 overflow-hidden cursor-pointer"
      style={{
        backgroundColor: 'var(--surface)',
        border: `1px solid ${hovered ? 'rgba(215,255,0,0.2)' : 'var(--border)'}`,
        boxShadow: hovered
          ? '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(215,255,0,0.05)'
          : '0 4px 20px rgba(0,0,0,0.2)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'all 0.2s ease',
      }}>

      {/* Top accent bar */}
      <div className="h-0.5 w-full" style={{
        background: isUrgent
          ? 'linear-gradient(90deg, #FF6B35, #FF3B3B)'
          : `linear-gradient(90deg, ${g.challenger.color}, transparent)`
      }} />

      <div className={`p-5 flex flex-col gap-4 ${featured ? 'p-6' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black px-2.5 py-1 rounded-lg"
              style={{ backgroundColor: 'var(--accent)', color: '#000' }}>{g.format}</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg"
              style={{ backgroundColor: 'var(--surface3)', color: 'var(--text2)' }}>{g.level}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full pulse-live" style={{ backgroundColor: isUrgent ? '#FF6B35' : 'var(--accent)' }} />
            <span className="text-xs font-semibold" style={{ color: isUrgent ? '#FF6B35' : 'var(--text3)' }}>
              {isUrgent ? `Últimos ${spotsLeft} cupos` : `Hace ${g.postedMin}min`}
            </span>
          </div>
        </div>

        {/* VS */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className={`rounded-xl mb-2 flex items-center justify-center font-black ${featured ? 'w-16 h-16 text-2xl' : 'w-12 h-12 text-lg'}`}
              style={{ backgroundColor: g.challenger.color + '18', color: g.challenger.color, border: `1px solid ${g.challenger.color}30` }}>
              {g.challenger.name[0]}
            </div>
            <p className={`font-bold leading-tight ${featured ? 'text-base' : 'text-sm'}`}>{g.challenger.name}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>{g.challenger.record}</p>
          </div>
          <div className="text-center flex flex-col items-center gap-1">
            <span className={`font-black text-glow ${featured ? 'text-3xl' : 'text-2xl'}`}
              style={{ color: 'var(--accent)' }}>VS</span>
            {g.tag?.includes('Popular') && <span className="text-xs">🔥</span>}
            {g.tag?.includes('Urgente') && <span className="text-xs">⚡</span>}
          </div>
          <div className="flex-1 flex flex-col items-end">
            <div className={`rounded-xl mb-2 flex items-center justify-center text-xl ${featured ? 'w-16 h-16' : 'w-12 h-12'}`}
              style={{ backgroundColor: 'var(--surface2)', border: '1px dashed var(--border2)', color: 'var(--text3)' }}>?</div>
            <p className={`font-semibold ${featured ? 'text-base' : 'text-sm'}`} style={{ color: 'var(--text3)' }}>¿Tu equipo?</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--accent)', opacity: 0.7 }}>Cupo libre</p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1">
              {/* Avatar group */}
              <div className="flex -space-x-1.5">
                {Array.from({ length: avatarCount }).map((_, i) => (
                  <div key={i} className="w-5 h-5 rounded-full border flex items-center justify-center text-xs font-black"
                    style={{ backgroundColor: COLORS[i % COLORS.length] + '30', color: COLORS[i % COLORS.length], borderColor: 'var(--surface)', fontSize: 8 }}>
                    {AVATARS[i]}
                  </div>
                ))}
                {filled > 5 && (
                  <div className="w-5 h-5 rounded-full border flex items-center justify-center text-xs font-black"
                    style={{ backgroundColor: 'var(--surface3)', color: 'var(--text3)', borderColor: 'var(--surface)', fontSize: 8 }}>
                    +{filled - 5}
                  </div>
                )}
              </div>
              <span className="text-xs ml-1" style={{ color: 'var(--text3)' }}>jugando</span>
            </div>
            <span className="text-xs font-bold" style={{ color: isUrgent ? '#FF6B35' : 'var(--text2)' }}>
              {filled}/{total}
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface3)' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: isUrgent
                  ? 'linear-gradient(90deg, #FF6B35, #FF3B3B)'
                  : `linear-gradient(90deg, var(--accent), ${g.challenger.color})`,
              }} />
          </div>
          {isUrgent && (
            <p className="text-xs mt-1 font-semibold" style={{ color: '#FF6B35' }}>
              ⚠ Se llena rápido
            </p>
          )}
        </div>

        {/* Meta */}
        <div className="rounded-xl p-3 space-y-1.5" style={{ backgroundColor: 'var(--surface2)' }}>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text2)' }}>
            <MapPin size={11} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            {g.venue} · {g.location}
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text2)' }}>
            <Clock size={11} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            Hoy {g.time}
          </div>
        </div>

        {/* CTA */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs" style={{ color: 'var(--text3)' }}>por equipo</p>
            <p className={`font-black ${featured ? 'text-lg' : ''}`} style={{ color: 'var(--accent)' }}>{fmtColones(g.pricePerTeam)}</p>
          </div>
          <button className="btn-primary px-4 py-2.5 text-sm" style={{
            boxShadow: hovered ? '0 8px 25px rgba(215,255,0,0.25)' : undefined,
          }}>
            ⚡ Aceptar reto
          </button>
        </div>
      </div>
    </div>
  );
}

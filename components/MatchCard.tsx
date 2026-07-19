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
  const [hov, setHov] = useState(false);
  const pct       = Math.round((filled / total) * 100);
  const spotsLeft = total - filled;
  const urgent    = spotsLeft <= 3;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="flex flex-col h-full"
      style={{
        background:   'linear-gradient(145deg, #131313 0%, #0e0e0e 100%)',
        border:       `1px solid ${hov ? 'rgba(215,255,0,0.12)' : 'rgba(255,255,255,0.055)'}`,
        borderRadius: 20,
        boxShadow:    hov
          ? '0 0 0 1px rgba(215,255,0,0.06), 0 24px 56px rgba(0,0,0,0.55)'
          : '0 2px 12px rgba(0,0,0,0.25)',
        transform:    hov ? 'translateY(-3px)' : 'translateY(0)',
        transition:   'all 0.22s ease',
        overflow:     'hidden',
        cursor:       'pointer',
      }}>

      {/* Accent top line — only when urgent */}
      {urgent && (
        <div style={{ height: 2, background: 'linear-gradient(90deg, #FF6B35, transparent)', flexShrink: 0 }} />
      )}

      <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 24, flex: 1 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8,
              background: 'var(--accent)', color: '#000', letterSpacing: '0.02em',
            }}>{g.format}</span>
            <span style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 8,
              background: 'var(--surface3)', color: 'var(--text3)',
            }}>{g.level}</span>
          </div>
          <span style={{ fontSize: 12, color: urgent ? '#FF6B35' : 'var(--text3)' }}>
            {urgent ? `⚡ ${spotsLeft} cupos` : `${g.postedMin}min`}
          </span>
        </div>

        {/* VS area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Challenger */}
          <div style={{ flex: 1 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, marginBottom: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: 18,
              background: g.challenger.color + '12',
              color: g.challenger.color,
            }}>
              {g.challenger.name[0]}
            </div>
            <p style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3, marginBottom: 3 }}>
              {g.challenger.name}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text3)' }}>{g.challenger.record}</p>
          </div>

          {/* VS badge */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(215,255,0,0.06)',
            border: '1px solid rgba(215,255,0,0.1)',
            flexShrink: 0,
          }}>
            <span style={{ fontWeight: 900, fontSize: 12, color: 'var(--accent)', letterSpacing: '-0.02em' }}>VS</span>
          </div>

          {/* Open spot */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, marginBottom: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, color: 'var(--text3)',
              background: 'var(--surface3)',
              border: '1px dashed rgba(255,255,255,0.1)',
            }}>?</div>
            <p style={{ fontWeight: 500, fontSize: 13, color: 'var(--text3)', textAlign: 'right' }}>¿Tu equipo?</p>
          </div>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{
            height: 3, borderRadius: 99, overflow: 'hidden',
            background: 'rgba(255,255,255,0.05)',
          }}>
            <div style={{
              height: '100%', borderRadius: 99,
              width: `${pct}%`,
              background: urgent
                ? 'linear-gradient(90deg, #FF6B35, #FF5722)'
                : 'var(--accent)',
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>{filled}/{total} jugadores</span>
            {urgent && (
              <span style={{ fontSize: 12, color: '#FF6B35', fontWeight: 500 }}>Últimos cupos</span>
            )}
          </div>
        </div>

        {/* Location */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text3)' }}>
          <MapPin size={10} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <span>{g.venue} · Hoy {g.time}</span>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: 20, marginTop: 'auto',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>por equipo</p>
            <p style={{ fontWeight: 900, fontSize: 20, color: 'var(--accent)', letterSpacing: '-0.02em' }}>
              {fmtColones(g.pricePerTeam)}
            </p>
          </div>
          <button className="btn-primary" style={{ padding: '10px 20px', fontSize: 13 }}>
            Aceptar reto
          </button>
        </div>

      </div>
    </div>
  );
}

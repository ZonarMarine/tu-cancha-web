"use client";
import { useEffect, useState } from "react";

const EVENTS = [
  { icon: "⚡", text: "Carlos G. se unió a Los Clavos FC",        time: "ahora" },
  { icon: "✅", text: "Partido confirmado · Furati Sports 8PM",   time: "1min"  },
  { icon: "🔥", text: "Escazú United llenó su cupo",              time: "2min"  },
  { icon: "⚽", text: "Nuevo reto · Heredia Kicks 9PM",           time: "3min"  },
  { icon: "👥", text: "Alajuela FC busca rival · 5v5",            time: "4min"  },
  { icon: "⚡", text: "Marco R. aceptó el reto · Santa Ana",      time: "5min"  },
  { icon: "🏆", text: "Los Clavos FC ganó 3-1",                   time: "8min"  },
  { icon: "🔔", text: "Diego M. te invitó a su equipo",           time: "10min" },
];

export default function LiveTicker() {
  const [idx, setIdx]         = useState(0);
  const [phase, setPhase]     = useState<'in' | 'out'>('in');

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      setPhase('out');
      setTimeout(() => {
        setIdx(i => (i + 1) % EVENTS.length);
        setPhase('in');
      }, 400);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const e = EVENTS[idx];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 16px', borderRadius: 40,
      backgroundColor: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.09)',
      overflow: 'hidden',
    }}>
      {/* Live dot */}
      <span className="pulse-live" style={{
        width: 7, height: 7, borderRadius: '50%',
        backgroundColor: 'var(--accent)',
        flexShrink: 0, display: 'inline-block',
      }} />

      {/* Text */}
      <span style={{
        fontSize: 12, fontWeight: 500, color: 'var(--text2)',
        letterSpacing: '0.01em', whiteSpace: 'nowrap',
        overflow: 'hidden', textOverflow: 'ellipsis',
        flex: 1, minWidth: 0,
        opacity:   phase === 'in' ? 1 : 0,
        transform: phase === 'in' ? 'translateY(0)' : 'translateY(4px)',
        transition: phase === 'in'
          ? 'opacity 0.35s ease, transform 0.35s ease'
          : 'opacity 0.25s ease, transform 0.25s ease',
      }}>
        {e.icon} {e.text}
      </span>

      {/* Time */}
      <span style={{
        fontSize: 11, color: 'var(--text3)', flexShrink: 0,
        opacity:   phase === 'in' ? 1 : 0,
        transition: phase === 'in' ? 'opacity 0.35s ease 0.05s' : 'opacity 0.2s ease',
      }}>
        {e.time}
      </span>
    </div>
  );
}

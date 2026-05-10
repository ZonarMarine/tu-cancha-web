"use client";
import { useEffect, useState } from "react";

const EVENTS = [
  { icon: "⚡", text: "Carlos G. se unió a Los Clavos FC", time: "ahora" },
  { icon: "✅", text: "Partido confirmado · Furati Sports 8PM", time: "1min" },
  { icon: "🔥", text: "Escazú United llenó su cupo", time: "2min" },
  { icon: "⚽", text: "Nuevo reto · Heredia Kicks 9PM", time: "3min" },
  { icon: "👥", text: "Alajuela FC busca rival · 5v5", time: "4min" },
  { icon: "⚡", text: "Marco R. aceptó el reto · Santa Ana", time: "5min" },
  { icon: "🏆", text: "Partido terminado · Los Clavos FC ganó 3-1", time: "8min" },
  { icon: "🔔", text: "Diego M. te invitó a su equipo", time: "10min" },
];

export default function LiveTicker() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % EVENTS.length);
        setVisible(true);
      }, 300);
    }, 3000);
    return () => clearInterval(t);
  }, []);

  const e = EVENTS[idx];

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
      <span className="w-2 h-2 rounded-full flex-shrink-0 pulse-live" style={{ backgroundColor: 'var(--accent)' }} />
      <span className="text-xs font-medium transition-opacity duration-300"
        style={{ color: 'var(--text2)', opacity: visible ? 1 : 0, letterSpacing: '0.01em' }}>
        {e.icon} {e.text}
      </span>
      <span className="text-xs flex-shrink-0" style={{ color: 'var(--text3)', marginLeft: 'auto' }}>{e.time}</span>
    </div>
  );
}

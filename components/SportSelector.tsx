"use client";
import { useSport, SPORT_THEME, type Sport } from "@/context/SportContext";
import { useState } from "react";

const SPORTS: Sport[] = ["futbol", "padel"];

/* SVG icons — emoji fallback is unreliable across OS/browsers */
function FutbolIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.8"/>
      <path d="M12 2C12 2 9 6 9 12s3 10 3 10" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M12 2C12 2 15 6 15 12s-3 10-3 10" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M2 12h20" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M4.5 6.5C6.5 8 9 8.5 12 8.5s5.5-.5 7.5-2" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M4.5 17.5C6.5 16 9 15.5 12 15.5s5.5.5 7.5 2" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function PadelIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Paddle racket */}
      <ellipse cx="10" cy="9" rx="6.5" ry="7" stroke={color} strokeWidth="1.8"/>
      <line x1="10" y1="9" x2="10" y2="9" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      {/* Grid lines */}
      <line x1="10" y1="2.2" x2="10" y2="15.8" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
      <line x1="3.6" y1="9" x2="16.4" y2="9" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
      <line x1="5" y1="5.5" x2="15" y2="12.5" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.35"/>
      <line x1="5" y1="12.5" x2="15" y2="5.5" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.35"/>
      {/* Handle */}
      <path d="M14.5 14.5 L19 20" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
      {/* Ball */}
      <circle cx="20" cy="5" r="2.5" stroke={color} strokeWidth="1.6"/>
      <path d="M18 4.2 Q20 5 22 4.2" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
    </svg>
  );
}

export default function SportSelector({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const { sport, setSport } = useSport();
  const [hov, setHov] = useState<Sport | null>(null);

  const pad  = size === "sm" ? "6px 14px" : size === "lg" ? "12px 28px" : "9px 20px";
  const fs   = size === "sm" ? 11.5 : size === "lg" ? 15 : 13;
  const iconFs = size === "sm" ? 13 : size === "lg" ? 18 : 15;
  const gap  = size === "sm" ? 5  : 7;

  return (
    <div style={{
      display: "inline-flex",
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 99,
      padding: 3,
      gap: 2,
    }}>
      {SPORTS.map(s => {
        const t       = SPORT_THEME[s];
        const active  = sport === s;
        const isHov   = hov === s && !active;
        return (
          <button
            key={s}
            onClick={() => setSport(s)}
            onMouseEnter={() => setHov(s)}
            onMouseLeave={() => setHov(null)}
            style={{
              display: "inline-flex", alignItems: "center", gap,
              padding: pad, borderRadius: 99,
              border: "none", cursor: "pointer",
              fontSize: fs, fontWeight: 700, letterSpacing: "-0.01em",
              transition: "all 0.20s cubic-bezier(0.34,1.1,0.64,1)",
              background: active
                ? `linear-gradient(135deg, ${t.bg} 0%, rgba(0,0,0,0) 100%), ${t.bg}`
                : isHov ? "rgba(255,255,255,0.06)" : "transparent",
              color: active ? t.accent : isHov ? "rgba(255,255,255,0.62)" : "rgba(255,255,255,0.32)",
              boxShadow: active
                ? `0 0 0 1px ${t.border}, 0 2px 12px ${t.accentGlow}`
                : "none",
              transform: active ? "scale(1.02)" : isHov ? "scale(1.01)" : "scale(1)",
            }}
          >
            {s === "futbol"
              ? <FutbolIcon size={iconFs} color={active ? t.accent : isHov ? "rgba(255,255,255,0.62)" : "rgba(255,255,255,0.32)"} />
              : <PadelIcon  size={iconFs} color={active ? t.accent : isHov ? "rgba(255,255,255,0.62)" : "rgba(255,255,255,0.32)"} />
            }
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

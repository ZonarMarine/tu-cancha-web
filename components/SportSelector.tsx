"use client";
import { useSport, SPORT_THEME, type Sport } from "@/context/SportContext";
import { useState } from "react";

const SPORTS: Sport[] = ["futbol", "padel"];

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
            <span style={{ fontSize: iconFs, lineHeight: 1 }}>{t.icon}</span>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";

export type Sport = "futbol" | "padel";

interface SportCtx {
  sport:    Sport;
  setSport: (s: Sport) => void;
}

const SportContext = createContext<SportCtx>({
  sport:    "futbol",
  setSport: () => {},
});

export function SportProvider({ children }: { children: React.ReactNode }) {
  const [sport, setSportState] = useState<Sport>("futbol");

  /* Restore from localStorage on mount */
  useEffect(() => {
    const saved = localStorage.getItem("tc-sport") as Sport | null;
    if (saved === "futbol" || saved === "padel") setSportState(saved);
  }, []);

  const setSport = useCallback((s: Sport) => {
    setSportState(s);
    localStorage.setItem("tc-sport", s);
  }, []);

  return (
    <SportContext.Provider value={{ sport, setSport }}>
      {children}
    </SportContext.Provider>
  );
}

export const useSport = () => useContext(SportContext);

/* Design tokens per sport — used by all sport-aware components */
export const SPORT_THEME = {
  futbol: {
    accent:      "#3B82F6",
    accentMuted: "rgba(59, 130, 246,0.65)",
    accentGlow:  "rgba(59, 130, 246,0.18)",
    bg:          "rgba(59, 130, 246,0.06)",
    border:      "rgba(59, 130, 246,0.20)",
    radius:      14,          // sharper — football is aggressive
    label:       "Fútbol",
    icon:        "⚽",   // football — renders fine everywhere
    eyebrow:     "FÚTBOL AMATEUR",
    tag:         "BUSCANDO RIVAL",
  },
  padel: {
    accent:      "#60A5FA",
    accentMuted: "rgba(96,165,250,0.65)",
    accentGlow:  "rgba(96,165,250,0.18)",
    bg:          "rgba(96,165,250,0.06)",
    border:      "rgba(96,165,250,0.20)",
    radius:      20,          // softer — padel is social/premium
    label:       "Pádel",
    icon:        "🏓",   // table tennis paddle — renders reliably vs 🎾
    eyebrow:     "PÁDEL AMATEUR",
    tag:         "BUSCANDO PAREJA",
  },
} as const;

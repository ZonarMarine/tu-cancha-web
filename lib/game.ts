// ─────────────────────────────────────────────────────────────
//  TuCancha — gamification core (WEB) — mirrors the mobile app's
//  lib/game.js exactly so level/rank/XP are congruent across platforms.
//  XP is DERIVED FROM REAL ACTIVITY: bookings*100 + accepted retos*150.
// ─────────────────────────────────────────────────────────────

export type Rank = {
  key: string; name: string; min: number;
  grad: [string, string]; solid: string; text: string;
};

// Rank tiers (same values as the app's constants/colors.js RANKS)
export const RANKS: Rank[] = [
  { key: 'bronce',   name: 'Bronce',   min: 1,  grad: ['#8A5A2B', '#C88A4B'], solid: '#C88A4B', text: '#3A2410' },
  { key: 'plata',    name: 'Plata',    min: 5,  grad: ['#8E97A6', '#D8DEE9'], solid: '#C7CEDB', text: '#2A2E36' },
  { key: 'oro',      name: 'Oro',      min: 10, grad: ['#C9971F', '#FFD75E'], solid: '#FFD75E', text: '#3A2C00' },
  { key: 'platino',  name: 'Platino',  min: 20, grad: ['#1F8A8A', '#5EEBD6'], solid: '#5EEBD6', text: '#043330' },
  { key: 'diamante', name: 'Diamante', min: 35, grad: ['#3B82F6', '#93C5FD'], solid: '#93C5FD', text: '#082044' },
  { key: 'leyenda',  name: 'Leyenda',  min: 50, grad: ['#A8CC00', '#EAFF6B'], solid: '#D7FF00', text: '#1A2000' },
];

export const XP = { BOOKING: 100, RETO: 150 };

const TITLES: Record<string, string> = {
  bronce: 'Novato', plata: 'Titular', oro: 'Crack',
  platino: 'Figura', diamante: 'Estrella', leyenda: 'Leyenda',
};

function reqToAdvance(level: number) { return 100 + (level - 1) * 60; }
function totalXpForLevel(level: number) {
  let sum = 0;
  for (let l = 1; l < level; l++) sum += reqToAdvance(l);
  return sum;
}

export function rankForLevel(level: number): Rank {
  let r = RANKS[0];
  for (const tier of RANKS) if (level >= tier.min) r = tier;
  return r;
}

export type Progress = {
  xp: number; level: number; rank: Rank; title: string;
  intoLevel: number; toNext: number; span: number; pct: number;
  matches: number; bookings: number; retos: number; ovr: number;
};

export function deriveProgress({ bookings = 0, retos = 0 }: { bookings?: number; retos?: number } = {}): Progress {
  const xp = bookings * XP.BOOKING + retos * XP.RETO;
  let level = 1;
  while (xp >= totalXpForLevel(level + 1)) level++;
  const floor = totalXpForLevel(level);
  const ceil = totalXpForLevel(level + 1);
  const intoLevel = xp - floor;
  const span = ceil - floor;
  const pct = Math.max(0, Math.min(1, span > 0 ? intoLevel / span : 0));
  const rank = rankForLevel(level);
  return {
    xp, level, rank, title: TITLES[rank.key] || 'Jugador',
    intoLevel, toNext: Math.max(0, ceil - xp), span, pct,
    matches: bookings + retos, bookings, retos,
    ovr: Math.min(99, 58 + level),
  };
}

// Derive progress directly from an XP total (leaderboard rows expose xp).
export function progressFromXp(xp: number): Progress {
  // recover a bookings-equivalent count is lossy; derive level straight from xp
  let level = 1;
  while (xp >= totalXpForLevel(level + 1)) level++;
  const floor = totalXpForLevel(level);
  const ceil = totalXpForLevel(level + 1);
  const span = ceil - floor;
  const rank = rankForLevel(level);
  return {
    xp, level, rank, title: TITLES[rank.key] || 'Jugador',
    intoLevel: xp - floor, toNext: Math.max(0, ceil - xp), span,
    pct: Math.max(0, Math.min(1, span > 0 ? (xp - floor) / span : 0)),
    matches: 0, bookings: 0, retos: 0, ovr: Math.min(99, 58 + level),
  };
}

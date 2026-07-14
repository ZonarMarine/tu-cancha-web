// Web port of the app's lib/achievements.js — same 8 achievements, all derived
// from the player's own real activity. `icon` is a lucide-react name mapped in
// the profile render.
export type AchCtx = { bookings: number; retos: number; matches: number; level: number; statsSet: boolean; friends: number };

export type AchDef = {
  key: string; icon: string; title: string; desc: string; goal: number;
  val: (c: AchCtx) => number;
};

export const ACHIEVEMENTS: AchDef[] = [
  { key: 'debut',      icon: 'Trophy',     title: 'Debut',    desc: 'Jugá tu primer partido', goal: 1,  val: c => c.matches },
  { key: 'reservista', icon: 'Calendar',   title: 'Fijo',     desc: 'Hacé 5 reservas',        goal: 5,  val: c => c.bookings },
  { key: 'habitue',    icon: 'Flame',      title: 'Fanático', desc: 'Hacé 20 reservas',       goal: 20, val: c => c.bookings },
  { key: 'retador',    icon: 'Zap',        title: 'Retador',  desc: 'Jugá tu primer reto',    goal: 1,  val: c => c.retos },
  { key: 'guerrero',   icon: 'Shield',     title: 'Guerrero', desc: 'Jugá 5 retos',           goal: 5,  val: c => c.retos },
  { key: 'ascenso',    icon: 'TrendingUp', title: 'Ascenso',  desc: 'Alcanzá el Nivel 5',     goal: 5,  val: c => c.level },
  { key: 'elite',      icon: 'Award',      title: 'Élite',    desc: 'Alcanzá el Nivel 10',    goal: 10, val: c => c.level },
  { key: 'carta',      icon: 'Sparkles',   title: 'Carta',    desc: 'Definí tus 4 atributos', goal: 1,  val: c => (c.statsSet ? 1 : 0) },
  { key: 'amistoso',   icon: 'Users',      title: 'Amistoso', desc: 'Sumá 10 amigos',         goal: 10, val: c => c.friends },
];

export function evalAll(ctx: AchCtx) {
  const list = ACHIEVEMENTS.map(a => {
    const value = Math.max(0, a.val(ctx) || 0);
    return { ...a, value, earned: value >= a.goal, pct: Math.max(0, Math.min(1, value / a.goal)) };
  });
  return { list, earned: list.filter(a => a.earned).length, total: list.length };
}

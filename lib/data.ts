export const GAMES = [
  { id: 'g1', format: '5v5', sport: 'Fútbol', location: 'Santa Ana', venue: 'Twelve Academy', time: '7:00 PM', pricePerTeam: 30000, level: 'Intermedio', tag: '🔥 Popular', postedMin: 3, challenger: { name: 'Los Clavos FC', record: '8V · 3D', color: '#4ADE80' } },
  { id: 'g2', format: '7v7', sport: 'Fútbol', location: 'Escazú',    venue: 'Furati Sports',   time: '8:00 PM', pricePerTeam: 35000, level: 'Principiante', tag: null, postedMin: 18, challenger: { name: 'Escazú United', record: '2V · 6D', color: '#60A5FA' } },
  { id: 'g3', format: '5v5', sport: 'Fútbol', location: 'Alajuela',  venue: 'Twelve Academy',  time: '6:30 PM', pricePerTeam: 20000, level: 'Avanzado', tag: '⚡ Urgente', postedMin: 2, challenger: { name: 'Alajuela FC', record: '9V · 1D', color: '#F87171' } },
  { id: 'g4', format: '5v5', sport: 'Fútbol', location: 'Heredia',   venue: 'Arena Heredia',   time: '9:00 PM', pricePerTeam: 28000, level: 'Intermedio', tag: null, postedMin: 45, challenger: { name: 'Heredia Kicks', record: '5V · 5D', color: '#A78BFA' } },
];

// ── Static seed courts (emergency fallback only) ───────────────
// Loaded from owner_courts in Supabase at runtime.
// This seed is only shown if the DB is unreachable.
export const COURTS = [
  {
    id:              '6b4cfbf7-dc24-4a82-bb75-9afb789303a6',
    title:           'Twelve Academy',
    location:        'San Rafael · Alajuela',
    basePrice:       25000,
    includedPlayers: 10,
    sport:           'Fútbol',
    rating:          5.0,
    tag:             'Popular',
    slotsAvailable:  5,
    imageUrl:        'https://lbmcwyvrszjnxvwhmqjz.supabase.co/storage/v1/object/public/court-images/f5996afa-b516-4fbd-8a38-e999a2eca932/1777672421881-pum8fuup188',
  },
];

export function fmtColones(n: number) {
  return '₡' + Math.round(n).toLocaleString('es-CR');
}

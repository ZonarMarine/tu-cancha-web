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

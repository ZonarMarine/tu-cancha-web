export const GAMES = [
  { id: 'g1', format: '5v5', sport: 'Fútbol', location: 'Santa Ana', venue: 'Complejo Fedefutbol', time: '7:00 PM', pricePerTeam: 30000, level: 'Intermedio', tag: '🔥 Popular', postedMin: 3, challenger: { name: 'Los Clavos FC', record: '8V · 3D', color: '#4ADE80' } },
  { id: 'g2', format: '7v7', sport: 'Fútbol', location: 'Escazú',    venue: 'Furati Sports',       time: '8:00 PM', pricePerTeam: 35000, level: 'Principiante', tag: null, postedMin: 18, challenger: { name: 'Escazú United', record: '2V · 6D', color: '#60A5FA' } },
  { id: 'g3', format: '5v5', sport: 'Fútbol', location: 'Alajuela',  venue: 'Complejo LDA',        time: '6:30 PM', pricePerTeam: 20000, level: 'Avanzado', tag: '⚡ Urgente', postedMin: 2, challenger: { name: 'Alajuela FC', record: '9V · 1D', color: '#F87171' } },
  { id: 'g4', format: '5v5', sport: 'Fútbol', location: 'Heredia',   venue: 'Arena Heredia',       time: '9:00 PM', pricePerTeam: 28000, level: 'Intermedio', tag: null, postedMin: 45, challenger: { name: 'Heredia Kicks', record: '5V · 5D', color: '#A78BFA' } },
];

export const COURTS = [
  { id: 1, title: 'Complejo Fedefutbol', location: 'Santa Ana · Belén', basePrice: 15000, includedPlayers: 10, sport: 'Fútbol', rating: 4.8, tag: 'Popular', slotsAvailable: 4 },
  { id: 2, title: 'Furati Sports',       location: 'Santa Ana',         basePrice: 12000, includedPlayers: 4,  sport: 'Pádel',  rating: 4.6, tag: null,      slotsAvailable: 6 },
  { id: 3, title: 'Complejo LDA',        location: 'Alajuela',          basePrice: 10000, includedPlayers: 10, sport: 'Fútbol', rating: 4.4, tag: 'Nuevo',   slotsAvailable: 3 },
  { id: 4, title: 'Arena Heredia',       location: 'Heredia',           basePrice: 13000, includedPlayers: 10, sport: 'Fútbol', rating: 4.7, tag: null,      slotsAvailable: 5 },
  { id: 5, title: 'Club Deportivo Escazú', location: 'Escazú',          basePrice: 18000, includedPlayers: 14, sport: 'Fútbol', rating: 4.9, tag: 'Premium', slotsAvailable: 2 },
  { id: 6, title: 'Estadio El Labrador', location: 'San José',          basePrice: 11000, includedPlayers: 10, sport: 'Fútbol', rating: 4.3, tag: null,      slotsAvailable: 7 },
];

export function fmtColones(n: number) {
  return '₡' + Math.round(n).toLocaleString('es-CR');
}

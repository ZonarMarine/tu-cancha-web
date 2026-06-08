// Court data is loaded exclusively from owner_courts in Supabase at runtime.
// No static seed — never display invented courts.

export function fmtColones(n: number) {
  return '₡' + Math.round(n).toLocaleString('es-CR');
}

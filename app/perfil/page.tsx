"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LogOut, Edit2, Calendar, MapPin, Clock } from "lucide-react";
import Link from "next/link";

const STATUS: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  confirmed: { label: 'Confirmada', color: '#4ADE80', bg: 'rgba(74,222,128,0.08)',  dot: '#4ADE80' },
  pending:   { label: 'Pendiente',  color: '#FACC15', bg: 'rgba(250,204,21,0.08)',  dot: '#FACC15' },
  cancelled: { label: 'Cancelada',  color: '#FF6B6B', bg: 'rgba(255,107,107,0.08)', dot: '#FF6B6B' },
};

const STATS = [
  { key: 'stat_atk', label: 'ATK', icon: '⚡' },
  { key: 'stat_def', label: 'DEF', icon: '🛡' },
  { key: 'stat_str', label: 'STR', icon: '💪' },
  { key: 'stat_skl', label: 'SKL', icon: '🎯' },
];

export default function PerfilPage() {
  const router = useRouter();
  const [profile,  setProfile]  = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.push('/auth'); return; }
      const [{ data: p }, { data: b }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
        supabase.from('bookings').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(10),
      ]);
      setProfile(p ?? { name: session.user.email, team: '' });
      setBookings(b ?? []);
      setLoading(false);
    })();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100svh' }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        border: '2px solid var(--surface3)',
        borderTopColor: 'var(--accent)',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const initials = profile?.name
    ? profile.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <div style={{ minHeight: '100svh', paddingTop: 64 }}>

      {/* ── Profile header band ── */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(215,255,0,0.04) 0%, transparent 100%)',
        borderBottom: '1px solid var(--border)',
        padding: '48px 0 40px',
      }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>

            {/* Avatar + identity */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24 }}>
              {/* Avatar */}
              <div style={{
                width: 80, height: 80, borderRadius: 20, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: 28,
                background: 'rgba(215,255,0,0.1)',
                color: 'var(--accent)',
                border: '2px solid rgba(215,255,0,0.2)',
              }}>
                {initials}
              </div>

              {/* Name + tags */}
              <div style={{ paddingBottom: 4 }}>
                <h1 style={{ fontWeight: 900, fontSize: 28, letterSpacing: '-0.02em', marginBottom: 8 }}>
                  {profile?.name ?? 'Usuario'}
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 12, padding: '4px 10px', borderRadius: 99,
                    background: 'var(--surface2)', color: 'var(--text3)',
                    border: '1px solid var(--border)',
                  }}>🇨🇷 Costa Rica</span>
                  {profile?.team && (
                    <span style={{
                      fontSize: 12, padding: '4px 10px', borderRadius: 99,
                      background: 'var(--surface2)', color: 'var(--text3)',
                      border: '1px solid var(--border)',
                    }}>{profile.team}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Link href="/perfil/editar" style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '10px 18px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                background: 'var(--surface2)', color: 'var(--text2)',
                border: '1px solid var(--border)', textDecoration: 'none',
                transition: 'border-color 0.18s',
              }}>
                <Edit2 size={13} /> Editar perfil
              </Link>
              <button onClick={handleLogout} style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '10px 18px', borderRadius: 12, fontSize: 13, fontWeight: 500,
                background: 'none', color: 'var(--text3)',
                border: '1px solid var(--border)', cursor: 'pointer',
                transition: 'color 0.18s',
              }}>
                <LogOut size={13} /> Salir
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="container" style={{ padding: '40px 40px' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '280px 1fr',
          gap: 28, alignItems: 'start',
        }} className="profile-grid">

          <style>{`
            @media (max-width: 900px) {
              .profile-grid { grid-template-columns: 1fr !important; }
            }
          `}</style>

          {/* ── Left column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Stats card */}
            <div style={{
              borderRadius: 20, padding: '24px',
              background: 'linear-gradient(145deg, #131313, #0e0e0e)',
              border: '1px solid rgba(255,255,255,0.055)',
            }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--text3)', marginBottom: 20 }}>
                ESTADÍSTICAS
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {STATS.map(s => (
                  <div key={s.key} style={{
                    padding: '16px 14px', borderRadius: 14, textAlign: 'center',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <p style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</p>
                    <p style={{
                      fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em',
                      color: profile?.[s.key] ? 'var(--accent)' : 'var(--text3)',
                      marginBottom: 4,
                    }}>
                      {profile?.[s.key] ?? '–'}
                    </p>
                    <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text3)' }}>
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick info card */}
            <div style={{
              borderRadius: 20, padding: '24px',
              background: 'linear-gradient(145deg, #131313, #0e0e0e)',
              border: '1px solid rgba(255,255,255,0.055)',
            }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--text3)', marginBottom: 18 }}>
                ACTIVIDAD
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Partidos jugados', val: '0' },
                  { label: 'Reservas totales', val: String(bookings.length) },
                  { label: 'Cancha favorita',  val: '–' },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--text3)' }}>{r.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{r.val}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ── Right column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

            {/* Mis reservas */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--text3)' }}>MIS RESERVAS</p>
                {bookings.length > 0 && (
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>{bookings.length} reservas</span>
                )}
              </div>

              {bookings.length === 0 ? (
                <div style={{
                  borderRadius: 20, padding: '48px 24px', textAlign: 'center',
                  background: 'linear-gradient(145deg, #131313, #0e0e0e)',
                  border: '1px solid rgba(255,255,255,0.055)',
                }}>
                  <Calendar size={28} style={{ color: 'var(--text3)', margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Sin reservas aún</p>
                  <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>Explorá las canchas disponibles</p>
                  <Link href="/explorar" className="btn-primary" style={{ padding: '10px 24px', fontSize: 13, borderRadius: 10 }}>
                    Explorar canchas →
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {bookings.map(b => {
                    const meta = STATUS[b.status] ?? STATUS.pending;
                    return (
                      <div key={b.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '18px 22px', borderRadius: 16,
                        background: 'linear-gradient(145deg, #131313, #0e0e0e)',
                        border: '1px solid rgba(255,255,255,0.055)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <div style={{
                            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 18, background: 'var(--surface3)',
                          }}>⚽</div>
                          <div>
                            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{b.court_name}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--text3)' }}>
                              <span className="flex items-center gap-1"><Clock size={10} /> {b.hours}h</span>
                              <span>·</span>
                              <span>{b.players ?? 10} jug.</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--accent)', letterSpacing: '-0.01em', marginBottom: 5 }}>
                            ₡{Math.round(b.total_price ?? 0).toLocaleString('es-CR')}
                          </p>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99,
                            background: meta.bg, color: meta.color,
                          }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: meta.dot, display: 'inline-block' }} />
                            {meta.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Historial de partidos */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--text3)', marginBottom: 16 }}>
                HISTORIAL DE PARTIDOS
              </p>
              <div style={{
                borderRadius: 20, padding: '48px 24px', textAlign: 'center',
                background: 'linear-gradient(145deg, #131313, #0e0e0e)',
                border: '1px solid rgba(255,255,255,0.055)',
              }}>
                <span style={{ fontSize: 32, display: 'block', marginBottom: 12 }}>⚽</span>
                <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Sin partidos aún</p>
                <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>
                  Aceptá un reto y tu historial aparecerá aquí
                </p>
                <Link href="/juegos" className="btn-primary" style={{ padding: '10px 24px', fontSize: 13, borderRadius: 10 }}>
                  Ver retos activos →
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

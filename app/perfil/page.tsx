"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LogOut, Edit2, Calendar } from "lucide-react";

export default function PerfilPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
    </div>
  );

  const STATUS: Record<string, { label: string; color: string; bg: string }> = {
    confirmed: { label: 'Confirmada', color: '#CCFF00', bg: '#1a2000' },
    pending:   { label: 'Pendiente',  color: '#FFA500', bg: '#1f1200' },
    cancelled: { label: 'Cancelada',  color: '#FF4444', bg: '#1f0000' },
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Avatar + name */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-black"
          style={{ backgroundColor: 'var(--accent-dark)', color: 'var(--accent)', border: '3px solid var(--accent)' }}>
          {profile?.name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <h1 className="text-2xl font-black">{profile?.name ?? 'Usuario'}</h1>
        {profile?.team && <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{profile.team}</p>}
        <div className="flex justify-center gap-3 mt-3">
          <span className="text-xs px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>🇨🇷 Costa Rica</span>
          {profile?.team && <span className="text-xs px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{profile.team}</span>}
        </div>
        <button className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold mx-auto transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--accent)', color: '#000' }}>
          <Edit2 size={14} /> Editar perfil
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {[['ATK', profile?.stat_atk], ['DEF', profile?.stat_def], ['STR', profile?.stat_str], ['SKL', profile?.stat_skl]].map(([label, val]) => (
          <div key={label as string} className="rounded-xl p-3 text-center" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xl font-black" style={{ color: 'var(--accent)' }}>{val ?? '–'}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Reservas */}
      <div className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>Mis Reservas</h2>
        {bookings.length === 0 ? (
          <div className="rounded-xl p-8 text-center" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <Calendar size={28} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aún no tenés reservas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {bookings.map(b => {
              const meta = STATUS[b.status] ?? STATUS.pending;
              return (
                <div key={b.id} className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div>
                    <p className="font-semibold text-sm">{b.court_name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Fútbol · {b.hours}h · {b.players} jug.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: 'var(--accent)' }}>₡{Math.round(b.total_price ?? 0).toLocaleString('es-CR')}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: meta.bg, color: meta.color }}>{meta.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historial */}
      <div className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>Historial de partidos</h2>
        <div className="rounded-xl p-8 text-center" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <span className="text-3xl mb-2 block">⚽</span>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Aún no has jugado partidos</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Tus partidos aparecerán aquí</p>
        </div>
      </div>

      {/* Logout */}
      <button onClick={handleLogout}
        className="flex items-center gap-2 text-sm font-medium mx-auto transition-opacity hover:opacity-80"
        style={{ color: 'var(--red)' }}>
        <LogOut size={16} /> Cerrar sesión
      </button>
    </div>
  );
}

import Link from "next/link";
import { Search, Zap, Shield, Star, ChevronRight, MapPin, Clock } from "lucide-react";
import { GAMES, COURTS, fmtColones } from "@/lib/data";

export default function HomePage() {
  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0D0D0D 0%, #111800 100%)' }}>
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
            style={{ backgroundColor: 'var(--accent-dark)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent)' }} />
            {GAMES.length} retos activos ahora mismo
          </div>
          <h1 className="text-4xl md:text-6xl font-black leading-tight mb-4">
            Tu cancha.<br />
            <span style={{ color: 'var(--accent)' }}>Tu partido.</span>
          </h1>
          <p className="text-lg md:text-xl mb-8 max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Reservá canchas, lanzá retos y jugá fútbol en Costa Rica.
          </p>
          <div className="max-w-lg mx-auto flex gap-2">
            <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <Search size={18} style={{ color: 'var(--text-muted)' }} />
              <span style={{ color: 'var(--text-muted)' }} className="text-sm">Buscar cancha, zona...</span>
            </div>
            <Link href="/explorar" className="px-5 py-3 rounded-xl font-bold text-sm transition-opacity hover:opacity-90" style={{ backgroundColor: 'var(--accent)', color: '#000' }}>
              Buscar
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {['Santa Ana', 'Escazú', 'Heredia', 'Alajuela', 'San José'].map(z => (
              <Link key={z} href={`/explorar?zona=${z}`}
                className="px-3 py-1 rounded-full text-xs font-medium transition-colors hover:text-white"
                style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                {z}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Retos activos ── */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black">Retos activos</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Equipos buscando rival ahora mismo</p>
          </div>
          <Link href="/juegos" className="flex items-center gap-1 text-sm font-semibold hover:opacity-80" style={{ color: 'var(--accent)' }}>
            Ver todos <ChevronRight size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {GAMES.map(g => (
            <div key={g.id} className="rounded-2xl p-4 flex flex-col gap-3 transition-transform hover:-translate-y-0.5"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent-dark)', color: 'var(--accent)' }}>{g.format}</span>
                {g.tag && <span className="text-xs">{g.tag}</span>}
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 text-center">
                  <div className="w-10 h-10 rounded-full mx-auto mb-1 flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: g.challenger.color + '20', color: g.challenger.color, border: `1px solid ${g.challenger.color}40` }}>
                    {g.challenger.name[0]}
                  </div>
                  <p className="text-xs font-bold leading-tight">{g.challenger.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{g.challenger.record}</p>
                </div>
                <span className="text-xs font-black" style={{ color: 'var(--accent)' }}>VS</span>
                <div className="flex-1 text-center">
                  <div className="w-10 h-10 rounded-full mx-auto mb-1 flex items-center justify-center text-sm"
                    style={{ backgroundColor: 'var(--surface-high)', border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>?</div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>¿Tu equipo?</p>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}><MapPin size={11} />{g.venue}</div>
                <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}><Clock size={11} />{g.time} · {g.level}</div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{fmtColones(g.pricePerTeam)}</span>
                <button className="px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-90" style={{ backgroundColor: 'var(--accent)', color: '#000' }}>⚡ Aceptar</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Canchas ── */}
      <section className="max-w-6xl mx-auto px-4 pb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black">Canchas disponibles</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Reservá ahora, pagá en cancha</p>
          </div>
          <Link href="/explorar" className="flex items-center gap-1 text-sm font-semibold hover:opacity-80" style={{ color: 'var(--accent)' }}>
            Ver todas <ChevronRight size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {COURTS.map(c => (
            <Link key={c.id} href={`/cancha/${c.id}`}
              className="rounded-2xl overflow-hidden transition-transform hover:-translate-y-0.5"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="h-40 flex items-center justify-center relative"
                style={{ background: 'linear-gradient(135deg, #1a2a00, #0d1a00)' }}>
                <span className="text-4xl">⚽</span>
                {c.tag && <span className="absolute top-3 left-3 text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent)', color: '#000' }}>{c.tag}</span>}
                <span className="absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: 'var(--text-secondary)' }}>{c.slotsAvailable} slots</span>
              </div>
              <div className="p-4">
                <h3 className="font-bold mb-1">{c.title}</h3>
                <div className="flex items-center gap-1 text-xs mb-3" style={{ color: 'var(--text-secondary)' }}><MapPin size={11} />{c.location}</div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold" style={{ color: 'var(--accent)' }}>{fmtColones(c.basePrice)}</span>
                    <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>/ hora</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs" style={{ color: '#FACC15' }}><Star size={11} fill="currentColor" />{c.rating}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Why Tu Cancha ── */}
      <section className="border-t py-16" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-black mb-2">¿Por qué Tu Cancha?</h2>
          <p className="mb-10" style={{ color: 'var(--text-secondary)' }}>La forma más fácil de jugar en Costa Rica</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: <Search size={28} />, title: 'Encontrá tu cancha', desc: 'Más de 50 canchas en todo el país. Filtrá por zona, deporte y precio.' },
              { icon: <Zap size={28} />, title: 'Retos instantáneos', desc: 'Lanzá un reto y encontrá rival en minutos. Sin llamadas, sin complicaciones.' },
              { icon: <Shield size={28} />, title: 'Reservas confirmadas', desc: 'Pagá en cancha o en línea. Tu horario reservado al instante.' },
            ].map(f => (
              <div key={f.title} className="p-6 rounded-2xl" style={{ backgroundColor: 'var(--surface-high)', border: '1px solid var(--border)' }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--accent-dark)', color: 'var(--accent)' }}>{f.icon}</div>
                <h3 className="font-bold mb-2">{f.title}</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 text-center">
        <div className="max-w-xl mx-auto px-4">
          <h2 className="text-3xl font-black mb-3">Empezá a jugar hoy</h2>
          <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>Creá tu cuenta gratis y reservá tu primera cancha en minutos.</p>
          <Link href="/auth?mode=signup" className="inline-block px-8 py-4 rounded-xl font-black text-lg transition-opacity hover:opacity-90" style={{ backgroundColor: 'var(--accent)', color: '#000' }}>
            Crear cuenta gratis
          </Link>
        </div>
      </section>
    </div>
  );
}

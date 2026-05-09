import Link from "next/link";
import { MapPin, Clock, ChevronRight, Star, Users, TrendingUp, Shield, Smartphone } from "lucide-react";
import { GAMES, COURTS, fmtColones } from "@/lib/data";

// ── Live counter badge ──────────────────────────────────────────────────────
function LiveBadge({ count }: { count: number }) {
  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold"
      style={{ backgroundColor: 'rgba(215,255,0,0.08)', border: '1px solid rgba(215,255,0,0.2)', color: 'var(--accent)' }}>
      <span className="w-2 h-2 rounded-full pulse-live" style={{ backgroundColor: 'var(--accent)' }} />
      {count} partidos activos ahora mismo
    </div>
  );
}

// ── Reto Card ───────────────────────────────────────────────────────────────
function RetoCard({ g }: { g: typeof GAMES[0] }) {
  const isUrgent = g.tag?.includes('Urgente');
  return (
    <div className="card-hover rounded-2xl p-5 flex flex-col gap-4 cursor-pointer"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: isUrgent ? '0 0 30px rgba(215,255,0,0.06)' : undefined,
      }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black px-2.5 py-1 rounded-lg"
            style={{ backgroundColor: 'var(--accent)', color: '#000' }}>
            {g.format}
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg"
            style={{ backgroundColor: 'var(--surface3)', color: 'var(--text2)' }}>
            {g.level}
          </span>
        </div>
        {isUrgent && (
          <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>
            ⚡ Urgente
          </span>
        )}
        {g.tag?.includes('Popular') && (
          <span className="text-xs font-bold" style={{ color: '#FF6B35' }}>
            🔥 Popular
          </span>
        )}
      </div>

      {/* VS section */}
      <div className="flex items-center gap-3">
        {/* Challenger */}
        <div className="flex-1">
          <div className="w-12 h-12 rounded-2xl mb-2 flex items-center justify-center text-lg font-black"
            style={{ backgroundColor: g.challenger.color + '18', color: g.challenger.color, border: `1px solid ${g.challenger.color}30` }}>
            {g.challenger.name[0]}
          </div>
          <p className="text-sm font-bold leading-tight">{g.challenger.name}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>{g.challenger.record}</p>
        </div>

        {/* VS */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl font-black text-glow" style={{ color: 'var(--accent)' }}>VS</span>
          <span className="text-xs" style={{ color: 'var(--text3)' }}>Hace {g.postedMin}min</span>
        </div>

        {/* Empty slot */}
        <div className="flex-1 flex flex-col items-end">
          <div className="w-12 h-12 rounded-2xl mb-2 flex items-center justify-center text-xl"
            style={{ backgroundColor: 'var(--surface2)', border: '1px dashed var(--border2)', color: 'var(--text3)' }}>
            ?
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text3)' }}>¿Tu equipo?</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>Cupo libre</p>
        </div>
      </div>

      {/* Info */}
      <div className="rounded-xl p-3 space-y-1.5" style={{ backgroundColor: 'var(--surface2)' }}>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text2)' }}>
          <MapPin size={11} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          {g.venue} · {g.location}
        </div>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text2)' }}>
          <Clock size={11} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          Hoy {g.time}
        </div>
      </div>

      {/* CTA */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs" style={{ color: 'var(--text3)' }}>por equipo</p>
          <p className="font-black" style={{ color: 'var(--accent)' }}>{fmtColones(g.pricePerTeam)}</p>
        </div>
        <button className="btn-primary px-4 py-2.5 text-sm">
          ⚡ Aceptar reto
        </button>
      </div>
    </div>
  );
}

// ── Court Card ──────────────────────────────────────────────────────────────
function CourtCard({ c }: { c: typeof COURTS[0] }) {
  const urgencyText = c.slotsAvailable <= 2 ? 'Últimos cupos' : c.slotsAvailable <= 4 ? 'Se llena rápido' : null;
  return (
    <Link href={`/cancha/${c.id}`} className="card-hover block rounded-2xl overflow-hidden"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
      {/* Visual */}
      <div className="h-48 relative flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0f1f00 0%, #081000 100%)' }}>
        <div className="absolute inset-0 shimmer" />
        <span className="text-5xl relative z-10">⚽</span>
        <div className="absolute top-3 left-3 flex gap-2">
          {c.tag && (
            <span className="text-xs font-black px-2.5 py-1 rounded-lg"
              style={{ backgroundColor: 'var(--accent)', color: '#000' }}>
              {c.tag}
            </span>
          )}
          {urgencyText && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
              style={{ backgroundColor: 'rgba(255,59,59,0.15)', color: 'var(--red)', border: '1px solid rgba(255,59,59,0.2)' }}>
              {urgencyText}
            </span>
          )}
        </div>
        <div className="absolute bottom-3 right-3">
          <span className="text-xs px-2 py-1 rounded-lg font-semibold"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: 'var(--text2)' }}>
            {c.slotsAvailable} slots hoy
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-bold text-base">{c.title}</h3>
          <div className="flex items-center gap-1 text-xs font-bold" style={{ color: '#FACC15' }}>
            <Star size={12} fill="currentColor" />
            {c.rating}
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs mb-4" style={{ color: 'var(--text2)' }}>
          <MapPin size={11} /> {c.location}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="font-black text-base" style={{ color: 'var(--accent)' }}>{fmtColones(c.basePrice)}</span>
            <span className="text-xs ml-1.5" style={{ color: 'var(--text3)' }}>/ hora</span>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-lg font-semibold"
            style={{ backgroundColor: 'var(--surface2)', color: 'var(--text2)' }}>
            {c.sport}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div>
      {/* ══════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-5 overflow-hidden"
        style={{ paddingTop: 80, background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(215,255,0,0.08) 0%, transparent 70%)' }}>

        {/* Background grid */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'linear-gradient(var(--border2) 1px, transparent 1px), linear-gradient(90deg, var(--border2) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        <div className="relative z-10 max-w-4xl mx-auto">
          <LiveBadge count={GAMES.length} />

          <h1 className="mt-6 font-black leading-none tracking-tighter"
            style={{ fontSize: 'clamp(52px, 8vw, 96px)' }}>
            Juega hoy<br />
            <span style={{ color: 'var(--accent)' }} className="text-glow">sin organizar</span><br />
            nada.
          </h1>

          <p className="mt-6 text-lg md:text-xl max-w-xl mx-auto leading-relaxed"
            style={{ color: 'var(--text2)' }}>
            El sistema operativo del fútbol amateur en Costa Rica.<br />
            Partidos. Canchas. Rivales. En segundos.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/juegos" className="btn-primary px-8 py-4 text-base w-full sm:w-auto text-center">
              Ver partidos activos →
            </Link>
            <Link href="/explorar"
              className="px-8 py-4 rounded-2xl text-base font-semibold w-full sm:w-auto text-center transition-all hover:border-white/20"
              style={{ border: '1px solid var(--border2)', color: 'var(--text2)', backgroundColor: 'var(--surface)' }}>
              Explorar canchas
            </Link>
          </div>

          {/* Social proof */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6">
            {[
              { val: '50+', label: 'canchas activas' },
              { val: '1,200+', label: 'jugadores' },
              { val: '4.9★', label: 'rating promedio' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-black" style={{ color: 'var(--accent)' }}>{s.val}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce">
          <div className="w-px h-8" style={{ background: 'linear-gradient(to bottom, transparent, var(--text3))' }} />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          RETOS ACTIVOS
      ══════════════════════════════════════════════════════ */}
      <section className="py-20 px-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-bold tracking-widest mb-2" style={{ color: 'var(--accent)' }}>PARTIDOS EN VIVO</p>
              <h2 className="text-3xl md:text-4xl font-black leading-tight">
                Retos activos.<br />
                <span style={{ color: 'var(--text2)' }}>Entrá ya.</span>
              </h2>
            </div>
            <Link href="/juegos" className="hidden md:flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-70"
              style={{ color: 'var(--accent)' }}>
              Ver todos <ChevronRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {GAMES.map(g => <RetoCard key={g.id} g={g} />)}
          </div>

          <div className="mt-6 text-center md:hidden">
            <Link href="/juegos" className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
              Ver todos los partidos →
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SPORTS STRIP
      ══════════════════════════════════════════════════════ */}
      <section className="py-8 px-5 overflow-hidden" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 overflow-x-auto no-scrollbar">
          {[
            { emoji: '⚽', sport: 'Fútbol', status: 'Activo', active: true },
            { emoji: '🎾', sport: 'Pádel', status: 'Próximamente', active: false },
            { emoji: '🏀', sport: 'Básquet', status: 'Próximamente', active: false },
            { emoji: '🏐', sport: 'Voleibol', status: 'Próximamente', active: false },
            { emoji: '⛳', sport: 'Golf', status: 'Próximamente', active: false },
          ].map(s => (
            <div key={s.sport} className="flex items-center gap-3 px-5 py-3 rounded-xl flex-shrink-0"
              style={{
                backgroundColor: s.active ? 'var(--accent-dark)' : 'var(--surface)',
                border: `1px solid ${s.active ? 'rgba(215,255,0,0.2)' : 'var(--border)'}`,
              }}>
              <span className="text-2xl">{s.emoji}</span>
              <div>
                <p className="text-sm font-bold" style={{ color: s.active ? 'var(--accent)' : 'var(--text2)' }}>{s.sport}</p>
                <p className="text-xs" style={{ color: s.active ? 'var(--accent-dim)' : 'var(--text3)' }}>{s.status}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          CANCHAS
      ══════════════════════════════════════════════════════ */}
      <section className="py-20 px-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-bold tracking-widest mb-2" style={{ color: 'var(--accent)' }}>CANCHAS DISPONIBLES</p>
              <h2 className="text-3xl md:text-4xl font-black leading-tight">
                Reservá hoy.<br />
                <span style={{ color: 'var(--text2)' }}>Pagá en cancha.</span>
              </h2>
            </div>
            <Link href="/explorar" className="hidden md:flex items-center gap-2 text-sm font-semibold hover:opacity-70"
              style={{ color: 'var(--accent)' }}>
              Ver todas <ChevronRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {COURTS.map(c => <CourtCard key={c.id} c={c} />)}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════════════ */}
      <section className="py-20 px-5" style={{ backgroundColor: 'var(--surface)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold tracking-widest mb-2" style={{ color: 'var(--accent)' }}>ASÍ DE FÁCIL</p>
            <h2 className="text-3xl md:text-4xl font-black">En 3 pasos. En segundos.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { n: '01', title: 'Encontrá tu partido', desc: 'Mirá los retos activos cerca de vos. Filtrá por formato, nivel y zona. Todo en tiempo real.', cta: 'Ver partidos', href: '/juegos' },
              { n: '02', title: 'Uníte o creá uno', desc: 'Aceptá un reto existente o lanzá el tuyo en segundos. Sin WhatsApp. Sin coordinación. Solo jugá.', cta: 'Crear partido', href: '/auth' },
              { n: '03', title: 'Jugá hoy', desc: 'Confirmado. Cancha reservada. Tu equipo listo. Solo tenés que llegar y jugar.', cta: 'Explorar canchas', href: '/explorar' },
            ].map(step => (
              <div key={step.n} className="rounded-2xl p-7"
                style={{ backgroundColor: 'var(--surface2)', border: '1px solid var(--border)' }}>
                <p className="text-5xl font-black mb-5" style={{ color: 'var(--accent)', opacity: 0.3 }}>{step.n}</p>
                <h3 className="text-xl font-black mb-3">{step.title}</h3>
                <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text2)' }}>{step.desc}</p>
                <Link href={step.href} className="text-sm font-bold transition-opacity hover:opacity-70"
                  style={{ color: 'var(--accent)' }}>
                  {step.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FEATURES GRID
      ══════════════════════════════════════════════════════ */}
      <section className="py-20 px-5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold tracking-widest mb-2" style={{ color: 'var(--accent)' }}>PLATAFORMA COMPLETA</p>
            <h2 className="text-3xl md:text-4xl font-black">Todo lo que necesitás.<br />
              <span style={{ color: 'var(--text2)' }}>En un solo lugar.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: <Users size={22} />, title: 'Perfiles de jugador', desc: 'Stats, nivel, historial. Tu identidad deportiva.' },
              { icon: <TrendingUp size={22} />, title: 'Rankings', desc: 'Subí tu nivel. Competí con los mejores de tu zona.' },
              { icon: <Shield size={22} />, title: 'Pagos seguros', desc: 'Split de pagos con tu equipo. Sin efectivo.' },
              { icon: <Smartphone size={22} />, title: 'App móvil', desc: 'Disponible en iOS. Android próximamente.' },
            ].map(f => (
              <div key={f.title} className="rounded-2xl p-6 transition-all card-hover"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: 'var(--accent-dark)', color: 'var(--accent)', border: '1px solid rgba(215,255,0,0.15)' }}>
                  {f.icon}
                </div>
                <h3 className="font-bold mb-2">{f.title}</h3>
                <p className="text-sm" style={{ color: 'var(--text2)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          OWNER SECTION
      ══════════════════════════════════════════════════════ */}
      <section className="py-20 px-5 overflow-hidden" style={{ backgroundColor: 'var(--surface)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="rounded-3xl p-8 md:p-14 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0f1f00 0%, #080808 60%, #0a1500 100%)', border: '1px solid rgba(215,255,0,0.1)' }}>
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-5"
              style={{ background: 'var(--accent)', transform: 'translate(30%, -30%)' }} />
            <div className="relative z-10 max-w-xl">
              <p className="text-xs font-bold tracking-widest mb-3" style={{ color: 'var(--accent)' }}>PARA DUEÑOS DE CANCHA</p>
              <h2 className="text-3xl md:text-4xl font-black mb-4 leading-tight">
                Tu cancha merece<br />
                <span style={{ color: 'var(--accent)' }}>tecnología premium.</span>
              </h2>
              <p className="text-base mb-8 leading-relaxed" style={{ color: 'var(--text2)' }}>
                Reservas automáticas. Dashboard de ingresos. Calendario inteligente. El sistema operativo moderno para tu negocio deportivo.
              </p>
              <div className="flex flex-wrap gap-3 mb-8">
                {['Reservas automáticas', 'Analytics de ingresos', 'Precios dinámicos', 'Gestión de clientes'].map(f => (
                  <span key={f} className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                    style={{ backgroundColor: 'rgba(215,255,0,0.08)', color: 'var(--accent)', border: '1px solid rgba(215,255,0,0.15)' }}>
                    ✓ {f}
                  </span>
                ))}
              </div>
              <Link href="/auth?mode=signup&role=owner" className="btn-primary inline-block px-7 py-3.5 text-sm">
                Registrá tu cancha →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════════════════════ */}
      <section className="py-28 px-5 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, var(--accent) 0%, transparent 70%)',
        }} />
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-black leading-none tracking-tight mb-5">
            ¿Cuándo fue<br />
            la última vez<br />
            que <span style={{ color: 'var(--accent)' }} className="text-glow">jugaste?</span>
          </h2>
          <p className="text-lg mb-10" style={{ color: 'var(--text2)' }}>
            Tu próximo partido está a un tap de distancia.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/auth?mode=signup" className="btn-primary px-10 py-4 text-base w-full sm:w-auto text-center">
              Jugá hoy gratis →
            </Link>
            <Link href="/juegos" className="px-10 py-4 rounded-2xl text-base font-semibold w-full sm:w-auto text-center transition-all"
              style={{ border: '1px solid var(--border2)', color: 'var(--text2)' }}>
              Ver partidos activos
            </Link>
          </div>
          <p className="mt-5 text-sm" style={{ color: 'var(--text3)' }}>Gratis. Sin tarjeta. En 30 segundos.</p>
        </div>
      </section>
    </div>
  );
}

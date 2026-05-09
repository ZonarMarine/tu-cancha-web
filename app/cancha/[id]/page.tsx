import { COURTS, fmtColones } from "@/lib/data";
import { MapPin, Star, Clock, Users, ArrowLeft, Phone } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default function CanchaPage({ params }: { params: { id: string } }) {
  const court = COURTS.find(c => c.id === Number(params.id));
  if (!court) notFound();

  const slots = [
    { time: '6:00 AM', available: true },
    { time: '7:00 AM', available: false },
    { time: '8:00 AM', available: true },
    { time: '9:00 AM', available: true },
    { time: '5:00 PM', available: false },
    { time: '6:00 PM', available: true },
    { time: '7:00 PM', available: true },
    { time: '8:00 PM', available: false },
    { time: '9:00 PM', available: true },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back */}
      <Link href="/explorar" className="flex items-center gap-2 text-sm mb-6 transition-colors hover:text-white" style={{ color: 'var(--text-secondary)' }}>
        <ArrowLeft size={16} /> Volver a explorar
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero image */}
          <div className="rounded-2xl overflow-hidden h-56 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1a2a00, #0d1a00)' }}>
            <span className="text-7xl">⚽</span>
          </div>

          {/* Title */}
          <div>
            <div className="flex items-start justify-between mb-2">
              <h1 className="text-2xl font-black">{court.title}</h1>
              <div className="flex items-center gap-1" style={{ color: '#FACC15' }}>
                <Star size={16} fill="currentColor" />
                <span className="font-bold">{court.rating}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <MapPin size={14} /> {court.location}
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Deporte', value: court.sport },
              { label: 'Jugadores', value: `${court.includedPlayers} incl.` },
              { label: 'Precio/hora', value: fmtColones(court.basePrice) },
            ].map(item => (
              <div key={item.label} className="p-3 rounded-xl text-center" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                <p className="font-bold text-sm" style={{ color: 'var(--accent)' }}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Available slots */}
          <div>
            <h2 className="font-bold mb-3">Horarios disponibles hoy</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {slots.map(s => (
                <button key={s.time} disabled={!s.available}
                  className="py-2 px-3 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: s.available ? 'var(--accent-dark)' : 'var(--surface)',
                    color: s.available ? 'var(--accent)' : 'var(--text-muted)',
                    border: `1px solid ${s.available ? 'var(--accent)' : 'var(--border)'}`,
                  }}>
                  {s.time}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: booking card */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 rounded-2xl p-5 space-y-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Precio por hora</p>
              <p className="text-2xl font-black" style={{ color: 'var(--accent)' }}>{fmtColones(court.basePrice)}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Incluye {court.includedPlayers} jugadores</p>
            </div>

            <hr style={{ borderColor: 'var(--border)' }} />

            <div className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <div className="flex items-center gap-2"><Clock size={14} /> Reservas por 1h mínimo</div>
              <div className="flex items-center gap-2"><Users size={14} /> Hasta 22 jugadores</div>
              <div className="flex items-center gap-2"><MapPin size={14} /> {court.location}</div>
            </div>

            <Link href="/auth"
              className="block w-full py-3 rounded-xl font-bold text-sm text-center transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--accent)', color: '#000' }}>
              Reservar ahora
            </Link>

            <button className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors hover:text-white"
              style={{ backgroundColor: 'var(--surface-high)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              <Phone size={14} /> Llamar a la cancha
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

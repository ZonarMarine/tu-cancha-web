"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fmtColones } from "@/lib/data";
import { MapPin, Star, Clock, Users, ArrowLeft, Phone, Zap } from "lucide-react";
import Link from "next/link";
import type { Court } from "@/app/explorar/page";

const FIELD_STYLE: Record<string, React.CSSProperties> = {
  Fútbol:  { background: 'linear-gradient(165deg, #1b3d09 0%, #0e2305 45%, #0b1c04 100%)' },
  Pádel:   { background: 'linear-gradient(160deg, #082040 0%, #051428 100%)' },
  Básquet: { background: 'linear-gradient(160deg, #3a1800 0%, #160900 100%)' },
  Tenis:   { background: 'linear-gradient(160deg, #0a2040 0%, #061228 100%)' },
};

function normalise(row: Record<string, any>): Court {
  return {
    id:              row.id,
    title:           row.title   ?? row.name   ?? 'Sin nombre',
    location:        row.location ?? row.zona   ?? '–',
    basePrice:       row.base_price  ?? row.basePrice  ?? row.precio_hora ?? 0,
    includedPlayers: row.included_players ?? row.includedPlayers ?? row.jugadores ?? 10,
    sport:           row.sport   ?? row.deporte ?? 'Fútbol',
    rating:          row.rating  ?? row.calificacion ?? 0,
    tag:             row.tag     ?? null,
    slotsAvailable:  row.slots_available ?? row.slotsAvailable ?? row.slots ?? 0,
    imageUrl:        row.image_url ?? row.imageUrl ?? null,
  };
}

const STATIC_SLOTS = [
  { time: '6:00 AM', available: true  },
  { time: '7:00 AM', available: false },
  { time: '8:00 AM', available: true  },
  { time: '9:00 AM', available: true  },
  { time: '5:00 PM', available: false },
  { time: '6:00 PM', available: true  },
  { time: '7:00 PM', available: true  },
  { time: '8:00 PM', available: false },
  { time: '9:00 PM', available: true  },
];

export default function CanchaPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const [court,   setCourt]  = useState<Court | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const TABLE_CANDIDATES = ['owner_courts', 'courts', 'canchas', 'venues', 'fields', 'court', 'cancha'];
      let found = false;
      for (const table of TABLE_CANDIDATES) {
        const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
        if (!error && data) {
          setCourt(normalise(data));
          found = true;
          break;
        }
      }
      if (!found) setNotFound(true);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100svh' }}>
      <div style={{ width: 26, height: 26, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.07)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );

  if (notFound || !court) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100svh', gap: 16, paddingTop: 64 }}>
      <span style={{ fontSize: 48 }}>🏟</span>
      <p style={{ fontWeight: 800, fontSize: 20 }}>Cancha no encontrada</p>
      <Link href="/explorar" className="btn-primary" style={{ padding: '10px 24px', fontSize: 13, borderRadius: 10 }}>
        Volver a explorar
      </Link>
    </div>
  );

  const fieldStyle = FIELD_STYLE[court.sport] ?? FIELD_STYLE.Fútbol;

  return (
    <div style={{ paddingTop: 64, minHeight: '100svh', background: 'var(--bg)' }}>
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>

      <div className="container" style={{ padding: '32px 40px 72px' }}>

        {/* Back */}
        <Link href="/explorar" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 28,
          fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.38)',
          textDecoration: 'none', transition: 'color 0.15s',
        }}>
          <ArrowLeft size={14} /> Volver a explorar
        </Link>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 28, alignItems: 'start' }} className="cancha-grid">
          <style>{`@media(max-width:860px){.cancha-grid{grid-template-columns:1fr!important;}}`}</style>

          {/* ── Left ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Hero image */}
            <div style={{
              borderRadius: 20, overflow: 'hidden', height: 280, position: 'relative',
              ...(court.imageUrl ? {} : fieldStyle),
            }}>
              {court.imageUrl ? (
                <img src={court.imageUrl} alt={court.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <>
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(to right,rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,0.04) 1px,transparent 1px)`, backgroundSize: '33.33% 50%', opacity: 0.5 }} />
                  {court.sport === 'Fútbol' && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 100, height: 100, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.08)' }} />}
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 52, opacity: 0.14 }}>
                    {court.sport === 'Fútbol' ? '⚽' : court.sport === 'Pádel' ? '🎾' : '🏀'}
                  </div>
                </>
              )}
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(0,0,0,0.5) 100%)' }} />
            </div>

            {/* Title + meta */}
            <div style={{
              padding: '24px', borderRadius: 18,
              background: 'linear-gradient(160deg, #161616, #111111)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 12 }}>
                <h1 style={{ fontWeight: 900, fontSize: 26, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                  {court.title}
                </h1>
                {court.rating > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, color: '#FACC15' }}>
                    <Star size={16} fill="currentColor" />
                    <span style={{ fontWeight: 800, fontSize: 16 }}>{court.rating}</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.38)', marginBottom: 20 }}>
                <MapPin size={12} /> {court.location}
              </div>

              {/* Info chips */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { label: court.sport,                          icon: '🏟' },
                  { label: `${court.includedPlayers} jugadores`, icon: '👥' },
                  { label: `${court.slotsAvailable} slots hoy`,  icon: '📅' },
                ].map(chip => (
                  <span key={chip.label} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 12, fontWeight: 600, padding: '6px 13px', borderRadius: 99,
                    background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    {chip.icon} {chip.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Time slots */}
            <div style={{ padding: '24px', borderRadius: 18, background: 'linear-gradient(160deg, #161616, #111111)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 16 }}>
                Horarios disponibles hoy
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 8 }}>
                {STATIC_SLOTS.map(s => (
                  <button key={s.time} disabled={!s.available} style={{
                    padding: '9px 8px', borderRadius: 11, fontSize: 12, fontWeight: 600,
                    cursor: s.available ? 'pointer' : 'not-allowed', opacity: s.available ? 1 : 0.35,
                    background: s.available ? 'rgba(215,255,0,0.08)' : 'rgba(255,255,255,0.03)',
                    color: s.available ? 'var(--accent)' : 'rgba(255,255,255,0.3)',
                    border: `1px solid ${s.available ? 'rgba(215,255,0,0.2)' : 'rgba(255,255,255,0.06)'}`,
                    transition: 'background 0.15s, border-color 0.15s',
                  }}>
                    {s.time}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: booking card ── */}
          <div style={{ position: 'sticky', top: 80 }}>
            <div style={{
              borderRadius: 20, padding: '24px',
              background: 'linear-gradient(160deg, #181818, #131313)',
              border: '1px solid rgba(255,255,255,0.09)',
              boxShadow: '0 2px 0 rgba(255,255,255,0.04) inset, 0 16px 48px rgba(0,0,0,0.4)',
            }}>
              {/* Price */}
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 8 }}>
                  Precio por hora
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontWeight: 900, fontSize: 32, color: 'var(--accent)', letterSpacing: '-0.03em' }}>
                    {fmtColones(court.basePrice)}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                  Incluye {court.includedPlayers} jugadores
                </p>
              </div>

              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 20 }} />

              {/* Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                {[
                  { icon: <Clock size={13} />,  text: 'Reservas por 1h mínimo' },
                  { icon: <Users size={13} />,  text: `Hasta 22 jugadores` },
                  { icon: <MapPin size={13} />, text: court.location },
                ].map(r => (
                  <div key={r.text} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'rgba(255,255,255,0.38)' }}>
                    <span style={{ color: 'rgba(255,255,255,0.22)', flexShrink: 0 }}>{r.icon}</span> {r.text}
                  </div>
                ))}
              </div>

              <Link href="/auth" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                width: '100%', padding: '14px', borderRadius: 13,
                background: 'var(--accent)', color: '#000',
                fontWeight: 800, fontSize: 14, letterSpacing: '-0.01em',
                textDecoration: 'none', marginBottom: 10,
                boxShadow: '0 0 24px rgba(215,255,0,0.25)',
              }}>
                <Zap size={14} fill="#000" /> Reservar ahora
              </Link>

              <button style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                width: '100%', padding: '12px', borderRadius: 13,
                background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)',
                fontWeight: 600, fontSize: 13, cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.07)',
                transition: 'color 0.15s, background 0.15s',
              }}>
                <Phone size={13} /> Llamar a la cancha
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

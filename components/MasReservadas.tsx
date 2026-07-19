"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Star, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fmtColones } from "@/lib/data";
import { useSport, SPORT_THEME } from "@/context/SportContext";

/* ─── types ─────────────────────────────────────────────────── */

type Court = {
  id:        string | number;
  title:     string;
  location:  string;
  basePrice: number;
  sport:     string;
  rating:    number;
  tag:       string | null;
  slots:     string[];
  imageUrl:  string | null;
};

type CourtLive = Court & {
  bookingsToday: number;
  slotsLeft:     number | null; // null when no slots schedule defined
};

/* ─── field preview (CSS-drawn courts) ─────────────────────── */

function FieldPreview({ sport, tag }: { sport: string; tag: string | null }) {
  const isPadel  = sport === 'Pádel';
  const isFutsal = sport === 'Fútsal';
  const lineColor = 'rgba(255,255,255,0.28)';

  if (isPadel) {
    return (
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, #0d1f3a 0%, #0a1828 100%)',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: '14px 20px', border: '1.5px solid rgba(255,255,255,0.30)', borderRadius: 2 }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '20%',  width: 1.5, background: 'rgba(255,255,255,0.22)' }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, right: '20%', width: 1.5, background: 'rgba(255,255,255,0.22)' }} />
          <div style={{ position: 'absolute', top: '50%', left: '20%', right: '20%', height: 1.5, background: 'rgba(255,255,255,0.22)' }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 2, background: 'rgba(255,255,255,0.50)', boxShadow: '0 0 6px rgba(255,255,255,0.20)' }} />
        </div>
        <div style={{ position: 'absolute', inset: '14px 20px', boxShadow: 'inset 0 0 20px rgba(100,160,255,0.06)', borderRadius: 2, pointerEvents: 'none' }} />
        {tag && (
          <div style={{ position: 'absolute', bottom: 14, left: 14, zIndex: 2, fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: 'rgba(96,165,250,0.15)', color: '#60A5FA', border: '1px solid rgba(96,165,250,0.22)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{tag}</div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: isFutsal ? 'linear-gradient(160deg, #0a1f0a 0%, #061406 100%)' : 'linear-gradient(160deg, #0b200b 0%, #071507 100%)',
      overflow: 'hidden',
    }}>
      {[0,1,2,3,4,5].map(i => (
        <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: `${i * 16.67}%`, width: '16.67%', background: i % 2 === 0 ? 'rgba(255,255,255,0.012)' : 'transparent' }} />
      ))}
      <div style={{ position: 'absolute', inset: '12px 18px', border: `1.5px solid ${lineColor}`, borderRadius: 2 }}>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1.5, background: lineColor }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: 56, height: 56, borderRadius: '50%', border: `1.5px solid ${lineColor}`, transform: 'translate(-50%, -50%)' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: 5, height: 5, borderRadius: '50%', background: lineColor, transform: 'translate(-50%, -50%)' }} />
        <div style={{ position: 'absolute', top: '28%', left: 0, width: 38, height: '44%', border: `1.5px solid ${lineColor}`, borderLeft: 'none' }} />
        <div style={{ position: 'absolute', top: '38%', left: 0, width: 16, height: '24%', border: `1.5px solid ${lineColor}`, borderLeft: 'none' }} />
        <div style={{ position: 'absolute', top: '28%', right: 0, width: 38, height: '44%', border: `1.5px solid ${lineColor}`, borderRight: 'none' }} />
        <div style={{ position: 'absolute', top: '38%', right: 0, width: 16, height: '24%', border: `1.5px solid ${lineColor}`, borderRight: 'none' }} />
      </div>
      <div style={{ position: 'absolute', top: '-30%', left: '50%', transform: 'translateX(-50%)', width: '120%', height: '80%', background: 'radial-gradient(ellipse, rgba(59, 130, 246,0.04) 0%, transparent 65%)', pointerEvents: 'none' }} />
      {tag && (
        <div style={{ position: 'absolute', bottom: 14, left: 14, zIndex: 2, fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: 'rgba(59, 130, 246,0.10)', color: 'rgba(59, 130, 246,0.70)', border: '1px solid rgba(59, 130, 246,0.18)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{tag}</div>
      )}
    </div>
  );
}

/* ─── skeleton ───────────────────────────────────────────────── */

function CardSkeleton() {
  return (
    <div style={{ borderRadius: 20, overflow: 'hidden', width: 300, flexShrink: 0, background: 'linear-gradient(155deg, #101000 0%, #0c0c0c 100%)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ height: 178, background: 'rgba(255,255,255,0.02)', animation: 'masSkPulse 1.8s ease-in-out infinite' }} />
      <div style={{ padding: '18px 20px 20px' }}>
        <div style={{ height: 14, width: '58%', borderRadius: 6, background: 'rgba(255,255,255,0.045)', marginBottom: 8, animation: 'masSkPulse 1.8s ease-in-out infinite' }} />
        <div style={{ height: 11, width: '38%', borderRadius: 6, background: 'rgba(255,255,255,0.028)', marginBottom: 18, animation: 'masSkPulse 1.8s ease-in-out infinite' }} />
        <div style={{ height: 11, width: '24%', borderRadius: 6, background: 'rgba(255,255,255,0.028)', animation: 'masSkPulse 1.8s ease-in-out infinite' }} />
      </div>
    </div>
  );
}

/* ─── MasReservadas ──────────────────────────────────────────── */

export default function MasReservadas() {
  const { sport }         = useSport();
  const t                 = SPORT_THEME[sport];
  const [courts,  setCourts]  = useState<CourtLive[]>([]);
  const [loading, setLoading] = useState(true);

  /* Sport → DB sport values */
  const sportValues = sport === "futbol"
    ? ["Fútbol", "Fútsal", "futbol"]
    : ["Pádel", "padel"];

  const load = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];

    const [courtsRes, bookingsRes] = await Promise.all([
      supabase.from('owner_courts').select('id, name, location, base_price, sport, rating, tag, slots, image_url').eq('active', true).is('deleted_at', null).in('sport', sport === 'futbol' ? ['Fútbol','Fútsal','futbol'] : ['Pádel','padel','Padel']).limit(9),
      supabase.from('bookings').select('court_name').in('status', ['confirmed', 'paid', 'completed']).eq('date', today),
    ]);

    const rawCourts   = courtsRes.data  ?? [];
    const todayBkgs   = bookingsRes.data ?? [];

    /* Build bookings-per-court map */
    const bMap: Record<string, number> = {};
    for (const b of todayBkgs) {
      if (b.court_name) bMap[b.court_name] = (bMap[b.court_name] ?? 0) + 1;
    }

    /* Attach live data */
    const live: CourtLive[] = rawCourts.map(r => {
      const slots        = Array.isArray(r.slots) ? r.slots as string[] : [];
      const bookingsToday = bMap[r.name] ?? 0;
      const totalSlots   = slots.length > 0 ? slots.length : null;
      const slotsLeft    = totalSlots !== null ? Math.max(0, totalSlots - bookingsToday) : null;
      return {
        id:           r.id,
        title:        r.name ?? 'Sin nombre',
        location:     r.location ?? '–',
        basePrice:    r.base_price ?? 0,
        sport:        r.sport ?? 'Fútbol',
        rating:       r.rating ?? 0,
        tag:          r.tag ?? null,
        slots,
        imageUrl:     r.image_url ?? null,
        bookingsToday,
        slotsLeft,
      };
    });

    /* Sort: most booked today → highest rated */
    live.sort((a, b) => b.bookingsToday - a.bookingsToday || b.rating - a.rating);

    setCourts(live);
    setLoading(false);
  }, []);

  /* Reload when sport changes */
  useEffect(() => { setCourts([]); setLoading(true); load(); }, [sport, load]);

  /* Realtime: re-compute whenever a booking is inserted/updated */
  useEffect(() => {
    const ch = supabase
      .channel('mas-reservadas-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'owner_courts' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load, sport]);

  /* Empty state — no courts at all */
  if (!loading && courts.length === 0) return null;

  /* Check if any court has real booking data */
  const hasAnyBookings = courts.some(c => c.bookingsToday > 0);

  return (
    <>
      <style>{`
        @keyframes masSkPulse { 0%,100%{opacity:1;} 50%{opacity:0.40;} }
        @keyframes slotPulse  { 0%,100%{opacity:1;} 50%{opacity:0.45;} }
        .scroll-row { scrollbar-width:none; -ms-overflow-style:none; }
        .scroll-row::-webkit-scrollbar { display:none; }
      `}</style>

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 48 }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: t.accentMuted, textTransform: 'uppercase', marginBottom: 14 }}>CANCHAS DE {sport === 'futbol' ? 'FÚTBOL' : 'PÁDEL'}</p>
          <h2 style={{ fontSize: 'clamp(26px, 3vw, 38px)', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 10 }}>
            {hasAnyBookings ? 'Las más reservadas.' : 'Canchas disponibles.'}
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text3)' }}>
            {hasAnyBookings ? 'Asegurá tu horario antes de que se llene.' : 'Reservá tu horario hoy.'}
          </p>
        </div>
        <Link href="/explorar" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text3)', fontWeight: 500, whiteSpace: 'nowrap', opacity: 0.8 }}>
          Ver todas <ChevronRight size={13} />
        </Link>
      </div>

      {/* Cards */}
      <div className="scroll-row" style={{ overflowX: 'auto', marginLeft: -24, marginRight: -24, paddingLeft: 24, paddingRight: 24, WebkitOverflowScrolling: 'touch' as any }}>
        <div style={{ display: 'flex', gap: 18, width: 'max-content', paddingBottom: 8 }}>
          {loading
            ? [1, 2, 3].map(i => <CardSkeleton key={i} />)
            : courts.map(c => {
                const totalSlots = c.slotsLeft !== null ? (c.bookingsToday + c.slotsLeft) : null;
                const fillPct    = totalSlots ? Math.round((c.bookingsToday / totalSlots) * 100) : 0;
                const isHot      = c.slotsLeft !== null && c.slotsLeft <= 2 && (totalSlots ?? 0) > 0;
                const isFilling  = c.slotsLeft !== null && c.slotsLeft <= 4;
                const showBadge  = c.bookingsToday > 0 || (c.slotsLeft !== null && c.slotsLeft <= 3);

                return (
                  <Link key={c.id} href={`/cancha/${c.id}`} style={{
                    display: 'block', borderRadius: 20, overflow: 'hidden', width: 300, flexShrink: 0,
                    background: 'linear-gradient(155deg, #101000 0%, #0c0c0c 100%)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    textDecoration: 'none', color: 'inherit', position: 'relative',
                  }}>
                    {/* Image / field preview */}
                    <div style={{ height: 178, position: 'relative', overflow: 'hidden' }}>
                      {c.imageUrl
                        ? <img src={c.imageUrl} alt={c.title} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.72) contrast(1.18)' }} />
                        : <FieldPreview sport={c.sport} tag={c.tag} />
                      }

                      {/* Live badge — only when real data exists */}
                      {showBadge && (
                        <span style={{
                          position: 'absolute', top: 13, left: 13, zIndex: 3,
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          fontSize: 10, fontWeight: 600, padding: '4px 9px', borderRadius: 7,
                          background: 'rgba(0,0,0,0.65)',
                          color: isHot ? '#FF6B6B' : '#4ADE80',
                          border: `1px solid ${isHot ? 'rgba(255,107,107,0.20)' : 'rgba(74,222,128,0.15)'}`,
                          backdropFilter: 'blur(8px)',
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: isHot ? '#FF6B6B' : '#4ADE80', display: 'inline-block', animation: 'slotPulse 2s ease-in-out infinite' }} />
                          {isHot
                            ? 'Últimos cupos'
                            : c.bookingsToday > 0
                            ? `${c.bookingsToday} reservada${c.bookingsToday !== 1 ? 's' : ''} hoy`
                            : `${c.slotsLeft} horario${(c.slotsLeft ?? 0) !== 1 ? 's' : ''} disponible${(c.slotsLeft ?? 0) !== 1 ? 's' : ''}`
                          }
                        </span>
                      )}

                      {/* Slots right — only when slot count known */}
                      {c.slotsLeft !== null && (
                        <span style={{
                          position: 'absolute', top: 13, right: 13, zIndex: 3,
                          fontSize: 10, fontWeight: 600, padding: '4px 9px', borderRadius: 7,
                          background: 'rgba(0,0,0,0.60)', color: 'rgba(255,255,255,0.50)',
                          backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.06)',
                        }}>
                          {c.slotsLeft} libre{c.slotsLeft !== 1 ? 's' : ''}
                        </span>
                      )}

                      {/* Availability bar — only with real slot data */}
                      {totalSlots !== null && totalSlots > 0 && (
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(0,0,0,0.4)', zIndex: 3 }}>
                          <div style={{
                            height: '100%', width: `${fillPct}%`,
                            background: isHot
                              ? 'linear-gradient(to right, #FF6B6B, #FF8C42)'
                              : isFilling
                              ? 'linear-gradient(to right, rgba(59, 130, 246,0.6), rgba(59, 130, 246,0.9))'
                              : 'rgba(74,222,128,0.7)',
                            transition: 'width 0.6s ease',
                            animation: isHot ? 'slotPulse 2.4s ease-in-out infinite' : undefined,
                          }} />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ padding: '18px 20px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <p style={{ fontWeight: 700, fontSize: 14 }}>{c.title}</p>
                        {c.rating > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0, marginLeft: 8, fontSize: 12, color: '#FACC15', fontWeight: 700 }}>
                            <Star size={9} fill="currentColor" />{c.rating.toFixed(1)}
                          </div>
                        )}
                      </div>
                      <p style={{ fontSize: 11.5, color: 'var(--text3)', marginBottom: 16 }}>📍 {c.location}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontWeight: 900, fontSize: 18, color: 'var(--accent)', letterSpacing: '-0.02em' }}>{fmtColones(c.basePrice)}</span>
                          <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 4 }}>/ hora</span>
                        </div>
                        <span style={{ fontSize: 10.5, padding: '4px 10px', borderRadius: 7, background: 'rgba(255,255,255,0.04)', color: 'var(--text3)', border: '1px solid rgba(255,255,255,0.06)' }}>{c.sport}</span>
                      </div>
                    </div>
                  </Link>
                );
              })
          }
        </div>
      </div>
    </>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fmtColones } from "@/lib/data";
import { MapPin, Star, Clock, Users, ArrowLeft, Phone, Zap, X, Check, Loader2, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Court } from "@/app/explorar/page";

/* ─── constants ──────────────────────────────────────────── */

const FIELD_STYLE: Record<string, React.CSSProperties> = {
  Fútbol:  { background: 'linear-gradient(165deg, #1b3d09 0%, #0e2305 45%, #0b1c04 100%)' },
  Pádel:   { background: 'linear-gradient(160deg, #082040 0%, #051428 100%)' },
  Básquet: { background: 'linear-gradient(160deg, #3a1800 0%, #160900 100%)' },
  Tenis:   { background: 'linear-gradient(160deg, #0a2040 0%, #061228 100%)' },
};

const TIME_SLOTS = ['6:00 AM','7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM',
  '12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM',
  '6:00 PM','7:00 PM','8:00 PM','9:00 PM'];

const DAYS_ES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

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
    imageUrl:        row.image_url ?? row.imageUrl ?? row.photo_url ?? row.photo
                  ?? row.cover_image ?? row.cover_url ?? row.thumbnail_url ?? row.thumbnail
                  ?? row.picture_url ?? row.picture ?? row.img_url ?? row.img
                  ?? row.banner_url ?? row.banner ?? row.media_url
                  ?? (Array.isArray(row.photos) ? row.photos[0] : row.photos)
                  ?? (Array.isArray(row.images) ? row.images[0] : row.images)
                  ?? null,
  };
}

/* ─── BookingModal ───────────────────────────────────────── */

function BookingModal({ court, user, onClose }: {
  court: Court;
  user: any;
  onClose: () => void;
}) {
  const router = useRouter();

  /* Calendar */
  const today = new Date();
  const [viewDate,   setViewDate]   = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  /* Booking options */
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [hours,        setHours]        = useState(1);
  const [players,      setPlayers]      = useState(court.includedPlayers ?? 10);
  const [step,         setStep]         = useState<'date'|'time'|'confirm'>('date');

  /* Save state */
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const handleClose = () => { setVisible(false); setTimeout(onClose, 220); };

  /* Calendar helpers */
  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDow    = (y: number, m: number) => new Date(y, m, 1).getDay();
  const isBefore = (d: Date) => {
    const t = new Date(); t.setHours(0,0,0,0);
    return d < t;
  };

  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

  const totalPrice = court.basePrice * hours;

  const handleConfirm = async () => {
    if (!selectedDay || !selectedTime) return;
    setSaving(true); setError('');
    try {
      const dateStr = selectedDay.toISOString().split('T')[0];
      const { error: err } = await supabase.from('bookings').insert({
        user_id:     user.id,
        court_id:    court.id,
        court_name:  court.title,
        date:        dateStr,
        time:        selectedTime,
        hours,
        players,
        total_price: totalPrice,
        status:      'pending',
      });
      if (err) throw err;
      setSuccess(true);
    } catch (e: any) {
      setError(e.message ?? 'Error al reservar. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const y = viewDate.getFullYear();
  const m = viewDate.getMonth();
  const blanks = firstDow(y, m);
  const days   = daysInMonth(y, m);

  const inputRow: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '13px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
  };

  return (
    <>
      <style>{`
        @keyframes modal-in { from { opacity:0; transform:translateY(14px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        .bk-day:hover:not(:disabled) { background: rgba(255,255,255,0.08) !important; }
        .slot-btn:hover { border-color: rgba(215,255,0,0.25) !important; }
        .bk-stepper:hover { background: rgba(255,255,255,0.08) !important; }
      `}</style>

      {/* Backdrop */}
      <div onClick={handleClose} style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)',
        opacity: visible ? 1 : 0, transition: 'opacity 0.22s',
      }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', zIndex: 101,
        transform: 'translate(-50%,-50%)',
        width: 'min(520px, calc(100vw - 32px))',
        maxHeight: 'calc(100svh - 48px)',
        overflowY: 'auto',
      }}>
        <div style={{
          animation: 'modal-in 0.26s cubic-bezier(0.34,1.4,0.64,1) both',
          borderRadius: 22,
          background: 'linear-gradient(160deg, #1c1c1c, #141414)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 2px 0 rgba(255,255,255,0.05) inset, 0 32px 80px rgba(0,0,0,0.7)',
          overflow: 'hidden',
        }}>

          {/* Success screen */}
          {success ? (
            <div style={{ padding: '48px 32px', textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: 20, margin: '0 auto 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)',
              }}>
                <Check size={28} color="#4ADE80" />
              </div>
              <p style={{ fontWeight: 900, fontSize: 20, letterSpacing: '-0.02em', marginBottom: 8 }}>
                ¡Reserva enviada!
              </p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 6, lineHeight: 1.6 }}>
                {court.title} · {selectedDay?.toLocaleDateString('es-CR',{day:'numeric',month:'long'})} · {selectedTime}
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 28 }}>
                Estado: <span style={{ color: '#FACC15', fontWeight: 700 }}>Pendiente de confirmación</span>
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleClose} style={{
                  flex: 1, padding: '12px', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>Cerrar</button>
                <Link href="/perfil" style={{
                  flex: 2, padding: '12px', borderRadius: 12, fontSize: 13, fontWeight: 700,
                  background: 'var(--accent)', color: '#000',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  textDecoration: 'none',
                }}>
                  <Calendar size={14} /> Ver mis reservas
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
                <div>
                  <p style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em', marginBottom: 2 }}>Reservar cancha</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{court.title}</p>
                </div>
                <button onClick={handleClose} style={{
                  width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.06)',
                  border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)',
                }}>
                  <X size={15} />
                </button>
              </div>

              {/* Step tabs */}
              <div style={{ display: 'flex', gap: 0, padding: '16px 24px 0' }}>
                {(['date','time','confirm'] as const).map((s, i) => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                    <button
                      onClick={() => { if (s === 'time' && !selectedDay) return; if (s === 'confirm' && (!selectedDay || !selectedTime)) return; setStep(s); }}
                      style={{
                        fontSize: 11, fontWeight: 700, padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: step === s ? 'rgba(215,255,0,0.1)' : 'transparent',
                        color: step === s ? 'var(--accent)' : 'rgba(255,255,255,0.28)',
                        letterSpacing: '0.04em', textTransform: 'uppercase',
                      }}>
                      {i + 1}. {s === 'date' ? 'Fecha' : s === 'time' ? 'Hora' : 'Confirmar'}
                    </button>
                    {i < 2 && <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 11 }}>›</span>}
                  </div>
                ))}
              </div>

              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '16px 0 0' }} />

              <div style={{ padding: '20px 24px 24px' }}>

                {/* ── Step 1: Date ── */}
                {step === 'date' && (
                  <div>
                    {/* Month nav */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                      <button onClick={prevMonth} className="bk-stepper" style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                        <ChevronLeft size={15} />
                      </button>
                      <p style={{ fontWeight: 700, fontSize: 14 }}>{MONTHS_ES[m]} {y}</p>
                      <button onClick={nextMonth} className="bk-stepper" style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                        <ChevronRight size={15} />
                      </button>
                    </div>

                    {/* Day headers */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 6 }}>
                      {DAYS_ES.map(d => (
                        <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.06em', padding: '4px 0' }}>{d}</div>
                      ))}
                    </div>

                    {/* Day grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                      {Array.from({ length: blanks }).map((_, i) => <div key={`b${i}`} />)}
                      {Array.from({ length: days }).map((_, i) => {
                        const d = new Date(y, m, i + 1);
                        const disabled = isBefore(d);
                        const isSelected = selectedDay?.toDateString() === d.toDateString();
                        const isToday = d.toDateString() === today.toDateString();
                        return (
                          <button key={i} disabled={disabled} onClick={() => { setSelectedDay(d); setStep('time'); }}
                            className="bk-day"
                            style={{
                              height: 36, borderRadius: 9, fontSize: 13, fontWeight: isSelected ? 800 : 500,
                              cursor: disabled ? 'default' : 'pointer', border: 'none',
                              background: isSelected ? 'var(--accent)' : isToday ? 'rgba(215,255,0,0.08)' : 'rgba(255,255,255,0.03)',
                              color: isSelected ? '#000' : disabled ? 'rgba(255,255,255,0.15)' : isToday ? 'var(--accent)' : 'rgba(255,255,255,0.7)',
                              outline: isToday && !isSelected ? '1px solid rgba(215,255,0,0.2)' : 'none',
                              transition: 'background 0.15s',
                            }}>
                            {i + 1}
                          </button>
                        );
                      })}
                    </div>

                    {selectedDay && (
                      <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(215,255,0,0.07)', border: '1px solid rgba(215,255,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
                          {selectedDay.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </span>
                        <button onClick={() => setStep('time')} style={{ fontSize: 12, fontWeight: 700, color: '#000', background: 'var(--accent)', border: 'none', borderRadius: 8, padding: '5px 12px', cursor: 'pointer' }}>
                          Continuar →
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Step 2: Time ── */}
                {step === 'time' && (
                  <div>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>
                      {selectedDay?.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
                      {TIME_SLOTS.map(t => {
                        const active = selectedTime === t;
                        return (
                          <button key={t} onClick={() => setSelectedTime(t)} className="slot-btn" style={{
                            padding: '10px 6px', borderRadius: 11, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            background: active ? 'var(--accent)' : 'rgba(255,255,255,0.04)',
                            color: active ? '#000' : 'rgba(255,255,255,0.6)',
                            border: `1px solid ${active ? 'transparent' : 'rgba(255,255,255,0.07)'}`,
                            boxShadow: active ? '0 0 16px rgba(215,255,0,0.2)' : 'none',
                            transition: 'all 0.15s',
                          }}>{t}</button>
                        );
                      })}
                    </div>

                    {/* Hours selector */}
                    <div style={inputRow}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Duración</p>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{fmtColones(court.basePrice)} / hora</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button onClick={() => setHours(h => Math.max(1, h - 1))} className="bk-stepper" style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', fontWeight: 700, fontSize: 16, color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                        <span style={{ fontWeight: 800, fontSize: 16, minWidth: 28, textAlign: 'center' }}>{hours}h</span>
                        <button onClick={() => setHours(h => Math.min(6, h + 1))} className="bk-stepper" style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', fontWeight: 700, fontSize: 16, color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      </div>
                    </div>

                    {/* Players */}
                    <div style={{ ...inputRow, borderBottom: 'none' }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Jugadores</p>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Incluye {court.includedPlayers}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button onClick={() => setPlayers(p => Math.max(2, p - 1))} className="bk-stepper" style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', fontWeight: 700, fontSize: 16, color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                        <span style={{ fontWeight: 800, fontSize: 16, minWidth: 28, textAlign: 'center' }}>{players}</span>
                        <button onClick={() => setPlayers(p => Math.min(22, p + 1))} className="bk-stepper" style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', fontWeight: 700, fontSize: 16, color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      </div>
                    </div>

                    <button
                      disabled={!selectedTime}
                      onClick={() => setStep('confirm')}
                      style={{
                        width: '100%', marginTop: 20, padding: '13px', borderRadius: 12,
                        fontWeight: 700, fontSize: 14, cursor: selectedTime ? 'pointer' : 'default',
                        background: selectedTime ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                        color: selectedTime ? '#000' : 'rgba(255,255,255,0.25)',
                        border: 'none', transition: 'all 0.15s',
                      }}>
                      Continuar →
                    </button>
                  </div>
                )}

                {/* ── Step 3: Confirm ── */}
                {step === 'confirm' && (
                  <div>
                    {/* Summary card */}
                    <div style={{ borderRadius: 14, padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 20 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', marginBottom: 14 }}>
                        Resumen de reserva
                      </p>
                      {[
                        { label: 'Cancha',    val: court.title },
                        { label: 'Ubicación', val: court.location },
                        { label: 'Fecha',     val: selectedDay?.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' }) ?? '' },
                        { label: 'Hora',      val: selectedTime ?? '' },
                        { label: 'Duración',  val: `${hours} hora${hours > 1 ? 's' : ''}` },
                        { label: 'Jugadores', val: String(players) },
                      ].map((r, i, arr) => (
                        <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)' }}>{r.label}</span>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{r.val}</span>
                        </div>
                      ))}
                    </div>

                    {/* Total */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: '14px 16px', borderRadius: 12, background: 'rgba(215,255,0,0.06)', border: '1px solid rgba(215,255,0,0.12)' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>Total</span>
                      <span style={{ fontWeight: 900, fontSize: 22, color: 'var(--accent)', letterSpacing: '-0.02em' }}>
                        {fmtColones(totalPrice)}
                      </span>
                    </div>

                    {error && (
                      <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 14, fontSize: 12, background: 'rgba(255,59,59,0.07)', color: '#FF6B6B', border: '1px solid rgba(255,59,59,0.15)' }}>
                        {error}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => setStep('time')} style={{
                        flex: 1, padding: '13px', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}>← Atrás</button>
                      <button onClick={handleConfirm} disabled={saving} style={{
                        flex: 2, padding: '13px', borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: saving ? 'default' : 'pointer',
                        background: saving ? 'rgba(215,255,0,0.6)' : 'var(--accent)',
                        color: '#000', border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                        letterSpacing: '-0.01em', boxShadow: '0 0 24px rgba(215,255,0,0.2)',
                      }}>
                        {saving ? <><Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> Confirmando…</> : <><Zap size={14} fill="#000" /> Confirmar reserva</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── CanchaPage ─────────────────────────────────────────── */

export default function CanchaPage() {
  const { id }     = useParams<{ id: string }>();
  const router     = useRouter();
  const [court,    setCourt]   = useState<Court | null>(null);
  const [loading,  setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [user,     setUser]    = useState<any>(null);
  const [bookingOpen, setBookingOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    (async () => {
      const TABLE_CANDIDATES = ['owner_courts', 'courts', 'canchas', 'venues', 'fields', 'court', 'cancha'];
      let found = false;
      for (const table of TABLE_CANDIDATES) {
        const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
        if (!error && data) { setCourt(normalise(data)); found = true; break; }
      }
      if (!found) setNotFound(true);
      setLoading(false);
    })();
  }, [id]);

  const handleReservar = () => {
    if (!user) {
      router.push(`/auth?redirect=/cancha/${id}`);
    } else {
      setBookingOpen(true);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100svh' }}>
      <div style={{ width: 26, height: 26, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.07)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );

  if (notFound || !court) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100svh', gap: 16, paddingTop: 64 }}>
      <span style={{ fontSize: 48 }}>🏟</span>
      <p style={{ fontWeight: 800, fontSize: 20 }}>Cancha no encontrada</p>
      <Link href="/explorar" className="btn-primary" style={{ padding: '10px 24px', fontSize: 13, borderRadius: 10 }}>Volver a explorar</Link>
    </div>
  );

  const fieldStyle = FIELD_STYLE[court.sport] ?? FIELD_STYLE.Fútbol;

  return (
    <div style={{ paddingTop: 64, minHeight: '100svh', background: 'var(--bg)' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>

      {bookingOpen && court && user && (
        <BookingModal court={court} user={user} onClose={() => setBookingOpen(false)} />
      )}

      <div className="container" style={{ padding: '32px 40px 72px' }}>

        <Link href="/explorar" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 28, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.38)', textDecoration: 'none' }}>
          <ArrowLeft size={14} /> Volver a explorar
        </Link>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 28, alignItems: 'start' }} className="cancha-grid">
          <style>{`@media(max-width:860px){.cancha-grid{grid-template-columns:1fr!important;}}`}</style>

          {/* ── Left ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Hero */}
            <div style={{ borderRadius: 20, overflow: 'hidden', height: 280, position: 'relative', ...(court.imageUrl ? {} : fieldStyle) }}>
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
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(0,0,0,0.45) 100%)' }} />
            </div>

            {/* Info card */}
            <div style={{ padding: '22px', borderRadius: 18, background: 'linear-gradient(160deg, #161616, #111111)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 12 }}>
                <h1 style={{ fontWeight: 900, fontSize: 24, letterSpacing: '-0.03em', lineHeight: 1.1 }}>{court.title}</h1>
                {court.rating > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, color: '#FACC15' }}>
                    <Star size={15} fill="currentColor" />
                    <span style={{ fontWeight: 800, fontSize: 15 }}>{court.rating}</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.38)', marginBottom: 18 }}>
                <MapPin size={12} /> {court.location}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { label: court.sport,                          icon: '🏟' },
                  { label: `${court.includedPlayers} jugadores`, icon: '👥' },
                  { label: `${court.slotsAvailable} slots hoy`,  icon: '📅' },
                ].map(chip => (
                  <span key={chip.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '6px 13px', borderRadius: 99, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {chip.icon} {chip.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Time slots */}
            <div style={{ padding: '22px', borderRadius: 18, background: 'linear-gradient(160deg, #161616, #111111)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 14 }}>Horarios disponibles hoy</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 8 }}>
                {[
                  { time: '6:00 AM', ok: true }, { time: '7:00 AM', ok: false },
                  { time: '8:00 AM', ok: true }, { time: '9:00 AM', ok: true },
                  { time: '5:00 PM', ok: false },{ time: '6:00 PM', ok: true },
                  { time: '7:00 PM', ok: true }, { time: '8:00 PM', ok: false },
                  { time: '9:00 PM', ok: true },
                ].map(s => (
                  <button key={s.time} disabled={!s.ok} onClick={s.ok ? () => { handleReservar(); } : undefined} style={{
                    padding: '9px 8px', borderRadius: 11, fontSize: 12, fontWeight: 600,
                    cursor: s.ok ? 'pointer' : 'not-allowed', opacity: s.ok ? 1 : 0.35,
                    background: s.ok ? 'rgba(215,255,0,0.08)' : 'rgba(255,255,255,0.03)',
                    color: s.ok ? 'var(--accent)' : 'rgba(255,255,255,0.3)',
                    border: `1px solid ${s.ok ? 'rgba(215,255,0,0.2)' : 'rgba(255,255,255,0.06)'}`,
                    transition: 'background 0.15s',
                  }}>{s.time}</button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: booking card ── */}
          <div style={{ position: 'sticky', top: 80 }}>
            <div style={{ borderRadius: 20, padding: '22px', background: 'linear-gradient(160deg, #181818, #131313)', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 2px 0 rgba(255,255,255,0.04) inset, 0 16px 48px rgba(0,0,0,0.4)' }}>

              <div style={{ marginBottom: 18 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 8 }}>Precio por hora</p>
                <span style={{ fontWeight: 900, fontSize: 30, color: 'var(--accent)', letterSpacing: '-0.03em' }}>{fmtColones(court.basePrice)}</span>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', marginTop: 4 }}>Incluye {court.includedPlayers} jugadores</p>
              </div>

              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 18 }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 22 }}>
                {[
                  { icon: <Clock size={13} />,  text: 'Reservas por 1h mínimo' },
                  { icon: <Users size={13} />,  text: 'Hasta 22 jugadores' },
                  { icon: <MapPin size={13} />, text: court.location },
                ].map(r => (
                  <div key={r.text} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'rgba(255,255,255,0.38)' }}>
                    <span style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>{r.icon}</span> {r.text}
                  </div>
                ))}
              </div>

              <button onClick={handleReservar} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                width: '100%', padding: '14px', borderRadius: 13,
                background: 'var(--accent)', color: '#000',
                fontWeight: 800, fontSize: 14, letterSpacing: '-0.01em',
                border: 'none', cursor: 'pointer', marginBottom: 10,
                boxShadow: '0 0 24px rgba(215,255,0,0.25)',
                transition: 'opacity 0.15s',
              }}>
                <Zap size={14} fill="#000" /> {user ? 'Reservar ahora' : 'Iniciá sesión para reservar'}
              </button>

              <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', padding: '12px', borderRadius: 13, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', fontWeight: 600, fontSize: 13, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.07)' }}>
                <Phone size={13} /> Llamar a la cancha
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fmtColones } from "@/lib/data";
import {
  MapPin, Star, Clock, Users, ArrowLeft, Phone, Zap, X,
  Check, Loader2, Calendar, ChevronLeft, ChevronRight, Shield,
} from "lucide-react";
import Link from "next/link";
import type { Court } from "@/app/explorar/page";

/* ─── constants ─────────────────────────────────────────────── */

const FIELD_BG: Record<string, string> = {
  Fútbol:  'linear-gradient(165deg, #192f08 0%, #0e2005 50%, #091602 100%)',
  Pádel:   'linear-gradient(160deg, #071c38 0%, #040f22 100%)',
  Básquet: 'linear-gradient(160deg, #321200 0%, #140700 100%)',
  Tenis:   'linear-gradient(160deg, #091b38 0%, #050f22 100%)',
};

const TIME_SLOTS = [
  '6:00 AM','7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM',
  '12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM',
  '6:00 PM','7:00 PM','8:00 PM','9:00 PM',
];

const DAYS_ES   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

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

/* ─── BookingModal ───────────────────────────────────────────── */

function BookingModal({ court, user, onClose }: {
  court: Court;
  user: any;
  onClose: () => void;
}) {
  const router = useRouter();
  const today  = new Date();

  const [viewDate,    setViewDate]    = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [hours,   setHours]   = useState(1);
  const [players, setPlayers] = useState(court.includedPlayers ?? 10);
  const [step,    setStep]    = useState<'date'|'time'|'confirm'>('date');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);
  const handleClose = () => { setVisible(false); setTimeout(onClose, 220); };

  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDow    = (y: number, m: number) => new Date(y, m, 1).getDay();
  const isBefore    = (d: Date) => { const t = new Date(); t.setHours(0,0,0,0); return d < t; };

  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

  const totalPrice = court.basePrice * hours;

  const handleConfirm = async () => {
    if (!selectedDay || !selectedTime) return;
    setSaving(true); setError('');
    try {
      const { error: err } = await supabase.from('bookings').insert({
        user_id:     user.id,
        court_id:    court.id,
        court_name:  court.title,
        date:        selectedDay.toISOString().split('T')[0],
        time:        selectedTime,
        hours, players,
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
        @keyframes modal-in { from{opacity:0;transform:translateY(12px) scale(0.97);}to{opacity:1;transform:translateY(0) scale(1);} }
        .bk-day:hover:not(:disabled){background:rgba(255,255,255,0.08)!important;}
        .bk-slot:hover{border-color:rgba(215,255,0,0.22)!important;background:rgba(215,255,0,0.04)!important;}
        .bk-stepper:hover{background:rgba(255,255,255,0.1)!important;}
      `}</style>

      {/* Backdrop */}
      <div onClick={handleClose} style={{
        position:'fixed', inset:0, zIndex:100,
        background:'rgba(0,0,0,0.75)', backdropFilter:'blur(12px)',
        opacity: visible ? 1 : 0, transition:'opacity 0.22s',
      }} />

      {/* Panel — outer positions, inner animates */}
      <div style={{
        position:'fixed', top:'50%', left:'50%', zIndex:101,
        transform:'translate(-50%,-50%)',
        width:'min(520px, calc(100vw - 32px))',
        maxHeight:'calc(100svh - 48px)', overflowY:'auto',
      }}>
        <div style={{
          animation:'modal-in 0.26s cubic-bezier(0.34,1.4,0.64,1) both',
          borderRadius:22,
          background:'linear-gradient(160deg, #1c1c1c, #141414)',
          border:'1px solid rgba(255,255,255,0.1)',
          boxShadow:'0 2px 0 rgba(255,255,255,0.05) inset, 0 32px 80px rgba(0,0,0,0.7)',
          overflow:'hidden',
        }}>
          {success ? (
            <div style={{ padding:'48px 32px', textAlign:'center' }}>
              <div style={{ width:64, height:64, borderRadius:20, margin:'0 auto 20px', display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.22)' }}>
                <Check size={28} color="#4ADE80" />
              </div>
              <p style={{ fontWeight:900, fontSize:20, letterSpacing:'-0.02em', marginBottom:8 }}>¡Reserva enviada!</p>
              <p style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginBottom:6, lineHeight:1.6 }}>
                {court.title} · {selectedDay?.toLocaleDateString('es-CR',{day:'numeric',month:'long'})} · {selectedTime}
              </p>
              <p style={{ fontSize:12, color:'rgba(255,255,255,0.28)', marginBottom:28 }}>
                Estado: <span style={{ color:'#FACC15', fontWeight:700 }}>Pendiente de confirmación</span>
              </p>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={handleClose} style={{ flex:1, padding:'12px', borderRadius:12, fontSize:13, fontWeight:600, cursor:'pointer', background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.45)', border:'1px solid rgba(255,255,255,0.08)' }}>Cerrar</button>
                <Link href="/perfil" style={{ flex:2, padding:'12px', borderRadius:12, fontSize:13, fontWeight:700, background:'var(--accent)', color:'#000', display:'flex', alignItems:'center', justifyContent:'center', gap:6, textDecoration:'none' }}>
                  <Calendar size={14} /> Ver mis reservas
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 24px 0' }}>
                <div>
                  <p style={{ fontWeight:800, fontSize:16, letterSpacing:'-0.02em', marginBottom:2 }}>Reservar cancha</p>
                  <p style={{ fontSize:12, color:'rgba(255,255,255,0.32)' }}>{court.title}</p>
                </div>
                <button onClick={handleClose} style={{ width:32, height:32, borderRadius:10, background:'rgba(255,255,255,0.06)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.45)' }}>
                  <X size={15} />
                </button>
              </div>

              {/* Step tabs */}
              <div style={{ display:'flex', gap:0, padding:'16px 24px 0' }}>
                {(['date','time','confirm'] as const).map((s, i) => (
                  <div key={s} style={{ display:'flex', alignItems:'center' }}>
                    <button
                      onClick={() => { if (s==='time'&&!selectedDay) return; if (s==='confirm'&&(!selectedDay||!selectedTime)) return; setStep(s); }}
                      style={{ fontSize:11, fontWeight:700, padding:'5px 12px', borderRadius:8, border:'none', cursor:'pointer', background: step===s ? 'rgba(215,255,0,0.1)' : 'transparent', color: step===s ? 'var(--accent)' : 'rgba(255,255,255,0.25)', letterSpacing:'0.04em', textTransform:'uppercase' }}>
                      {i+1}. {s==='date'?'Fecha':s==='time'?'Hora':'Confirmar'}
                    </button>
                    {i < 2 && <span style={{ color:'rgba(255,255,255,0.12)', fontSize:11, padding:'0 2px' }}>›</span>}
                  </div>
                ))}
              </div>

              <div style={{ height:1, background:'rgba(255,255,255,0.06)', margin:'14px 0 0' }} />
              <div style={{ padding:'20px 24px 24px' }}>

                {/* Step 1 — Date */}
                {step==='date' && (
                  <div>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                      <button onClick={prevMonth} className="bk-stepper" style={{ width:32, height:32, borderRadius:9, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.45)' }}><ChevronLeft size={15}/></button>
                      <p style={{ fontWeight:700, fontSize:14 }}>{MONTHS_ES[m]} {y}</p>
                      <button onClick={nextMonth} className="bk-stepper" style={{ width:32, height:32, borderRadius:9, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.45)' }}><ChevronRight size={15}/></button>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', marginBottom:4 }}>
                      {DAYS_ES.map(d => <div key={d} style={{ textAlign:'center', fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.22)', letterSpacing:'0.06em', padding:'4px 0' }}>{d}</div>)}
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3 }}>
                      {Array.from({length:blanks}).map((_,i)=><div key={`b${i}`}/>)}
                      {Array.from({length:days}).map((_,i)=>{
                        const d = new Date(y,m,i+1);
                        const disabled = isBefore(d);
                        const isSelected = selectedDay?.toDateString()===d.toDateString();
                        const isToday = d.toDateString()===today.toDateString();
                        return (
                          <button key={i} disabled={disabled} onClick={()=>{setSelectedDay(d);setStep('time');}} className="bk-day"
                            style={{ height:34, borderRadius:8, fontSize:13, fontWeight:isSelected?800:500, cursor:disabled?'default':'pointer', border:'none', background:isSelected?'var(--accent)':isToday?'rgba(215,255,0,0.07)':'rgba(255,255,255,0.03)', color:isSelected?'#000':disabled?'rgba(255,255,255,0.12)':isToday?'var(--accent)':'rgba(255,255,255,0.65)', outline:isToday&&!isSelected?'1px solid rgba(215,255,0,0.18)':'none', transition:'background 0.14s' }}>
                            {i+1}
                          </button>
                        );
                      })}
                    </div>
                    {selectedDay && (
                      <div style={{ marginTop:14, padding:'10px 14px', borderRadius:10, background:'rgba(215,255,0,0.06)', border:'1px solid rgba(215,255,0,0.13)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <span style={{ fontSize:13, color:'var(--accent)', fontWeight:600 }}>{selectedDay.toLocaleDateString('es-CR',{weekday:'long',day:'numeric',month:'long'})}</span>
                        <button onClick={()=>setStep('time')} style={{ fontSize:12, fontWeight:700, color:'#000', background:'var(--accent)', border:'none', borderRadius:8, padding:'5px 12px', cursor:'pointer' }}>Continuar →</button>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 2 — Time */}
                {step==='time' && (
                  <div>
                    <p style={{ fontSize:12, color:'rgba(255,255,255,0.32)', marginBottom:14 }}>
                      {selectedDay?.toLocaleDateString('es-CR',{weekday:'long',day:'numeric',month:'long'})}
                    </p>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:7, marginBottom:18 }}>
                      {TIME_SLOTS.map(t=>{
                        const active = selectedTime===t;
                        return (
                          <button key={t} onClick={()=>setSelectedTime(t)} className="bk-slot" style={{ padding:'9px 4px', borderRadius:10, fontSize:11.5, fontWeight:600, cursor:'pointer', background:active?'var(--accent)':'rgba(255,255,255,0.03)', color:active?'#000':'rgba(255,255,255,0.55)', border:`1px solid ${active?'transparent':'rgba(255,255,255,0.07)'}`, transition:'all 0.13s' }}>{t}</button>
                        );
                      })}
                    </div>
                    <div style={inputRow}>
                      <div>
                        <p style={{ fontSize:13, fontWeight:600, marginBottom:2 }}>Duración</p>
                        <p style={{ fontSize:11, color:'rgba(255,255,255,0.28)' }}>{fmtColones(court.basePrice)} / hora</p>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:11 }}>
                        <button onClick={()=>setHours(h=>Math.max(1,h-1))} className="bk-stepper" style={{ width:30, height:30, borderRadius:8, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', cursor:'pointer', fontWeight:700, fontSize:16, color:'var(--text)', display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                        <span style={{ fontWeight:800, fontSize:15, minWidth:26, textAlign:'center' }}>{hours}h</span>
                        <button onClick={()=>setHours(h=>Math.min(6,h+1))} className="bk-stepper" style={{ width:30, height:30, borderRadius:8, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', cursor:'pointer', fontWeight:700, fontSize:16, color:'var(--text)', display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                      </div>
                    </div>
                    <div style={{...inputRow, borderBottom:'none'}}>
                      <div>
                        <p style={{ fontSize:13, fontWeight:600, marginBottom:2 }}>Jugadores</p>
                        <p style={{ fontSize:11, color:'rgba(255,255,255,0.28)' }}>Incluye {court.includedPlayers}</p>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:11 }}>
                        <button onClick={()=>setPlayers(p=>Math.max(2,p-1))} className="bk-stepper" style={{ width:30, height:30, borderRadius:8, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', cursor:'pointer', fontWeight:700, fontSize:16, color:'var(--text)', display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                        <span style={{ fontWeight:800, fontSize:15, minWidth:26, textAlign:'center' }}>{players}</span>
                        <button onClick={()=>setPlayers(p=>Math.min(22,p+1))} className="bk-stepper" style={{ width:30, height:30, borderRadius:8, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', cursor:'pointer', fontWeight:700, fontSize:16, color:'var(--text)', display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                      </div>
                    </div>
                    <button disabled={!selectedTime} onClick={()=>setStep('confirm')} style={{ width:'100%', marginTop:18, padding:'13px', borderRadius:12, fontWeight:700, fontSize:14, cursor:selectedTime?'pointer':'default', background:selectedTime?'var(--accent)':'rgba(255,255,255,0.05)', color:selectedTime?'#000':'rgba(255,255,255,0.2)', border:'none', transition:'all 0.14s' }}>
                      Continuar →
                    </button>
                  </div>
                )}

                {/* Step 3 — Confirm */}
                {step==='confirm' && (
                  <div>
                    <div style={{ borderRadius:14, padding:'14px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', marginBottom:16 }}>
                      <p style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'rgba(255,255,255,0.25)', textTransform:'uppercase', marginBottom:12 }}>Resumen de reserva</p>
                      {[
                        {label:'Cancha',    val:court.title},
                        {label:'Ubicación', val:court.location},
                        {label:'Fecha',     val:selectedDay?.toLocaleDateString('es-CR',{weekday:'long',day:'numeric',month:'long'})??''},
                        {label:'Hora',      val:selectedTime??''},
                        {label:'Duración',  val:`${hours} hora${hours>1?'s':''}`},
                        {label:'Jugadores', val:String(players)},
                      ].map((r,i,arr)=>(
                        <div key={r.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:i<arr.length-1?'1px solid rgba(255,255,255,0.04)':'none' }}>
                          <span style={{ fontSize:12, color:'rgba(255,255,255,0.35)' }}>{r.label}</span>
                          <span style={{ fontSize:13, fontWeight:600 }}>{r.val}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, padding:'13px 16px', borderRadius:12, background:'rgba(215,255,0,0.05)', border:'1px solid rgba(215,255,0,0.1)' }}>
                      <span style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.5)' }}>Total</span>
                      <span style={{ fontWeight:900, fontSize:22, color:'var(--accent)', letterSpacing:'-0.02em' }}>{fmtColones(totalPrice)}</span>
                    </div>
                    {error && <div style={{ padding:'10px 14px', borderRadius:10, marginBottom:12, fontSize:12, background:'rgba(255,59,59,0.07)', color:'#FF6B6B', border:'1px solid rgba(255,59,59,0.13)' }}>{error}</div>}
                    <div style={{ display:'flex', gap:10 }}>
                      <button onClick={()=>setStep('time')} style={{ flex:1, padding:'13px', borderRadius:12, fontSize:13, fontWeight:600, cursor:'pointer', background:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.45)', border:'1px solid rgba(255,255,255,0.07)' }}>← Atrás</button>
                      <button onClick={handleConfirm} disabled={saving} style={{ flex:2, padding:'13px', borderRadius:12, fontSize:14, fontWeight:800, cursor:saving?'default':'pointer', background:saving?'rgba(215,255,0,0.65)':'var(--accent)', color:'#000', border:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:7, letterSpacing:'-0.01em', boxShadow:'0 0 20px rgba(215,255,0,0.2)' }}>
                        {saving ? <><Loader2 size={14} style={{animation:'spin 0.7s linear infinite'}}/> Confirmando…</> : <><Zap size={14} fill="#000"/> Confirmar reserva</>}
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

/* ─── CanchaPage ─────────────────────────────────────────────── */

export default function CanchaPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const [court,       setCourt]       = useState<Court | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [notFound,    setNotFound]    = useState(false);
  const [user,        setUser]        = useState<any>(null);
  const [bookingOpen, setBookingOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    (async () => {
      const TABLES = ['owner_courts','courts','canchas','venues','fields','court','cancha'];
      let found = false;
      for (const t of TABLES) {
        const { data, error } = await supabase.from(t).select('*').eq('id', id).maybeSingle();
        if (!error && data) { setCourt(normalise(data)); found = true; break; }
      }
      if (!found) setNotFound(true);
      setLoading(false);
    })();
  }, [id]);

  const handleReservar = () => {
    if (!user) router.push(`/auth?redirect=/cancha/${id}`);
    else setBookingOpen(true);
  };

  /* ── Loading ── */
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100svh' }}>
      <div style={{ width:22, height:22, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.06)', borderTopColor:'var(--accent)', animation:'spin 0.7s linear infinite' }}/>
    </div>
  );

  /* ── Not found ── */
  if (notFound || !court) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100svh', gap:12, paddingTop:64 }}>
      <span style={{ fontSize:40 }}>🏟</span>
      <p style={{ fontWeight:800, fontSize:20, letterSpacing:'-0.03em' }}>Cancha no encontrada</p>
      <Link href="/explorar" className="btn-primary" style={{ padding:'8px 20px', fontSize:13, borderRadius:9 }}>Volver a explorar</Link>
    </div>
  );

  const fieldBg    = FIELD_BG[court.sport] ?? FIELD_BG.Fútbol;
  const sportEmoji = court.sport==='Fútbol'?'⚽':court.sport==='Pádel'?'🎾':court.sport==='Básquet'?'🏀':'🎾';

  const PREVIEW_SLOTS = [
    {time:'6:00 AM', ok:true}, {time:'7:00 AM', ok:false},{time:'8:00 AM', ok:true},
    {time:'9:00 AM', ok:true}, {time:'10:00 AM',ok:false},{time:'11:00 AM',ok:true},
    {time:'5:00 PM', ok:false},{time:'6:00 PM', ok:true}, {time:'7:00 PM', ok:true},
    {time:'8:00 PM', ok:false},{time:'9:00 PM', ok:true},
  ];

  /* Shared card surface */
  const card: React.CSSProperties = {
    borderRadius: 14,
    background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, transparent 55%), linear-gradient(160deg, #181818 0%, #121212 100%)',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 1px 0 rgba(255,255,255,0.05) inset, 0 6px 24px rgba(0,0,0,0.4)',
    transition: 'transform 0.24s cubic-bezier(0.34,1.2,0.64,1), box-shadow 0.24s ease',
  };

  return (
    <div style={{ paddingTop:60, minHeight:'100svh', background:'var(--bg)', position:'relative', overflow:'hidden' }}>

      {/* ── Stadium ambient atmosphere ── */}
      <div aria-hidden="true" style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0 }}>
        {/* Top-right: stadium floodlight leak */}
        <div style={{
          position:'absolute', top:'-15%', right:'-8%',
          width:700, height:700, borderRadius:'50%',
          background:'radial-gradient(circle at center, rgba(215,255,0,0.042) 0%, transparent 65%)',
          filter:'blur(2px)',
        }}/>
        {/* Bottom-left: field reflection bounce */}
        <div style={{
          position:'absolute', bottom:'-20%', left:'-12%',
          width:600, height:600, borderRadius:'50%',
          background:'radial-gradient(circle at center, rgba(215,255,0,0.022) 0%, transparent 65%)',
        }}/>
        {/* Center: ultra-subtle lime atmosphere */}
        <div style={{
          position:'absolute', top:'30%', left:'50%',
          transform:'translateX(-50%)',
          width:900, height:400,
          background:'radial-gradient(ellipse at center, rgba(215,255,0,0.012) 0%, transparent 70%)',
        }}/>
      </div>

      <style>{`
        /* ─── TuCancha design system ──────────────────────────
           Opacity hierarchy:
           0.95 = primary heading
           0.55 = card labels / detail labels
           0.28 = secondary / meta
           0.16 = ghost / trust copy
        ──────────────────────────────────────────────────── */

        /* Hero — cinematic zoom + grain */
        .hero-wrap { overflow: hidden; position: relative; }
        .hero-img {
          transition: transform 1s cubic-bezier(0.25,0.46,0.45,0.94);
          filter: contrast(1.12) brightness(0.82) saturate(1.18);
          will-change: transform;
          display: block;
        }
        .hero-wrap:hover .hero-img { transform: scale(1.06); }

        /* Cinematic grain overlay — subtle film texture */
        .hero-wrap::after {
          content: '';
          position: absolute; inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
          opacity: 0.04;
          mix-blend-mode: overlay;
          pointer-events: none;
          border-radius: inherit;
        }

        /* Card lift — single consistent shadow */
        .card-lift { transition: transform 0.26s cubic-bezier(0.34,1.2,0.64,1), box-shadow 0.26s ease; }
        .card-lift:hover {
          transform: translateY(-2px);
          box-shadow: 0 1px 0 rgba(255,255,255,0.06) inset, 0 18px 52px rgba(0,0,0,0.65) !important;
        }

        /* Time slot — breathing pulse on available (subtle life) */
        @keyframes slot-breathe {
          0%, 100% { border-color: rgba(74,222,128,0.14); box-shadow: none; }
          50%       { border-color: rgba(74,222,128,0.26); box-shadow: 0 0 8px rgba(74,222,128,0.08); }
        }
        .slot-p {
          animation: slot-breathe 4.5s ease-in-out infinite;
          transition: background 0.18s, color 0.18s, transform 0.2s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.18s;
        }
        .slot-p:hover:not(:disabled) {
          animation: none;
          background: rgba(74,222,128,0.13) !important;
          border-color: rgba(74,222,128,0.38) !important;
          transform: scale(1.07);
          color: rgba(215,255,215,0.95) !important;
          box-shadow: 0 0 20px rgba(74,222,128,0.2), 0 1px 0 rgba(74,222,128,0.18) inset;
        }

        /* Detail row */
        .detail-row {
          cursor: default;
          transition: background 0.2s ease, border-color 0.2s ease;
        }
        .detail-row:hover {
          background: linear-gradient(130deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.015) 100%) !important;
          border-color: rgba(255,255,255,0.09) !important;
        }

        /* CTA — slow stadium breath */
        .cta-main {
          animation: cta-pulse 4s ease-in-out infinite;
          transition: opacity 0.18s, transform 0.12s;
        }
        .cta-main:hover {
          animation: none;
          opacity: 0.92;
          box-shadow: 0 0 52px rgba(215,255,0,0.5), 0 2px 0 rgba(255,255,255,0.32) inset !important;
        }
        .cta-main:active { transform: scale(0.975); animation: none; }

        /* Phone btn */
        .phone-btn { transition: background 0.18s, border-color 0.18s; }
        .phone-btn:hover {
          background: rgba(255,255,255,0.055) !important;
          border-color: rgba(255,255,255,0.12) !important;
        }

        /* Dot animations */
        .live-dot { animation: pulse-live 2s ease-in-out infinite; }
        .view-dot { animation: pulse-dot 2.5s ease-in-out infinite; }

        /* Breadcrumb */
        .breadcrumb { transition: color 0.18s; }
        .breadcrumb:hover { color: rgba(255,255,255,0.5) !important; }

        /* Section label — TuCancha signature */
        .sec-label {
          font-size: 9px; font-weight: 800;
          letter-spacing: 0.16em;
          color: rgba(255,255,255,0.18);
          text-transform: uppercase;
          display: block;
        }

        /* Emotional badges — no competing borders */
        .badge-active {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 10px; border-radius: 99px;
          background: rgba(74,222,128,0.09);
          font-size: 9.5px; font-weight: 800;
          color: rgba(100,225,120,0.8);
          letter-spacing: 0.07em; text-transform: uppercase;
          user-select: none;
        }
        .badge-warn {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 9px; border-radius: 99px;
          background: rgba(250,204,21,0.07);
          font-size: 9px; font-weight: 800;
          color: rgba(250,204,21,0.55);
          letter-spacing: 0.05em; text-transform: uppercase;
        }

        /* Nav chip (meta) */
        .meta-chip {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 11px; border-radius: 99px;
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.32);
          font-size: 11px; font-weight: 600;
          border: 1px solid rgba(255,255,255,0.055);
        }

        @media (max-width: 880px) { .cancha-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      {bookingOpen && court && user && (
        <BookingModal court={court} user={user} onClose={()=>setBookingOpen(false)}/>
      )}

      {/* ── Page content ── */}
      <div style={{ maxWidth:1280, margin:'0 auto', padding:'32px 32px 80px', position:'relative', zIndex:1 }}>

        {/* Breadcrumb */}
        <Link href="/explorar" className="breadcrumb" style={{
          display:'inline-flex', alignItems:'center', gap:6,
          marginBottom:24, fontSize:12, fontWeight:600,
          color:'rgba(255,255,255,0.22)', textDecoration:'none',
          letterSpacing:'0.01em', transition:'color 0.18s',
        }}>
          <ArrowLeft size={12}/> Explorar canchas
        </Link>

        {/* 8 / 4 grid */}
        <div className="cancha-grid" style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) 300px', gap:24, alignItems:'start' }}>

          {/* ════ LEFT COLUMN ════ */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* ── Cinematic hero ── */}
            <div
              className="hero-wrap card-lift"
              style={{
                ...card,
                borderRadius:16,
                height:220,
                position:'relative',
                background: court.imageUrl ? '#050505' : fieldBg,
                flexShrink:0,
                cursor:'default',
                boxShadow:'0 1px 0 rgba(255,255,255,0.05) inset, 0 12px 48px rgba(0,0,0,0.6)',
              }}
            >
              {court.imageUrl ? (
                <img
                  src={court.imageUrl} alt={court.title}
                  className="hero-img"
                  style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', borderRadius:16 }}
                />
              ) : (
                <>
                  <div style={{ position:'absolute', inset:0, backgroundImage:`linear-gradient(to right,rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,0.03) 1px,transparent 1px)`, backgroundSize:'33.33% 50%', borderRadius:16 }}/>
                  {court.sport==='Fútbol' && (
                    <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:88, height:88, borderRadius:'50%', border:'1.5px solid rgba(255,255,255,0.07)' }}/>
                  )}
                  <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', fontSize:44, opacity:0.1 }}>{sportEmoji}</div>
                </>
              )}

              {/* Cinematic overlays — night football atmosphere */}
              {/* Bottom: deep fade into UI */}
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(5,5,5,0.95) 0%, rgba(5,5,5,0.22) 42%, transparent 100%)', borderRadius:16, pointerEvents:'none' }}/>
              {/* Edge vignette */}
              <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 130% 100% at 50% 50%, transparent 35%, rgba(0,0,0,0.48) 100%)', borderRadius:16, pointerEvents:'none' }}/>
              {/* Stadium floodlight from upper-right — signature TuCancha glow */}
              <div style={{ position:'absolute', top:-20, right:-20, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle, rgba(215,255,0,0.07) 0%, transparent 65%)', pointerEvents:'none' }}/>
              {/* Cool blue-green field bounce from lower-left */}
              <div style={{ position:'absolute', bottom:-10, left:-10, width:160, height:120, borderRadius:'50%', background:'radial-gradient(circle, rgba(74,200,120,0.06) 0%, transparent 70%)', pointerEvents:'none' }}/>

              {/* Sport tag */}
              <div style={{ position:'absolute', top:14, left:14, display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:99, background:'rgba(0,0,0,0.62)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)', border:'1px solid rgba(255,255,255,0.09)', fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.65)', letterSpacing:'0.01em' }}>
                {sportEmoji} {court.sport}
              </div>

              {court.rating > 0 && (
                <div style={{ position:'absolute', top:14, right:14, display:'flex', alignItems:'center', gap:4, padding:'4px 9px', borderRadius:99, background:'rgba(0,0,0,0.62)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)', border:'1px solid rgba(250,204,21,0.18)', fontSize:12, fontWeight:800, color:'#FACC15' }}>
                  <Star size={11} fill="#FACC15" color="#FACC15"/>{court.rating}
                </div>
              )}

              {/* Bottom-left: cancha activa badge */}
              <div style={{ position:'absolute', bottom:14, left:14, display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:99, background:'rgba(0,0,0,0.65)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)', border:'1px solid rgba(74,222,128,0.2)', fontSize:10, fontWeight:800, color:'rgba(100,230,120,0.8)', letterSpacing:'0.05em' }}>
                <span className="live-dot" style={{ width:5, height:5, borderRadius:'50%', background:'rgba(74,222,128,0.8)', display:'inline-block', flexShrink:0 }}/>
                CANCHA ACTIVA
              </div>
            </div>

            {/* ── Title + meta ── */}
            <div className="card-lift" style={{ ...card, padding:'20px 22px' }}>
              {/* Emotional badge row */}
              <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:11, flexWrap:'wrap' }}>
                <span className="badge-active">
                  <span className="live-dot" style={{ width:5, height:5, borderRadius:'50%', background:'rgba(74,222,128,0.8)', display:'inline-block' }}/>
                  Disponible esta noche
                </span>
                <span className="badge-warn">⚡ Se llena rápido</span>
              </div>

              <h1 style={{ fontWeight:900, fontSize:27, letterSpacing:'-0.046em', lineHeight:1.04, marginBottom:6, color:'rgba(255,255,255,0.95)' }}>
                {court.title}
              </h1>
              <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'rgba(255,255,255,0.28)', marginBottom:16, letterSpacing:'0.005em', lineHeight:1.5 }}>
                <MapPin size={11} style={{ flexShrink:0 }}/>{court.location}
              </div>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                {[
                  {icon:<Users size={11}/>,    text:`${court.includedPlayers} jugadores`},
                  {icon:<Clock size={11}/>,    text:'Desde 1 hora'},
                  {icon:<Calendar size={11}/>, text:`${court.slotsAvailable} slots hoy`},
                  {icon:<span style={{fontSize:10}}>⚽</span>, text:'Ideal para mejengas'},
                ].map(c=>(
                  <span key={String(c.text)} className="meta-chip">
                    <span style={{ color:'rgba(255,255,255,0.2)', display:'flex' }}>{c.icon}</span>
                    {c.text}
                  </span>
                ))}
              </div>
            </div>

            {/* ── Time slots ── */}
            <div className="card-lift" style={{ ...card, padding:'16px 20px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <p className="sec-label" style={{ margin:0 }}>Horarios disponibles hoy</p>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:9.5, color:'rgba(255,255,255,0.2)', fontWeight:600, letterSpacing:'0.04em', textTransform:'uppercase' }}>
                    <span style={{ width:5, height:5, borderRadius:'50%', background:'rgba(74,222,128,0.6)', display:'inline-block' }}/>libre
                  </span>
                  <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:9.5, color:'rgba(255,255,255,0.2)', fontWeight:600, letterSpacing:'0.04em', textTransform:'uppercase' }}>
                    <span style={{ width:5, height:5, borderRadius:'50%', background:'rgba(255,255,255,0.14)', display:'inline-block' }}/>ocupado
                  </span>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:5 }}>
                {PREVIEW_SLOTS.map(s=>(
                  <button
                    key={s.time}
                    disabled={!s.ok}
                    onClick={s.ok ? handleReservar : undefined}
                    className={s.ok ? 'slot-p' : undefined}
                    style={{
                      padding:'6px 3px', borderRadius:8,
                      fontSize:10, fontWeight:600,
                      cursor: s.ok ? 'pointer' : 'not-allowed',
                      border:`1px solid ${s.ok ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.05)'}`,
                      background: s.ok ? 'rgba(74,222,128,0.035)' : 'rgba(255,255,255,0.015)',
                      color: s.ok ? 'rgba(160,240,160,0.65)' : 'rgba(255,255,255,0.15)',
                      opacity: s.ok ? 1 : 0.45,
                      userSelect:'none',
                    }}>
                    {s.time}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Details — Apple Wallet rows ── */}
            <div className="card-lift" style={{ ...card, padding:'16px 20px' }}>
              <p className="sec-label" style={{ marginBottom:12 }}>Detalles del campo</p>
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {[
                  {
                    icon:<Shield size={14}/>,
                    label:'Sin cobro por adelantado',
                    sub:'Pagás directamente en la cancha',
                    accent: 'rgba(74,222,128,0.35)',
                    bg: 'rgba(74,222,128,0.07)',
                  },
                  {
                    icon:<Users size={14}/>,
                    label:`Hasta ${court.includedPlayers} jugadores incluidos`,
                    sub:'Configurá el equipo al reservar',
                    accent: 'rgba(147,197,253,0.35)',
                    bg: 'rgba(59,130,246,0.07)',
                  },
                  {
                    icon:<Clock size={14}/>,
                    label:`${fmtColones(court.basePrice)} por hora`,
                    sub:'Mínimo 1h · hasta 6h seguidas',
                    accent: 'rgba(215,255,0,0.35)',
                    bg: 'rgba(215,255,0,0.06)',
                  },
                  {
                    icon:<MapPin size={14}/>,
                    label:court.location,
                    sub:'Zona de juego nocturno',
                    accent: 'rgba(251,146,60,0.35)',
                    bg: 'rgba(251,146,60,0.06)',
                  },
                ].map(d=>(
                  <div key={d.label} className="detail-row" style={{
                    display:'flex', alignItems:'center', gap:13, padding:'13px 14px',
                    borderRadius:12,
                    background:'linear-gradient(130deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.008) 100%)',
                    border:'1px solid rgba(255,255,255,0.065)',
                  }}>
                    {/* Icon tile */}
                    <div style={{
                      width:36, height:36, borderRadius:10, flexShrink:0,
                      background: d.bg,
                      border:`1px solid ${d.accent}`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      color: d.accent.replace('0.35','0.85'),
                    }}>
                      {d.icon}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:12.5, fontWeight:700, color:'rgba(255,255,255,0.68)', marginBottom:3, lineHeight:1.25, letterSpacing:'-0.01em' }}>{d.label}</p>
                      <p style={{ fontSize:10.5, color:'rgba(255,255,255,0.28)', lineHeight:1.45 }}>{d.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ════ RIGHT — booking sidebar ════ */}
          <div style={{ position:'sticky', top:76 }}>

            {/* Ambient glow behind card — fills dead right space */}
            <div aria-hidden style={{ position:'absolute', top:'-30%', left:'-40%', width:400, height:500, background:'radial-gradient(ellipse at center, rgba(215,255,0,0.04) 0%, transparent 65%)', pointerEvents:'none', zIndex:0, filter:'blur(10px)' }}/>

            <div style={{
              position:'relative', zIndex:1,
              borderRadius:16,
              background:'linear-gradient(145deg, rgba(255,255,255,0.045) 0%, transparent 40%), linear-gradient(160deg, rgba(22,22,22,0.97) 0%, rgba(12,12,12,0.99) 100%)',
              border:'1px solid rgba(255,255,255,0.11)',
              boxShadow:'0 2px 0 rgba(255,255,255,0.08) inset, 0 24px 72px rgba(0,0,0,0.65), 0 0 0 1px rgba(0,0,0,0.5)',
              backdropFilter:'blur(28px)',
              WebkitBackdropFilter:'blur(28px)',
              overflow:'hidden',
            }}>

              {/* Price hero */}
              <div style={{ padding:'20px 20px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)', position:'relative', overflow:'hidden' }}>
                {/* Lime atmosphere behind price */}
                <div style={{ position:'absolute', top:'-50%', right:'-25%', width:220, height:220, borderRadius:'50%', background:'radial-gradient(circle, rgba(215,255,0,0.09) 0%, transparent 65%)', pointerEvents:'none' }}/>
                <p className="sec-label" style={{ marginBottom:9, position:'relative' }}>Precio por hora</p>
                <div style={{ display:'flex', alignItems:'baseline', gap:6, position:'relative' }}>
                  <span style={{
                    fontWeight:900, fontSize:36,
                    color:'var(--accent)', letterSpacing:'-0.05em', lineHeight:1,
                    textShadow:'0 0 32px rgba(215,255,0,0.28)',
                  }}>
                    {fmtColones(court.basePrice)}
                  </span>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.2)', fontWeight:500 }}>/hr</span>
                </div>
                {/* Thin lime accent line under price */}
                <div style={{ width:40, height:1.5, background:'linear-gradient(90deg, rgba(215,255,0,0.5), transparent)', borderRadius:99, margin:'8px 0 6px' }}/>
                <p style={{ fontSize:11, color:'rgba(255,255,255,0.24)', letterSpacing:'-0.01em' }}>
                  Incluye {court.includedPlayers} jugadores · Por equipo
                </p>
              </div>

              {/* Features */}
              <div style={{ padding:'12px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column', gap:9 }}>
                {[
                  {icon:<Clock size={11}/>,  text:'Mínimo 1 hora de reserva'},
                  {icon:<Users size={11}/>,  text:'Hasta 22 jugadores'},
                  {icon:<MapPin size={11}/>, text:court.location},
                  {icon:<Shield size={11}/>, text:'Pago directo en la cancha'},
                ].map(r=>(
                  <div key={r.text} style={{ display:'flex', alignItems:'center', gap:9 }}>
                    <span style={{ color:'rgba(255,255,255,0.18)', flexShrink:0 }}>{r.icon}</span>
                    <span style={{ fontSize:11.5, color:'rgba(255,255,255,0.28)', fontWeight:500, lineHeight:1.4 }}>{r.text}</span>
                  </div>
                ))}
              </div>

              {/* Availability signal */}
              <div style={{ padding:'10px 20px 0', display:'flex', alignItems:'center', gap:7 }}>
                <span className="view-dot" style={{ width:5.5, height:5.5, borderRadius:'50%', background:'rgba(74,222,128,0.75)', display:'inline-block', flexShrink:0 }}/>
                <span style={{ fontSize:10.5, color:'rgba(255,255,255,0.22)', fontWeight:500, lineHeight:1.4 }}>
                  Disponible para reservar esta noche
                </span>
              </div>

              {/* CTAs */}
              <div style={{ padding:'12px 20px 16px', display:'flex', flexDirection:'column', gap:8 }}>
                <button onClick={handleReservar} className="cta-main" style={{
                  display:'flex', alignItems:'center', justifyContent:'center', gap:7,
                  width:'100%', padding:'14px', borderRadius:12,
                  background:'var(--accent)', color:'#000',
                  fontWeight:900, fontSize:14, letterSpacing:'-0.025em',
                  border:'none', cursor:'pointer',
                  boxShadow:'0 0 26px rgba(215,255,0,0.28), 0 2px 0 rgba(255,255,255,0.3) inset',
                }}>
                  <Zap size={14} fill="#000"/>
                  {user ? 'Reservar ahora' : 'Iniciá sesión para reservar'}
                </button>

                <button className="phone-btn" style={{
                  display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                  width:'100%', padding:'10px', borderRadius:11,
                  background:'rgba(255,255,255,0.03)',
                  color:'rgba(255,255,255,0.3)',
                  fontWeight:600, fontSize:12, cursor:'pointer',
                  border:'1px solid rgba(255,255,255,0.07)',
                  transition:'background 0.16s, border-color 0.16s',
                }}>
                  <Phone size={11}/> Llamar a la cancha
                </button>
              </div>

              {/* Trust footer */}
              <div style={{ padding:'0 20px 16px', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                <Shield size={9} color="rgba(255,255,255,0.14)"/>
                <p style={{ fontSize:10, color:'rgba(255,255,255,0.14)', fontWeight:500 }}>Sin cobro por adelantado · Cancelá gratis</p>
              </div>

            </div>

            {/* Tagline — football culture */}
            <p style={{ marginTop:16, textAlign:'center', fontSize:11, color:'rgba(255,255,255,0.14)', fontWeight:500, letterSpacing:'0.01em', lineHeight:1.6 }}>
              Armá el equipo.<br/>
              <span style={{ color:'rgba(215,255,0,0.32)' }}>Tu cancha los espera.</span>
            </p>

            {/* Tactical field — cinematic atmosphere, not decoration */}
            <div aria-hidden style={{ marginTop:24, display:'flex', justifyContent:'center', opacity:0.016, pointerEvents:'none', userSelect:'none', filter:'blur(0.6px)' }}>
              <svg viewBox="0 0 240 310" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width:248, height:'auto' }}>
                {/* Outer boundary */}
                <rect x="8" y="8" width="224" height="294" stroke="white" strokeWidth="1.5" rx="2"/>
                {/* Halfway line */}
                <line x1="8" y1="155" x2="232" y2="155" stroke="white" strokeWidth="1.5"/>
                {/* Center circle */}
                <circle cx="120" cy="155" r="44" stroke="white" strokeWidth="1.5"/>
                {/* Center dot */}
                <circle cx="120" cy="155" r="2.5" fill="white"/>
                {/* Top penalty box */}
                <rect x="52" y="8" width="136" height="56" stroke="white" strokeWidth="1.5"/>
                {/* Top goal box */}
                <rect x="82" y="8" width="76" height="24" stroke="white" strokeWidth="1.5"/>
                {/* Top penalty arc */}
                <path d="M 85 64 A 35 35 0 0 1 155 64" stroke="white" strokeWidth="1.5" fill="none"/>
                {/* Bottom penalty box */}
                <rect x="52" y="246" width="136" height="56" stroke="white" strokeWidth="1.5"/>
                {/* Bottom goal box */}
                <rect x="82" y="278" width="76" height="24" stroke="white" strokeWidth="1.5"/>
                {/* Bottom penalty arc */}
                <path d="M 155 246 A 35 35 0 0 1 85 246" stroke="white" strokeWidth="1.5" fill="none"/>
              </svg>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

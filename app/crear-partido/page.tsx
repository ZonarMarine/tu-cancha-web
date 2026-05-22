"use client";
import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MapPin, Clock, Users, ChevronRight, Check, Zap, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";

/* ─── constants ──────────────────────────────────────────── */

const FORMATS   = ['5v5', '7v7', '11v11'];
const LEVELS    = ['Principiante', 'Intermedio', 'Avanzado'];
const ZONES     = ['San José', 'Santa Ana', 'Escazú', 'Heredia', 'Alajuela', 'Cartago', 'Desamparados', 'Otro'];
const TIMES     = ['6:00 AM','7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM','6:00 PM','6:30 PM','7:00 PM','7:30 PM','8:00 PM','8:30 PM','9:00 PM','9:30 PM','10:00 PM'];
const DURATIONS = ['1h', '1h 30m', '2h'];

/* ─── helpers ────────────────────────────────────────────── */

function StepLabel({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div style={{
      width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 800,
      background: done  ? 'var(--accent)'               : active ? 'rgba(215,255,0,0.12)' : 'rgba(255,255,255,0.05)',
      border:     done  ? 'none'                         : active ? '1.5px solid rgba(215,255,0,0.35)' : '1.5px solid rgba(255,255,255,0.08)',
      color:      done  ? '#000'                         : active ? 'var(--accent)' : 'rgba(255,255,255,0.22)',
      transition: 'all 0.22s ease',
    }}>
      {done ? <Check size={13} strokeWidth={3} /> : n}
    </div>
  );
}

/* ─── PillGroup ──────────────────────────────────────────── */

function PillGroup<T extends string>({
  options, value, onChange, size = 'md',
}: { options: T[]; value: T | null; onChange: (v: T) => void; size?: 'sm' | 'md' }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {options.map(o => {
        const active = value === o;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            style={{
              padding: size === 'sm' ? '6px 14px' : '9px 20px',
              borderRadius: 99, cursor: 'pointer', border: 'none',
              fontSize: size === 'sm' ? 12 : 13, fontWeight: 700, letterSpacing: '-0.01em',
              background: active ? 'var(--accent)' : 'rgba(255,255,255,0.055)',
              color:      active ? '#000'           : 'rgba(255,255,255,0.42)',
              outline:    active ? 'none'           : '1px solid rgba(255,255,255,0.08)',
              boxShadow:  active ? '0 0 16px rgba(215,255,0,0.16)' : 'none',
              transition: 'all 0.14s ease',
            }}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

/* ─── FieldInput ─────────────────────────────────────────── */

function FieldInput({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', marginBottom: 10 }}>
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px', borderRadius: 13,
  background: 'rgba(255,255,255,0.042)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'rgba(255,255,255,0.88)', fontSize: 14, fontWeight: 500,
  letterSpacing: '-0.01em', outline: 'none',
  transition: 'border-color 0.16s, background 0.16s',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none', cursor: 'pointer',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.28)' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
  paddingRight: 38,
};

/* ─── VenueAutocomplete ──────────────────────────────────── */

type VenueSuggestion = { id: string; name: string; location: string; sport: string; basePrice: number };

function VenueAutocomplete({
  value, onChange, zone, onSelect,
}: {
  value: string;
  onChange: (v: string) => void;
  zone: string;
  onSelect?: (court: VenueSuggestion | null) => void;
}) {
  const [courts,  setCourts]  = useState<VenueSuggestion[]>([]);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  /* Fetch all active courts once (include base_price) */
  useEffect(() => {
    setLoading(true);
    supabase
      .from('owner_courts')
      .select('id, name, location, sport, base_price')
      .eq('active', true)
      .then(({ data }) => {
        setCourts((data ?? []).map((r: any) => ({
          id:        r.id,
          name:      r.name ?? r.title ?? '',
          location:  r.location ?? '',
          sport:     r.sport ?? '',
          basePrice: r.base_price ?? 0,
        })));
        setLoading(false);
      });
  }, []);

  /* Close on outside click */
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  /* Filter logic:
     - Typing a query → match by name (ignore zone — user knows what they want)
     - Input empty   → show zone-relevant courts as smart suggestions */
  const q = value.trim().toLowerCase();
  const filtered = courts.filter(c => {
    if (q) {
      // Active search: name or location match, ignore zone restriction
      return c.name.toLowerCase().includes(q) || c.location.toLowerCase().includes(q);
    }
    // Empty input: show all (zone filter removed — too restrictive)
    return true;
  }).slice(0, 6);

  const showDropdown = open && filtered.length > 0;

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search size={13} style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          color: 'rgba(255,255,255,0.22)', pointerEvents: 'none',
        }} />
        <input
          type="text"
          placeholder="Buscar cancha o complejo…"
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
          style={{ ...inputStyle, paddingLeft: 36 }}
        />
        {loading && (
          <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'rgba(255,255,255,0.20)' }}>
            cargando…
          </span>
        )}
      </div>

      {showDropdown && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          zIndex: 50, borderRadius: 14, overflow: 'hidden',
          background: '#141414',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.70), 0 1px 0 rgba(255,255,255,0.04) inset',
        }}>
          {filtered.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={e => { e.preventDefault(); onChange(c.name); onSelect?.(c); setOpen(false); }}
              style={{
                width: '100%', padding: '11px 14px',
                background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                display: 'flex', alignItems: 'center', gap: 10,
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(215,255,0,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              {/* Sport icon */}
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: c.sport === 'Pádel' ? 'rgba(96,165,250,0.10)' : 'rgba(74,222,128,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13,
              }}>
                {c.sport === 'Pádel' ? '🎾' : '⚽'}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.88)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.name}
                </p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', marginTop: 1 }}>
                  📍 {c.location} · {c.sport}
                </p>
              </div>
              {/* Highlight match */}
              {q && c.name.toLowerCase().startsWith(q) && (
                <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--accent)', flexShrink: 0 }}>
                  MATCH
                </span>
              )}
            </button>
          ))}

          {/* "Use custom" hint at bottom */}
          {value.trim() && !filtered.some(c => c.name.toLowerCase() === value.trim().toLowerCase()) && (
            <div style={{
              padding: '9px 14px',
              background: 'rgba(255,255,255,0.015)',
              borderTop: filtered.length > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>
                Usar "<span style={{ color: 'rgba(255,255,255,0.55)' }}>{value.trim()}</span>" como cancha personalizada
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── CreatePartidoPage ──────────────────────────────────── */

export default function CreatePartidoPage() {
  return (
    <Suspense>
      <CreatePartidoInner />
    </Suspense>
  );
}

function CreatePartidoInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [step,        setStep]        = useState(1);
  const [submitted,   setSubmitted]   = useState(false);
  const [profileLoad, setProfileLoad] = useState(true);

  /* Pre-fill from invite link params */
  const paramVenue   = searchParams.get('venue')   ?? '';
  const paramTime    = searchParams.get('time')    ?? '';
  const paramHours   = searchParams.get('hours')   ?? '1';
  const paramPlayers = searchParams.get('players') ?? '';

  /* Form state — seed from URL params where available */
  const [teamName, setTeamName] = useState('');
  const [format,   setFormat]   = useState<string | null>(null);
  const [level,    setLevel]    = useState<string | null>(null);
  const [zone,     setZone]     = useState('');
  const [venue,    setVenue]    = useState(paramVenue);
  const [date,     setDate]     = useState(() => new Date().toISOString().split('T')[0]);
  const [time,     setTime]     = useState(paramTime);
  const [duration, setDuration] = useState<string>(
    paramHours === '2' ? '2h' : paramHours === '1.5' ? '1h 30m' : '1h'
  );
  const [price,         setPrice]         = useState('');
  const [pricePerHour,  setPricePerHour]  = useState<number | null>(null);
  const [courtFound,    setCourtFound]    = useState(false); // true = official court from DB
  const [note,          setNote]          = useState('');

  /* ── Auto-fill from profile on mount ── */
  useEffect(() => {
    (async () => {
      try {
        /* 1. Restore from localStorage instantly (fast) */
        try {
          const lsTeam   = localStorage.getItem('tc_team_name');
          const lsFormat = localStorage.getItem('tc_team_format');
          const lsLevel  = localStorage.getItem('tc_team_level');
          if (lsTeam)   setTeamName(lsTeam);
          if (lsFormat) setFormat(lsFormat);
          if (lsLevel)  setLevel(lsLevel);
        } catch (_) {}

        /* 2. Override with DB value if logged in — most recent reto team name */
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: lastReto } = await supabase
            .from('retos')
            .select('team_name')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if ((lastReto as any)?.team_name) {
            setTeamName((lastReto as any).team_name);
            try { localStorage.setItem('tc_team_name', (lastReto as any).team_name); } catch (_) {}
          }
        }
      } catch (_) {}
      setProfileLoad(false);
    })();
  }, []);

  /* ── Lookup court whenever venue name changes ── */
  useEffect(() => {
    const name = venue.trim();
    if (!name) { setCourtFound(false); setPricePerHour(null); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('owner_courts')
        .select('base_price')
        .ilike('name', `%${name}%`)
        .eq('active', true)
        .limit(1)
        .maybeSingle();
      if (data) {
        // Court exists in DB — price is the owner's rate, not user-defined
        setCourtFound(true);
        const bp = (data as any)?.base_price;
        if (bp && bp > 0) setPricePerHour(bp);
        else setPricePerHour(null); // owner hasn't set price yet
      } else {
        setCourtFound(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [venue]);

  /* ── Re-scale price whenever per-hour rate or duration changes ── */
  useEffect(() => {
    if (pricePerHour === null) return;
    const hours = duration === '2h' ? 2 : duration === '1h 30m' ? 1.5 : 1;
    setPrice(String(Math.round(pricePerHour * hours)));
  }, [pricePerHour, duration]);

  /* Step gating */
  const step1Ok = teamName.trim().length >= 2 && !!format && !!level;
  // Price is optional when using an official court with no price configured yet
  const step2Ok = !!zone && !!time && (courtFound || price.trim().length > 0);

  function nextStep() { if (step < 3) setStep(s => s + 1); }
  function prevStep() { if (step > 1) setStep(s => s - 1); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const hours = duration === '2h' ? 2 : duration === '1h 30m' ? 1.5 : 1;
      const playersPerTeam = format === '11v11' ? 11 : format === '7v7' ? 7 : 5;
      await supabase.from('retos').insert({
        team_name:  teamName.trim(),
        court_name: venue.trim() || zone,
        location:   zone,
        time,
        date,
        hours,
        players:    playersPerTeam,
        price:      parseInt(price || '0'),
        format,
        level,
        note:       note.trim() || null,
        status:     'open',
        user_id:    session?.user?.id ?? null,
        created_at: new Date().toISOString(),
      });
      /* Persist team name, format, level for next visit */
      try {
        if (teamName.trim()) localStorage.setItem('tc_team_name',   teamName.trim());
        if (format)          localStorage.setItem('tc_team_format', format);
        if (level)           localStorage.setItem('tc_team_level',  level);
      } catch (_) {}
    } catch (_) {
      // Non-blocking — show success regardless (fallback UX)
    }
    setSubmitted(true);
    setTimeout(() => router.push('/juegos'), 3200);
  }

  /* ── Success screen ── */
  if (submitted) {
    return (
      <div style={{ paddingTop: 60, minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg, #090909 0%, #070707 48%, #080807 100%)' }}>
        <div style={{ textAlign: 'center', padding: '0 24px', maxWidth: 420 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 22, margin: '0 auto 24px',
            background: 'rgba(215,255,0,0.10)', border: '1.5px solid rgba(215,255,0,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 36px rgba(215,255,0,0.12)',
          }}>
            <Check size={30} color="var(--accent)" strokeWidth={2.5} />
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 8 }}>
            ¡Reto publicado!
          </h2>
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.36)', lineHeight: 1.6, letterSpacing: '-0.01em' }}>
            Tu partido está live. Los equipos ya lo pueden ver y aceptar el reto.
          </p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.20)', marginTop: 20 }}>
            Volviendo a juegos…
          </p>
        </div>
      </div>
    );
  }

  const STEPS = [
    { n: 1, label: 'Tu equipo'  },
    { n: 2, label: 'Detalles'   },
    { n: 3, label: 'Confirmar'  },
  ];

  return (
    <div style={{ paddingTop: 60, minHeight: '100svh', background: 'linear-gradient(160deg, #090909 0%, #070707 48%, #080807 100%)', position: 'relative' }}>

      <style>{`
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.22); }
        input:focus, textarea:focus, select:focus {
          border-color: rgba(215,255,0,0.28) !important;
          background: rgba(255,255,255,0.058) !important;
          outline: none;
        }
        select option { background: #141414; color: #f2f2f2; }
        .back-btn:hover { color: rgba(255,255,255,0.70) !important; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .step-panel { animation: fadeUp 0.32s ease forwards; }
        @keyframes orb-a { 0%,100%{transform:translate(0,0);} 50%{transform:translate(20px,-12px);} }
        .orb-a { animation: orb-a 14s ease-in-out infinite; }
        @keyframes skeletonPulse { 0%,100%{opacity:0.5;} 50%{opacity:1;} }
      `}</style>

      {/* Ambient */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div className="orb-a" style={{ position: 'absolute', top: '-15%', right: '-8%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(215,255,0,0.018) 0%, transparent 60%)', filter: 'blur(2px)' }} />
      </div>

      <div className="container" style={{ position: 'relative', zIndex: 1, paddingTop: 48, paddingBottom: 96 }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>

          {/* ── Back ── */}
          <button onClick={() => step > 1 ? prevStep() : router.back()} className="back-btn" style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 36,
            fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.30)',
            letterSpacing: '-0.01em', transition: 'color 0.16s',
          }}>
            <ChevronRight size={13} style={{ transform: 'rotate(180deg)' }} />
            {step > 1 ? 'Atrás' : 'Volver a juegos'}
          </button>

          {/* ── Header ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 9,
              background: 'linear-gradient(135deg, rgba(215,255,0,0.14) 0%, rgba(215,255,0,0.05) 100%)',
              border: '1px solid rgba(215,255,0,0.20)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Zap size={14} fill="var(--accent)" color="var(--accent)" />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em' }}>
              Crear partido
            </h1>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.30)', letterSpacing: '-0.01em', marginBottom: 36 }}>
            Publicá tu reto en minutos. Los equipos te encuentran solos.
          </p>

          {/* ── Step indicators ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 40 }}>
            {STEPS.map((s, i) => (
              <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <StepLabel n={s.n} active={step === s.n} done={step > s.n} />
                  <span style={{
                    fontSize: 11.5, fontWeight: 600, letterSpacing: '-0.01em',
                    color: step === s.n ? 'rgba(255,255,255,0.80)' : step > s.n ? 'rgba(215,255,0,0.60)' : 'rgba(255,255,255,0.20)',
                    transition: 'color 0.22s',
                  }}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 1, background: step > s.n ? 'rgba(215,255,0,0.22)' : 'rgba(255,255,255,0.07)', margin: '0 14px', transition: 'background 0.3s' }} />
                )}
              </div>
            ))}
          </div>

          {/* ── Form card ── */}
          <form onSubmit={handleSubmit}>
            <div style={{
              borderRadius: 22,
              background: 'linear-gradient(145deg, rgba(255,255,255,0.026) 0%, transparent 50%), linear-gradient(155deg, #161616 0%, #0e0e0e 60%, #0b0b0b 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 20px 64px rgba(0,0,0,0.55)',
              overflow: 'hidden',
            }}>
              {/* Top accent */}
              <div style={{ height: 2, background: 'linear-gradient(90deg, rgba(215,255,0,0.60) 0%, rgba(215,255,0,0.10) 50%, transparent 100%)' }} />

              <div className="step-panel" key={step} style={{ padding: '32px 32px 28px' }}>

                {/* ════════════════ STEP 1 ════════════════ */}
                {step === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
                    <FieldInput label="Nombre de tu equipo" icon={<Users size={9} color="rgba(215,255,0,0.55)" />}>
                      {profileLoad ? (
                        /* Skeleton while fetching profile */
                        <div style={{
                          ...inputStyle, height: 46, borderRadius: 13,
                          background: 'rgba(255,255,255,0.03)',
                          animation: 'skeletonPulse 1.4s ease-in-out infinite',
                        }} />
                      ) : (
                        /* Always editable — pre-filled when logged in */
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            placeholder="Ej: Los Clavos FC"
                            value={teamName}
                            onChange={e => setTeamName(e.target.value)}
                            maxLength={40}
                            autoFocus={!teamName}
                            style={{
                              ...inputStyle,
                              ...(teamName.trim().length >= 2 ? {
                                borderColor: 'rgba(215,255,0,0.22)',
                                background: 'rgba(215,255,0,0.03)',
                                paddingRight: 36,
                              } : {}),
                            }}
                          />
                          {teamName.trim().length >= 2 && (
                            <Check
                              size={13}
                              color="var(--accent)"
                              strokeWidth={2.5}
                              style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                            />
                          )}
                        </div>
                      )}
                    </FieldInput>

                    <FieldInput label="Formato">
                      <PillGroup options={FORMATS} value={format} onChange={setFormat} />
                    </FieldInput>

                    <FieldInput label="Nivel de juego">
                      <PillGroup options={LEVELS} value={level} onChange={setLevel} size="sm" />
                    </FieldInput>
                  </div>
                )}

                {/* ════════════════ STEP 2 ════════════════ */}
                {step === 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <FieldInput label="Zona" icon={<MapPin size={9} color="rgba(215,255,0,0.55)" />}>
                      <select value={zone} onChange={e => setZone(e.target.value)} style={selectStyle}>
                        <option value="" disabled>Seleccioná la zona</option>
                        {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                      </select>
                    </FieldInput>

                    <FieldInput label="Cancha o complejo" icon={<MapPin size={9} color="rgba(215,255,0,0.35)" />}>
                      <VenueAutocomplete
                        value={venue}
                        onChange={setVenue}
                        zone={zone}
                        onSelect={court => {
                          if (court) {
                            setCourtFound(true);
                            if (court.basePrice > 0) setPricePerHour(court.basePrice);
                            else setPricePerHour(null);
                          }
                        }}
                      />
                    </FieldInput>

                    {/* ── Date picker — next 7 days as pills ── */}
                    <FieldInput label="Fecha" icon={<Clock size={9} color="rgba(215,255,0,0.55)" />}>
                      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                        {Array.from({ length: 7 }, (_, i) => {
                          const d = new Date(); d.setDate(d.getDate() + i);
                          const iso   = d.toISOString().split('T')[0];
                          const label = i === 0 ? 'Hoy' : i === 1 ? 'Mañana'
                            : d.toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric' })
                                .replace('.', '').replace(/^\w/, c => c.toUpperCase());
                          const dayNum = d.getDate();
                          const active = date === iso;
                          return (
                            <button
                              key={iso}
                              type="button"
                              onClick={() => setDate(iso)}
                              style={{
                                flexShrink: 0,
                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                padding: '10px 14px', borderRadius: 13, cursor: 'pointer',
                                minWidth: 58,
                                background: active ? 'rgba(215,255,0,0.10)' : 'rgba(255,255,255,0.04)',
                                border: active ? '1.5px solid rgba(215,255,0,0.35)' : '1px solid rgba(255,255,255,0.08)',
                                color: active ? 'var(--accent)' : 'rgba(255,255,255,0.40)',
                                boxShadow: active ? '0 0 14px rgba(215,255,0,0.08)' : 'none',
                                transition: 'all 0.14s ease',
                              }}
                            >
                              <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1 }}>
                                {dayNum}
                              </span>
                              <span style={{ fontSize: 10, fontWeight: 600, marginTop: 3, letterSpacing: '0.01em' }}>
                                {label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </FieldInput>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <FieldInput label="Hora" icon={<Clock size={9} color="rgba(215,255,0,0.55)" />}>
                        <select value={time} onChange={e => setTime(e.target.value)} style={selectStyle}>
                          <option value="" disabled>Hora</option>
                          {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </FieldInput>

                      <FieldInput label="Precio por equipo (₡)">
                        {courtFound ? (
                          pricePerHour !== null ? (
                            /* ── Official court with price — locked ── */
                            <div style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '14px 18px', borderRadius: 13,
                              background: 'rgba(215,255,0,0.04)',
                              border: '1px solid rgba(215,255,0,0.18)',
                            }}>
                              <div>
                                <p style={{ fontWeight: 900, fontSize: 22, color: 'var(--accent)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                                  ₡{parseInt(price || '0').toLocaleString('es-CR')}
                                </p>
                                <p style={{ fontSize: 10, color: 'rgba(215,255,0,0.50)', marginTop: 4 }}>
                                  ₡{pricePerHour.toLocaleString('es-CR')}/h · cambia con la duración
                                </p>
                              </div>
                              <span style={{
                                fontSize: 9, fontWeight: 800, letterSpacing: '0.06em',
                                padding: '4px 9px', borderRadius: 6,
                                background: 'rgba(215,255,0,0.08)',
                                color: 'rgba(215,255,0,0.55)',
                                border: '1px solid rgba(215,255,0,0.13)',
                              }}>AUTO</span>
                            </div>
                          ) : (
                            /* ── Official court but owner hasn't set price yet ── */
                            <div style={{
                              padding: '13px 16px', borderRadius: 13,
                              background: 'rgba(255,255,255,0.025)',
                              border: '1px solid rgba(255,255,255,0.07)',
                              display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                              <span style={{ fontSize: 13 }}>⏳</span>
                              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', letterSpacing: '-0.01em' }}>
                                El propietario aún no ha configurado el precio de esta cancha.
                              </p>
                            </div>
                          )
                        ) : (
                          /* ── Custom venue — manual entry ── */
                          <div style={{ position: 'relative' }}>
                            <input
                              type="number"
                              placeholder="Ej: 25000"
                              value={price}
                              onChange={e => {
                                const val = e.target.value;
                                setPrice(val);
                                const num = parseFloat(val);
                                if (!isNaN(num) && num > 0) {
                                  const hrs = duration === '2h' ? 2 : duration === '1h 30m' ? 1.5 : 1;
                                  setPricePerHour(Math.round(num / hrs));
                                } else {
                                  setPricePerHour(null);
                                }
                              }}
                              min={0}
                              style={{
                                ...inputStyle,
                                ...(pricePerHour !== null ? {
                                  borderColor: 'rgba(215,255,0,0.18)',
                                  background: 'rgba(215,255,0,0.02)',
                                } : {}),
                              }}
                            />
                            {pricePerHour !== null && (
                              <span style={{
                                position: 'absolute', right: 10, top: '50%',
                                transform: 'translateY(-50%)',
                                fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
                                color: 'rgba(215,255,0,0.45)', pointerEvents: 'none',
                              }}>₡{pricePerHour.toLocaleString('es-CR')}/h</span>
                            )}
                          </div>
                        )}
                        {!courtFound && pricePerHour !== null && (
                          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', marginTop: 5 }}>
                            Se ajusta al cambiar la duración
                          </p>
                        )}
                      </FieldInput>
                    </div>

                    <FieldInput label="Duración" icon={<Clock size={9} color="rgba(215,255,0,0.55)" />}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {DURATIONS.map(d => {
                          const active = duration === d;
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => setDuration(d)}
                              style={{
                                flex: 1, padding: '10px 0', borderRadius: 11, cursor: 'pointer',
                                fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em',
                                background: active ? 'rgba(215,255,0,0.10)' : 'rgba(255,255,255,0.042)',
                                border: active ? '1.5px solid rgba(215,255,0,0.32)' : '1px solid rgba(255,255,255,0.08)',
                                color: active ? 'var(--accent)' : 'rgba(255,255,255,0.40)',
                                boxShadow: active ? '0 0 14px rgba(215,255,0,0.08)' : 'none',
                                transition: 'all 0.14s ease',
                              }}
                            >
                              {d}
                              {d === '1h' && (
                                <span style={{ display: 'block', fontSize: 9, fontWeight: 600, letterSpacing: '0.04em', color: active ? 'rgba(215,255,0,0.55)' : 'rgba(255,255,255,0.18)', marginTop: 2 }}>
                                  ESTÁNDAR
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </FieldInput>

                    <FieldInput label="Nota para los rivales (opcional)">
                      <textarea
                        placeholder="Ej: Jugamos sin contacto fuerte, traé peto oscuro…"
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        maxLength={160}
                        rows={3}
                        style={{
                          ...inputStyle, resize: 'none', lineHeight: 1.55,
                          fontFamily: 'inherit',
                        }}
                      />
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', marginTop: 5, textAlign: 'right' }}>
                        {note.length}/160
                      </p>
                    </FieldInput>
                  </div>
                )}

                {/* ════════════════ STEP 3 ════════════════ */}
                {step === 3 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', color: 'rgba(255,255,255,0.26)', textTransform: 'uppercase', marginBottom: 18 }}>
                      Resumen del partido
                    </p>

                    {/* Summary card */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderRadius: 15, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 26 }}>
                      {[
                        { label: 'Equipo',   value: teamName },
                        { label: 'Formato',  value: `${format} · ${level}` },
                        { label: 'Zona',     value: venue ? `${venue} — ${zone}` : zone },
                        { label: 'Fecha',    value: new Date(date + 'T12:00:00').toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' }) },
                        { label: 'Hora',     value: `${time} · ${duration}` },
                        { label: 'Precio',   value: `₡${parseInt(price || '0').toLocaleString('es-CR')} por equipo` },
                        ...(note ? [{ label: 'Nota', value: note }] : []),
                      ].map((row, i, arr) => (
                        <div key={row.label} style={{
                          display: 'flex', gap: 12, padding: '13px 16px',
                          background: i % 2 === 0 ? 'rgba(255,255,255,0.022)' : 'transparent',
                          borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                        }}>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.30)', minWidth: 60, letterSpacing: '-0.01em' }}>
                            {row.label}
                          </span>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.82)', letterSpacing: '-0.02em', flex: 1 }}>
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Visibility note */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '13px 14px', borderRadius: 12, background: 'rgba(215,255,0,0.045)', border: '1px solid rgba(215,255,0,0.12)', marginBottom: 4 }}>
                      <Zap size={13} color="rgba(215,255,0,0.70)" style={{ flexShrink: 0, marginTop: 1 }} />
                      <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.44)', lineHeight: 1.55, letterSpacing: '-0.01em' }}>
                        Tu reto estará <span style={{ color: 'rgba(215,255,0,0.72)', fontWeight: 700 }}>visible para todos los equipos</span> de la zona inmediatamente.
                      </p>
                    </div>
                  </div>
                )}

              </div>

              {/* ── Footer CTA ── */}
              <div style={{
                padding: '20px 32px 28px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                background: 'rgba(0,0,0,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              }}>
                {/* Step hint */}
                <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.18)', letterSpacing: '-0.01em' }}>
                  Paso {step} de 3
                </p>

                {step < 3 ? (
                  <button
                    type="button"
                    disabled={step === 1 ? !step1Ok : !step2Ok}
                    onClick={nextStep}
                    className="btn-primary"
                    style={{
                      padding: '11px 28px', fontSize: 13.5, borderRadius: 13,
                      letterSpacing: '-0.01em', fontWeight: 800,
                      opacity: (step === 1 ? !step1Ok : !step2Ok) ? 0.38 : 1,
                      cursor: (step === 1 ? !step1Ok : !step2Ok) ? 'not-allowed' : 'pointer',
                      transition: 'opacity 0.18s',
                    }}>
                    Continuar →
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{
                      padding: '12px 32px', fontSize: 14, borderRadius: 13,
                      letterSpacing: '-0.01em', fontWeight: 800,
                      display: 'flex', alignItems: 'center', gap: 8,
                      animation: 'cta-pulse 4s ease-in-out infinite',
                    }}>
                    <Zap size={14} fill="#000" color="#000" />
                    Publicar reto
                  </button>
                )}
              </div>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}

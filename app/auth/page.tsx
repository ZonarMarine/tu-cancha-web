"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, Zap } from "lucide-react";
import Link from "next/link";

const SOCIAL_PROOF = [
  { val: '1,240+', label: 'Jugadores' },
  { val: '320+',   label: 'Partidos este mes' },
  { val: '4.9★',   label: 'Rating promedio' },
];

type Role = 'player' | 'owner';

const ROLES: { id: Role; icon: string; label: string; sub: string }[] = [
  { id: 'player', icon: '⚽', label: 'Jugador',      sub: 'Reservá canchas y encontrá partidos' },
  { id: 'owner',  icon: '🏟️', label: 'Propietario',  sub: 'Publicá y gestioná tus instalaciones' },
];

function AuthForm() {
  const params   = useSearchParams();
  const router   = useRouter();
  const [mode, setMode]         = useState<'login'|'signup'>(params.get('mode') === 'signup' ? 'signup' : 'login');
  const [role, setRole]         = useState<Role>('player');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (mode === 'signup') {
        const { data: signUpData, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name, role } },
        });
        if (err) throw err;

        // Write role into profiles table so portal guards work immediately after confirmation
        if (signUpData.user) {
          await supabase.from('profiles').upsert(
            { id: signUpData.user.id, email, name, role },
            { onConflict: 'id' },
          );
        }

        setSuccess(
          role === 'owner'
            ? '¡Cuenta creada! Revisá tu email para confirmar. Luego ingresá al Portal Propietario.'
            : '¡Cuenta creada! Revisá tu email para confirmar.',
        );
      } else {
        const { data: signInData, error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        // Owners go straight to the owner portal
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', signInData.user?.id ?? '')
          .single();
        if (profile?.role === 'owner') {
          router.replace('/propietario');
        } else {
          router.push('/perfil');
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 16px', borderRadius: 12,
    fontSize: 14, outline: 'none',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.09)',
    color: 'var(--text)',
    transition: 'border-color 0.18s',
  };

  return (
    <div style={{
      minHeight: '100svh',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      paddingTop: 64,
    }} className="auth-grid">

      <style>{`
        @media (max-width: 768px) {
          .auth-grid { grid-template-columns: 1fr !important; }
          .auth-left  { display: none !important; }
        }
        input:focus { border-color: rgba(215,255,0,0.35) !important; }
      `}</style>

      {/* ── Left panel: brand ── */}
      <div className="auth-left" style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(160deg, #0e1f00 0%, #080808 60%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '64px 56px',
      }}>
        {/* Ambient glow */}
        <div style={{
          position: 'absolute', top: '30%', left: '40%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(215,255,0,0.07) 0%, transparent 65%)',
          transform: 'translate(-50%,-50%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 56, textDecoration: 'none' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Zap size={18} fill="#000" color="#000" />
            </div>
            <span style={{ fontWeight: 900, fontSize: 20, letterSpacing: '-0.02em' }}>
              Tu<span style={{ color: 'var(--accent)' }}>Cancha</span>
            </span>
          </Link>

          {/* Headline */}
          <h1 style={{
            fontWeight: 900, fontSize: 'clamp(32px, 3.5vw, 48px)',
            letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 20,
          }}>
            Jugá hoy.<br />
            <span style={{ color: 'var(--accent)' }}>Sin organizar</span><br />
            nada.
          </h1>

          <p style={{ fontSize: 15, color: 'var(--text3)', lineHeight: 1.65, marginBottom: 56, maxWidth: 320 }}>
            El sistema operativo del fútbol amateur en Costa Rica.
          </p>

          {/* Social proof */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {SOCIAL_PROOF.map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{
                  fontWeight: 900, fontSize: 22,
                  letterSpacing: '-0.02em', color: 'var(--accent)',
                  minWidth: 72,
                }}>{s.val}</span>
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px 40px',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Mobile logo */}
          <div className="auth-left" style={{ display: 'none' }} />
          <Link href="/" style={{
            display: 'none', alignItems: 'center', gap: 8,
            marginBottom: 40, textDecoration: 'none',
          }} className="mobile-logo">
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={15} fill="#000" color="#000" />
            </div>
            <span style={{ fontWeight: 900, fontSize: 18 }}>Tu<span style={{ color: 'var(--accent)' }}>Cancha</span></span>
          </Link>

          {/* Header */}
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.02em', marginBottom: 8 }}>
              {mode === 'login' ? 'Bienvenido de vuelta.' : 'Creá tu cuenta.'}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text3)' }}>
              {mode === 'login' ? 'Iniciá sesión para continuar jugando.' : 'Gratis. Sin tarjeta. En 30 segundos.'}
            </p>
          </div>

          {/* Mode toggle */}
          <div style={{
            display: 'flex', gap: 0, marginBottom: 36,
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}>
            {(['login','signup'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setSuccess(''); }}
                style={{
                  padding: '10px 0', marginRight: 28,
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  background: 'none', border: 'none',
                  color: mode === m ? 'var(--text)' : 'var(--text3)',
                  borderBottom: `2px solid ${mode === m ? 'var(--accent)' : 'transparent'}`,
                  marginBottom: -1,
                  transition: 'all 0.18s',
                }}>
                {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* ── Role selector (signup only) ── */}
            {mode === 'signup' && (
              <div style={{ marginBottom: 2 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text3)', marginBottom: 10 }}>
                  SOY UN
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {ROLES.map(r => {
                    const active = role === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRole(r.id)}
                        style={{
                          padding: '14px 12px',
                          borderRadius: 14,
                          border: `1.5px solid ${active ? 'rgba(215,255,0,0.45)' : 'rgba(255,255,255,0.08)'}`,
                          background: active ? 'rgba(215,255,0,0.06)' : 'rgba(255,255,255,0.02)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.16s',
                          outline: 'none',
                          position: 'relative',
                        }}
                      >
                        {/* Selected dot */}
                        {active && (
                          <div style={{
                            position: 'absolute', top: 10, right: 10,
                            width: 8, height: 8, borderRadius: '50%',
                            background: '#D7FF00',
                            boxShadow: '0 0 6px rgba(215,255,0,0.7)',
                          }} />
                        )}
                        <div style={{ fontSize: 22, marginBottom: 6 }}>{r.icon}</div>
                        <div style={{
                          fontSize: 13, fontWeight: 800,
                          color: active ? '#D7FF00' : 'rgba(255,255,255,0.75)',
                          letterSpacing: '-0.01em', marginBottom: 3,
                          transition: 'color 0.16s',
                        }}>
                          {r.label}
                        </div>
                        <div style={{
                          fontSize: 11, color: 'rgba(255,255,255,0.3)',
                          lineHeight: 1.4,
                        }}>
                          {r.sub}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text3)', marginBottom: 8 }}>
                  NOMBRE COMPLETO
                </label>
                <input required value={name} onChange={e => setName(e.target.value)}
                  style={inputStyle} placeholder="Tu nombre" />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text3)', marginBottom: 8 }}>
                EMAIL
              </label>
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                style={inputStyle} placeholder="tu@email.com" />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text3)', marginBottom: 8 }}>
                CONTRASEÑA
              </label>
              <div style={{ position: 'relative' }}>
                <input required type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ ...inputStyle, paddingRight: 44 }}
                  placeholder="••••••••" minLength={6} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text3)', display: 'flex', alignItems: 'center',
                  }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 10, fontSize: 13,
                background: 'rgba(255,59,59,0.07)', color: '#FF6B6B',
                border: '1px solid rgba(255,59,59,0.15)',
              }}>{error}</div>
            )}
            {success && (
              <div style={{
                padding: '10px 14px', borderRadius: 10, fontSize: 13,
                background: 'rgba(215,255,0,0.06)', color: 'var(--accent)',
                border: '1px solid rgba(215,255,0,0.14)',
              }}>{success}</div>
            )}

            <button type="submit" disabled={loading} className="btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: 14, borderRadius: 12, marginTop: 4 }}>
              {loading
                ? 'Cargando...'
                : mode === 'login'
                ? 'Iniciar sesión'
                : role === 'owner'
                ? 'Crear cuenta de propietario'
                : 'Crear cuenta gratis'}
            </button>
          </form>

          <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', marginTop: 28 }}>
            {mode === 'login' ? '¿No tenés cuenta?' : '¿Ya tenés cuenta?'}{' '}
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 12, fontWeight: 600 }}>
              {mode === 'login' ? 'Registrate gratis' : 'Iniciá sesión'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  );
}

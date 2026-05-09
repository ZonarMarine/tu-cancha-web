"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff } from "lucide-react";

function AuthForm() {
  const params   = useSearchParams();
  const router   = useRouter();
  const [mode, setMode]         = useState<'login'|'signup'>(params.get('mode') === 'signup' ? 'signup' : 'login');
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
        const { error: err } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
        if (err) throw err;
        setSuccess('¡Cuenta creada! Revisá tu email para confirmar.');
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        router.push('/perfil');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <p className="text-3xl font-black mb-1">
            <span style={{ color: 'var(--accent)' }}>Tu</span>Cancha
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {mode === 'login' ? 'Iniciá sesión para continuar' : 'Creá tu cuenta gratis'}
          </p>
        </div>

        <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          {/* Toggle */}
          <div className="flex rounded-xl p-1 mb-6" style={{ backgroundColor: 'var(--surface-high)' }}>
            {(['login','signup'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{ backgroundColor: mode === m ? 'var(--accent)' : 'transparent', color: mode === m ? '#000' : 'var(--text-secondary)' }}>
                {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Nombre completo</label>
                <input required value={name} onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none focus:ring-2"
                  style={{ backgroundColor: 'var(--surface-high)', border: '1px solid var(--border)', color: 'var(--text)', '--tw-ring-color': 'var(--accent)' } as any}
                  placeholder="Tu nombre" />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Email</label>
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ backgroundColor: 'var(--surface-high)', border: '1px solid var(--border)', color: 'var(--text)' }}
                placeholder="tu@email.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Contraseña</label>
              <div className="relative">
                <input required type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none pr-12"
                  style={{ backgroundColor: 'var(--surface-high)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  placeholder="••••••••" minLength={6} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error   && <p className="text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: '#1f0000', color: 'var(--red)', border: '1px solid #3f0000' }}>{error}</p>}
            {success && <p className="text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: '#0d1a00', color: 'var(--accent)', border: '1px solid var(--accent-dark)' }}>{success}</p>}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: 'var(--accent)', color: '#000' }}>
              {loading ? 'Cargando...' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>
          </form>
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

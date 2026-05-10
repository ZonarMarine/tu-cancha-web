"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";

const NAV_LINKS = [
  { href: "/explorar", label: "Explorar" },
  { href: "/juegos",   label: "Juegos"   },
];

export default function Navbar() {
  const path   = usePathname();
  const router = useRouter();
  const [open,      setOpen]      = useState(false);
  const [scrolled,  setScrolled]  = useState(false);
  const [user,      setUser]      = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const initials = user?.user_metadata?.name
    ? user.user_metadata.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      height: 64,
      backgroundColor: scrolled ? 'rgba(8,8,8,0.88)' : 'transparent',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
      backdropFilter: scrolled ? 'blur(24px)' : 'none',
      WebkitBackdropFilter: scrolled ? 'blur(24px)' : 'none',
      transition: 'background-color 0.3s ease, border-color 0.3s ease, backdrop-filter 0.3s ease',
    }}>
      <div style={{
        maxWidth: 1280, margin: '0 auto', padding: '0 40px',
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>

        {/* Logo */}
        <Link href="/" style={{
          display: 'flex', alignItems: 'center', gap: 7,
          textDecoration: 'none', flexShrink: 0,
        }}>
          <Zap size={18} fill="var(--accent)" color="var(--accent)" />
          <span style={{ fontWeight: 900, fontSize: 17, letterSpacing: '-0.02em', color: 'var(--text)' }}>
            Tu<span style={{ color: 'var(--accent)' }}>Cancha</span>
          </span>
        </Link>

        {/* Center nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="nav-links">
          <style>{`
            @media (max-width: 768px) { .nav-links { display: none !important; } .nav-auth { display: none !important; } .nav-burger { display: flex !important; } }
            @media (min-width: 769px) { .nav-burger { display: none !important; } }
          `}</style>
          {NAV_LINKS.map(l => (
            <Link key={l.href} href={l.href} style={{
              padding: '6px 14px', borderRadius: 8,
              fontSize: 14, fontWeight: 500,
              color: path === l.href ? 'var(--text)' : 'var(--text3)',
              backgroundColor: path === l.href ? 'rgba(255,255,255,0.06)' : 'transparent',
              textDecoration: 'none',
              transition: 'color 0.18s, background-color 0.18s',
              letterSpacing: '-0.01em',
            }}>
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right: auth */}
        <div className="nav-auth" style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
          {!authReady ? (
            <div style={{ width: 80, height: 28, borderRadius: 8, backgroundColor: 'var(--surface2)' }} />
          ) : user ? (
            <>
              <Link href="/perfil" style={{
                display: 'flex', alignItems: 'center', gap: 8,
                textDecoration: 'none', fontSize: 14, fontWeight: 500,
                color: 'var(--text3)',
                transition: 'color 0.18s',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  backgroundColor: 'var(--accent)', color: '#000',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800,
                }}>
                  {initials}
                </div>
                Mi perfil
              </Link>
              <button onClick={handleLogout} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 500, color: 'var(--text3)',
                transition: 'color 0.18s',
              }}>
                Salir
              </button>
            </>
          ) : (
            <>
              <Link href="/auth" style={{
                fontSize: 14, fontWeight: 500, color: 'var(--text3)',
                textDecoration: 'none', transition: 'color 0.18s',
                letterSpacing: '-0.01em',
              }}>
                Iniciar sesión
              </Link>
              <Link href="/auth?mode=signup" className="btn-primary"
                style={{ padding: '8px 18px', fontSize: 13, borderRadius: 10 }}>
                Jugá hoy →
              </Link>
            </>
          )}
        </div>

        {/* Mobile burger */}
        <button className="nav-burger" onClick={() => setOpen(!open)} style={{
          display: 'none', background: 'none', border: 'none',
          cursor: 'pointer', color: 'var(--text)', padding: 4,
          alignItems: 'center', justifyContent: 'center',
        }}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div style={{
          backgroundColor: 'rgba(8,8,8,0.98)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '16px 20px 24px',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 16 }}>
            {NAV_LINKS.map(l => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} style={{
                padding: '12px 16px', borderRadius: 10,
                fontSize: 15, fontWeight: 500,
                color: path === l.href ? 'var(--accent)' : 'var(--text2)',
                textDecoration: 'none',
                backgroundColor: path === l.href ? 'var(--accent-dark)' : 'transparent',
              }}>
                {l.label}
              </Link>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {!authReady ? null : user ? (
              <>
                <Link href="/perfil" onClick={() => setOpen(false)} style={{
                  padding: '12px 16px', borderRadius: 10, fontSize: 14, fontWeight: 500,
                  color: 'var(--text2)', border: '1px solid var(--border)', textDecoration: 'none',
                }}>
                  Mi perfil
                </Link>
                <button onClick={() => { handleLogout(); setOpen(false); }} style={{
                  padding: '12px 16px', borderRadius: 10, fontSize: 14, fontWeight: 500,
                  color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                }}>
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <Link href="/auth" onClick={() => setOpen(false)} style={{
                  display: 'block', textAlign: 'center', padding: '12px',
                  borderRadius: 10, fontSize: 14, fontWeight: 500,
                  color: 'var(--text2)', border: '1px solid var(--border)', textDecoration: 'none',
                }}>
                  Iniciar sesión
                </Link>
                <Link href="/auth?mode=signup" onClick={() => setOpen(false)}
                  className="btn-primary" style={{ display: 'block', textAlign: 'center', padding: '13px', borderRadius: 10, fontSize: 14 }}>
                  Jugá hoy →
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

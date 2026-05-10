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
    const onScroll = () => setScrolled(window.scrollY > 8);
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
      height: 60,
      backgroundColor: scrolled ? 'rgba(8,8,8,0.92)' : 'transparent',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : '1px solid transparent',
      backdropFilter: scrolled ? 'blur(28px) saturate(1.8)' : 'none',
      WebkitBackdropFilter: scrolled ? 'blur(28px) saturate(1.8)' : 'none',
      transition: 'background-color 0.25s ease, border-color 0.25s ease, backdrop-filter 0.25s ease',
    }}>
      <style>{`
        /* ── Desktop hide/show ── */
        @media (max-width: 768px) {
          .nav-links { display: none !important; }
          .nav-auth  { display: none !important; }
          .nav-burger { display: flex !important; }
        }
        @media (min-width: 769px) { .nav-burger { display: none !important; } }

        /* ── Nav link base ── */
        .nav-link {
          position: relative;
          padding: 5px 12px;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 500;
          text-decoration: none;
          letter-spacing: -0.01em;
          transition: color 0.16s, background-color 0.16s;
        }
        .nav-link:hover { color: rgba(255,255,255,0.9) !important; }

        /* ── Active indicator — lime underline dot ── */
        .nav-link-active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 50%;
          transform: translateX(-50%);
          width: 18px;
          height: 2px;
          border-radius: 99px;
          background: var(--accent);
          box-shadow: 0 0 6px rgba(215,255,0,0.32);
        }

        /* ── Auth buttons ── */
        .nav-signin:hover { color: rgba(255,255,255,0.8) !important; }
        .nav-profile:hover { color: rgba(255,255,255,0.8) !important; }
        .nav-logout:hover { color: rgba(255,255,255,0.7) !important; }

        /* ── CTA hover ── */
        .nav-cta:hover { opacity: 0.88; }
      `}</style>

      <div style={{
        maxWidth: 1280, margin: '0 auto', padding: '0 32px',
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>

        {/* ── Logo ── */}
        <Link href="/" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          textDecoration: 'none', flexShrink: 0,
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: 'linear-gradient(135deg, rgba(215,255,0,0.15) 0%, rgba(215,255,0,0.06) 100%)',
            border: '1px solid rgba(215,255,0,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 8px rgba(215,255,0,0.08)',
          }}>
            <Zap size={13} fill="var(--accent)" color="var(--accent)" />
          </div>
          <span style={{
            fontWeight: 900, fontSize: 16, letterSpacing: '-0.04em',
            color: 'var(--text)',
          }}>
            Tu<span style={{ color: 'var(--accent)' }}>Cancha</span>
          </span>
        </Link>

        {/* ── Center nav links ── */}
        <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {NAV_LINKS.map(l => {
            const isActive = path === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`nav-link ${isActive ? 'nav-link-active' : ''}`}
                style={{
                  color: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.42)',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                }}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        {/* ── Right: auth ── */}
        <div className="nav-auth" style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          {!authReady ? (
            <div style={{ width: 72, height: 26, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.05)' }} />
          ) : user ? (
            <>
              <Link href="/perfil" className="nav-profile" style={{
                display: 'flex', alignItems: 'center', gap: 8,
                textDecoration: 'none', fontSize: 13.5, fontWeight: 500,
                color: 'rgba(255,255,255,0.42)',
                transition: 'color 0.16s',
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 7,
                  background: 'linear-gradient(135deg, rgba(215,255,0,0.9), rgba(215,255,0,0.7))',
                  color: '#000',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 900, letterSpacing: '0.02em',
                  boxShadow: '0 0 8px rgba(215,255,0,0.12)',
                }}>
                  {initials}
                </div>
                Mi perfil
              </Link>
              <button onClick={handleLogout} className="nav-logout" style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13.5, fontWeight: 500, color: 'rgba(255,255,255,0.3)',
                transition: 'color 0.16s', letterSpacing: '-0.01em',
              }}>
                Salir
              </button>
            </>
          ) : (
            <>
              <Link href="/auth" className="nav-signin" style={{
                fontSize: 13.5, fontWeight: 500,
                color: 'rgba(255,255,255,0.42)',
                textDecoration: 'none', transition: 'color 0.16s',
                letterSpacing: '-0.01em',
              }}>
                Iniciar sesión
              </Link>
              <Link href="/auth?mode=signup" className="nav-cta btn-primary"
                style={{ padding: '7px 16px', fontSize: 12.5, borderRadius: 9, letterSpacing: '-0.01em', transition: 'opacity 0.16s' }}>
                Jugá hoy →
              </Link>
            </>
          )}
        </div>

        {/* ── Mobile burger ── */}
        <button className="nav-burger" onClick={() => setOpen(!open)} style={{
          display: 'none', background: 'none', border: 'none',
          cursor: 'pointer', color: 'rgba(255,255,255,0.7)', padding: 4,
          alignItems: 'center', justifyContent: 'center',
        }}>
          {open ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      {open && (
        <div style={{
          backgroundColor: 'rgba(8,8,8,0.97)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          padding: '14px 20px 22px',
          backdropFilter: 'blur(28px)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 14 }}>
            {NAV_LINKS.map(l => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} style={{
                padding: '11px 14px', borderRadius: 10,
                fontSize: 15, fontWeight: 500,
                color: path === l.href ? 'var(--accent)' : 'rgba(255,255,255,0.55)',
                textDecoration: 'none',
                backgroundColor: path === l.href ? 'rgba(215,255,0,0.06)' : 'transparent',
                borderLeft: path === l.href ? '2px solid rgba(215,255,0,0.4)' : '2px solid transparent',
              }}>
                {l.label}
              </Link>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            {!authReady ? null : user ? (
              <>
                <Link href="/perfil" onClick={() => setOpen(false)} style={{
                  padding: '11px 14px', borderRadius: 10, fontSize: 14, fontWeight: 500,
                  color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.09)', textDecoration: 'none',
                }}>
                  Mi perfil
                </Link>
                <button onClick={() => { handleLogout(); setOpen(false); }} style={{
                  padding: '11px 14px', borderRadius: 10, fontSize: 14, fontWeight: 500,
                  color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                }}>
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <Link href="/auth" onClick={() => setOpen(false)} style={{
                  display: 'block', textAlign: 'center', padding: '12px',
                  borderRadius: 10, fontSize: 14, fontWeight: 500,
                  color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.09)', textDecoration: 'none',
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

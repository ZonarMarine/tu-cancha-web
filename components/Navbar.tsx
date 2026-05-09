"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, Zap } from "lucide-react";

const links = [
  { href: "/explorar", label: "Explorar" },
  { href: "/juegos",   label: "Juegos" },
];

export default function Navbar() {
  const path = usePathname();
  const [open, setOpen]       = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        backgroundColor: scrolled ? 'rgba(8,8,8,0.92)' : 'transparent',
        borderBottom: scrolled ? '1px solid var(--border)' : 'none',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
      }}>
      <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent)' }}>
            <Zap size={16} fill="#000" color="#000" />
          </div>
          <span className="font-black text-lg tracking-tight" style={{ color: 'var(--text)' }}>
            Tu<span style={{ color: 'var(--accent)' }}>Cancha</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(l => (
            <Link key={l.href} href={l.href}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                color: path === l.href ? 'var(--accent)' : 'var(--text2)',
                backgroundColor: path === l.href ? 'var(--accent-dark)' : 'transparent',
              }}>
              {l.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/auth" className="text-sm font-semibold transition-colors hover:text-white"
            style={{ color: 'var(--text2)' }}>
            Iniciar sesión
          </Link>
          <Link href="/auth?mode=signup" className="btn-primary px-5 py-2.5 text-sm">
            Jugá hoy →
          </Link>
        </div>

        {/* Mobile */}
        <button className="md:hidden p-2" onClick={() => setOpen(!open)}
          style={{ color: 'var(--text)' }}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden px-5 pb-5 pt-2 space-y-1"
          style={{ backgroundColor: 'rgba(8,8,8,0.98)', borderTop: '1px solid var(--border)' }}>
          {links.map(l => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
              className="block px-4 py-3 rounded-xl text-sm font-semibold"
              style={{ color: path === l.href ? 'var(--accent)' : 'var(--text2)' }}>
              {l.label}
            </Link>
          ))}
          <div className="pt-3 space-y-2">
            <Link href="/auth" onClick={() => setOpen(false)}
              className="block text-center py-3 rounded-xl text-sm font-semibold"
              style={{ color: 'var(--text2)', border: '1px solid var(--border)' }}>
              Iniciar sesión
            </Link>
            <Link href="/auth?mode=signup" onClick={() => setOpen(false)}
              className="btn-primary block text-center py-3 text-sm">
              Jugá hoy →
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

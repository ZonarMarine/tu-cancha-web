"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const links = [
  { href: "/",        label: "Inicio" },
  { href: "/explorar", label: "Explorar" },
  { href: "/juegos",  label: "Juegos" },
];

export default function Navbar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-black text-lg tracking-tight">
          <span style={{ color: 'var(--accent)' }}>Tu</span>
          <span style={{ color: 'var(--text)' }}>Cancha</span>
          <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--accent-dark)', color: 'var(--accent)' }}>CR</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium transition-colors"
              style={{ color: path === l.href ? 'var(--accent)' : 'var(--text-secondary)' }}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Desktop auth */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/auth" className="text-sm font-medium transition-colors hover:text-white" style={{ color: 'var(--text-secondary)' }}>
            Iniciar sesión
          </Link>
          <Link
            href="/auth?mode=signup"
            className="text-sm font-bold px-4 py-2 rounded-xl transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--accent)', color: '#000' }}
          >
            Registrarse
          </Link>
        </div>

        {/* Mobile menu button */}
        <button className="md:hidden" onClick={() => setOpen(!open)} style={{ color: 'var(--text)' }}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t px-4 py-4 flex flex-col gap-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
          {links.map(l => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
              className="text-sm font-medium"
              style={{ color: path === l.href ? 'var(--accent)' : 'var(--text-secondary)' }}>
              {l.label}
            </Link>
          ))}
          <hr style={{ borderColor: 'var(--border)' }} />
          <Link href="/auth" onClick={() => setOpen(false)} className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Iniciar sesión</Link>
          <Link href="/auth?mode=signup" onClick={() => setOpen(false)}
            className="text-sm font-bold px-4 py-2 rounded-xl text-center"
            style={{ backgroundColor: 'var(--accent)', color: '#000' }}>
            Registrarse
          </Link>
        </div>
      )}
    </nav>
  );
}

"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function Footer() {
  const path = usePathname();

  // Hide on owner portal, auth page
  if (path.startsWith("/propietario") || path === "/auth") return null;

  return (
    <footer style={{
      borderTop: "1px solid rgba(255,255,255,0.06)",
      padding: "32px 32px 28px",
      marginTop: 0,
      background: "transparent",
    }}>
      <div style={{
        maxWidth: 1280, margin: "0 auto",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 16,
      }}>
        {/* Copyright */}
        <p style={{
          fontSize: 11.5, color: "rgba(255,255,255,0.2)",
          letterSpacing: "-0.01em", margin: 0,
        }}>
          © 2026 TuCancha CR. Todos los derechos reservados.
        </p>

        {/* Links */}
        <div style={{ display: "flex", gap: 20 }}>
          {[
            { href: "/explorar", label: "Explorar" },
            { href: "/juegos",   label: "Juegos"   },
            { href: "/propietario/auth", label: "Portal propietarios" },
          ].map(l => (
            <Link key={l.href} href={l.href} style={{
              fontSize: 11.5, color: "rgba(255,255,255,0.2)",
              textDecoration: "none", letterSpacing: "-0.01em",
              transition: "color 0.16s",
            }}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}

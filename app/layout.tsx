import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Tu Cancha — Juega hoy sin organizar nada",
  description: "El sistema operativo del deporte amateur en Costa Rica. Reservá canchas, encontrá partidos, jugá hoy.",
  keywords: "fútbol costa rica, canchas, reservas, partidos, retos, pádel",
  openGraph: {
    title: "Tu Cancha CR",
    description: "Juega hoy sin organizar nada.",
    locale: "es_CR",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
        <Navbar />
        <main>{children}</main>
        <footer style={{ borderTop: '1px solid var(--border)' }} className="py-12 mt-20">
          <div className="max-w-7xl mx-auto px-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-black text-lg">Tu<span style={{ color: 'var(--accent)' }}>Cancha</span></p>
              <p className="text-sm mt-1" style={{ color: 'var(--text3)' }}>El sistema operativo del deporte amateur en Costa Rica.</p>
            </div>
            <p className="text-sm" style={{ color: 'var(--text3)' }}>
              © 2026 Tu Cancha CR · <a href="mailto:hola@tucanchacr.com" className="hover:text-white transition-colors">hola@tucanchacr.com</a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

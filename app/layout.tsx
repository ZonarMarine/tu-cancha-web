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
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Tu Cancha CR — Reservá tu cancha",
  description: "La plataforma de fútbol de Costa Rica. Reservá canchas, encontrá retos y jugá.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full flex flex-col" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t text-center py-6 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          © 2026 Tu Cancha CR · <a href="mailto:soporte@tucanchacr.com" className="hover:text-white transition-colors">soporte@tucanchacr.com</a>
        </footer>
      </body>
    </html>
  );
}

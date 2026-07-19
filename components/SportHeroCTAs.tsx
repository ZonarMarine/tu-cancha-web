"use client";
import Link from "next/link";
import { useSport } from "@/context/SportContext";

interface Props {
  /** "primary" = full hero CTA group (default); "secondary" = single inline link only */
  variant?: "primary" | "secondary";
}

export default function SportHeroCTAs({ variant = "primary" }: Props) {
  const { sport } = useSport();

  const isPadel    = sport === "padel";
  const sportParam = isPadel ? "padel" : "futbol";

  const retosLabel  = isPadel ? "Ver partidas activas →" : "Ver partidos activos →";
  const explorLabel = isPadel ? "Explorar canchas de pádel" : "Explorar canchas";

  if (variant === "secondary") {
    return (
      <Link
        href={`/juegos?sport=${sportParam}`}
        style={{
          padding: "13px 28px", borderRadius: 14, fontSize: 14,
          fontWeight: 500, color: "var(--text3)",
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.02)",
          display: "inline-block",
        }}
      >
        {retosLabel}
      </Link>
    );
  }

  return (
    <div
      className="hero-cta-group"
      style={{
        display: "flex", flexWrap: "wrap",
        alignItems: "center", justifyContent: "center",
        gap: 12, marginBottom: 88,
      }}
    >
      <Link
        href={`/juegos?sport=${sportParam}`}
        className="btn-primary"
        style={{
          padding: "16px 44px", fontSize: 14.5, borderRadius: 15,
          fontWeight: 800, letterSpacing: "-0.01em",
          boxShadow: "0 6px 28px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.18) inset, 0 0 0 1px rgba(215,255,0,0.10)",
        }}
      >
        {retosLabel}
      </Link>
      <Link
        href={`/explorar?sport=${sportParam}`}
        style={{
          padding: "15px 30px", borderRadius: 15, fontSize: 14,
          fontWeight: 500, color: "rgba(255,255,255,0.46)",
          border: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(255,255,255,0.025)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          transition: "border-color 0.18s, color 0.18s",
          display: "inline-block",
          letterSpacing: "-0.01em",
        }}
      >
        {explorLabel}
      </Link>
    </div>
  );
}

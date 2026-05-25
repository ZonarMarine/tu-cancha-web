"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronRight, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSport, SPORT_THEME } from "@/context/SportContext";
import RetoCard from "@/components/RetoCard";

type Reto = Record<string, any>;

function isStillValid(r: Reto, today: string): boolean {
  if (!r.date || r.date > today) return true;
  if (!r.time) return true;
  const m = String(r.time).match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!m) return true;
  let h = parseInt(m[1]);
  const p = m[3]?.toUpperCase();
  if (p === "PM" && h !== 12) h += 12;
  if (p === "AM" && h === 12) h = 0;
  const t = new Date(`${r.date}T00:00:00`);
  t.setHours(h, parseInt(m[2]), 0, 0);
  return t > new Date();
}

export default function HomeRetosSection() {
  const { sport } = useSport();
  const t = SPORT_THEME[sport];
  const [retos, setRetos] = useState<Reto[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];

    /* Sport mapping: futbol → Fútbol + Fútsal; padel → Pádel */
    const sportValues = sport === "futbol"
      ? ["Fútbol", "Fútsal", "futbol", "fútbol", "football"]
      : ["Pádel", "Padel", "pádel", "padel"];

    const { data } = await supabase
      .from("retos")
      .select("*")
      .eq("status", "open")
      .gte("date", today)
      .order("date", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(20);

    const all = data ?? [];

    /* Filter by sport — retos may have sport field OR we infer from format */
    const filtered = all.filter(r => {
      const rSport = (r.sport ?? r.deporte ?? "").toLowerCase();
      const fmt    = (r.format ?? "").toLowerCase();
      if (sport === "padel") {
        return rSport.includes("padel") || rSport.includes("pádel") || fmt.includes("padel") || fmt.includes("dobles");
      }
      /* Football: anything that is not padel */
      return !rSport.includes("padel") && !rSport.includes("pádel") && !fmt.includes("padel");
    });

    const valid = filtered.filter(r => isStillValid(r, today)).slice(0, 6);
    setRetos(valid);
    setLoading(false);
  }, [sport]);

  useEffect(() => { load(); }, [load]);

  /* Realtime */
  useEffect(() => {
    const ch = supabase
      .channel(`home-retos-${sport}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "retos" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [sport, load]);

  const heading = sport === "futbol"
    ? "Retos de fútbol esta noche."
    : "Partidas de pádel abiertas.";
  const subHeading = sport === "futbol"
    ? "Equipos buscando rival ahora. Aceptá el reto."
    : "Parejas buscando partido. Unite a la cancha.";
  const emptyTitle = sport === "futbol"
    ? "Sé el primero en lanzar un reto esta noche."
    : "Creá el primer partido de pádel hoy.";
  const emptyBody = sport === "futbol"
    ? "Publicá el reto — los equipos de la zona lo verán en tiempo real."
    : "Buscá pareja, confirmá cancha y jugá pádel en minutos.";

  return (
    <section style={{ padding: "60px 0" }}>
      <div className="container">
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 48 }}>
          <div>
            {/* Eyebrow */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: t.accent, display: "inline-block",
                boxShadow: `0 0 10px ${t.accentGlow}`,
                animation: "retoPulse 2s ease-in-out infinite",
              }} />
              <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: t.accentMuted, textTransform: "uppercase", margin: 0 }}>
                {t.eyebrow} · {t.tag}
              </p>
            </div>
            <h2 style={{ fontSize: "clamp(26px, 3vw, 38px)", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: 10 }}>
              {heading}
            </h2>
            <p style={{ fontSize: 15, color: "var(--text3)" }}>
              {loading
                ? "Cargando retos..."
                : retos.length > 0
                ? `${retos.length} ${sport === "futbol" ? "equipo" : "pareja"}${retos.length > 1 ? "s" : ""} esperando rival.`
                : subHeading}
            </p>
          </div>
          <Link href="/juegos" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--text3)", fontWeight: 500, whiteSpace: "nowrap", opacity: 0.8 }}>
            Ver todos <ChevronRight size={13} />
          </Link>
        </div>

        <style>{`@keyframes retoPulse { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.35;transform:scale(0.65);} }`}</style>

        {loading ? (
          /* Skeleton */
          <div style={{ display: "flex", gap: 20 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ width: 310, flexShrink: 0, borderRadius: t.radius, height: 160, background: "rgba(255,255,255,0.025)", animation: "retoPulse 1.8s ease-in-out infinite" }} />
            ))}
          </div>
        ) : retos.length > 0 ? (
          <div className="scroll-row" style={{ overflowX: "auto", marginLeft: -24, marginRight: -24, paddingLeft: 24, paddingRight: 24, WebkitOverflowScrolling: "touch" as any }}>
            <div style={{ display: "flex", gap: 20, width: "max-content", paddingBottom: 8 }}>
              {retos.map((r: any) => (
                <div key={r.id} style={{ width: 310, flexShrink: 0 }}>
                  <RetoCard reto={r} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Empty state */
          <div style={{
            borderRadius: t.radius + 6,
            border: `1px dashed ${t.border}`,
            background: `linear-gradient(145deg, ${t.bg} 0%, transparent 60%)`,
            padding: "56px 40px",
            textAlign: "center",
            maxWidth: 560,
            margin: "0 auto",
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: t.radius, margin: "0 auto 20px",
              background: t.bg, border: `1px solid ${t.border}`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
            }}>{t.icon}</div>
            <p style={{ fontWeight: 900, fontSize: 20, letterSpacing: "-0.03em", marginBottom: 8 }}>{emptyTitle}</p>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", lineHeight: 1.65, marginBottom: 28, maxWidth: 360, margin: "0 auto 28px" }}>
              {emptyBody}
            </p>
            <Link href="/explorar" style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "12px 28px", borderRadius: t.radius, textDecoration: "none",
              background: t.accent, color: sport === "futbol" ? "#000" : "#fff",
              fontSize: 13, fontWeight: 800, letterSpacing: "-0.01em",
              boxShadow: `0 0 24px ${t.accentGlow}`,
            }}>
              <Zap size={14} fill={sport === "futbol" ? "#000" : "#fff"} />
              {sport === "futbol" ? "Reservar cancha →" : "Buscar cancha de pádel →"}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

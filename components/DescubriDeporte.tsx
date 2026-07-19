"use client";
import Link from "next/link";
import { useSport, SPORT_THEME } from "@/context/SportContext";

const FOOTBALL_FEATURES = [
  { icon: "⚔️", label: "Retos de equipos",    desc: "Publicá o aceptá retos entre equipos de tu zona." },
  { icon: "🏆", label: "Ligas y torneos",      desc: "Competí en formato liga con clasificación en tiempo real." },
  { icon: "📊", label: "Rankings de equipos",  desc: "Clasificación por victorias, goles y rendimiento." },
  { icon: "⚽", label: "Canchas de fútbol",    desc: "Fútbol 5, 7 y 11 en toda Costa Rica." },
];

const PADEL_FEATURES = [
  { icon: "🏓", label: "Partidos de dobles",   desc: "Encontrá pareja o rival para tu próxima partida." },
  { icon: "🏟",  label: "Clubes y canchas",    desc: "Reservá en los mejores clubes de pádel del país." },
  { icon: "📊", label: "Rankings de parejas",  desc: "Seguimiento de resultados y estadísticas por pareja." },
  { icon: "🤝", label: "Partidos amistosos",   desc: "Challengers, americano y torneos sociales." },
];

function FeatureRow({ icon, label, desc, accent }: { icon: string; label: string; desc: string; accent: string }) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
      <div style={{
        width: 38, height: 38, borderRadius: 11, flexShrink: 0,
        background: `${accent}12`, border: `1px solid ${accent}20`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
      }}>{icon}</div>
      <div>
        <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 2, color: "rgba(255,255,255,0.82)" }}>{label}</p>
        <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.32)", lineHeight: 1.45 }}>{desc}</p>
      </div>
    </div>
  );
}

export default function DescubriDeporte() {
  const { setSport } = useSport();
  const tf = SPORT_THEME.futbol;
  const tp = SPORT_THEME.padel;

  return (
    <section style={{ padding: "60px 0" }}>
      <div className="container">
        {/* Section header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: "rgba(255,255,255,0.28)", textTransform: "uppercase", marginBottom: 12 }}>
            DOS DEPORTES · UN ECOSISTEMA
          </p>
          <h2 style={{ fontSize: "clamp(26px, 3vw, 40px)", fontWeight: 900, letterSpacing: "-0.028em", lineHeight: 1.1 }}>
            Descubrí tu deporte.
          </h2>
        </div>

        {/* Split cards */}
        <div className="descubri-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <style>{`
            @media (max-width: 700px) { .descubri-grid { grid-template-columns: 1fr !important; } }
          `}</style>

          {/* ── Football card ── */}
          <div style={{
            borderRadius: 24, overflow: "hidden",
            background: "linear-gradient(145deg, rgba(59, 130, 246,0.045) 0%, rgba(59, 130, 246,0.008) 40%, #0e0e0e 100%)",
            border: "1px solid rgba(59, 130, 246,0.10)",
            padding: "36px 32px",
            position: "relative",
          }}>
            {/* Field texture overlay */}
            <div style={{
              position: "absolute", inset: 0, opacity: 0.03, pointerEvents: "none",
              backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)",
              backgroundSize: "40px 40px",
            }} />
            {/* Corner floodlight bloom */}
            <div style={{
              position: "absolute", top: -40, right: -40, width: 200, height: 200,
              background: "radial-gradient(circle, rgba(59, 130, 246,0.08) 0%, transparent 65%)",
              pointerEvents: "none",
            }} />

            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <span style={{ fontSize: 32 }}>⚽</span>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: "rgba(59, 130, 246,0.50)", textTransform: "uppercase", marginBottom: 2 }}>FÚTBOL</p>
                  <h3 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.03em", color: "#fff", lineHeight: 1 }}>
                    Competitivo.<br />
                    <span style={{ color: tf.accent }}>Comunidad.</span>
                  </h3>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
                {FOOTBALL_FEATURES.map(f => (
                  <FeatureRow key={f.label} {...f} accent={tf.accent} />
                ))}
              </div>

              <button
                onClick={() => setSport("futbol")}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "11px 24px", borderRadius: 12, border: "none", cursor: "pointer",
                  background: tf.accent, color: "#fff",
                  fontSize: 13, fontWeight: 800, letterSpacing: "-0.01em",
                  boxShadow: `0 4px 20px ${tf.accentGlow}`,
                  transition: "transform 0.16s, box-shadow 0.16s",
                }}
              >
                Entrar al fútbol →
              </button>
            </div>
          </div>

          {/* ── Padel card ── */}
          <div style={{
            borderRadius: 24, overflow: "hidden",
            background: "linear-gradient(145deg, rgba(96,165,250,0.05) 0%, rgba(96,165,250,0.010) 40%, #0e0e0e 100%)",
            border: "1px solid rgba(96,165,250,0.10)",
            padding: "36px 32px",
            position: "relative",
          }}>
            {/* Clean glass sheen overlay */}
            <div style={{
              position: "absolute", inset: 0, opacity: 1, pointerEvents: "none",
              background: "linear-gradient(145deg, rgba(96,165,250,0.02) 0%, transparent 50%)",
            }} />
            {/* Corner glow */}
            <div style={{
              position: "absolute", top: -40, right: -40, width: 200, height: 200,
              background: "radial-gradient(circle, rgba(96,165,250,0.10) 0%, transparent 65%)",
              pointerEvents: "none",
            }} />

            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <span style={{ fontSize: 32 }}>🏓</span>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: "rgba(96,165,250,0.55)", textTransform: "uppercase", marginBottom: 2 }}>PÁDEL</p>
                  <h3 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.03em", color: "#fff", lineHeight: 1 }}>
                    Premium.<br />
                    <span style={{ color: tp.accent }}>Social.</span>
                  </h3>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
                {PADEL_FEATURES.map(f => (
                  <FeatureRow key={f.label} {...f} accent={tp.accent} />
                ))}
              </div>

              <button
                onClick={() => setSport("padel")}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "11px 24px", borderRadius: 18, border: `1px solid ${tp.border}`, cursor: "pointer",
                  background: `linear-gradient(135deg, ${tp.bg} 0%, rgba(0,0,0,0.4) 100%)`,
                  color: tp.accent,
                  fontSize: 13, fontWeight: 800, letterSpacing: "-0.01em",
                  boxShadow: `0 4px 20px ${tp.accentGlow}`,
                  transition: "transform 0.16s, box-shadow 0.16s",
                }}
              >
                Entrar al pádel →
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

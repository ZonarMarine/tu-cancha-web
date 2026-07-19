"use client";
import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MapPin, Clock, Users, Calendar, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

/* ─── helpers ──────────────────────────────────────────────── */
function fmtPrice(n: number) {
  return `₡${n.toLocaleString("es-CR")}`;
}
function fmtDate(raw: string) {
  if (!raw) return null;
  const d = new Date(raw + "T00:00:00");
  return d.toLocaleDateString("es-CR", { weekday: "long", day: "numeric", month: "long" });
}

/* ─── outer shell with Suspense ────────────────────────────── */
export default function UnirsePage() {
  return (
    <Suspense>
      <UnirseInner />
    </Suspense>
  );
}

/* ─── inner page ────────────────────────────────────────────── */
function UnirseInner() {
  const params = useSearchParams();
  const router = useRouter();

  const venue   = params.get("venue")   ?? "";
  const time    = params.get("time")    ?? "";
  const date    = params.get("date")    ?? "";
  const players = Number(params.get("players") ?? 10);
  const hours   = Number(params.get("hours")   ?? 1);
  const price   = Number(params.get("price")   ?? 0);
  const retoId  = params.get("reto")    ?? "";   // optional: link to specific reto

  const [step,    setStep]    = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errMsg,  setErrMsg]  = useState("");

  const handleJoin = async () => {
    setStep("loading");
    setErrMsg("");

    // Check auth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      // Redirect to auth, come back here after login
      const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
      router.push(`/auth?redirect=${returnTo}`);
      return;
    }

    // Build booking payload
    const payload: Record<string, unknown> = {
      user_id:    session.user.id,
      court_name: venue,
      time,
      players,
      hours,
      price,
      status:     "pending",
    };
    if (date)   payload.date   = date;
    if (retoId) payload.reto_id = retoId;

    const { error } = await supabase.from("bookings").insert(payload);
    if (error) {
      setErrMsg(error.message ?? "Ocurrió un error. Intentá de nuevo.");
      setStep("error");
      return;
    }
    setStep("done");
  };

  /* ── success screen ── */
  if (step === "done") {
    return (
      <div style={{
        minHeight: "100dvh", background: "#0a0a0a",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px",
      }}>
        <div style={{
          background: "linear-gradient(160deg,#161616,#111)",
          border: "1px solid rgba(59, 130, 246,0.18)",
          borderRadius: 24, padding: "48px 32px", textAlign: "center",
          maxWidth: 420, width: "100%",
          boxShadow: "0 0 40px rgba(59, 130, 246,0.08), 0 24px 60px rgba(0,0,0,0.5)",
        }}>
          <CheckCircle size={56} color="#3B82F6" style={{ marginBottom: 20, filter: "drop-shadow(0 0 14px rgba(59, 130, 246,0.45))" }} />
          <h2 style={{ color: "#fff", fontSize: 26, fontWeight: 800, margin: "0 0 10px", letterSpacing: "-0.03em" }}>
            ¡Ya estás dentro!
          </h2>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 15, margin: "0 0 32px", lineHeight: 1.5 }}>
            Tu reservación fue confirmada. Nos vemos en la cancha 🏟️
          </p>
          <Link href="/juegos" style={{
            display: "inline-block", padding: "14px 32px",
            background: "#3B82F6", color: "#fff",
            borderRadius: 14, fontWeight: 800, fontSize: 15,
            textDecoration: "none", letterSpacing: "-0.02em",
            boxShadow: "0 0 24px rgba(59, 130, 246,0.30)",
          }}>
            Ver mis partidos →
          </Link>
        </div>
      </div>
    );
  }

  /* ── join screen ── */
  const dateLabel = date ? fmtDate(date) : null;
  const hasDetails = venue || time;

  return (
    <div style={{
      minHeight: "100dvh", background: "#0a0a0a",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "32px 20px",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 36, maxWidth: 480 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(59, 130, 246,0.08)", border: "1px solid rgba(59, 130, 246,0.18)",
          borderRadius: 100, padding: "6px 16px", marginBottom: 20,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3B82F6", display: "inline-block",
            boxShadow: "0 0 8px rgba(59, 130, 246,0.8)", animation: "ping 1.5s ease-in-out infinite" }} />
          <span style={{ color: "#3B82F6", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em" }}>
            INVITACIÓN ACTIVA
          </span>
        </div>
        <h1 style={{
          color: "#fff", fontSize: 30, fontWeight: 900,
          margin: "0 0 12px", letterSpacing: "-0.04em", lineHeight: 1.1,
        }}>
          Te invitaron a un partido
        </h1>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 15, margin: 0, lineHeight: 1.5 }}>
          Confirmá tu lugar con un solo click
        </p>
      </div>

      {/* Match card */}
      {hasDetails && (
        <div style={{
          width: "100%", maxWidth: 420,
          background: "linear-gradient(160deg,#161616,#111)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 22, padding: "28px 24px",
          marginBottom: 24,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 16px 50px rgba(0,0,0,0.4)",
        }}>
          {/* Detail rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {venue && (
              <DetailRow icon={<MapPin size={16} color="#3B82F6" />} label="Cancha" value={venue} />
            )}
            {dateLabel && (
              <DetailRow icon={<Calendar size={16} color="#60A5FA" />} label="Fecha" value={dateLabel} />
            )}
            {time && (
              <DetailRow icon={<Clock size={16} color="#F97316" />} label="Hora" value={`${time} · ${hours}h`} />
            )}
            {players > 0 && (
              <DetailRow icon={<Users size={16} color="#A78BFA" />} label="Jugadores" value={`${players} jugadores`} />
            )}
          </div>

          {/* Price bar */}
          {price > 0 && (
            <div style={{
              marginTop: 24, paddingTop: 20,
              borderTop: "1px solid rgba(255,255,255,0.07)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600 }}>
                Tu parte
              </span>
              <span style={{
                color: "#3B82F6", fontSize: 22, fontWeight: 900, letterSpacing: "-0.03em",
                filter: "drop-shadow(0 0 8px rgba(59, 130, 246,0.35))",
              }}>
                {fmtPrice(price)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* CTA */}
      <div style={{ width: "100%", maxWidth: 420 }}>
        <button
          onClick={handleJoin}
          disabled={step === "loading"}
          style={{
            width: "100%", padding: "18px 0",
            background: step === "loading"
              ? "rgba(59, 130, 246,0.6)"
              : "linear-gradient(135deg,#5AB8FF 0%,#3B82F6 60%,#35C7F5 100%)",
            color: "#fff", fontWeight: 900, fontSize: 17,
            border: "none", borderRadius: 16, cursor: step === "loading" ? "default" : "pointer",
            letterSpacing: "-0.02em",
            boxShadow: step === "loading"
              ? "none"
              : "0 0 32px rgba(59, 130, 246,0.35), 0 4px 16px rgba(0,0,0,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            transition: "all 0.18s ease",
          }}
        >
          {step === "loading" ? (
            <><Loader2 size={20} style={{ animation: "spin 0.8s linear infinite" }} /> Procesando...</>
          ) : (
            <>Unirme al partido{price > 0 ? ` · ${fmtPrice(price)}` : ""} →</>
          )}
        </button>

        {step === "error" && (
          <p style={{
            color: "#FF6B6B", fontSize: 13, textAlign: "center",
            marginTop: 14, marginBottom: 0,
          }}>
            {errMsg}
          </p>
        )}

        <p style={{
          color: "rgba(255,255,255,0.28)", fontSize: 12,
          textAlign: "center", marginTop: 16, lineHeight: 1.5,
        }}>
          Al confirmar aceptás los términos de Tu Cancha
        </p>
      </div>

      <style>{`
        @keyframes ping {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.6; transform: scale(1.25); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/* ─── tiny detail row ───────────────────────────────────────── */
function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {label}
        </div>
        <div style={{ color: "#fff", fontSize: 15, fontWeight: 700, marginTop: 1 }}>
          {value}
        </div>
      </div>
    </div>
  );
}

"use client";
import { useState, useEffect, useCallback } from "react";
import { MapPin, Clock, Plus, CalendarDays, Zap } from "lucide-react";
import Link from "next/link";
import { fmtColones } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { useSport, SPORT_THEME, Sport } from "@/context/SportContext";

/* ─── Types ────────────────────────────────────────────────── */
type Reto = {
  id: string;
  team_name: string;
  court_name: string;
  date: string | null;
  time: string | null;
  hours: number | null;
  players: number | null;
  price: number | null;
  status: string;
  created_at: string;
  sport?: string;
  deporte?: string;
  level?: string;
  location?: string;
  format?: string;
};

/* ─── Constants ─────────────────────────────────────────────── */
const FORMATS = ["Todos", "5v5", "7v7", "11v11"];
const LEVELS  = ["Todos", "Principiante", "Intermedio", "Avanzado"];

// All statuses that represent a reto that's visible/active
const ACTIVE_STATUSES = [
  "open", "looking_for_rival", "pending_rival",
  "active", "published", "created",
];

/* ─── Helpers ───────────────────────────────────────────────── */
const TEAM_COLORS = ["#D7FF00","#4ADE80","#60A5FA","#F97316","#A78BFA","#FF6B6B","#FACC15"];
function teamColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return TEAM_COLORS[Math.abs(h) % TEAM_COLORS.length];
}
function deriveFormat(players: number | null): string {
  const n = players ?? 10;
  if (n >= 18) return "11v11";
  if (n >= 12) return "7v7";
  return "5v5";
}
function postedMin(created_at: string): number {
  return Math.floor((Date.now() - new Date(created_at).getTime()) / 60000);
}
function minutesUntil(dateStr: string | null, timeStr: string | null): number | null {
  try {
    if (!dateStr || !timeStr) return null;
    const m = String(timeStr).match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!m) return null;
    let h = parseInt(m[1]);
    const p = m[3]?.toUpperCase();
    if (p === "PM" && h !== 12) h += 12;
    if (p === "AM" && h === 12) h = 0;
    const t = new Date(`${dateStr}T00:00:00`);
    t.setHours(h, parseInt(m[2]), 0, 0);
    const diff = Math.round((t.getTime() - Date.now()) / 60000);
    return diff > 0 && diff < 480 ? diff : null;
  } catch { return null; }
}
function fmtCountdown(mins: number): string {
  if (mins < 60) return `${mins}min`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}
function isStillFuture(r: Reto, today: string): boolean {
  // Future date → always valid
  if (!r.date || r.date > today) return true;
  // No time field → show it (can't determine expiry)
  if (!r.time) return true;
  const m = String(r.time).match(/(\d+):(\d+)\s*(AM|PM)?/i);
  // Unparseable time format → show it
  if (!m) return true;
  let h = parseInt(m[1]);
  const p = m[3]?.toUpperCase();
  if (p === "PM" && h !== 12) h += 12;
  if (p === "AM" && h === 12) h = 0;
  const gameTime = new Date(`${r.date}T00:00:00`);
  gameTime.setHours(h, parseInt(m[2]), 0, 0);
  // Keep reto visible until 30 min after game start (grace period)
  const grace = new Date(gameTime.getTime() + 30 * 60 * 1000);
  return grace > new Date();
}
function isSportMatch(r: Reto, sport: "futbol" | "padel"): boolean {
  const rSport = (r.sport ?? r.deporte ?? "").toLowerCase().trim();

  // If no sport field stored at all (crear-partido doesn't save sport),
  // treat the reto as football by default — show it under football tab.
  const noSportField = rSport === "";
  const fmt = (r.format ?? "").toLowerCase();

  const isPadel =
    rSport.includes("padel") || rSport.includes("pádel") ||
    fmt.includes("padel") || fmt.includes("dobles");

  if (sport === "padel") {
    if (noSportField) return false; // retos without sport = football by default
    return isPadel;
  }
  // football: include retos with no sport field OR any non-padel sport
  return noSportField || !isPadel;
}

function dateLabel(r: Reto): string {
  if (!r.date) return "–";
  const today = new Date().toISOString().split("T")[0];
  if (r.date === today) return "Hoy";
  try {
    return new Date(r.date + "T12:00:00").toLocaleDateString("es-CR", { weekday: "short", day: "numeric", month: "short" });
  } catch { return r.date; }
}

/* ─── MatchCard ─────────────────────────────────────────────── */
function MatchCard({ r }: { r: Reto }) {
  const [hov, setHov] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const format    = r.format ?? deriveFormat(r.players);
  const level     = r.level ?? "Intermedio";
  const color     = teamColor(r.team_name ?? "?");
  const initials  = (r.team_name ?? "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  const mins      = minutesUntil(r.date, r.time);
  const isImminent = mins !== null && mins < 60;
  const pMin      = postedMin(r.created_at);
  const isUrgent  = pMin <= 10 || isImminent;
  const isLooking = r.status === "open" || r.status === "looking_for_rival";

  const borderColor = isUrgent
    ? hov ? "rgba(255,107,107,0.28)" : "rgba(255,107,107,0.16)"
    : hov ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.07)";

  const shadow = hov
    ? isUrgent
      ? "0 0 0 1px rgba(255,107,107,0.08), 0 24px 60px rgba(0,0,0,0.80), 0 1px 0 rgba(255,255,255,0.05) inset"
      : "0 0 0 1px rgba(255,255,255,0.04), 0 20px 52px rgba(0,0,0,0.76), 0 1px 0 rgba(255,255,255,0.05) inset"
    : "0 1px 0 rgba(255,255,255,0.045) inset, 0 2px 8px rgba(0,0,0,0.4), 0 10px 36px rgba(0,0,0,0.52)";

  return (
    <>
      {showModal && <RetoModal r={r} onClose={() => setShowModal(false)} />}
      <div
        className="match-card"
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          borderRadius: 20, overflow: "hidden",
          background: "linear-gradient(145deg, rgba(255,255,255,0.026) 0%, transparent 52%), linear-gradient(155deg, #161616 0%, #0d0d0d 58%, #0b0b0b 100%)",
          border: `1px solid ${borderColor}`,
          boxShadow: shadow,
          transform: hov ? "translateY(-4px)" : "translateY(0)",
          transition: "transform 0.28s cubic-bezier(0.22,0.61,0.36,1), border-color 0.20s, box-shadow 0.28s",
          display: "flex", flexDirection: "column",
        }}>

        {/* Accent line */}
        {isUrgent && (
          <div style={{ height: 2, background: "linear-gradient(90deg, #FF6B6B 0%, rgba(255,107,107,0.20) 70%, transparent 100%)" }} />
        )}

        {/* Header: format + level + badges */}
        <div style={{ padding: "16px 18px 0", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 9.5, fontWeight: 900, padding: "3px 9px", borderRadius: 7, background: "var(--accent)", color: "#000", letterSpacing: "0.04em" }}>
              {format}
            </span>
            <span style={{ fontSize: 9.5, fontWeight: 600, padding: "3px 9px", borderRadius: 7, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.48)", border: "1px solid rgba(255,255,255,0.07)" }}>
              {level}
            </span>
            {isUrgent && (
              <span style={{ fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 7, background: "rgba(255,107,107,0.12)", color: "#FF8080", border: "1px solid rgba(255,107,107,0.20)", letterSpacing: "0.03em" }}>
                ⚡ URGENTE
              </span>
            )}
          </div>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", letterSpacing: "-0.01em", flexShrink: 0 }}>
            hace {pMin < 60 ? `${pMin}min` : `${Math.floor(pMin / 60)}h`}
          </span>
        </div>

        {/* VS composition */}
        <div style={{ display: "flex", alignItems: "center", padding: "0 18px", gap: 8, marginBottom: 14 }}>
          {/* Challenger */}
          <div style={{ flex: 1, textAlign: "center" }}>
            <div className="team-avatar" style={{
              width: 56, height: 56, borderRadius: 15, margin: "0 auto 7px",
              background: `${color}18`, border: `1.5px solid ${color}38`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, fontWeight: 900, color,
              boxShadow: hov ? `0 0 18px ${color}18` : "none",
              transition: "box-shadow 0.28s ease",
            }}>
              {initials}
            </div>
            <p style={{ fontSize: 11.5, fontWeight: 800, color: "rgba(255,255,255,0.90)", letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 2 }}>
              {r.team_name}
            </p>
            <p style={{ fontSize: 9.5, color: "rgba(255,255,255,0.30)", fontWeight: 600, letterSpacing: "0.02em" }}>
              {r.players ?? 10} jugadores
            </p>
          </div>

          {/* VS + countdown */}
          <div style={{ flexShrink: 0, textAlign: "center", padding: "0 2px" }}>
            <p style={{ fontSize: 26, fontWeight: 900, color: "var(--accent)", letterSpacing: "-0.06em", lineHeight: 1 }}>VS</p>
            {mins !== null ? (
              <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 4, fontSize: 9, fontWeight: 700, color: isImminent ? "#FF8080" : "#FACC15", letterSpacing: "-0.01em" }}>
                {isImminent && <span className="live-dot" style={{ width: 4, height: 4, borderRadius: "50%", background: "#FF8080", display: "inline-block", flexShrink: 0 }} />}
                {fmtCountdown(mins)}
              </div>
            ) : (
              <p style={{ marginTop: 4, fontSize: 9, color: "rgba(255,255,255,0.22)", fontWeight: 500 }}>
                {r.time ?? "–"}
              </p>
            )}
          </div>

          {/* Open slot or status */}
          <div style={{ flex: 1, textAlign: "center" }}>
            {isLooking ? (
              <>
                <div className={isImminent ? "slot-pulse" : ""} style={{
                  width: 56, height: 56, borderRadius: 15, margin: "0 auto 7px",
                  background: "rgba(255,255,255,0.03)", border: "1.5px dashed rgba(255,255,255,0.14)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, color: "rgba(255,255,255,0.20)",
                }}>?</div>
                <p style={{ fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,0.36)", letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 2 }}>
                  ¿Tu equipo?
                </p>
                <p style={{ fontSize: 9.5, color: "rgba(215,255,0,0.55)", fontWeight: 600, letterSpacing: "0.01em" }}>
                  Sin rival
                </p>
              </>
            ) : (
              <>
                <div style={{
                  width: 56, height: 56, borderRadius: 15, margin: "0 auto 7px",
                  background: "rgba(74,222,128,0.08)", border: "1.5px solid rgba(74,222,128,0.20)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, color: "#4ADE80",
                }}>✓</div>
                <p style={{ fontSize: 11.5, fontWeight: 700, color: "#4ADE80", letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 2 }}>
                  Activo
                </p>
                <p style={{ fontSize: 9.5, color: "rgba(74,222,128,0.55)", fontWeight: 600 }}>
                  En juego
                </p>
              </>
            )}
          </div>
        </div>

        {/* Meta row */}
        <div style={{
          margin: "0 14px 14px", padding: "10px 13px", borderRadius: 11,
          background: "rgba(255,255,255,0.028)", border: "1px solid rgba(255,255,255,0.05)",
          display: "flex", flexDirection: "column", gap: 5,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: "rgba(255,255,255,0.42)", letterSpacing: "-0.01em" }}>
            <MapPin size={9} style={{ color: "rgba(215,255,0,0.55)", flexShrink: 0 }} />
            <span style={{ fontWeight: 600 }}>{r.court_name ?? "–"}</span>
            {r.location && <><span style={{ opacity: 0.5 }}>·</span><span>{r.location}</span></>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: "rgba(255,255,255,0.42)", letterSpacing: "-0.01em" }}>
            <CalendarDays size={9} style={{ color: "rgba(215,255,0,0.55)", flexShrink: 0 }} />
            <span>
              <strong style={{ color: "rgba(255,255,255,0.65)", fontWeight: 700 }}>{dateLabel(r)}</strong>
              {r.time && <> · {r.time}</>}
            </span>
            {mins !== null && (
              <>
                <span style={{ opacity: 0.4 }}>·</span>
                <span style={{ color: isImminent ? "#FF8080" : "#FACC15", fontWeight: 700 }}>
                  en {fmtCountdown(mins)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Price + CTA */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px 16px" }}>
          <div>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.24)", marginBottom: 1, letterSpacing: "-0.01em" }}>por equipo</p>
            <p style={{ fontSize: 17, fontWeight: 900, color: "var(--accent)", letterSpacing: "-0.04em", lineHeight: 1 }}>
              {fmtColones(r.price ?? 0)}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary"
            style={{ padding: "8px 15px", fontSize: 11.5, borderRadius: 10, letterSpacing: "-0.01em", fontWeight: 800 }}
          >
            {isUrgent ? "⚡ Entrar ya" : "Aceptar reto →"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── RetoModal ─────────────────────────────────────────────── */
function RetoModal({ r, onClose }: { r: Reto; onClose: () => void }) {
  const [confirmed, setConfirmed] = useState(false);
  const [teamName, setTeamName]   = useState("");
  const color    = teamColor(r.team_name ?? "?");
  const initials = (r.team_name ?? "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  const format   = r.format ?? deriveFormat(r.players);
  const dlabel   = dateLabel(r);

  if (confirmed) return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.80)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "linear-gradient(145deg, #141414 0%, #0f0f0f 100%)", border: "1px solid rgba(74,222,128,0.20)", borderRadius: 24, padding: "48px 40px", maxWidth: 420, width: "100%", textAlign: "center", boxShadow: "0 0 0 1px rgba(74,222,128,0.06) inset, 0 40px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, margin: "0 auto 24px", background: "rgba(74,222,128,0.10)", border: "1px solid rgba(74,222,128,0.22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>✓</div>
        <h3 style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-0.02em", marginBottom: 10 }}>¡Reto aceptado!</h3>
        <p style={{ fontSize: 14, color: "var(--text3)", lineHeight: 1.6, marginBottom: 8 }}>
          Le avisamos a <strong style={{ color: "rgba(255,255,255,0.80)" }}>{r.team_name}</strong> que{teamName ? <strong style={{ color: "rgba(255,255,255,0.80)" }}> {teamName}</strong> : " tu equipo"} acepta el reto.
        </p>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.30)", marginBottom: 32 }}>{r.court_name} · {r.time ?? "–"} · {dlabel}</p>
        <button onClick={onClose} style={{ width: "100%", padding: 13, borderRadius: 13, background: "rgba(74,222,128,0.10)", border: "1px solid rgba(74,222,128,0.18)", color: "#4ADE80", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Cerrar</button>
      </div>
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(14px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "linear-gradient(145deg, #141414 0%, #0f0f0f 100%)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, width: "100%", maxWidth: 480, overflow: "hidden", boxShadow: "0 48px 100px rgba(0,0,0,0.70)", position: "relative" }}>
        <div style={{ height: 3, background: "linear-gradient(90deg, #D7FF00 0%, rgba(215,255,0,0.15) 60%, transparent 100%)" }} />
        <div style={{ padding: "28px 28px 32px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <p style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, letterSpacing: "0.06em", marginBottom: 6 }}>ACEPTAR RETO</p>
              <h3 style={{ fontWeight: 900, fontSize: 20, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                {r.team_name}<br /><span style={{ color: "var(--text3)", fontWeight: 500, fontSize: 14 }}>busca rival</span>
              </h3>
            </div>
            <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, fontSize: 18 }}>×</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 20, borderRadius: 16, marginBottom: 20, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ width: 52, height: 52, borderRadius: 15, margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 18, background: color + "18", color, border: `1.5px solid ${color}30` }}>{initials}</div>
              <p style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>{r.team_name}</p>
              <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{format}</p>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 11, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(215,255,0,0.06)", border: "1px solid rgba(215,255,0,0.12)" }}>
              <span style={{ fontWeight: 900, fontSize: 12, color: "var(--accent)" }}>VS</span>
            </div>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ width: 52, height: 52, borderRadius: 15, margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "var(--text3)", background: "var(--surface3)", border: "1.5px dashed rgba(255,255,255,0.12)" }}>?</div>
              <p style={{ fontWeight: 600, fontSize: 13, color: "rgba(255,255,255,0.55)" }}>Tu equipo</p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
            {[
              { icon: "📍", label: "Cancha",    val: r.court_name ?? "–" },
              { icon: "📅", label: "Fecha",     val: dlabel },
              { icon: "⏰", label: "Hora",      val: `${r.time ?? "–"}${r.hours ? ` · ${r.hours}h` : ""}` },
              { icon: "👥", label: "Jugadores", val: `${r.players ?? 10} por equipo` },
            ].map(({ icon, label, val }) => (
              <div key={label} style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.055)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                  <span style={{ fontSize: 10 }}>{icon}</span>
                  <span style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</span>
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{val}</p>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderRadius: 13, marginBottom: 20, background: "rgba(215,255,0,0.04)", border: "1px solid rgba(215,255,0,0.10)" }}>
            <span style={{ fontSize: 13, color: "var(--text3)" }}>Total por equipo</span>
            <span style={{ fontWeight: 900, fontSize: 20, color: "var(--accent)", letterSpacing: "-0.02em" }}>{fmtColones(r.price ?? 0)}</span>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Nombre de tu equipo (opcional)</label>
            <input type="text" placeholder="ej. Los Clavos FC" value={teamName} onChange={e => setTeamName(e.target.value)}
              style={{ width: "100%", padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: 13, borderRadius: 13, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text3)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Cancelar</button>
            <button onClick={() => setConfirmed(true)} style={{ flex: 2, padding: 13, borderRadius: 13, background: "var(--accent)", color: "#000", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, boxShadow: "0 0 24px rgba(215,255,0,0.22)" }}>
              <Zap size={14} fill="#000" /> Confirmar reto
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── JuegosPage ─────────────────────────────────────────────── */
export default function JuegosPage() {
  const { sport, setSport } = useSport();
  const t                   = SPORT_THEME[sport];

  /* Sync ?sport= URL param → global context on mount */
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("sport");
    if (p === "padel")                          setSport("padel");
    else if (p === "futbol" || p === "football") setSport("futbol");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [format, setFormat] = useState("Todos");
  const [level,  setLevel]  = useState("Todos");
  const [retos,  setRetos]  = useState<Reto[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlineDot, setOnlineDot] = useState(true);

  /* ── Load retos ── */
  const load = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];

    // Fetch with server-side status + date filters.
    // Schema columns: id, user_id, team_name, court_name, date, time,
    //                 hours, players, price, status, created_at,
    //                 location, format, level, note, sport (added via migration)
    const { data, error } = await supabase
      .from("retos")
      .select("id, user_id, team_name, court_name, date, time, hours, players, price, status, created_at, location, format, level, note, sport")
      .in("status", ACTIVE_STATUSES)
      .gte("date", today)
      .order("date", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(60);

    if (error) console.error("[juegos] query error:", error);

    const all = (data ?? []) as Reto[];

    // Client-side: sport match + not yet expired (30-min grace period)
    const valid = all.filter(r =>
      isSportMatch(r, sport) && isStillFuture(r, today)
    );

    setRetos(valid);
    setLoading(false);
  }, [sport]);

  useEffect(() => {
    setLoading(true);
    setRetos([]);
    load();
  }, [load]);

  /* ── Realtime: INSERT / UPDATE / DELETE ── */
  useEffect(() => {
    const ch = supabase
      .channel(`juegos-live-${sport}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "retos" }, () => load())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "retos" }, () => load())
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "retos" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [sport, load]);

  /* ── Online indicator ── */
  useEffect(() => {
    const id = setInterval(() => setOnlineDot(v => !v), 2800);
    return () => clearInterval(id);
  }, []);

  /* ── Filter + sort ── */
  const filtered = retos.filter(r => {
    const fmt = r.format ?? deriveFormat(r.players);
    const lvl = r.level ?? "Intermedio";
    return (format === "Todos" || fmt === format) && (level === "Todos" || lvl === level);
  });

  const sorted = [...filtered].sort((a, b) => {
    const aUrgent = postedMin(a.created_at) <= 10 ? 1 : 0;
    const bUrgent = postedMin(b.created_at) <= 10 ? 1 : 0;
    if (aUrgent !== bUrgent) return bUrgent - aUrgent;
    return new Date(a.date ?? "").getTime() - new Date(b.date ?? "").getTime();
  });

  /* Live counts for CTA panel */
  const lookingCount = retos.filter(r => r.status === "open" || r.status === "looking_for_rival").length;
  const activeCount  = retos.filter(r => r.status === "active").length;

  const sportLabel = sport === "futbol" ? "fútbol" : "pádel";
  const sportIcon  = sport === "futbol" ? "⚽" : "🏓";

  return (
    <div style={{ paddingTop: 60, minHeight: "100svh", background: "linear-gradient(160deg, #090909 0%, #070707 48%, #080807 100%)", position: "relative" }}>

      <style>{`
        @keyframes live-dot  { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.35;transform:scale(0.65);} }
        @keyframes slot-pulse{ 0%,100%{border-color:rgba(255,255,255,0.14);} 50%{border-color:rgba(255,107,107,0.40);} }
        @keyframes orb-a     { 0%,100%{transform:translate(0,0) scale(1); opacity:.78;} 40%{transform:translate(24px,-14px) scale(1.05); opacity:.90;} 70%{transform:translate(-10px,10px) scale(.97); opacity:.72;} }
        @keyframes orb-b     { 0%,100%{transform:translate(0,0) scale(1); opacity:.65;} 35%{transform:translate(-18px,12px) scale(1.04); opacity:.80;} 68%{transform:translate(14px,-8px) scale(.98); opacity:.60;} }
        @keyframes pulse     { 0%,100%{opacity:1;} 50%{opacity:0.45;} }
        @keyframes floodlight{ 0%{transform:translateX(-120%) skewX(-8deg);} 100%{transform:translateX(320%) skewX(-8deg);} }
        .live-dot    { animation: live-dot 2.2s ease-in-out infinite; }
        .section-dot { animation: live-dot 2.8s ease-in-out infinite; }
        .slot-pulse  { animation: slot-pulse 1.8s ease-in-out infinite; }
        .orb-a       { animation: orb-a 15s ease-in-out infinite; }
        .orb-b       { animation: orb-b 12s ease-in-out infinite; }
        .match-card  { will-change: transform; }
        .pill        { transition: background 0.14s, color 0.14s, box-shadow 0.16s, border-color 0.14s, transform 0.12s; }
        .pill:hover  { transform: translateY(-1px); }
        .floodlight-beam { animation: floodlight 20s cubic-bezier(0.4,0,0.6,1) infinite; animation-delay: -7s; }
        @media (max-width: 900px)  { .hero-grid { grid-template-columns: 1fr !important; } .cta-panel { display: none; } .hero-mobile-cta { display: flex !important; } }
        @media (min-width: 901px)  { .hero-mobile-cta { display: none !important; } }
        @media (max-width: 640px)  { .cards-grid { grid-template-columns: 1fr !important; gap: 12px !important; } }
        @media (min-width: 641px) and (max-width: 1024px)  { .cards-grid { grid-template-columns: repeat(2,1fr) !important; } }
        @media (min-width: 1025px) and (max-width: 1279px) { .cards-grid { grid-template-columns: repeat(3,1fr) !important; } }
        @media (min-width: 1280px) { .cards-grid { grid-template-columns: repeat(4,1fr) !important; } .team-avatar { width: 50px !important; height: 50px !important; border-radius: 13px !important; font-size: 18px !important; } }
        @media (max-width: 500px)  { .filter-pills { gap: 5px !important; } }
      `}</style>

      {/* Ambient orbs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div className="orb-a" style={{ position: "absolute", top: "-10%", right: "-5%", width: 720, height: 720, background: `radial-gradient(circle, ${t.accentGlow} 0%, transparent 58%)`, filter: "blur(2px)" }} />
        <div className="orb-b" style={{ position: "absolute", bottom: "-18%", left: "-8%", width: 640, height: 640, background: `radial-gradient(circle, ${t.accentGlow} 0%, transparent 60%)`, filter: "blur(2px)" }} />
      </div>

      {/* ── Hero ── */}
      <div style={{ position: "relative", zIndex: 1, overflow: "hidden", background: `linear-gradient(180deg, ${t.bg} 0%, rgba(0,0,0,0.00) 100%)`, padding: "40px 0 36px" }}>
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          <div className="floodlight-beam" style={{ position: "absolute", top: "-20%", bottom: "-20%", width: "18%", background: `linear-gradient(90deg, transparent 0%, ${t.accentGlow} 50%, transparent 100%)`, filter: "blur(18px)" }} />
        </div>

        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 40, alignItems: "start" }}>

            {/* Left */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16 }}>
                <span className="live-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: t.accent, display: "inline-block", boxShadow: `0 0 8px ${t.accentGlow}` }} />
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", color: t.accent, textTransform: "uppercase" }}>En vivo · {t.label}</span>
              </div>

              <h1 style={{ fontWeight: 900, fontSize: "clamp(30px, 3.8vw, 52px)", letterSpacing: "-0.044em", lineHeight: 1.03, marginBottom: 8 }}>
                Retos activos.
              </h1>
              <h2 style={{ fontWeight: 900, fontSize: "clamp(26px, 3.2vw, 44px)", letterSpacing: "-0.040em", lineHeight: 1.03, color: "rgba(255,255,255,0.18)", marginBottom: 18 }}>
                Entrá ya.
              </h2>

              <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.36)", marginBottom: 28, letterSpacing: "-0.01em", lineHeight: 1.5, maxWidth: 420 }}>
                {loading
                  ? "Cargando retos en tiempo real..."
                  : retos.length === 0
                  ? `No hay retos de ${sportLabel} activos ahora mismo.`
                  : <><span style={{ color: "rgba(255,255,255,0.72)", fontWeight: 700 }}>{lookingCount} equipo{lookingCount !== 1 ? "s" : ""}</span> buscando rival · {activeCount > 0 && <><span style={{ color: "rgba(255,255,255,0.72)", fontWeight: 700 }}>{activeCount}</span> en juego · </>}Costa Rica</>
                }
              </p>

              {/* Format pills */}
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.24)", textTransform: "uppercase", marginBottom: 8 }}>Formato</p>
                <div className="filter-pills" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {FORMATS.map(f => {
                    const active = format === f;
                    return (
                      <button key={f} onClick={() => setFormat(f)} className="pill" style={{ padding: "7px 16px", borderRadius: 99, cursor: "pointer", border: "none", fontSize: 12, fontWeight: 700, letterSpacing: "-0.01em", background: active ? t.accent : "rgba(255,255,255,0.06)", color: active ? "#000" : "rgba(255,255,255,0.42)", outline: active ? "none" : "1px solid rgba(255,255,255,0.08)", boxShadow: active ? `0 0 18px ${t.accentGlow}, 0 0 0 1px ${t.border}` : "none" }}>{f}</button>
                    );
                  })}
                </div>
              </div>

              {/* Level pills */}
              <div>
                <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.24)", textTransform: "uppercase", marginBottom: 8 }}>Nivel</p>
                <div className="filter-pills" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {LEVELS.map(l => {
                    const active = level === l;
                    return (
                      <button key={l} onClick={() => setLevel(l)} className="pill" style={{ padding: "6px 14px", borderRadius: 99, cursor: "pointer", border: "none", fontSize: 11.5, fontWeight: 600, letterSpacing: "-0.01em", background: active ? `${t.bg}` : "transparent", color: active ? t.accent : "rgba(255,255,255,0.34)", outline: active ? `1px solid ${t.border}` : "1px solid rgba(255,255,255,0.06)" }}>{l}</button>
                    );
                  })}
                </div>
              </div>

              <Link href="/crear-partido" className="btn-primary hero-mobile-cta" style={{ marginTop: 28, padding: "13px 28px", fontSize: 14, borderRadius: 13, gap: 8, letterSpacing: "-0.01em" }}>
                <Plus size={16} /> Crear reto
              </Link>
            </div>

            {/* Right: CTA panel */}
            <div className="cta-panel" style={{ borderRadius: 20, overflow: "hidden", background: `linear-gradient(145deg, ${t.bg} 0%, rgba(0,0,0,0.00) 55%), linear-gradient(160deg, #181818 0%, #0f0f0f 100%)`, border: `1px solid ${t.border}`, boxShadow: "0 1px 0 rgba(255,255,255,0.05) inset, 0 12px 48px rgba(0,0,0,0.55)", padding: "26px 24px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.28)", textTransform: "uppercase" }}>En vivo</p>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ADE80", opacity: onlineDot ? 1 : 0.28, transition: "opacity 0.6s ease", boxShadow: onlineDot ? "0 0 5px rgba(74,222,128,0.7)" : "none" }} />
                  <span style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.24)", letterSpacing: "-0.01em" }}>en vivo</span>
                </div>
              </div>

              <h3 style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.038em", lineHeight: 1.15, marginBottom: 6, color: "rgba(255,255,255,0.94)" }}>¿Armás el partido?</h3>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.36)", lineHeight: 1.55, marginBottom: 22, letterSpacing: "-0.01em" }}>Publicá tu reto. Los equipos te encuentran solos.</p>

              <Link href="/crear-partido" className="btn-primary" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 0", width: "100%", fontSize: 13.5, borderRadius: 13, letterSpacing: "-0.01em", fontWeight: 800 }}>
                <Plus size={15} /> Crear reto
              </Link>

              {/* Live counts — real data */}
              <div style={{ display: "flex", alignItems: "stretch", gap: 8, marginTop: 14 }}>
                <div style={{ flex: 1, padding: "12px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
                  <p style={{ fontWeight: 900, fontSize: 22, color: t.accent, letterSpacing: "-0.04em", lineHeight: 1 }}>{loading ? "–" : lookingCount}</p>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", marginTop: 3, lineHeight: 1.3 }}>buscando<br />rival</p>
                </div>
                <div style={{ flex: 1, padding: "12px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
                  <p style={{ fontWeight: 900, fontSize: 22, color: "#4ADE80", letterSpacing: "-0.04em", lineHeight: 1 }}>{loading ? "–" : activeCount}</p>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", marginTop: 3, lineHeight: 1.3 }}>equipos<br />activos</p>
                </div>
              </div>

              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "20px 0" }} />

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { text: `Retos de ${sportLabel} en Costa Rica`, color: t.accent },
                  { text: "Datos en tiempo real · sin hardcodear", color: "#4ADE80" },
                ].map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="live-dot" style={{ width: 5, height: 5, borderRadius: "50%", background: s.color, display: "inline-block", flexShrink: 0, animationDelay: `${i * 0.4}s` }} />
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.44)", letterSpacing: "-0.01em", fontWeight: 500 }}>{s.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Results ── */}
      <div className="container" style={{ padding: "28px 40px 96px", position: "relative", zIndex: 1 }}>

        {/* Count row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.26)", fontWeight: 500, letterSpacing: "-0.01em" }}>
              <span style={{ fontWeight: 800, color: "rgba(255,255,255,0.68)", fontSize: 13.5 }}>{filtered.length}</span>{" "}
              reto{filtered.length !== 1 ? "s" : ""} activo{filtered.length !== 1 ? "s" : ""}
            </p>
            {(format !== "Todos" || level !== "Todos") && (
              <button onClick={() => { setFormat("Todos"); setLevel("Todos"); }} style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.26)", background: "none", border: "none", cursor: "pointer", letterSpacing: "-0.01em" }}>
                Limpiar filtros
              </button>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="section-dot" style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ADE80", display: "inline-block" }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(255,255,255,0.26)", textTransform: "uppercase" }}>Tiempo real</span>
          </div>
        </div>

        {/* Loading skeleton */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: 16 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ borderRadius: 20, height: 280, background: "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.015) 100%)", border: "1px solid rgba(255,255,255,0.06)", animation: "pulse 1.6s ease-in-out infinite" }} />
            ))}
          </div>

        ) : sorted.length === 0 && (format !== "Todos" || level !== "Todos") ? (
          /* No results for these filters */
          <div style={{ textAlign: "center", padding: "88px 24px" }}>
            <div style={{ width: 72, height: 72, borderRadius: 22, margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", fontSize: 32 }}>{sportIcon}</div>
            <p style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, letterSpacing: "-0.025em" }}>No hay retos con esos filtros</p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.28)", marginBottom: 24 }}>Intentá con otro formato o nivel</p>
            <button onClick={() => { setFormat("Todos"); setLevel("Todos"); }} className="btn-primary" style={{ padding: "10px 24px", fontSize: 13, borderRadius: 10 }}>
              Ver todos los retos
            </button>
          </div>

        ) : sorted.length === 0 ? (
          /* Truly no retos */
          <div style={{ textAlign: "center", padding: "88px 24px" }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center", background: t.bg, border: `1px solid ${t.border}`, fontSize: 36 }}>{sportIcon}</div>
            <p style={{ fontSize: 20, fontWeight: 900, marginBottom: 8, letterSpacing: "-0.03em" }}>
              No hay retos activos ahora mismo.
            </p>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.32)", lineHeight: 1.65, marginBottom: 32, maxWidth: 360, margin: "0 auto 32px" }}>
              Sé el primero en lanzar un reto de {sportLabel} esta noche. Los equipos de la zona lo ven en tiempo real.
            </p>
            <Link href="/crear-partido" className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 32px", fontSize: 14, borderRadius: 13, fontWeight: 800, letterSpacing: "-0.01em" }}>
              <Plus size={16} /> Crear reto
            </Link>
          </div>

        ) : (
          <div className="cards-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {sorted.map(r => <MatchCard key={r.id} r={r} />)}
          </div>
        )}
      </div>
    </div>
  );
}

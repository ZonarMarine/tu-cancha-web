"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Calendar, Clock, ChevronDown } from "lucide-react";

/* ─── data ─────────────────────────────────────────────────── */

const SPORT_OPTIONS = [
  { label: "Todos los deportes", value: "todos",  icon: "🏟", hint: "Fútbol, Pádel..." },
  { label: "Fútbol",             value: "futbol", icon: "⚽", hint: "5v5, 7v7, 11v11"  },
  { label: "Pádel",              value: "padel",  icon: "🏓", hint: "Individual o dobles" },
];

const LOCATION_OPTIONS = [
  { label: "Todas las zonas",  hint: "" },
  { label: "Santa Ana",        hint: "Lindora, Ciudad Colón" },
  { label: "Escazú",           hint: "Guachipelín, San Rafael" },
  { label: "Heredia",          hint: "Santo Domingo, Barva" },
  { label: "Alajuela",         hint: "San Rafael, La Garita" },
  { label: "San José",         hint: "Sabana, Zapote, Curridabat" },
];

const TIME_OPTIONS = [
  "Cualquier hora",
  "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM",
  "5:00 PM", "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM",
];

const QUICK_FILTERS = [
  { id: "hoy",    label: "Hoy"                },
  { id: "manana", label: "Mañana"             },
  { id: "finde",  label: "Este fin de semana" },
  { id: "cerca",  label: "📍 Cerca de mí"    },
] as const;

/* ─── helpers ───────────────────────────────────────────────── */

function todayISO()    { return new Date().toISOString().split("T")[0]; }
function offsetISO(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}
function saturdayISO() {
  const d = new Date();
  const until = ((6 - d.getDay()) + 7) % 7 || 7;
  d.setDate(d.getDate() + until);
  return d.toISOString().split("T")[0];
}
function fmtDate(iso: string) {
  if (!iso) return "";
  const [y, m, day] = iso.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("es-CR", {
    weekday: "short", day: "numeric", month: "short",
  });
}

/* ─── useDropdown ───────────────────────────────────────────── */

function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);
  const toggle = useCallback(() => setOpen(v => !v), []);
  const close  = useCallback(() => setOpen(false),   []);
  return { open, toggle, close, ref };
}

/* ─── component ─────────────────────────────────────────────── */

export default function HomeAdvancedSearch() {
  const router = useRouter();

  const [sport,    setSport]    = useState("todos");
  const [location, setLocation] = useState("");
  const [date,     setDate]     = useState("");
  const [hora,     setHora]     = useState("");
  const [nearMe,   setNearMe]   = useState(false);
  const [geoError, setGeoError] = useState("");

  const sportDd    = useDropdown();
  const locationDd = useDropdown();
  const dateDd     = useDropdown();
  const horaDd     = useDropdown();

  function openOnly(dd: ReturnType<typeof useDropdown>) {
    [sportDd, locationDd, dateDd, horaDd].forEach(d => { if (d !== dd) d.close(); });
    dd.toggle();
  }

  // Build a list of the next 30 days for the date dropdown
  const DATE_OPTIONS = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const iso  = d.toISOString().split("T")[0];
    const disp = d.toLocaleDateString("es-CR", { weekday: "short", day: "numeric", month: "short" });
    const label = i === 0 ? `Hoy — ${disp}` : i === 1 ? `Mañana — ${disp}` : disp;
    return { iso, label };
  });

  function handleSearch() {
    const p = new URLSearchParams();
    p.set("sport", sport);
    if (location && location !== "Todas las zonas") p.set("location", location);
    if (date)  p.set("date", date);
    if (hora && hora !== "Cualquier hora")          p.set("hora", hora);
    router.push(`/explorar?${p.toString()}`);
  }

  function applyQuick(id: typeof QUICK_FILTERS[number]["id"]) {
    setGeoError("");
    if (id === "hoy")    { setDate(todayISO());    return; }
    if (id === "manana") { setDate(offsetISO(1));  return; }
    if (id === "finde")  { setDate(saturdayISO()); return; }
    if (!navigator.geolocation) {
      setGeoError("Tu navegador no soporta geolocalización.");
      return;
    }
    setNearMe(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        if      (lat > 10.05) setLocation("Heredia");
        else if (lat > 9.95)  setLocation("Alajuela");
        else if (lat > 9.85)  setLocation("San José");
        else                  setLocation("Santa Ana");
        setNearMe(false);
      },
      (err) => {
        setNearMe(false);
        setGeoError(err.code === 1
          ? "Permiso de ubicación denegado. Activalo en Configuración."
          : "No se pudo obtener tu ubicación. Intentá de nuevo."
        );
      },
      { timeout: 8000 }
    );
  }

  const sportOpt  = SPORT_OPTIONS.find(s => s.value === sport) ?? SPORT_OPTIONS[0];
  const locOpt    = LOCATION_OPTIONS.find(l => l.label === location);
  const dateDisp  = date ? fmtDate(date) : undefined;
  const horaDisp  = hora && hora !== "Cualquier hora" ? hora : undefined;
  const locDisp   = location && location !== "Todas las zonas" ? location : undefined;

  const today    = todayISO();
  const tomorrow = offsetISO(1);
  const saturday = saturdayISO();

  return (
    <>
      <style>{`
        /* ── Section — pulls up to overlap hero bottom ── */
        .hads-section {
          position: relative;
          z-index: 10;
          margin-top: -100px;
          padding: 0 0 56px;
        }

        /* ── Inner width constraint ── */
        .hads-inner {
          max-width: 1080px;
          margin: 0 auto;
          padding: 0 40px;
        }

        /* ── Card ── */
        .hads-card {
          background: rgba(9,9,9,0.88);
          -webkit-backdrop-filter: blur(40px);
          backdrop-filter: blur(40px);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 26px;
          padding: 28px 32px 24px;
          box-shadow:
            0 8px 80px rgba(0,0,0,0.55),
            0 1px 0 rgba(255,255,255,0.05) inset,
            0 0 0 1px rgba(0,0,0,0.5);
          position: relative;
        }

        /* ── Search bar row ── */
        .hads-grid {
          display: flex;
          align-items: stretch;
          background: rgba(255,255,255,0.028);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          margin-bottom: 16px;
          overflow: visible;
        }

        /* ── Individual fields ── */
        .hads-field {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex: 1;
          padding: 12px 16px;
          cursor: pointer;
          position: relative;
          transition: background 0.15s;
          min-width: 0;
        }
        .hads-field:hover { background: rgba(255,255,255,0.025); }
        .hads-field:first-child { border-radius: 16px 0 0 16px; }

        /* Primary fields (Sport + Location) — wider and more prominent */
        .hads-field--primary { flex: 1.35; }

        .hads-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.22);
          display: flex;
          align-items: center;
          gap: 4px;
          pointer-events: none;
          margin-bottom: 1px;
        }
        .hads-label--primary { color: rgba(255,255,255,0.3); font-size: 9.5px; }

        .hads-value {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.35);
          line-height: 1.2;
          min-width: 0;
        }
        .hads-value--primary {
          font-size: 14px;
          font-weight: 700;
        }
        .hads-value--set { color: rgba(255,255,255,0.88); }
        .hads-value-text {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          min-width: 0;
        }
        .hads-hint {
          font-size: 10px;
          color: rgba(255,255,255,0.18);
          font-weight: 400;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          pointer-events: none;
          margin-top: 1px;
        }

        /* ── Dividers ── */
        .hads-divider {
          width: 1px;
          height: 36px;
          background: rgba(255,255,255,0.06);
          flex-shrink: 0;
          align-self: center;
        }

        /* ── CTA button ── */
        .hads-btn-wrap {
          padding: 7px;
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }
        .hads-search-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 11px 22px;
          border-radius: 12px;
          background: #D7FF00;
          color: #0a0a0a;
          font-weight: 800;
          font-size: 13.5px;
          letter-spacing: -0.02em;
          border: none;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 0 20px rgba(215,255,0,0.20), 0 2px 8px rgba(0,0,0,0.35);
          transition: transform 0.12s, box-shadow 0.12s, background 0.12s;
        }
        .hads-search-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 0 30px rgba(215,255,0,0.32), 0 4px 16px rgba(0,0,0,0.5);
          background: #e4ff26;
        }
        .hads-search-btn:active { transform: translateY(0); }

        /* ── Quick chips ── */
        .hads-chips-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .hads-chip {
          padding: 6px 14px;
          border-radius: 99px;
          background: rgba(255,255,255,0.035);
          border: 1px solid rgba(255,255,255,0.07);
          font-size: 12px;
          font-weight: 600;
          color: rgba(255,255,255,0.35);
          cursor: pointer;
          transition: all 0.18s cubic-bezier(0.34,1.56,0.64,1);
          white-space: nowrap;
          user-select: none;
        }
        .hads-chip:hover:not(:disabled) {
          background: rgba(255,255,255,0.07);
          color: rgba(255,255,255,0.65);
          border-color: rgba(255,255,255,0.12);
        }
        .hads-chip.active {
          background: rgba(215,255,0,0.1);
          border-color: rgba(215,255,0,0.3);
          color: #D7FF00;
          box-shadow: 0 0 12px rgba(215,255,0,0.15), 0 0 0 1px rgba(215,255,0,0.12) inset;
          transform: scale(1.04);
        }
        .hads-chip:disabled { opacity: 0.45; cursor: default; }

        /* ── Dropdown menus ── */
        .hads-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          min-width: 210px;
          max-height: 270px;
          overflow-y: auto;
          background: rgba(11,11,11,0.98);
          -webkit-backdrop-filter: blur(32px);
          backdrop-filter: blur(32px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          padding: 6px;
          z-index: 1100;
          box-shadow: 0 16px 60px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.04) inset;
          animation: ddIn 0.14s cubic-bezier(0.22,0.61,0.36,1) both;
        }
        .hads-dropdown--right { left: auto; right: 0; }
        .hads-dropdown-item {
          padding: 9px 12px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          color: rgba(255,255,255,0.65);
          cursor: pointer;
          transition: background 0.1s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .hads-dropdown-item:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.9); }
        .hads-dropdown-item.selected { background: rgba(215,255,0,0.08); color: #D7FF00; }
        .hads-dropdown-hint {
          font-size: 10.5px;
          color: rgba(255,255,255,0.28);
          font-weight: 400;
          margin-top: 1px;
        }
        @keyframes ddIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }

        /* ── Sport decorations ── */
        .hads-deco {
          position: absolute;
          top: 50%;
          pointer-events: none;
          user-select: none;
          font-size: 108px;
          line-height: 1;
          -webkit-filter: blur(1.5px);
          filter: blur(1.5px);
        }
        .hads-deco-left {
          left: -56px;
          opacity: 0.38;
          filter: blur(1.5px) drop-shadow(0 0 28px rgba(215,255,0,0.55));
          animation: floatL 7s ease-in-out infinite;
        }
        .hads-deco-right {
          right: -56px;
          opacity: 0.38;
          filter: blur(1.5px) drop-shadow(0 0 28px rgba(96,165,250,0.55));
          animation: floatR 7s ease-in-out infinite;
          animation-delay: -3.5s;
        }
        @keyframes floatL {
          0%,100% { transform: translateY(-50%) rotate(-14deg) translateY(0px);  }
          50%      { transform: translateY(-50%) rotate(-11deg) translateY(-9px); }
        }
        @keyframes floatR {
          0%,100% { transform: translateY(-50%) rotate(15deg) translateY(0px);   }
          50%      { transform: translateY(-50%) rotate(12deg) translateY(-9px);  }
        }

        /* ── Geo error ── */
        .hads-geo-error {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: rgba(255,130,80,0.9);
          margin-top: 10px;
          padding: 7px 12px;
          border-radius: 9px;
          background: rgba(255,80,50,0.07);
          border: 1px solid rgba(255,80,50,0.16);
        }

        /* ── Responsive: tablet ── */
        @media (max-width: 900px) {
          .hads-inner { padding: 0 24px; }
          .hads-deco  { display: none; }
          .hads-grid  { flex-wrap: wrap; }
          .hads-field { min-width: calc(50% - 0.5px); }
          .hads-field--primary { flex: 1 1 calc(50% - 0.5px); }
          .hads-divider { display: none; }
          .hads-btn-wrap { width: 100%; padding: 8px; }
          .hads-search-btn { width: 100%; justify-content: center; padding: 13px 22px; font-size: 14px; }
        }

        /* ── Responsive: mobile ── */
        @media (max-width: 540px) {
          .hads-section { margin-top: -60px; padding-bottom: 40px; }
          .hads-inner   { padding: 0 16px; }
          .hads-card    { padding: 20px 18px 18px; border-radius: 20px; }
          .hads-grid    { border-radius: 14px; }
          .hads-field, .hads-field--primary {
            min-width: 100% !important;
            flex: unset !important;
            border-radius: 0 !important;
          }
          .hads-field:first-child { border-radius: 14px 14px 0 0 !important; }
          .hads-dropdown, .hads-dropdown--right {
            left: 0; right: 0; min-width: unset;
          }
          .hads-hint { display: none; }
        }
      `}</style>

      <section className="hads-section">
        {/* Ambient glow */}
        <div aria-hidden style={{
          position: "absolute", top: 0, left: "50%",
          transform: "translateX(-50%)",
          width: 800, height: 300, pointerEvents: "none",
          background: "radial-gradient(ellipse 60% 80% at 50% 0%, rgba(215,255,0,0.018) 0%, transparent 70%)",
        }} />

        <div className="hads-inner">
          <div style={{ position: "relative" }}>

            {/* ⚽ left deco */}
            <div aria-hidden className="hads-deco hads-deco-left">⚽</div>
            {/* 🏓 right deco */}
            <div aria-hidden className="hads-deco hads-deco-right">🏓</div>

            {/* ── Card ── */}
            <div className="hads-card">

              {/* Eyebrow */}
              <p style={{
                fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em",
                color: "rgba(215,255,0,0.45)", marginBottom: 18,
                textTransform: "uppercase", display: "flex", alignItems: "center", gap: 7,
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: "#D7FF00", display: "inline-block",
                  boxShadow: "0 0 6px #D7FF00", animation: "pulse 2s infinite",
                }} />
                Encontrá tu cancha
              </p>

              {/* ── Search bar ── */}
              <div className="hads-grid">

                {/* Deporte — primary */}
                <div ref={sportDd.ref}
                  className="hads-field hads-field--primary"
                  style={{ borderRadius: "16px 0 0 16px" }}
                  onClick={() => openOnly(sportDd)}>
                  <span className="hads-label hads-label--primary">
                    <span style={{ fontSize: 10 }}>⚽</span> Deporte
                  </span>
                  <span className={`hads-value hads-value--primary${sport !== "todos" ? " hads-value--set" : ""}`}>
                    <span style={{ fontSize: 17, flexShrink: 0 }}>{sportOpt.icon}</span>
                    <span className="hads-value-text">{sportOpt.label}</span>
                    <ChevronDown size={12} style={{ opacity: 0.3, flexShrink: 0 }} />
                  </span>
                  {!sport || sport === "todos" ? (
                    <span className="hads-hint">{sportOpt.hint}</span>
                  ) : null}
                  {sportDd.open && (
                    <div className="hads-dropdown">
                      {SPORT_OPTIONS.map(s => (
                        <div key={s.value}
                          className={`hads-dropdown-item${sport === s.value ? " selected" : ""}`}
                          onClick={e => { e.stopPropagation(); setSport(s.value); sportDd.close(); }}>
                          <span style={{ fontSize: 18 }}>{s.icon}</span>
                          <div>
                            <div>{s.label}</div>
                            <div className="hads-dropdown-hint">{s.hint}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="hads-divider" />

                {/* Ubicación — primary */}
                <div ref={locationDd.ref}
                  className="hads-field hads-field--primary"
                  onClick={() => openOnly(locationDd)}>
                  <span className="hads-label hads-label--primary">
                    <MapPin size={9} /> Ubicación
                  </span>
                  <span className={`hads-value hads-value--primary${locDisp ? " hads-value--set" : ""}`}>
                    <MapPin size={13} style={{ flexShrink: 0, opacity: 0.45 }} />
                    <span className="hads-value-text">{locDisp ?? "Zona o ciudad"}</span>
                    <ChevronDown size={12} style={{ opacity: 0.3, flexShrink: 0 }} />
                  </span>
                  {!locDisp ? (
                    <span className="hads-hint">Escazú, Santa Ana, Heredia…</span>
                  ) : locOpt?.hint ? (
                    <span className="hads-hint">{locOpt.hint}</span>
                  ) : null}
                  {locationDd.open && (
                    <div className="hads-dropdown">
                      {LOCATION_OPTIONS.map(l => (
                        <div key={l.label}
                          className={`hads-dropdown-item${location === l.label ? " selected" : ""}`}
                          onClick={e => { e.stopPropagation(); setLocation(l.label); locationDd.close(); }}>
                          <MapPin size={12} style={{ opacity: 0.4, flexShrink: 0 }} />
                          <div>
                            <div>{l.label}</div>
                            {l.hint && <div className="hads-dropdown-hint">{l.hint}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="hads-divider" />

                {/* Fecha */}
                <div ref={dateDd.ref} className="hads-field"
                  onClick={() => openOnly(dateDd)}>
                  <span className="hads-label">
                    <Calendar size={9} /> Fecha
                  </span>
                  <span className={`hads-value${dateDisp ? " hads-value--set" : ""}`}>
                    <Calendar size={12} style={{ flexShrink: 0, opacity: 0.45 }} />
                    <span className="hads-value-text">{dateDisp ?? "¿Cuándo jugás?"}</span>
                    <ChevronDown size={12} style={{ opacity: 0.3, flexShrink: 0 }} />
                  </span>
                  {dateDd.open && (
                    <div className="hads-dropdown" style={{ maxHeight: 260 }}>
                      {/* Clear option */}
                      {date && (
                        <div className="hads-dropdown-item"
                          style={{ color: "rgba(255,100,100,0.65)", fontSize: 12 }}
                          onClick={e => { e.stopPropagation(); setDate(""); dateDd.close(); }}>
                          <span style={{ opacity: 0.6 }}>✕</span> Quitar fecha
                        </div>
                      )}
                      {DATE_OPTIONS.map(opt => (
                        <div key={opt.iso}
                          className={`hads-dropdown-item${date === opt.iso ? " selected" : ""}`}
                          onClick={e => { e.stopPropagation(); setDate(opt.iso); dateDd.close(); }}>
                          <Calendar size={11} style={{ opacity: 0.35, flexShrink: 0 }} />
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="hads-divider" />

                {/* Hora */}
                <div ref={horaDd.ref} className="hads-field"
                  onClick={() => openOnly(horaDd)}>
                  <span className="hads-label">
                    <Clock size={9} /> Hora
                  </span>
                  <span className={`hads-value${horaDisp ? " hads-value--set" : ""}`}>
                    <Clock size={12} style={{ flexShrink: 0, opacity: 0.45 }} />
                    <span className="hads-value-text">{horaDisp ?? "Cualquier hora"}</span>
                    <ChevronDown size={12} style={{ opacity: 0.3, flexShrink: 0 }} />
                  </span>
                  {horaDd.open && (
                    <div className="hads-dropdown hads-dropdown--right" style={{ maxHeight: 220 }}>
                      {TIME_OPTIONS.map(t => (
                        <div key={t}
                          className={`hads-dropdown-item${hora === t ? " selected" : ""}`}
                          onClick={e => { e.stopPropagation(); setHora(t); horaDd.close(); }}>
                          <Clock size={11} style={{ opacity: 0.35, flexShrink: 0 }} /> {t}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Buscar */}
                <div className="hads-btn-wrap">
                  <button className="hads-search-btn" onClick={handleSearch}>
                    <Search size={14} />
                    Buscar Canchas
                  </button>
                </div>

              </div>{/* /.hads-grid */}

              {/* ── Quick chips ── */}
              <div className="hads-chips-row">
                <span style={{
                  fontSize: 10.5, fontWeight: 600,
                  color: "rgba(255,255,255,0.16)",
                  letterSpacing: "0.04em", flexShrink: 0,
                }}>
                  Acceso rápido:
                </span>
                {QUICK_FILTERS.map(chip => {
                  const active =
                    (chip.id === "hoy"    && date === today)    ||
                    (chip.id === "manana" && date === tomorrow) ||
                    (chip.id === "finde"  && date === saturday) ||
                    (chip.id === "cerca"  && nearMe);
                  return (
                    <button key={chip.id}
                      className={`hads-chip${active ? " active" : ""}`}
                      onClick={() => applyQuick(chip.id)}
                      disabled={nearMe}>
                      {chip.id === "cerca" && nearMe ? "Buscando…" : chip.label}
                    </button>
                  );
                })}
              </div>

              {/* Geo error */}
              {geoError && (
                <div className="hads-geo-error" role="alert">
                  <span style={{ flex: 1 }}>{geoError}</span>
                  <button onClick={() => setGeoError("")}
                    style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 13, opacity: 0.6, padding: 0, lineHeight: 1 }}>
                    ✕
                  </button>
                </div>
              )}

            </div>{/* /.hads-card */}
          </div>
        </div>
      </section>
    </>
  );
}

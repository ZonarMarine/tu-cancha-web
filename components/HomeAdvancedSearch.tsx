"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Calendar, Clock, ChevronDown } from "lucide-react";

/* ─── data ─────────────────────────────────────────────────── */

const SPORT_OPTIONS = [
  { label: "Todos los deportes", value: "todos",  icon: "🏟" },
  { label: "Fútbol",             value: "futbol", icon: "⚽" },
  { label: "Pádel",              value: "padel",  icon: "🏓" },
];

const LOCATION_OPTIONS = [
  "Todas las zonas",
  "Santa Ana",
  "Escazú",
  "Heredia",
  "Alajuela",
  "San José",
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

/* ─── date helpers ──────────────────────────────────────────── */

function todayISO() {
  return new Date().toISOString().split("T")[0];
}
function offsetISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}
/** Next Saturday (always ≥ 1 day away) */
function saturdayISO() {
  const d = new Date();
  // 6 = Saturday; if today is Saturday push to next Saturday
  const daysUntil = ((6 - d.getDay()) + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntil);
  return d.toISOString().split("T")[0];
}
function fmtDate(iso: string) {
  if (!iso) return "";
  const [y, m, day] = iso.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("es-CR", {
    weekday: "short", day: "numeric", month: "short",
  });
}

/* ─── useDropdown hook ──────────────────────────────────────── */

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
  const horaDd     = useDropdown();

  /** Close every other dropdown before opening one */
  function openOnly(dd: ReturnType<typeof useDropdown>) {
    [sportDd, locationDd, horaDd].forEach(d => { if (d !== dd) d.close(); });
    dd.toggle();
  }

  function handleSearch() {
    const params = new URLSearchParams();
    params.set("sport", sport); // always include — "todos" | "futbol" | "padel"
    if (location && location !== "Todas las zonas") params.set("location", location);
    if (date)  params.set("date", date);
    if (hora && hora !== "Cualquier hora")          params.set("hora", hora);
    router.push(`/explorar?${params.toString()}`);
  }

  function applyQuick(id: typeof QUICK_FILTERS[number]["id"]) {
    setGeoError("");
    if (id === "hoy")    { setDate(todayISO());   return; }
    if (id === "manana") { setDate(offsetISO(1)); return; }
    if (id === "finde")  { setDate(saturdayISO()); return; }
    // cerca de mí
    if (!navigator.geolocation) {
      setGeoError("Tu navegador no soporta geolocalización.");
      return;
    }
    setNearMe(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        // Rough Costa Rica zone heuristic by latitude
        if      (lat > 10.05) setLocation("Heredia");
        else if (lat > 9.95)  setLocation("Alajuela");
        else if (lat > 9.85)  setLocation("San José");
        else                  setLocation("Santa Ana");
        setNearMe(false);
      },
      (err) => {
        setNearMe(false);
        if (err.code === 1) {
          setGeoError("Permiso de ubicación denegado. Activalo en tu navegador.");
        } else {
          setGeoError("No se pudo obtener tu ubicación. Intentá de nuevo.");
        }
      },
      { timeout: 8000 }
    );
  }

  const sportOption  = SPORT_OPTIONS.find(s => s.value === sport) ?? SPORT_OPTIONS[0];
  const dateDisplay  = date ? fmtDate(date) : undefined;
  const horaDisplay  = hora && hora !== "Cualquier hora" ? hora : undefined;
  const locDisplay   = location && location !== "Todas las zonas" ? location : undefined;

  const today    = todayISO();
  const tomorrow = offsetISO(1);
  const saturday = saturdayISO();

  return (
    <>
      <style>{`
        /* ── Section ── */
        .hads-section { padding: 36px 0 48px; position: relative; }

        /* ── Card ── */
        .hads-card {
          background: rgba(10,10,10,0.82);
          -webkit-backdrop-filter: blur(32px);
          backdrop-filter: blur(32px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          padding: 24px 28px 20px;
          box-shadow: 0 4px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04);
          position: relative; z-index: 1;
        }

        /* ── Search bar (inner row) ── */
        .hads-grid {
          display: flex; align-items: stretch;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 18px; margin-bottom: 14px;
          overflow: visible;
        }
        .hads-field {
          display: flex; flex-direction: column; gap: 3;
          flex: 1; padding: 11px 15px; cursor: pointer; position: relative;
          min-width: 0;
        }
        .hads-field:hover { background: rgba(255,255,255,0.022); }
        .hads-field:first-child { border-radius: 18px 0 0 18px; }
        .hads-label {
          font-size: 9.5px; font-weight: 700; letter-spacing: 0.09em;
          color: rgba(255,255,255,0.25); text-transform: uppercase;
          display: flex; align-items: center; gap: 4; pointer-events: none;
        }
        .hads-value {
          font-size: 13.5px; font-weight: 600; margin-top: 1px;
          display: flex; align-items: center; gap: 6;
        }
        .hads-value--empty { color: rgba(255,255,255,0.38); }
        .hads-value--set   { color: rgba(255,255,255,0.90); }

        /* ── Dividers ── */
        .hads-divider {
          width: 1px; flex-shrink: 0; align-self: center;
          height: 32px; background: rgba(255,255,255,0.07);
        }

        /* ── Search button ── */
        .hads-btn-wrap { padding: 6px; display: flex; align-items: center; flex-shrink: 0; }
        .hads-search-btn {
          display: flex; align-items: center; gap: 8;
          padding: 12px 24px; border-radius: 13px;
          background: #D7FF00; color: #000;
          font-weight: 800; font-size: 14px; letter-spacing: -0.02em;
          border: none; cursor: pointer; white-space: nowrap;
          box-shadow: 0 0 24px rgba(215,255,0,0.22), 0 2px 8px rgba(0,0,0,0.4);
          transition: transform 0.12s, box-shadow 0.12s;
        }
        .hads-search-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 0 32px rgba(215,255,0,0.32), 0 4px 16px rgba(0,0,0,0.5);
        }
        .hads-search-btn:active { transform: translateY(0); }

        /* ── Quick chips ── */
        .hads-chip {
          padding: 6px 14px; border-radius: 99px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.38);
          cursor: pointer; transition: all 0.15s; white-space: nowrap;
        }
        .hads-chip:hover:not(:disabled) {
          background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.65);
          border-color: rgba(255,255,255,0.12);
        }
        .hads-chip.active {
          background: rgba(215,255,0,0.08);
          border-color: rgba(215,255,0,0.22);
          color: #D7FF00;
        }
        .hads-chip:disabled { opacity: 0.5; cursor: default; }

        /* ── Dropdown menus ── */
        .hads-dropdown {
          position: absolute; top: calc(100% + 8px);
          min-width: 200px; max-height: 260px; overflow-y: auto;
          background: rgba(13,13,13,0.98);
          -webkit-backdrop-filter: blur(24px);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 16px;
          padding: 6px; z-index: 1100;
          box-shadow: 0 12px 48px rgba(0,0,0,0.65);
          animation: ddFadeIn 0.12s ease both;
          /* default: open left-aligned */
          left: 0;
        }
        /* Last dropdown (hora) opens right-aligned to avoid off-screen on mobile */
        .hads-dropdown--right { left: auto; right: 0; }
        .hads-dropdown-item {
          padding: 9px 12px; border-radius: 10px;
          font-size: 13px; font-weight: 500;
          color: rgba(255,255,255,0.68); cursor: pointer;
          transition: background 0.1s;
          display: flex; align-items: center; gap: 8;
        }
        .hads-dropdown-item:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.92); }
        .hads-dropdown-item.selected { background: rgba(215,255,0,0.08); color: #D7FF00; }
        @keyframes ddFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Sport decorations ── */
        .hads-deco {
          position: absolute; top: 50%; pointer-events: none;
          user-select: none; font-size: 96px; line-height: 1;
        }
        .hads-deco-left  {
          left: -28px;
          transform: translateY(-50%) rotate(-12deg);
          animation: hadsFloatL 6s ease-in-out infinite;
          opacity: 0.11;
          filter: drop-shadow(0 0 20px rgba(215,255,0,0.45));
        }
        .hads-deco-right {
          right: -28px;
          transform: translateY(-50%) rotate(14deg);
          animation: hadsFloatR 6s ease-in-out infinite;
          animation-delay: -3s;
          opacity: 0.11;
          filter: drop-shadow(0 0 20px rgba(96,165,250,0.45));
        }
        @keyframes hadsFloatL {
          0%,100% { transform: translateY(-50%) rotate(-12deg);               }
          50%     { transform: translateY(calc(-50% - 8px)) rotate(-12deg);   }
        }
        @keyframes hadsFloatR {
          0%,100% { transform: translateY(-50%) rotate(14deg);                }
          50%     { transform: translateY(calc(-50% - 8px)) rotate(14deg);    }
        }

        /* ── Geo error ── */
        .hads-geo-error {
          font-size: 11px; color: rgba(255,120,80,0.85);
          margin-top: 6px; padding: 6px 10px;
          border-radius: 8px; background: rgba(255,80,50,0.07);
          border: 1px solid rgba(255,80,50,0.15);
        }

        /* ── Responsive — tablet (2-column) ── */
        @media (max-width: 860px) {
          .hads-deco { display: none; }
          .hads-grid { flex-wrap: wrap; }
          .hads-field { min-width: calc(50% - 1px); }
          /* Hide all dividers; borders on the card provide enough separation */
          .hads-divider { display: none; }
          .hads-btn-wrap { width: 100%; padding: 8px 8px 8px; }
          .hads-search-btn { width: 100%; justify-content: center; }
        }

        /* ── Responsive — mobile (single column) ── */
        @media (max-width: 540px) {
          .hads-section { padding: 24px 0 36px; }
          .hads-card { padding: 20px 16px 16px; border-radius: 20px; }
          .hads-field { min-width: 100% !important; border-radius: 0 !important; }
          .hads-field:first-child { border-radius: 14px 14px 0 0 !important; }
          .hads-grid { border-radius: 14px; }
          /* Dropdown on mobile: always open left-aligned, full width of field */
          .hads-dropdown, .hads-dropdown--right {
            left: 0; right: 0; min-width: unset;
          }
        }
      `}</style>

      <section className="hads-section">
        {/* Ambient glow */}
        <div aria-hidden style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          width: 900, height: 360, pointerEvents: "none",
          background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(215,255,0,0.014) 0%, transparent 70%)",
        }} />

        <div className="container" style={{ position: "relative" }}>

          {/* ⚽ Left decoration */}
          <div aria-hidden className="hads-deco hads-deco-left">⚽</div>
          {/* 🏓 Right decoration */}
          <div aria-hidden className="hads-deco hads-deco-right">🏓</div>

          {/* ── Main card ── */}
          <div className="hads-card">

            {/* Card eyebrow */}
            <p style={{
              fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em",
              color: "rgba(215,255,0,0.5)", marginBottom: 16,
              textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: "50%", background: "#D7FF00",
                display: "inline-block", boxShadow: "0 0 6px #D7FF00",
                animation: "pulse 2s infinite",
              }} />
              Encontrá tu cancha
            </p>

            {/* ── Row 1: search fields ── */}
            <div className="hads-grid">

              {/* Deporte */}
              <div ref={sportDd.ref} className="hads-field"
                style={{ borderRadius: "18px 0 0 18px" }}
                onClick={() => openOnly(sportDd)}>
                <span className="hads-label">
                  <span style={{ fontSize: 10 }}>🏟</span> Deporte
                </span>
                <span className={`hads-value ${sport !== "todos" ? "hads-value--set" : "hads-value--empty"}`}>
                  <span style={{ fontSize: 15 }}>{sportOption.icon}</span>
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {sportOption.label}
                  </span>
                  <ChevronDown size={12} style={{ opacity: 0.35, flexShrink: 0 }} />
                </span>
                {sportDd.open && (
                  <div className="hads-dropdown">
                    {SPORT_OPTIONS.map(s => (
                      <div key={s.value}
                        className={`hads-dropdown-item${sport === s.value ? " selected" : ""}`}
                        onClick={e => { e.stopPropagation(); setSport(s.value); sportDd.close(); }}>
                        <span style={{ fontSize: 16 }}>{s.icon}</span> {s.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="hads-divider" />

              {/* Ubicación */}
              <div ref={locationDd.ref} className="hads-field"
                onClick={() => openOnly(locationDd)}>
                <span className="hads-label">
                  <MapPin size={9} /> Ubicación
                </span>
                <span className={`hads-value ${locDisplay ? "hads-value--set" : "hads-value--empty"}`}>
                  <MapPin size={12} style={{ flexShrink: 0, opacity: 0.45 }} />
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {locDisplay ?? "Zona / Ciudad"}
                  </span>
                  <ChevronDown size={12} style={{ opacity: 0.35, flexShrink: 0 }} />
                </span>
                {locationDd.open && (
                  <div className="hads-dropdown">
                    {LOCATION_OPTIONS.map(l => (
                      <div key={l}
                        className={`hads-dropdown-item${location === l ? " selected" : ""}`}
                        onClick={e => { e.stopPropagation(); setLocation(l); locationDd.close(); }}>
                        <MapPin size={11} style={{ opacity: 0.4, flexShrink: 0 }} /> {l}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="hads-divider" />

              {/* Fecha — native picker hidden behind label */}
              <div className="hads-field" style={{ position: "relative" }}>
                <span className="hads-label">
                  <Calendar size={9} /> Fecha
                </span>
                <span className={`hads-value ${dateDisplay ? "hads-value--set" : "hads-value--empty"}`}
                  style={{ pointerEvents: "none" }}>
                  <Calendar size={12} style={{ flexShrink: 0, opacity: 0.45 }} />
                  {dateDisplay ?? "Seleccioná fecha"}
                </span>
                <input
                  type="date"
                  value={date}
                  min={todayISO()}
                  onChange={e => setDate(e.target.value)}
                  aria-label="Fecha de reserva"
                  style={{
                    position: "absolute", inset: 0, opacity: 0,
                    cursor: "pointer", width: "100%", height: "100%",
                    fontSize: 16, /* prevent iOS auto-zoom */
                  }}
                />
              </div>

              <div className="hads-divider" />

              {/* Hora */}
              <div ref={horaDd.ref} className="hads-field"
                onClick={() => openOnly(horaDd)}>
                <span className="hads-label">
                  <Clock size={9} /> Hora
                </span>
                <span className={`hads-value ${horaDisplay ? "hads-value--set" : "hads-value--empty"}`}>
                  <Clock size={12} style={{ flexShrink: 0, opacity: 0.45 }} />
                  <span style={{ flex: 1 }}>{horaDisplay ?? "Cualquier hora"}</span>
                  <ChevronDown size={12} style={{ opacity: 0.35, flexShrink: 0 }} />
                </span>
                {horaDd.open && (
                  /* Opens right-aligned so it doesn't clip off-screen on small viewports */
                  <div className="hads-dropdown hads-dropdown--right" style={{ maxHeight: 220 }}>
                    {TIME_OPTIONS.map(t => (
                      <div key={t}
                        className={`hads-dropdown-item${hora === t ? " selected" : ""}`}
                        onClick={e => { e.stopPropagation(); setHora(t); horaDd.close(); }}>
                        <Clock size={11} style={{ opacity: 0.4, flexShrink: 0 }} /> {t}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Buscar button */}
              <div className="hads-btn-wrap">
                <button className="hads-search-btn" onClick={handleSearch}>
                  <Search size={14} />
                  Buscar Canchas
                </button>
              </div>

            </div>{/* /.hads-grid */}

            {/* ── Row 2: quick chips ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{
                fontSize: 10.5, fontWeight: 600, color: "rgba(255,255,255,0.18)",
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
                    disabled={nearMe && chip.id !== "cerca"}>
                    {chip.id === "cerca" && nearMe ? "Buscando…" : chip.label}
                  </button>
                );
              })}
            </div>

            {/* Geolocation error */}
            {geoError && (
              <p className="hads-geo-error" role="alert">
                {geoError}
                <button
                  onClick={() => setGeoError("")}
                  style={{ marginLeft: 8, background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 11, opacity: 0.7 }}>
                  ✕
                </button>
              </p>
            )}

          </div>{/* /.hads-card */}
        </div>
      </section>
    </>
  );
}

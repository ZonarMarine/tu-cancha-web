"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Calendar, Clock, ChevronDown, Navigation2 } from "lucide-react";

/* ─── data ─────────────────────────────────────────────────── */

const SPORT_OPTIONS = [
  { label: "Todos los deportes", value: "",       icon: "🏟" },
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
  { id: "hoy",   label: "Hoy" },
  { id: "mañana", label: "Mañana" },
  { id: "finde", label: "Este fin de semana" },
  { id: "cerca", label: "📍 Cerca de mí" },
] as const;

/* ─── helpers ───────────────────────────────────────────────── */

function todayISO() { return new Date().toISOString().split("T")[0]; }
function offsetISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}
function saturdayISO() {
  const d = new Date();
  const daysUntil = ((6 - d.getDay()) + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntil);
  return d.toISOString().split("T")[0];
}
function fmtDate(iso: string) {
  if (!iso) return "";
  const [y, m, day] = iso.split("-").map(Number);
  const d = new Date(y, m - 1, day);
  return d.toLocaleDateString("es-CR", { weekday: "short", day: "numeric", month: "short" });
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
  return { open, setOpen: useCallback((v: boolean | ((p: boolean) => boolean)) => setOpen(v), []), ref };
}

/* ─── component ─────────────────────────────────────────────── */

export default function HomeAdvancedSearch() {
  const router = useRouter();

  const [sport,    setSport]    = useState("");
  const [location, setLocation] = useState("");
  const [date,     setDate]     = useState("");
  const [hora,     setHora]     = useState("");
  const [nearMe,   setNearMe]   = useState(false);
  const [hovered,  setHovered]  = useState("");

  const sportDd    = useDropdown();
  const locationDd = useDropdown();
  const horaDd     = useDropdown();

  // Close all other dropdowns when one opens
  function openOnly(which: "sport" | "location" | "hora") {
    if (which !== "sport")    sportDd.setOpen(false);
    if (which !== "location") locationDd.setOpen(false);
    if (which !== "hora")     horaDd.setOpen(false);
  }

  function handleSearch() {
    const params = new URLSearchParams();
    if (sport) params.set("sport", sport);
    if (location && location !== "Todas las zonas") params.set("location", location);
    if (date)  params.set("date", date);
    if (hora && hora !== "Cualquier hora") params.set("hora", hora);
    router.push(`/explorar${params.toString() ? "?" + params : ""}`);
  }

  function applyQuick(id: typeof QUICK_FILTERS[number]["id"]) {
    if (id === "hoy")    setDate(todayISO());
    if (id === "mañana") setDate(offsetISO(1));
    if (id === "finde")  setDate(saturdayISO());
    if (id === "cerca") {
      setNearMe(true);
      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          // Costa Rica bounding: lat 8–11, lng -84 to -82
          // Simple heuristic: pick closest zone by latitude
          const lat = pos.coords.latitude;
          if (lat > 10.0) setLocation("Heredia");
          else if (lat > 9.9) setLocation("Alajuela");
          else setLocation("San José");
          setNearMe(false);
        },
        () => setNearMe(false)
      );
    }
  }

  const sportOption   = SPORT_OPTIONS.find(s => s.value === sport) ?? SPORT_OPTIONS[0];
  const dateDisplay   = date ? fmtDate(date) : undefined;
  const horaDisplay   = hora && hora !== "Cualquier hora" ? hora : undefined;
  const locDisplay    = location && location !== "Todas las zonas" ? location : undefined;

  const today    = todayISO();
  const tomorrow = offsetISO(1);
  const saturday = saturdayISO();

  return (
    <>
      <style>{`
        .hads-section { padding: 40px 0 52px; position: relative; }
        .hads-grid {
          display: flex; align-items: stretch; gap: 0;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 18px; margin-bottom: 14px;
          flex-wrap: wrap;
        }
        .hads-field {
          display: flex; flex-direction: column; gap: 4;
          flex: 1; min-width: 130px;
          padding: 12px 16px; cursor: pointer;
          border-radius: 0; position: relative;
        }
        .hads-field:hover { background: rgba(255,255,255,0.02); }
        .hads-field:first-child { border-radius: 18px 0 0 18px; }
        .hads-divider {
          width: 1px; flex-shrink: 0; align-self: center;
          height: 34px; background: rgba(255,255,255,0.07);
        }
        .hads-btn-wrap { padding: 7px; display: flex; align-items: center; flex-shrink: 0; }
        .hads-search-btn {
          display: flex; align-items: center; gap: 8;
          padding: 12px 26px; border-radius: 13px;
          background: #D7FF00; color: #000;
          font-weight: 800; font-size: 14px; letter-spacing: -0.02em;
          border: none; cursor: pointer; white-space: nowrap;
          box-shadow: 0 0 24px rgba(215,255,0,0.22), 0 2px 8px rgba(0,0,0,0.4);
          transition: transform 0.12s, box-shadow 0.12s;
        }
        .hads-search-btn:hover { transform: translateY(-1px); box-shadow: 0 0 32px rgba(215,255,0,0.32), 0 4px 16px rgba(0,0,0,0.5); }
        .hads-search-btn:active { transform: translateY(0); }
        .hads-chip {
          padding: 7px 14px; border-radius: 99px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.38);
          cursor: pointer; transition: all 0.15s; white-space: nowrap;
        }
        .hads-chip:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.65); border-color: rgba(255,255,255,0.12); }
        .hads-chip.active { background: rgba(215,255,0,0.08); border-color: rgba(215,255,0,0.22); color: #D7FF00; }
        .hads-dropdown {
          position: absolute; top: calc(100% + 8px); left: 0;
          min-width: 200px; max-height: 280px; overflow-y: auto;
          background: rgba(14,14,14,0.97); backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 16px;
          padding: 6px; z-index: 1000;
          box-shadow: 0 12px 48px rgba(0,0,0,0.6);
          animation: ddFadeIn 0.12s ease both;
        }
        .hads-dropdown-item {
          padding: 9px 12px; border-radius: 10px;
          font-size: 13px; font-weight: 500;
          color: rgba(255,255,255,0.68); cursor: pointer;
          transition: background 0.1s; display: flex; align-items: center; gap: 8;
        }
        .hads-dropdown-item:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.92); }
        .hads-dropdown-item.selected { background: rgba(215,255,0,0.08); color: #D7FF00; }
        @keyframes ddFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

        /* Deco glows */
        .hads-deco-left, .hads-deco-right {
          position: absolute; top: 50%; pointer-events: none; user-select: none;
          font-size: 100px; line-height: 1;
          animation: hadsFloat 6s ease-in-out infinite;
        }
        .hads-deco-left  { left: -40px;  transform: translateY(-50%) rotate(-12deg); animation-delay: 0s; }
        .hads-deco-right { right: -40px; transform: translateY(-50%) rotate(14deg);  animation-delay: -3s; }
        @keyframes hadsFloat {
          0%, 100% { transform: translateY(-50%) rotate(-12deg) translateY(0);    }
          50%       { transform: translateY(-50%) rotate(-12deg) translateY(-8px); }
        }
        @keyframes hadsFloatR {
          0%, 100% { transform: translateY(-50%) rotate(14deg) translateY(0);    }
          50%       { transform: translateY(-50%) rotate(14deg) translateY(-8px); }
        }
        .hads-deco-right { animation-name: hadsFloatR; }

        /* Responsive */
        @media (max-width: 860px) {
          .hads-deco-left, .hads-deco-right { display: none; }
          .hads-field { min-width: calc(50% - 2px); }
          .hads-divider:nth-child(4), .hads-divider:nth-child(6) { display: none; }
        }
        @media (max-width: 540px) {
          .hads-field { min-width: 100%; border-radius: 0 !important; }
          .hads-divider { display: none; }
          .hads-grid { border-radius: 16px; }
          .hads-btn-wrap { width: 100%; padding: 8px 10px 10px; }
          .hads-search-btn { width: 100%; justify-content: center; border-radius: 12px; }
        }
      `}</style>

      <section className="hads-section">
        {/* Ambient glow behind the card */}
        <div aria-hidden style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          width: 900, height: 400, pointerEvents: "none",
          background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(215,255,0,0.016) 0%, transparent 70%)",
        }} />

        <div className="container" style={{ position: "relative" }}>

          {/* Left football deco */}
          <div aria-hidden className="hads-deco-left" style={{
            opacity: 0.12,
            filter: "drop-shadow(0 0 24px rgba(215,255,0,0.5))",
          }}>⚽</div>

          {/* Right padel deco */}
          <div aria-hidden className="hads-deco-right" style={{
            opacity: 0.12,
            filter: "drop-shadow(0 0 24px rgba(96,165,250,0.5))",
          }}>🏓</div>

          {/* ── Main card ── */}
          <div style={{
            background: "rgba(10,10,10,0.82)",
            backdropFilter: "blur(32px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 24,
            padding: "26px 28px 22px",
            boxShadow: "0 4px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
            position: "relative",
            zIndex: 1,
          }}>

            {/* Card header */}
            <p style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
              color: "rgba(215,255,0,0.5)", marginBottom: 18,
              textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#D7FF00", display: "inline-block", boxShadow: "0 0 6px #D7FF00", animation: "pulse 2s infinite" }} />
              Encontrá tu cancha
            </p>

            {/* ── Row 1: search fields ── */}
            <div className="hads-grid">

              {/* ── Sport dropdown ── */}
              <div ref={sportDd.ref} className="hads-field" style={{ borderRadius: "18px 0 0 18px" }}
                onClick={() => { openOnly("sport"); sportDd.setOpen(o => !o); }}>
                <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.09em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 10 }}>🏟</span> Deporte
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, color: sport ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.38)", display: "flex", alignItems: "center", gap: 7, marginTop: 1 }}>
                  <span style={{ fontSize: 16 }}>{sportOption.icon}</span>
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {sport ? sportOption.label : "Deporte"}
                  </span>
                  <ChevronDown size={12} style={{ opacity: 0.35, flexShrink: 0 }} />
                </span>
                {sportDd.open && (
                  <div className="hads-dropdown">
                    {SPORT_OPTIONS.map(s => (
                      <div key={s.value}
                        className={`hads-dropdown-item${sport === s.value ? " selected" : ""}`}
                        onClick={(e) => { e.stopPropagation(); setSport(s.value); sportDd.setOpen(false); }}>
                        <span style={{ fontSize: 17 }}>{s.icon}</span> {s.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="hads-divider" />

              {/* ── Location dropdown ── */}
              <div ref={locationDd.ref} className="hads-field"
                onClick={() => { openOnly("location"); locationDd.setOpen(o => !o); }}>
                <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.09em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 4 }}>
                  <MapPin size={9} /> Ubicación
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, color: locDisplay ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.38)", display: "flex", alignItems: "center", gap: 7, marginTop: 1 }}>
                  <MapPin size={13} style={{ flexShrink: 0, opacity: 0.5 }} />
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
                        onClick={(e) => { e.stopPropagation(); setLocation(l); locationDd.setOpen(false); }}>
                        <MapPin size={12} style={{ opacity: 0.4, flexShrink: 0 }} /> {l}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="hads-divider" />

              {/* ── Date picker ── */}
              <div className="hads-field" style={{ position: "relative" }}>
                <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.09em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 4, pointerEvents: "none" }}>
                  <Calendar size={9} /> Fecha
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, color: dateDisplay ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.38)", display: "flex", alignItems: "center", gap: 7, marginTop: 1, pointerEvents: "none" }}>
                  <Calendar size={13} style={{ flexShrink: 0, opacity: 0.5 }} />
                  {dateDisplay ?? "Seleccioná fecha"}
                </span>
                {/* Native date input overlaid invisibly for native picker */}
                <input
                  type="date"
                  value={date}
                  min={todayISO()}
                  onChange={e => setDate(e.target.value)}
                  style={{
                    position: "absolute", inset: 0, opacity: 0,
                    cursor: "pointer", width: "100%", height: "100%",
                    fontSize: 16, // prevent iOS zoom
                  }}
                />
              </div>

              <div className="hads-divider" />

              {/* ── Time dropdown ── */}
              <div ref={horaDd.ref} className="hads-field"
                onClick={() => { openOnly("hora"); horaDd.setOpen(o => !o); }}>
                <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.09em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 4 }}>
                  <Clock size={9} /> Hora
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, color: horaDisplay ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.38)", display: "flex", alignItems: "center", gap: 7, marginTop: 1 }}>
                  <Clock size={13} style={{ flexShrink: 0, opacity: 0.5 }} />
                  <span style={{ flex: 1 }}>{horaDisplay ?? "Cualquier hora"}</span>
                  <ChevronDown size={12} style={{ opacity: 0.35, flexShrink: 0 }} />
                </span>
                {horaDd.open && (
                  <div className="hads-dropdown" style={{ maxHeight: 220 }}>
                    {TIME_OPTIONS.map(t => (
                      <div key={t}
                        className={`hads-dropdown-item${hora === t ? " selected" : ""}`}
                        onClick={(e) => { e.stopPropagation(); setHora(t); horaDd.setOpen(false); }}>
                        <Clock size={12} style={{ opacity: 0.4, flexShrink: 0 }} /> {t}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Search button ── */}
              <div className="hads-btn-wrap">
                <button className="hads-search-btn" onClick={handleSearch}>
                  <Search size={14} />
                  Buscar Canchas
                </button>
              </div>

            </div>{/* end .hads-grid */}

            {/* ── Row 2: quick filter chips ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: "rgba(255,255,255,0.18)", letterSpacing: "0.04em", flexShrink: 0 }}>
                Acceso rápido:
              </span>
              {QUICK_FILTERS.map(chip => {
                const active =
                  (chip.id === "hoy"    && date === today)    ||
                  (chip.id === "mañana" && date === tomorrow) ||
                  (chip.id === "finde"  && date === saturday) ||
                  (chip.id === "cerca"  && nearMe);
                return (
                  <button key={chip.id}
                    className={`hads-chip${active ? " active" : ""}`}
                    onClick={() => applyQuick(chip.id)}
                    disabled={chip.id === "cerca" && nearMe}>
                    {chip.id === "cerca" && nearMe ? "Buscando…" : chip.label}
                  </button>
                );
              })}
            </div>

          </div>{/* end card */}
        </div>
      </section>
    </>
  );
}

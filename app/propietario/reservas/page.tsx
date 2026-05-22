"use client";
import { useState } from "react";
import {
  CheckCircle2, XCircle, Clock, Search,
  Filter, Users, MapPin, Phone, ChevronDown, X,
  CalendarDays, AlertTriangle,
} from "lucide-react";

type Status = "pending" | "confirmed" | "rejected" | "cancelled";

type Reservation = {
  id: string;
  player: string;
  phone: string;
  email: string;
  court: string;
  sport: string;
  date: string;
  time: string;
  duration: number; // hours
  players: number;
  amount: number;
  notes: string;
  status: Status;
  bookedAt: string;
};

const ALL: Reservation[] = [
  { id:"r1", player:"Diego Morales",   phone:"+506 8834-2211", email:"diego@gmail.com",   court:"Cancha 1", sport:"Fútbol 5",  date:"Hoy",    time:"6:00 PM", duration:1.5, players:8,  amount:14000, notes:"Traemos petos propios.",     status:"pending",   bookedAt:"hace 12 min" },
  { id:"r2", player:"Ana Jiménez",     phone:"+506 7721-9980", email:"ana.j@outlook.com", court:"Cancha 3", sport:"Pádel",     date:"Hoy",    time:"7:30 PM", duration:1,   players:4,  amount:9000,  notes:"",                           status:"pending",   bookedAt:"hace 28 min" },
  { id:"r3", player:"Carlos Quesada",  phone:"+506 8890-3342", email:"cquesa@icloud.com", court:"Cancha 2", sport:"Fútbol 8",  date:"Mañana", time:"9:00 AM", duration:2,   players:14, amount:22000, notes:"Necesitamos árbitro si hay.",  status:"pending",   bookedAt:"hace 1h"     },
  { id:"c1", player:"Equipo Escazú",   phone:"+506 8811-0033", email:"escazu@equipo.cr",  court:"Cancha 1", sport:"Fútbol 5",  date:"Hoy",    time:"4:00 PM", duration:1.5, players:10, amount:14000, notes:"",                           status:"confirmed", bookedAt:"hace 2h"     },
  { id:"c2", player:"Laura Vargas",    phone:"+506 7756-8812", email:"lvargas@gmail.com", court:"Cancha 3", sport:"Pádel",     date:"Hoy",    time:"5:30 PM", duration:1,   players:4,  amount:9000,  notes:"Primera vez en sus canchas.",  status:"confirmed", bookedAt:"ayer"        },
  { id:"c3", player:"FC Tibás",        phone:"+506 8899-2200", email:"fc.tibas@cr.com",   court:"Cancha 2", sport:"Fútbol 8",  date:"Hoy",    time:"8:00 PM", duration:2,   players:16, amount:22000, notes:"",                           status:"confirmed", bookedAt:"ayer"        },
  { id:"x1", player:"Manuel Rojas",    phone:"+506 8763-1199", email:"m.rojas@gmail.com", court:"Cancha 1", sport:"Fútbol 5",  date:"Ayer",   time:"7:00 PM", duration:1,   players:8,  amount:14000, notes:"",                           status:"rejected",  bookedAt:"hace 2 días" },
];

const STATUS_META: Record<Status, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  pending:   { label:"Pendiente",  color:"#FACC15", bg:"rgba(250,204,21,0.08)",  border:"rgba(250,204,21,0.18)", icon:<Clock size={10}/>   },
  confirmed: { label:"Confirmada", color:"#34D399", bg:"rgba(52,211,153,0.08)",  border:"rgba(52,211,153,0.15)", icon:<CheckCircle2 size={10}/> },
  rejected:  { label:"Rechazada",  color:"rgba(239,68,68,0.7)", bg:"rgba(239,68,68,0.07)", border:"rgba(239,68,68,0.14)", icon:<XCircle size={10}/> },
  cancelled: { label:"Cancelada",  color:"rgba(255,255,255,0.25)", bg:"rgba(255,255,255,0.04)", border:"rgba(255,255,255,0.08)", icon:<XCircle size={10}/> },
};

const SPORT_ICON: Record<string, string> = {
  "Fútbol 5": "⚽", "Fútbol 8": "⚽", "Pádel": "🎾", "Básquet": "🏀", "Tenis": "🎾",
};

function fmt(n: number) { return n >= 1000 ? `₡${(n/1000).toFixed(0)}k` : `₡${n}`; }

export default function ReservasPage() {
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<Reservation[]>(ALL);
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [animating, setAnimating] = useState<Record<string, "confirming" | "rejecting">>({});

  const act = (id: string, action: "confirmed" | "rejected") => {
    setAnimating(prev => ({ ...prev, [id]: action === "confirmed" ? "confirming" : "rejecting" }));
    setTimeout(() => {
      setData(prev => prev.map(r => r.id === id ? { ...r, status: action } : r));
      setAnimating(prev => { const n = { ...prev }; delete n[id]; return n; });
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: action } : null);
    }, 400);
  };

  const filtered = data.filter(r => {
    const matchStatus = filter === "all" || r.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || r.player.toLowerCase().includes(q) || r.court.toLowerCase().includes(q) || r.sport.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const pendingCount = data.filter(r => r.status === "pending").length;

  return (
    <div style={{ padding: "28px 28px 60px", maxWidth: 1000, margin: "0 auto" }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);} }
        @keyframes rowSlide { to { opacity:0; transform:translateX(48px); } }
        @keyframes modalIn { from{opacity:0;transform:scale(0.97)translateY(8px);}to{opacity:1;transform:scale(1)translateY(0);} }
        .res-row { transition: background 0.16s; cursor: pointer; }
        .res-row:hover { background: rgba(255,255,255,0.025) !important; }
        .res-row.confirming { animation: rowSlide 0.35s ease forwards; }
        .res-row.rejecting  { animation: rowSlide 0.35s ease forwards; }
        .filter-tab { transition: all 0.15s; cursor: pointer; border: none; }
        .filter-tab:hover { background: rgba(255,255,255,0.05) !important; color: rgba(255,255,255,0.7) !important; }
        .res-action-btn { transition: all 0.15s; }
        .res-action-btn:hover { transform: scale(1.05); }
        @keyframes liveBlip { 0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.4;transform:scale(1.6);} }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24, animation: "fadeUp 0.35s ease both" }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", color: "#fff", margin: 0 }}>Reservas</h1>
        <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
          Gestiona solicitudes y confirmaciones de tus canchas
        </p>
      </div>

      {/* Pending alert banner */}
      {pendingCount > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 16px", borderRadius: 12, marginBottom: 20,
          background: "rgba(250,204,21,0.07)", border: "1px solid rgba(250,204,21,0.2)",
          animation: "fadeUp 0.35s 0.04s ease both",
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
            background: "#FACC15", animation: "liveBlip 2s ease-in-out infinite",
            boxShadow: "0 0 8px rgba(250,204,21,0.6)",
          }} />
          <AlertTriangle size={13} color="#FACC15" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "rgba(250,204,21,0.9)", flex: 1 }}>
            {pendingCount} reserva{pendingCount !== 1 ? "s" : ""} esperan tu respuesta — revísalas ahora
          </span>
          <button
            onClick={() => setFilter("pending")}
            style={{
              background: "#FACC15", color: "#000", border: "none",
              padding: "6px 12px", borderRadius: 8, cursor: "pointer",
              fontSize: 11, fontWeight: 800,
            }}
          >
            Ver pendientes
          </button>
        </div>
      )}

      {/* Controls */}
      <div style={{
        display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap",
        animation: "fadeUp 0.37s 0.07s ease both",
      }}>
        {/* Search */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 200,
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10, padding: "8px 12px",
        }}>
          <Search size={12} color="rgba(255,255,255,0.25)" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por jugador, cancha o deporte..."
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              fontSize: 12.5, color: "#fff",
              "::placeholder": { color: "rgba(255,255,255,0.25)" },
            } as any}
          />
        </div>

        {/* Status filters */}
        <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 4 }}>
          {(["all","pending","confirmed","rejected"] as const).map(f => {
            const active = filter === f;
            const count = f === "all" ? data.length : data.filter(r => r.status === f).length;
            return (
              <button
                key={f}
                className="filter-tab"
                onClick={() => setFilter(f)}
                style={{
                  padding: "6px 12px", borderRadius: 7, fontSize: 11.5, fontWeight: 600,
                  letterSpacing: "-0.01em",
                  background: active ? "rgba(255,255,255,0.08)" : "transparent",
                  color: active ? "#fff" : "rgba(255,255,255,0.35)",
                }}
              >
                {f === "all" ? "Todas" : STATUS_META[f].label} <span style={{ fontSize: 10, opacity: 0.6, marginLeft: 2 }}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: "rgba(10,10,10,0.8)", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16, overflow: "hidden",
        animation: "fadeUp 0.4s 0.1s ease both",
      }}>
        {/* Table header */}
        <div style={{
          display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 1fr 100px 120px",
          padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}>
          {["Jugador", "Cancha · Deporte", "Fecha · Hora", "Importe", "Estado", "Acción"].map(h => (
            <div key={h} style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,0.22)", letterSpacing: "0.05em" }}>
              {h.toUpperCase()}
            </div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>📋</div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.22)" }}>No hay reservas con este filtro</p>
          </div>
        ) : filtered.map((r, i) => {
          const meta = STATUS_META[r.status];
          const anim = animating[r.id];
          return (
            <div
              key={r.id}
              className={`res-row ${anim ?? ""}`}
              onClick={() => setSelected(r)}
              style={{
                display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 1fr 100px 120px",
                padding: "13px 20px", alignItems: "center",
                borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                background: "transparent",
              }}
            >
              {/* Player */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13,
                }}>
                  {SPORT_ICON[r.sport] ?? "⚽"}
                </div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", letterSpacing: "-0.015em" }}>{r.player}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{r.players} jugadores · {r.bookedAt}</div>
                </div>
              </div>

              {/* Court */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>{r.court}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{r.sport}</div>
              </div>

              {/* Date */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>{r.time}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{r.date} · {r.duration}h</div>
              </div>

              {/* Amount */}
              <div style={{ fontSize: 13, fontWeight: 800, color: "rgba(215,255,0,0.75)", letterSpacing: "-0.02em" }}>
                {fmt(r.amount)}
              </div>

              {/* Status badge */}
              <div>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "4px 9px", borderRadius: 99,
                  background: meta.bg, border: `1px solid ${meta.border}`,
                  fontSize: 10, fontWeight: 700, color: meta.color,
                }}>
                  {meta.icon} {meta.label}
                </span>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 5 }} onClick={e => e.stopPropagation()}>
                {r.status === "pending" ? (
                  <>
                    <button
                      className="res-action-btn"
                      onClick={() => act(r.id, "confirmed")}
                      style={{
                        padding: "6px 10px", borderRadius: 7, border: "none",
                        background: "rgba(52,211,153,0.12)", color: "#34D399",
                        cursor: "pointer", fontSize: 11, fontWeight: 700,
                      }}
                    >✓</button>
                    <button
                      className="res-action-btn"
                      onClick={() => act(r.id, "rejected")}
                      style={{
                        padding: "6px 8px", borderRadius: 7, border: "none",
                        background: "rgba(239,68,68,0.10)", color: "rgba(239,68,68,0.65)",
                        cursor: "pointer", fontSize: 11,
                      }}
                    >✕</button>
                  </>
                ) : (
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", paddingLeft: 4 }}>—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Detail Modal ── */}
      {selected && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.72)", backdropFilter: "blur(14px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24,
          }}
          onClick={() => setSelected(null)}
        >
          <div
            style={{
              width: "100%", maxWidth: 480,
              background: "linear-gradient(160deg, rgba(14,14,14,0.99), rgba(9,9,9,0.99))",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20,
              boxShadow: "0 0 0 1px rgba(215,255,0,0.04), 0 32px 80px rgba(0,0,0,0.7)",
              animation: "modalIn 0.25s cubic-bezier(0.34,1.1,0.64,1) both",
              overflow: "hidden",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Accent line */}
            <div style={{ height: 2, background: "linear-gradient(90deg, #D7FF00cc, #D7FF0033, transparent)" }} />

            {/* Modal header */}
            <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em", marginBottom: 4 }}>
                  DETALLE DE RESERVA · #{selected.id.toUpperCase()}
                </div>
                <div style={{ fontSize: 19, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>{selected.player}</div>
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{ background: "rgba(255,255,255,0.05)", border: "none", cursor: "pointer", borderRadius: 8, padding: 8, color: "rgba(255,255,255,0.4)" }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: "18px 22px" }}>
              {/* Status */}
              <div style={{ marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
                {(() => { const m = STATUS_META[selected.status]; return (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "5px 12px", borderRadius: 99,
                    background: m.bg, border: `1px solid ${m.border}`,
                    fontSize: 11, fontWeight: 700, color: m.color,
                  }}>
                    {m.icon} {m.label}
                  </span>
                ); })()}
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>Solicitado {selected.bookedAt}</span>
              </div>

              {/* Info grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                {[
                  { icon: "🏟️", label: "Instalación", value: `${selected.court} · ${selected.sport}` },
                  { icon: "📅", label: "Fecha y hora", value: `${selected.date} · ${selected.time}` },
                  { icon: "⏱",  label: "Duración",    value: `${selected.duration}h` },
                  { icon: "👥", label: "Jugadores",   value: `${selected.players} personas` },
                  { icon: "💰", label: "Importe",     value: fmt(selected.amount) },
                  { icon: "📞", label: "Teléfono",    value: selected.phone },
                ].map(f => (
                  <div key={f.label} style={{
                    background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 10, padding: "10px 12px",
                  }}>
                    <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.22)", letterSpacing: "0.04em", marginBottom: 4 }}>
                      {f.icon} {f.label.toUpperCase()}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.75)", letterSpacing: "-0.015em" }}>
                      {f.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Email */}
              <div style={{
                background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 10, padding: "10px 12px", marginBottom: 12,
              }}>
                <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.22)", letterSpacing: "0.04em", marginBottom: 4 }}>✉️ EMAIL</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,0.65)" }}>{selected.email}</div>
              </div>

              {/* Notes */}
              {selected.notes && (
                <div style={{
                  background: "rgba(215,255,0,0.03)", border: "1px solid rgba(215,255,0,0.10)",
                  borderRadius: 10, padding: "10px 12px", marginBottom: 16,
                }}>
                  <div style={{ fontSize: 9.5, color: "rgba(215,255,0,0.4)", letterSpacing: "0.04em", marginBottom: 4 }}>💬 NOTAS DEL JUGADOR</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>{selected.notes}</div>
                </div>
              )}

              {/* Action buttons */}
              {selected.status === "pending" && (
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => { act(selected.id, "confirmed"); setSelected(null); }}
                    style={{
                      flex: 1, padding: "13px", borderRadius: 12, border: "none",
                      background: "#D7FF00", color: "#000", cursor: "pointer",
                      fontSize: 13, fontWeight: 900, letterSpacing: "-0.02em",
                      boxShadow: "0 0 20px rgba(215,255,0,0.2)",
                      transition: "opacity 0.16s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                  >
                    ✓ Confirmar reserva
                  </button>
                  <button
                    onClick={() => { act(selected.id, "rejected"); setSelected(null); }}
                    style={{
                      padding: "13px 18px", borderRadius: 12, border: "1px solid rgba(239,68,68,0.2)",
                      background: "rgba(239,68,68,0.07)", color: "rgba(239,68,68,0.75)",
                      cursor: "pointer", fontSize: 13, fontWeight: 700,
                      transition: "all 0.16s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.12)"; (e.currentTarget as HTMLElement).style.color = "rgba(239,68,68,0.9)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.07)"; (e.currentTarget as HTMLElement).style.color = "rgba(239,68,68,0.75)"; }}
                  >
                    ✕ Rechazar
                  </button>
                </div>
              )}

              {selected.status === "confirmed" && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "12px 14px", borderRadius: 10,
                  background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.12)",
                }}>
                  <CheckCircle2 size={14} color="#34D399" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(52,211,153,0.8)" }}>Reserva confirmada — el jugador fue notificado</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

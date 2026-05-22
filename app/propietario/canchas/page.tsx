"use client";
import { useState } from "react";
import { Edit3, Eye, EyeOff, Plus, MapPin, Clock } from "lucide-react";

const COURTS = [
  { id: "c1", name: "Cancha 1", sport: "Fútbol 5", size: "5v5", surface: "Césped sintético", price: 14000, active: true,  img: "🏟️", slots: ["8AM","9AM","10AM","4PM","5PM","6PM","7PM","8PM","9PM"] },
  { id: "c2", name: "Cancha 2", sport: "Fútbol 8", size: "8v8", surface: "Césped sintético", price: 22000, active: true,  img: "⚽", slots: ["9AM","10AM","11AM","5PM","6PM","7PM","8PM","9PM"]    },
  { id: "c3", name: "Cancha 3", sport: "Pádel",    size: "2v2", surface: "Hormigón poroso",  price: 9000,  active: false, img: "🎾", slots: ["7AM","8AM","9AM","4PM","5PM","6PM","7PM","8PM"]      },
];

function fmt(n: number) { return `₡${(n/1000).toFixed(0)}k / hora`; }

export default function CanchasPage() {
  const [courts, setCourts] = useState(COURTS);

  const toggle = (id: string) => {
    setCourts(prev => prev.map(c => c.id === id ? { ...c, active: !c.active } : c));
  };

  return (
    <div style={{ padding: "28px 28px 60px", maxWidth: 900, margin: "0 auto" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}`}</style>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, animation: "fadeUp 0.35s ease both" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", color: "#fff", margin: 0 }}>Canchas</h1>
          <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>Gestioná tus instalaciones, precios y disponibilidad</p>
        </div>
        <button style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "9px 16px", borderRadius: 10, border: "none",
          background: "#D7FF00", color: "#000",
          fontSize: 12.5, fontWeight: 800, cursor: "pointer",
          boxShadow: "0 0 18px rgba(215,255,0,0.22)",
        }}>
          <Plus size={12} /> Nueva cancha
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, animation: "fadeUp 0.4s 0.08s ease both" }}>
        {courts.map(c => (
          <div key={c.id} style={{
            background: "rgba(10,10,10,0.8)", border: `1px solid ${c.active ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)"}`,
            borderRadius: 16, overflow: "hidden",
            opacity: c.active ? 1 : 0.55, transition: "opacity 0.3s",
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 200px 120px", alignItems: "center", gap: 16, padding: "16px 20px" }}>
              {/* Icon */}
              <div style={{
                width: 54, height: 54, borderRadius: 13, flexShrink: 0,
                background: "rgba(215,255,0,0.06)", border: "1px solid rgba(215,255,0,0.10)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22,
              }}>
                {c.img}
              </div>

              {/* Info */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>{c.name}</span>
                  {!c.active && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.3)",
                      background: "rgba(255,255,255,0.06)", padding: "2px 7px",
                      borderRadius: 99, letterSpacing: "0.06em",
                    }}>INACTIVA</span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                    <MapPin size={9} style={{ display: "inline", marginRight: 3 }} />{c.sport} · {c.size}
                  </span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{c.surface}</span>
                  <span style={{ fontSize: 11, color: "rgba(215,255,0,0.55)", fontWeight: 700 }}>{fmt(c.price)}</span>
                </div>
              </div>

              {/* Slots preview */}
              <div>
                <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.22)", letterSpacing: "0.04em", marginBottom: 6 }}>
                  HORARIOS ACTIVOS
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {c.slots.slice(0, 6).map(s => (
                    <span key={s} style={{
                      fontSize: 9, fontWeight: 600, padding: "2px 6px",
                      borderRadius: 5, background: "rgba(255,255,255,0.05)",
                      color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.07)",
                    }}>{s}</span>
                  ))}
                  {c.slots.length > 6 && (
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>+{c.slots.length - 6}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  onClick={() => toggle(c.id)}
                  title={c.active ? "Desactivar" : "Activar"}
                  style={{
                    padding: "7px 9px", borderRadius: 8, border: "none",
                    background: c.active ? "rgba(52,211,153,0.10)" : "rgba(255,255,255,0.05)",
                    color: c.active ? "#34D399" : "rgba(255,255,255,0.3)",
                    cursor: "pointer", display: "flex", alignItems: "center",
                    transition: "all 0.16s",
                  }}
                >
                  {c.active ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>
                <button style={{
                  padding: "7px 9px", borderRadius: 8, border: "none",
                  background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.45)",
                  cursor: "pointer", display: "flex", alignItems: "center",
                  transition: "all 0.16s",
                }}>
                  <Edit3 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

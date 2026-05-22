"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DAYS = ["L","M","X","J","V","S","D"];

/* Fake bookings to show color on the calendar */
const BOOKED: Record<number, { court: string; time: string; color: string }[]> = {
  9:  [{ court:"C1", time:"4PM", color:"#D7FF00" }, { court:"C3", time:"5:30PM", color:"#60A5FA" }],
  10: [{ court:"C2", time:"9AM", color:"#D7FF00" }],
  12: [{ court:"C1", time:"6PM", color:"#FACC15" }, { court:"C3", time:"7:30PM", color:"#FACC15" }, { court:"C2", time:"8PM", color:"#D7FF00" }],
  14: [{ court:"C1", time:"5PM", color:"#D7FF00" }],
  16: [{ court:"C2", time:"7AM", color:"#60A5FA" }, { court:"C3", time:"11AM", color:"#34D399" }],
  19: [{ court:"C1", time:"3PM", color:"#D7FF00" }],
  21: [{ court:"C2", time:"6PM", color:"#D7FF00" }, { court:"C1", time:"8PM", color:"#FACC15" }],
};

export default function CalendarioPage() {
  const [month] = useState({ year: 2026, month: 4 }); // May 2026 (0-indexed)
  const [selected, setSelected] = useState<number | null>(9);

  // First day of month (0=Sun → adjust to Mon=0)
  const firstDow = (new Date(month.year, month.month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(month.year, month.month + 1, 0).getDate();
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  return (
    <div style={{ padding: "28px 28px 60px", maxWidth: 900, margin: "0 auto" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}`}</style>

      <div style={{ marginBottom: 24, animation: "fadeUp 0.35s ease both" }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", color: "#fff", margin: 0 }}>Calendario</h1>
        <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>Visualizá y gestioná la disponibilidad de tus canchas</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, animation: "fadeUp 0.4s 0.08s ease both" }}>
        {/* Calendar grid */}
        <div style={{ background: "rgba(10,10,10,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" }}>
          {/* Month nav */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}>
            <button style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: "rgba(255,255,255,0.5)", display: "flex" }}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#fff", letterSpacing: "-0.025em" }}>
              {MONTH_NAMES[month.month]} {month.year}
            </span>
            <button style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: "rgba(255,255,255,0.5)", display: "flex" }}>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", padding: "10px 16px 6px" }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.2)", letterSpacing: "0.05em" }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, padding: "4px 12px 16px" }}>
            {cells.map((day, i) => {
              if (!day) return <div key={`e${i}`} />;
              const bookings = BOOKED[day] ?? [];
              const isSelected = selected === day;
              const isToday = day === 9;
              return (
                <div
                  key={day}
                  onClick={() => setSelected(day)}
                  style={{
                    aspectRatio: "1", borderRadius: 10, padding: "6px",
                    background: isSelected ? "rgba(215,255,0,0.1)" : isToday ? "rgba(255,255,255,0.04)" : "transparent",
                    border: isSelected ? "1px solid rgba(215,255,0,0.35)" : isToday ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                  }}
                >
                  <span style={{
                    fontSize: 11.5, fontWeight: isToday ? 800 : 500,
                    color: isSelected ? "#D7FF00" : isToday ? "#fff" : "rgba(255,255,255,0.45)",
                  }}>{day}</span>
                  {/* Booking dots */}
                  <div style={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
                    {bookings.slice(0, 3).map((b, j) => (
                      <div key={j} style={{ width: 4, height: 4, borderRadius: "50%", background: b.color, boxShadow: `0 0 4px ${b.color}80` }} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Day detail */}
        <div style={{ background: "rgba(10,10,10,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "16px" }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em", marginBottom: 2 }}>DÍA SELECCIONADO</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>
              {selected ? `${selected} de Mayo` : "—"}
            </div>
          </div>

          {selected && (BOOKED[selected] ?? []).length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(BOOKED[selected] ?? []).map((b, i) => (
                <div key={i} style={{
                  padding: "10px 12px", borderRadius: 10,
                  background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <div style={{ width: 3, height: 30, borderRadius: 99, background: b.color, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>{b.court}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{b.time}</div>
                  </div>
                </div>
              ))}
              <div style={{
                marginTop: 6, padding: "10px 12px", borderRadius: 10,
                background: "rgba(215,255,0,0.04)", border: "1px dashed rgba(215,255,0,0.12)",
                textAlign: "center", cursor: "pointer",
              }}>
                <span style={{ fontSize: 11, color: "rgba(215,255,0,0.45)", fontWeight: 600 }}>+ Bloquear horario</span>
              </div>
            </div>
          ) : selected ? (
            <div style={{ textAlign: "center", padding: "30px 0" }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>📅</div>
              <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.22)" }}>Sin reservas este día</p>
              <div style={{
                marginTop: 12, padding: "9px 14px", borderRadius: 10,
                background: "rgba(215,255,0,0.04)", border: "1px dashed rgba(215,255,0,0.12)",
                cursor: "pointer",
              }}>
                <span style={{ fontSize: 11, color: "rgba(215,255,0,0.45)", fontWeight: 600 }}>+ Bloquear disponibilidad</span>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.2)", textAlign: "center", paddingTop: 24 }}>
              Seleccioná un día
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

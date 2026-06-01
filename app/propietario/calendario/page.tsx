"use client";
import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

const DAYS = ["L", "M", "X", "J", "V", "S", "D"];
const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

type Booking = {
  id: string;
  court_name: string;
  date: string;
  time: string | null;
  status: string;
  player_name: string | null;
  total_price: number | null;
};

// Deterministic color from court name
const COURT_COLORS = ["#D7FF00","#60A5FA","#4ADE80","#F97316","#A78BFA","#FACC15","#FF6B6B"];
function courtColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return COURT_COLORS[Math.abs(h) % COURT_COLORS.length];
}

function zeroPad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export default function CalendarioPage() {
  const now = new Date();
  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-indexed
  const [selected,  setSelected]  = useState<number | null>(now.getDate());
  const [bookings,  setBookings]  = useState<Booking[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [courtNames, setCourtNames] = useState<string[]>([]);

  // First weekday of month (Mon=0)
  const firstDow = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const todayYear  = now.getFullYear();
  const todayMonth = now.getMonth();
  const todayDay   = now.getDate();
  const isCurrentMonth = viewYear === todayYear && viewMonth === todayMonth;

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
    setSelected(null);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
    setSelected(null);
  };

  // Load owner courts then bookings for this month
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: courts } = await supabase
        .from("owner_courts")
        .select("name")
        .eq("owner_id", user.id)
        .is("deleted_at", null);

      const names = (courts ?? []).map((c: any) => c.name).filter(Boolean) as string[];
      setCourtNames(names);

      if (names.length === 0) {
        setBookings([]);
        return;
      }

      const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
      const from = `${viewYear}-${zeroPad(viewMonth + 1)}-01`;
      const to   = `${viewYear}-${zeroPad(viewMonth + 1)}-${zeroPad(lastDay)}`;

      const { data: bks } = await supabase
        .from("bookings")
        .select("id, court_name, date, time, status, player_name, total_price")
        .in("court_name", names)
        .gte("date", from)
        .lte("date", to)
        .order("time", { ascending: true });

      setBookings((bks ?? []) as Booking[]);
    } finally {
      setLoading(false);
    }
  }, [viewYear, viewMonth]);

  useEffect(() => { loadData(); }, [loadData]);

  // Group bookings by day
  const byDay: Record<number, Booking[]> = {};
  for (const b of bookings) {
    const day = parseInt(b.date.split("-")[2], 10);
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(b);
  }

  const selectedBookings = selected ? (byDay[selected] ?? []) : [];

  // Stats
  const totalBookings   = bookings.length;
  const confirmedCount  = bookings.filter(b => ["confirmed","paid","completed"].includes(b.status)).length;
  const totalRevenue    = bookings
    .filter(b => ["confirmed","paid","completed"].includes(b.status))
    .reduce((s, b) => s + (b.total_price ?? 0), 0);

  return (
    <div style={{ padding: "28px 28px 60px", maxWidth: 940, margin: "0 auto" }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
        @keyframes pulse{0%,100%{opacity:0.5;}50%{opacity:1;}}
        .cal-day:hover { background: rgba(255,255,255,0.06) !important; cursor: pointer; }
      `}</style>

      <div style={{ marginBottom: 24, animation: "fadeUp 0.35s ease both" }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", color: "#fff", margin: 0 }}>Calendario</h1>
        <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
          Visualizá y gestioná la disponibilidad de tus canchas
        </p>
      </div>

      {/* Monthly stats bar */}
      {!loading && (
        <div style={{ display: "flex", gap: 10, marginBottom: 20, animation: "fadeUp 0.38s 0.04s ease both" }}>
          {[
            { label: "Reservas",   value: String(totalBookings),   color: "rgba(255,255,255,0.70)" },
            { label: "Confirmadas",value: String(confirmedCount),  color: "#34D399" },
            { label: "Ingresos",   value: totalRevenue > 0 ? `₡${(totalRevenue/1000).toFixed(0)}k` : "₡0", color: "#D7FF00" },
          ].map(s => (
            <div key={s.label} style={{
              padding: "10px 16px", borderRadius: 10,
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ fontSize: 18, fontWeight: 900, color: s.color, letterSpacing: "-0.04em" }}>{s.value}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.28)" }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, animation: "fadeUp 0.4s 0.08s ease both" }}>
        {/* Calendar grid */}
        <div style={{ background: "rgba(10,10,10,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" }}>
          {/* Month nav */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}>
            <button onClick={prevMonth} style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: "rgba(255,255,255,0.5)", display: "flex" }}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#fff", letterSpacing: "-0.025em" }}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button onClick={nextMonth} style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: "rgba(255,255,255,0.5)", display: "flex" }}>
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
          {loading ? (
            <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} style={{ aspectRatio: "1", borderRadius: 10, background: "rgba(255,255,255,0.03)", animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.02}s` }} />
              ))}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, padding: "4px 12px 16px" }}>
              {cells.map((day, i) => {
                if (!day) return <div key={`e${i}`} />;
                const dayBookings = byDay[day] ?? [];
                const isSelected = selected === day;
                const isToday = isCurrentMonth && day === todayDay;
                // Get unique court colors for dots
                const uniqueCourts = Array.from(new Set(dayBookings.map(b => b.court_name))).slice(0, 3);
                return (
                  <div
                    key={day}
                    className="cal-day"
                    onClick={() => setSelected(day)}
                    style={{
                      aspectRatio: "1", borderRadius: 10, padding: "6px",
                      background: isSelected ? "rgba(215,255,0,0.1)" : isToday ? "rgba(255,255,255,0.04)" : "transparent",
                      border: isSelected ? "1px solid rgba(215,255,0,0.35)" : isToday ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent",
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
                      {uniqueCourts.map((name, j) => (
                        <div key={j} style={{
                          width: 4, height: 4, borderRadius: "50%",
                          background: courtColor(name),
                          boxShadow: `0 0 4px ${courtColor(name)}80`,
                        }} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Day detail */}
        <div style={{ background: "rgba(10,10,10,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "16px" }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em", marginBottom: 2 }}>DÍA SELECCIONADO</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>
              {selected ? `${selected} de ${MONTH_NAMES[viewMonth]}` : "—"}
            </div>
          </div>

          {courtNames.length === 0 && !loading ? (
            <div style={{ textAlign: "center", padding: "30px 0" }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>🏟️</div>
              <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.22)" }}>Sin canchas registradas</p>
            </div>
          ) : !selected ? (
            <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.2)", textAlign: "center", paddingTop: 24 }}>
              Seleccioná un día
            </p>
          ) : loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[1,2].map(i => (
                <div key={i} style={{ height: 52, borderRadius: 10, background: "rgba(255,255,255,0.03)", animation: "pulse 1.5s ease-in-out infinite" }} />
              ))}
            </div>
          ) : selectedBookings.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {selectedBookings.map(b => {
                const color = courtColor(b.court_name ?? "");
                const statusColor = ["confirmed","paid","completed"].includes(b.status) ? "#34D399" : b.status === "pending" ? "#FACC15" : "rgba(255,255,255,0.35)";
                return (
                  <div key={b.id} style={{
                    padding: "10px 12px", borderRadius: 10,
                    background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)",
                    display: "flex", alignItems: "flex-start", gap: 10,
                  }}>
                    <div style={{ width: 3, height: "auto", minHeight: 30, borderRadius: 99, background: color, flexShrink: 0, alignSelf: "stretch" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.75)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {b.court_name ?? "Cancha"}
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                        {b.time ?? "–"}
                        {b.player_name ? ` · ${b.player_name}` : ""}
                      </div>
                      {b.total_price != null && b.total_price > 0 && (
                        <div style={{ fontSize: 10.5, color: "#D7FF00", fontWeight: 700, marginTop: 2 }}>
                          ₡{b.total_price.toLocaleString("es-CR")}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: statusColor, letterSpacing: "0.04em", textTransform: "uppercase", flexShrink: 0 }}>
                      {b.status}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "30px 0" }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>📅</div>
              <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.22)" }}>Sin reservas este día</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

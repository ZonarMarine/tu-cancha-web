"use client";

const MONTHS = ["Nov","Dic","Ene","Feb","Mar","Abr","May"];
const REV = [112000, 98000, 134000, 156000, 143000, 171000, 285000];
const OCC = [62, 55, 70, 78, 74, 82, 87];
const MAX_REV = Math.max(...REV);

const TOP_COURTS = [
  { name: "Cancha 2 · Fútbol 8", rev: 127000, pct: 44, sport: "⚽" },
  { name: "Cancha 1 · Fútbol 5", rev: 98000,  pct: 35, sport: "⚽" },
  { name: "Cancha 3 · Pádel",    rev: 60000,  pct: 21, sport: "🎾" },
];

const TOP_HOURS = [
  { h: "7PM–8PM",  count: 42, pct: 95 },
  { h: "6PM–7PM",  count: 38, pct: 86 },
  { h: "8PM–9PM",  count: 31, pct: 70 },
  { h: "5PM–6PM",  count: 24, pct: 54 },
  { h: "9AM–10AM", count: 14, pct: 32 },
];

function fmt(n: number) { return n >= 1000 ? `₡${(n/1000).toFixed(0)}k` : `₡${n}`; }

export default function AnalyticsPage() {
  return (
    <div style={{ padding: "28px 28px 60px", maxWidth: 1000, margin: "0 auto" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}`}</style>

      <div style={{ marginBottom: 24, animation: "fadeUp 0.35s ease both" }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", color: "#fff", margin: 0 }}>Analytics</h1>
        <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>Ingresos, ocupación y tendencias de tus instalaciones</p>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16, animation: "fadeUp 0.38s 0.05s ease both" }}>
        {[
          { label: "Ingresos mes",   value: "₡285k", sub: "+67% vs abril",     color: "#D7FF00" },
          { label: "Ocupación media",value: "87%",   sub: "↑ 5pp vs mes ant.", color: "#34D399" },
          { label: "Reservas mes",   value: "94",    sub: "+12 vs abril",       color: "#60A5FA" },
          { label: "Ticket promedio",value: "₡15k",  sub: "por reserva",        color: "#F97316" },
        ].map((k, i) => (
          <div key={i} style={{
            background: "rgba(10,10,10,0.8)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 14, padding: "14px 16px",
          }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: "0.04em", marginBottom: 8 }}>
              {k.label.toUpperCase()}
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: k.color, letterSpacing: "-0.04em", lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 14, marginBottom: 14 }}>
        {/* Revenue chart */}
        <div style={{
          background: "rgba(10,10,10,0.8)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 16, padding: "18px 20px",
          animation: "fadeUp 0.4s 0.1s ease both",
        }}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: "0.04em", marginBottom: 4 }}>
              INGRESOS MENSUALES
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: "#D7FF00", letterSpacing: "-0.04em" }}>₡285k</span>
              <span style={{ fontSize: 11, color: "rgba(52,211,153,0.7)", fontWeight: 700 }}>+67% ↑</span>
            </div>
          </div>

          {/* Bars */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120, marginBottom: 8 }}>
            {REV.map((r, i) => {
              const h = (r / MAX_REV) * 120;
              const isLast = i === REV.length - 1;
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                  {isLast && (
                    <div style={{ fontSize: 9, color: "#D7FF00", fontWeight: 700, marginBottom: 3 }}>{fmt(r)}</div>
                  )}
                  <div style={{
                    width: "100%", height: h, borderRadius: "4px 4px 2px 2px",
                    background: isLast
                      ? "linear-gradient(180deg,#D7FF00,#D7FF0077)"
                      : "rgba(255,255,255,0.07)",
                    boxShadow: isLast ? "0 0 14px rgba(215,255,0,0.25)" : "none",
                  }} />
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {MONTHS.map((m, i) => (
              <div key={m} style={{
                flex: 1, textAlign: "center",
                fontSize: 9.5, fontWeight: i === MONTHS.length - 1 ? 800 : 500,
                color: i === MONTHS.length - 1 ? "#D7FF00" : "rgba(255,255,255,0.22)",
              }}>{m}</div>
            ))}
          </div>

          {/* Occupancy overlay */}
          <div style={{ marginTop: 20, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 14 }}>
            <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.22)", letterSpacing: "0.04em", marginBottom: 10 }}>OCUPACIÓN (%)</div>
            {OCC.map((o, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
                <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.25)", width: 22 }}>{MONTHS[i]}</div>
                <div style={{ flex: 1, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.06)" }}>
                  <div style={{ height: "100%", borderRadius: 99, width: `${o}%`, background: o >= 80 ? "#D7FF00" : "#60A5FA" }} />
                </div>
                <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.3)", width: 22, textAlign: "right" }}>{o}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Top courts */}
          <div style={{
            background: "rgba(10,10,10,0.8)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 16, padding: "16px", flex: 1,
            animation: "fadeUp 0.42s 0.13s ease both",
          }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: "0.04em", marginBottom: 12 }}>INGRESOS POR CANCHA</div>
            {TOP_COURTS.map((c, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>{c.sport} {c.name}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: "#D7FF00" }}>{fmt(c.rev)}</span>
                </div>
                <div style={{ height: 4, borderRadius: 99, background: "rgba(255,255,255,0.06)" }}>
                  <div style={{ height: "100%", borderRadius: 99, width: `${c.pct}%`, background: "rgba(215,255,0,0.65)" }} />
                </div>
                <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.2)", marginTop: 3 }}>{c.pct}% de ingresos totales</div>
              </div>
            ))}
          </div>

          {/* Peak hours */}
          <div style={{
            background: "rgba(10,10,10,0.8)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 16, padding: "16px",
            animation: "fadeUp 0.44s 0.16s ease both",
          }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: "0.04em", marginBottom: 12 }}>HORAS PICO</div>
            {TOP_HOURS.map((h, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.55)", width: 64 }}>{h.h}</div>
                <div style={{ flex: 1, height: 6, borderRadius: 99, background: "rgba(255,255,255,0.06)" }}>
                  <div style={{
                    height: "100%", borderRadius: 99, width: `${h.pct}%`,
                    background: h.pct >= 90 ? "#D7FF00" : h.pct >= 70 ? "#60A5FA" : "rgba(255,255,255,0.2)",
                  }} />
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", width: 20, textAlign: "right" }}>{h.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

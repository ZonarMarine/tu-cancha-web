"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  TrendingUp, TrendingDown, BarChart3, Clock,
  Zap, AlertCircle, Calendar, Users,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────── */

type Booking = {
  id: string;
  court_id?: string | null;
  court_name: string;
  date: string;
  time: string | null;
  total_price: number;
  status: string;
  hours: number | null;
};

type CourtMeta = {
  id: string;
  name: string;
  sport: string | null;
  slots: string[] | null;
};

type MonthPoint = { label: string; revenue: number; bookings: number; occ: number };
type CourtRev   = { name: string; sport: string | null; revenue: number; bookings: number; pct: number };
type HourPoint  = { label: string; count: number; pct: number };

/* ─── Helpers ────────────────────────────────────────────── */

const MONTH_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function fmt(n: number) {
  if (n >= 1_000_000) return `₡${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `₡${(n / 1_000).toFixed(0)}k`;
  return `₡${n}`;
}
function fmtFull(n: number) { return `₡${n.toLocaleString("es-CR")}`; }

function pct(a: number, b: number) {
  if (b === 0) return null;
  return Math.round(((a - b) / b) * 100);
}

function sportEmoji(s: string | null) {
  if (!s) return "⚽";
  if (/ádel|enis/i.test(s)) return "🎾";
  if (/ásquet/i.test(s))    return "🏀";
  if (/éisbol/i.test(s))    return "⚾";
  return "⚽";
}

/* Parse date string without timezone drift */
function parseDate(iso: string): { year: number; month: number; day: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return { year: y, month: m - 1, day: d }; // month 0-indexed
}

/* Last N calendar months → array of { year, month(0-idx) } */
function lastNMonths(n: number) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const offset = n - 1 - i;
    const m      = (now.getMonth() - offset + 120) % 12;
    const y      = now.getFullYear() + Math.floor((now.getMonth() - offset) / 12);
    return { year: y, month: m };
  });
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

/* ─── Skeleton ───────────────────────────────────────────── */

function Skeleton({ w = "100%", h = 40, r = 10 }: { w?: number | string; h?: number; r?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: "rgba(255,255,255,0.04)",
      animation: "skPulse 1.5s ease-in-out infinite",
    }} />
  );
}

/* ─── Trend badge ────────────────────────────────────────── */

function Trend({ change }: { change: number | null }) {
  if (change === null) return null;
  const up  = change >= 0;
  const abs = Math.abs(change);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      fontSize: 10, fontWeight: 700,
      color: up ? "#34D399" : "#f87171",
      background: up ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)",
      border: `1px solid ${up ? "rgba(52,211,153,0.16)" : "rgba(248,113,113,0.16)"}`,
      borderRadius: 99, padding: "3px 7px",
    }}>
      {up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
      {abs}% vs mes ant.
    </span>
  );
}

/* ─── Main component ─────────────────────────────────────── */

export default function AnalyticsPage() {
  const [loading,     setLoading]     = useState(true);
  const [hasCourts,   setHasCourts]   = useState(false);
  const [hasBookings, setHasBookings] = useState(false);
  const [lastUpdate,  setLastUpdate]  = useState("");

  /* Computed state */
  const [kpis,         setKpis]         = useState({ ingresosMes: 0, ingresosAnt: 0, reservasMes: 0, reservasAnt: 0, ticket: 0, occ: 0 });
  const [monthlyData,  setMonthlyData]  = useState<MonthPoint[]>([]);
  const [courtRevData, setCourtRevData] = useState<CourtRev[]>([]);
  const [peakHours,    setPeakHours]    = useState<HourPoint[]>([]);
  const [totalCourts,  setTotalCourts]  = useState(0);

  /* ── Core compute function ── */
  const compute = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      /* 1 · Owner's courts */
      const { data: courtsRaw } = await supabase
        .from("owner_courts")
        .select("id, name, sport, slots")
        .eq("owner_id", user.id)
        .is("deleted_at", null);

      const courts = (courtsRaw ?? []) as CourtMeta[];
      setHasCourts(courts.length > 0);
      setTotalCourts(courts.length);

      if (courts.length === 0) { setLoading(false); return; }

      const courtNames = courts.map(c => c.name).filter(Boolean);
      const courtIds   = courts.map(c => c.id).filter(Boolean);

      /* 2 · Bookings — last 7 months */
      const since = new Date();
      since.setMonth(since.getMonth() - 7);
      const sinceStr = since.toISOString().split("T")[0];

      let bookingsQuery = supabase
        .from("bookings")
        .select("id, court_id, court_name, date, time, total_price, status, hours")
        .gte("date", sinceStr)
        .in("status", ["confirmed", "paid", "completed"])
        .order("date", { ascending: true });

      // Primary: match by court_id (secure FK). Fallback: court_name for legacy rows without court_id.
      if (courtIds.length > 0 && courtNames.length > 0) {
        bookingsQuery = bookingsQuery.or(`court_id.in.(${courtIds.join(',')}),and(court_id.is.null,court_name.in.(${courtNames.map(n => `"${n}"`).join(',')}))`);
      } else if (courtIds.length > 0) {
        bookingsQuery = bookingsQuery.in("court_id", courtIds);
      } else {
        bookingsQuery = bookingsQuery.in("court_name", courtNames);
      }

      const { data: bookingsRaw } = await bookingsQuery;

      const bookings = (bookingsRaw ?? []) as Booking[];
      setHasBookings(bookings.length > 0);

      if (bookings.length === 0) { setLoading(false); return; }

      /* 3 · Compute monthly metrics */
      const now         = new Date();
      const currYear    = now.getFullYear();
      const currMonth   = now.getMonth();            // 0-indexed
      const prevMonth   = (currMonth - 1 + 12) % 12;
      const prevYear    = currMonth === 0 ? currYear - 1 : currYear;

      /* Map: "year-month" → aggregates */
      const mMap: Record<string, { revenue: number; bookings: number }> = {};
      lastNMonths(7).forEach(({ year, month }) => {
        mMap[`${year}-${month}`] = { revenue: 0, bookings: 0 };
      });

      let ingresosMes = 0, ingresosAnt = 0;
      let reservasMes = 0, reservasAnt = 0;
      const hourMap:  Record<string, number> = {};
      const courtMap: Record<string, { sport: string | null; revenue: number; bookings: number }> = {};

      for (const b of bookings) {
        const { year: y, month: m } = parseDate(b.date);
        const key   = `${y}-${m}`;
        const price = b.total_price ?? 0;

        if (mMap[key]) {
          mMap[key].revenue  += price;
          mMap[key].bookings += 1;
        }

        if (y === currYear && m === currMonth) { ingresosMes += price; reservasMes++; }
        if (y === prevYear && m === prevMonth)  { ingresosAnt += price; reservasAnt++; }

        /* Peak hours */
        if (b.time) {
          const t = b.time.trim();
          hourMap[t] = (hourMap[t] ?? 0) + 1;
        }

        /* Per-court revenue */
        const cn = b.court_name ?? "Sin nombre";
        const ct = courts.find(c => c.name === cn);
        if (!courtMap[cn]) courtMap[cn] = { sport: ct?.sport ?? null, revenue: 0, bookings: 0 };
        courtMap[cn].revenue  += price;
        courtMap[cn].bookings += 1;
      }

      /* 4 · Monthly chart data with occupancy */
      const totalSlotsPerDay = courts.reduce((s, c) => s + (c.slots?.length ?? 10), 0);
      const monthPoints: MonthPoint[] = lastNMonths(7).map(({ year, month }) => {
        const md           = mMap[`${year}-${month}`];
        const daysThisMonth = daysInMonth(year, month);
        const availHours   = totalSlotsPerDay * daysThisMonth;
        const occ          = availHours > 0
          ? Math.min(100, Math.round((md.bookings / availHours) * 100))
          : 0;
        return { label: MONTH_ES[month], revenue: md.revenue, bookings: md.bookings, occ };
      });
      setMonthlyData(monthPoints);

      /* 5 · KPIs */
      const ticket = reservasMes > 0 ? Math.round(ingresosMes / reservasMes) : 0;
      const occNow = monthPoints[monthPoints.length - 1]?.occ ?? 0;
      setKpis({ ingresosMes, ingresosAnt, reservasMes, reservasAnt, ticket, occ: occNow });

      /* 6 · Revenue per court (sorted desc) */
      const totalRevAll = Object.values(courtMap).reduce((s, c) => s + c.revenue, 0) || 1;
      const courtRevArr: CourtRev[] = Object.entries(courtMap)
        .map(([name, d]) => ({
          name, sport: d.sport,
          revenue: d.revenue, bookings: d.bookings,
          pct: Math.round((d.revenue / totalRevAll) * 100),
        }))
        .sort((a, b) => b.revenue - a.revenue);
      setCourtRevData(courtRevArr);

      /* 7 · Peak hours (top 7) */
      const maxHour = Math.max(...Object.values(hourMap), 1);
      const peakArr: HourPoint[] = Object.entries(hourMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7)
        .map(([label, count]) => ({ label, count, pct: Math.round((count / maxHour) * 100) }));
      setPeakHours(peakArr);

      setLastUpdate(new Date().toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit", hour12: true }));
    } catch (err) {
      console.error("Analytics error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { compute(); }, [compute]);

  /* ── Realtime: re-compute on any booking/payment change ── */
  useEffect(() => {
    const ch = supabase
      .channel("analytics-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, compute)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, compute)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [compute]);

  /* ── Derived for charts ── */
  const maxRev   = Math.max(...monthlyData.map(m => m.revenue), 1);
  const currMon  = monthlyData[monthlyData.length - 1];
  const totalRev = monthlyData.reduce((s, m) => s + m.revenue, 0);

  /* ── Render ── */
  return (
    <div style={{ padding: "28px 28px 72px", maxWidth: 1050, margin: "0 auto" }}>
      <style>{`
        @keyframes fadeUp  { from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);} }
        @keyframes liveBlip{ 0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.5;transform:scale(1.6);} }
        @keyframes skPulse { 0%,100%{opacity:0.5;}50%{opacity:1;} }
        @keyframes countUp { from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);} }
        .bar-col:hover > div { opacity: 0.75 !important; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: 24, animation: "fadeUp 0.35s ease both" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", color: "#fff", margin: 0 }}>Analytics</h1>
            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.30)", marginTop: 4 }}>
              Ingresos, ocupación y tendencias de tus instalaciones
            </p>
          </div>
          {lastUpdate && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 99, background: "rgba(215,255,0,0.06)", border: "1px solid rgba(215,255,0,0.12)" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#D7FF00", animation: "liveBlip 2s ease-in-out infinite" }} />
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(215,255,0,0.65)", letterSpacing: "0.06em" }}>
                EN VIVO · {lastUpdate}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── No courts empty state ── */}
      {!loading && !hasCourts && (
        <div style={{ textAlign: "center", padding: "72px 24px", background: "rgba(255,255,255,0.02)", borderRadius: 18, border: "1px dashed rgba(255,255,255,0.08)", animation: "fadeUp 0.4s ease both" }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>📊</div>
          <p style={{ fontSize: 16, fontWeight: 800, color: "rgba(255,255,255,0.50)", marginBottom: 6 }}>
            Sin canchas registradas
          </p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)" }}>
            Creá tu primera cancha para empezar a ver tus estadísticas.
          </p>
        </div>
      )}

      {/* ── Has courts but no bookings ── */}
      {!loading && hasCourts && !hasBookings && (
        <div style={{ animation: "fadeUp 0.4s ease both" }}>
          {/* KPI skeleton */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ background: "rgba(10,10,10,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "20px" }}>
                <Skeleton h={10} w={80} r={4} />
                <div style={{ marginTop: 12 }}><Skeleton h={28} w="60%" r={6} /></div>
                <div style={{ marginTop: 8 }}><Skeleton h={10} w={100} r={4} /></div>
              </div>
            ))}
          </div>
          <div style={{ padding: "48px 24px", textAlign: "center", background: "rgba(10,10,10,0.8)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(215,255,0,0.07)", border: "1px solid rgba(215,255,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <BarChart3 size={20} color="rgba(215,255,0,0.5)" />
            </div>
            <p style={{ fontSize: 15, fontWeight: 800, color: "rgba(255,255,255,0.50)", marginBottom: 6 }}>
              Todavía no hay suficientes datos
            </p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", maxWidth: 340, margin: "0 auto" }}>
              Las estadísticas aparecerán automáticamente después de las primeras reservas confirmadas.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", marginTop: 20 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34D399", animation: "liveBlip 2s ease-in-out infinite" }} />
              <span style={{ fontSize: 11, color: "rgba(52,211,153,0.6)", fontWeight: 600 }}>
                Se actualiza en tiempo real cuando llegue la primera reserva
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
            {[1,2,3,4].map(i => <Skeleton key={i} h={100} r={14} />)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 14 }}>
            <Skeleton h={320} r={16} />
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Skeleton h={150} r={16} />
              <Skeleton h={150} r={16} />
            </div>
          </div>
        </div>
      )}

      {/* ── Real data ── */}
      {!loading && hasCourts && hasBookings && (
        <>
          {/* ── KPI cards ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16, animation: "fadeUp 0.38s 0.05s ease both" }}>
            {[
              {
                label: "Ingresos mes",
                value: fmt(kpis.ingresosMes),
                full: fmtFull(kpis.ingresosMes),
                change: pct(kpis.ingresosMes, kpis.ingresosAnt),
                icon: TrendingUp,
                color: "#D7FF00",
                bg: "rgba(215,255,0,0.06)",
                border: "rgba(215,255,0,0.12)",
              },
              {
                label: "Ocupación media",
                value: `${kpis.occ}%`,
                full: `${kpis.occ}% de disponibilidad`,
                change: null as number | null,
                icon: BarChart3,
                color: "#34D399",
                bg: "rgba(52,211,153,0.06)",
                border: "rgba(52,211,153,0.12)",
              },
              {
                label: "Reservas mes",
                value: String(kpis.reservasMes),
                full: `${kpis.reservasMes} reservas confirmadas`,
                change: pct(kpis.reservasMes, kpis.reservasAnt),
                icon: Calendar,
                color: "#60A5FA",
                bg: "rgba(96,165,250,0.06)",
                border: "rgba(96,165,250,0.12)",
              },
              {
                label: "Ticket promedio",
                value: fmt(kpis.ticket),
                full: fmtFull(kpis.ticket),
                change: null as number | null,
                icon: Users,
                color: "#F97316",
                bg: "rgba(249,115,22,0.06)",
                border: "rgba(249,115,22,0.12)",
              },
            ].map((k, i) => (
              <div key={i} style={{
                background: k.bg, border: `1px solid ${k.border}`,
                borderRadius: 14, padding: "16px 18px",
                position: "relative", overflow: "hidden",
                animation: `countUp 0.4s ${0.05 + i * 0.06}s ease both`,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,0.28)", letterSpacing: "0.06em" }}>
                    {k.label.toUpperCase()}
                  </span>
                  <k.icon size={13} color={k.color} style={{ opacity: 0.6 }} />
                </div>
                <div title={k.full} style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.04em", color: k.color, lineHeight: 1 }}>
                  {k.value}
                </div>
                <div style={{ marginTop: 8 }}>
                  {k.change !== null ? <Trend change={k.change} /> : (
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)" }}>{k.full}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ── Main layout: chart + sidebar ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 296px", gap: 14, marginBottom: 14, animation: "fadeUp 0.4s 0.10s ease both" }}>

            {/* Monthly revenue chart */}
            <div style={{ background: "rgba(10,10,10,0.80)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "20px 22px" }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(255,255,255,0.22)", marginBottom: 6 }}>
                  INGRESOS MENSUALES
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <span style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.04em", color: "#D7FF00" }}>
                    {fmt(currMon?.revenue ?? 0)}
                  </span>
                  {(() => {
                    const prev = monthlyData[monthlyData.length - 2];
                    const c    = pct(currMon?.revenue ?? 0, prev?.revenue ?? 0);
                    return <Trend change={c} />;
                  })()}
                </div>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.22)", marginTop: 3 }}>
                  {MONTH_ES[new Date().getMonth()]} · {currMon?.bookings ?? 0} reservas
                </div>
              </div>

              {/* Bar chart */}
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 130, marginBottom: 10 }}>
                {monthlyData.map((m, i) => {
                  const h      = maxRev > 0 ? Math.max((m.revenue / maxRev) * 130, m.revenue > 0 ? 5 : 2) : 2;
                  const isLast = i === monthlyData.length - 1;
                  return (
                    <div
                      key={i}
                      className="bar-col"
                      title={`${m.label}: ${fmt(m.revenue)} · ${m.bookings} reservas`}
                      style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 0, cursor: "default" }}
                    >
                      {isLast && m.revenue > 0 && (
                        <div style={{ fontSize: 9, color: "#D7FF00", fontWeight: 700, marginBottom: 4, whiteSpace: "nowrap" }}>
                          {fmt(m.revenue)}
                        </div>
                      )}
                      <div style={{
                        width: "100%", height: h,
                        borderRadius: "5px 5px 2px 2px",
                        background: isLast
                          ? "linear-gradient(180deg, #D7FF00 0%, rgba(215,255,0,0.50) 100%)"
                          : m.revenue > 0
                            ? "rgba(255,255,255,0.10)"
                            : "rgba(255,255,255,0.04)",
                        boxShadow: isLast ? "0 0 18px rgba(215,255,0,0.22)" : "none",
                        transition: "height 0.5s cubic-bezier(0.34,1.1,0.64,1)",
                      }} />
                    </div>
                  );
                })}
              </div>

              {/* Month labels */}
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {monthlyData.map((m, i) => (
                  <div key={i} style={{
                    flex: 1, textAlign: "center",
                    fontSize: 9.5,
                    fontWeight: i === monthlyData.length - 1 ? 800 : 500,
                    color: i === monthlyData.length - 1 ? "#D7FF00" : "rgba(255,255,255,0.22)",
                  }}>
                    {m.label}
                  </div>
                ))}
              </div>

              {/* Occupancy mini-chart */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 16 }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.07em", color: "rgba(255,255,255,0.20)", marginBottom: 10 }}>
                  OCUPACIÓN (%)
                </div>
                {monthlyData.map((m, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.22)", width: 24, flexShrink: 0 }}>{m.label}</div>
                    <div style={{ flex: 1, height: 5, borderRadius: 99, background: "rgba(255,255,255,0.05)" }}>
                      <div style={{
                        height: "100%", borderRadius: 99,
                        width: `${m.occ}%`,
                        background: m.occ >= 70 ? "#D7FF00" : m.occ >= 40 ? "#60A5FA" : "rgba(255,255,255,0.18)",
                        transition: "width 0.6s cubic-bezier(0.34,1.1,0.64,1)",
                      }} />
                    </div>
                    <div style={{ fontSize: 9, color: m.occ >= 70 ? "rgba(215,255,0,0.55)" : "rgba(255,255,255,0.25)", width: 26, textAlign: "right", flexShrink: 0 }}>
                      {m.occ}%
                    </div>
                  </div>
                ))}
                {totalCourts > 0 && (
                  <p style={{ fontSize: 9.5, color: "rgba(255,255,255,0.16)", marginTop: 8 }}>
                    Calculado sobre {totalCourts} cancha{totalCourts > 1 ? "s" : ""} y sus horarios disponibles
                  </p>
                )}
              </div>
            </div>

            {/* Right column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Revenue per court */}
              <div style={{ background: "rgba(10,10,10,0.80)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "16px 18px", flex: 1 }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.07em", color: "rgba(255,255,255,0.22)", marginBottom: 14 }}>
                  INGRESOS POR CANCHA
                </div>
                {courtRevData.length === 0 ? (
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.22)" }}>Sin datos aún</p>
                ) : (
                  courtRevData.map((c, i) => (
                    <div key={i} style={{ marginBottom: i < courtRevData.length - 1 ? 14 : 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,0.65)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>
                          {sportEmoji(c.sport)} {c.name}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 900, color: "#D7FF00", flexShrink: 0, marginLeft: 8 }}>
                          {fmt(c.revenue)}
                        </span>
                      </div>
                      <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,0.05)", marginBottom: 3 }}>
                        <div style={{
                          height: "100%", borderRadius: 99, width: `${c.pct}%`,
                          background: i === 0 ? "rgba(215,255,0,0.70)" : i === 1 ? "rgba(96,165,250,0.65)" : "rgba(52,211,153,0.55)",
                          transition: "width 0.6s cubic-bezier(0.34,1.1,0.64,1)",
                        }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 9.5, color: "rgba(255,255,255,0.20)" }}>{c.pct}% del total</span>
                        <span style={{ fontSize: 9.5, color: "rgba(255,255,255,0.20)" }}>{c.bookings} reservas</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Peak hours */}
              <div style={{ background: "rgba(10,10,10,0.80)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "16px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                  <Clock size={10} color="rgba(255,255,255,0.25)" />
                  <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.07em", color: "rgba(255,255,255,0.22)" }}>
                    HORAS PICO
                  </span>
                </div>
                {peakHours.length === 0 ? (
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.22)" }}>Sin datos aún</p>
                ) : (
                  peakHours.map((h, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.55)", width: 62, flexShrink: 0 }}>
                        {h.label}
                      </div>
                      <div style={{ flex: 1, height: 6, borderRadius: 99, background: "rgba(255,255,255,0.05)" }}>
                        <div style={{
                          height: "100%", borderRadius: 99, width: `${h.pct}%`,
                          background: h.pct >= 85 ? "#D7FF00"
                            : h.pct >= 60 ? "#60A5FA"
                            : "rgba(255,255,255,0.18)",
                          transition: "width 0.6s cubic-bezier(0.34,1.1,0.64,1)",
                        }} />
                      </div>
                      <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.28)", width: 18, textAlign: "right", flexShrink: 0 }}>
                        {h.count}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ── Summary insight bar ── */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10,
            animation: "fadeUp 0.42s 0.15s ease both",
          }}>
            {[
              {
                icon: "📅", color: "#D7FF00",
                label: "Total últimos 7 meses",
                value: fmt(totalRev),
                sub: `${monthlyData.reduce((s, m) => s + m.bookings, 0)} reservas confirmadas`,
              },
              {
                icon: "🏆", color: "#60A5FA",
                label: "Cancha más rentable",
                value: courtRevData[0]?.name ?? "—",
                sub: courtRevData[0] ? `${fmt(courtRevData[0].revenue)} · ${courtRevData[0].pct}% del total` : "Sin datos",
              },
              {
                icon: "⏰", color: "#F97316",
                label: "Hora más demandada",
                value: peakHours[0]?.label ?? "—",
                sub: peakHours[0] ? `${peakHours[0].count} reservas en ese horario` : "Sin datos",
              },
            ].map((s, i) => (
              <div key={i} style={{
                padding: "14px 16px", borderRadius: 13,
                background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "flex-start", gap: 12,
              }}>
                <span style={{ fontSize: 20 }}>{s.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: "0.06em", marginBottom: 4 }}>
                    {s.label.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: s.color, letterSpacing: "-0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>{s.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

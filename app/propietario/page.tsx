"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp, Clock, CheckCircle2, XCircle,
  ChevronRight, AlertTriangle, Users, Zap,
  CalendarDays, BarChart3, CreditCard,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────

interface BookingRow {
  id:          string;
  court_name:  string;
  date:        string;
  time:        string;
  players:     number;
  total_price: number;
  status:      string;
  profiles?:   { name?: string; email?: string } | null;
}

// ── Constants ─────────────────────────────────────────────────────────────

const WEEK_DAYS = ["L","M","X","J","V","S","D"];

function fmt(n: number) {
  return n >= 1000 ? `₡${(n / 1000).toFixed(0)}k` : `₡${n}`;
}
function fmtFull(n: number) {
  return `₡${n.toLocaleString("es-CR")}`;
}
function timeNow() {
  return new Date().toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function relativeTime(dateStr: string, timeStr: string) {
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  if (dateStr === today)    return `${timeStr} · hoy`;
  if (dateStr === tomorrow) return `${timeStr} · mañana`;
  return `${timeStr} · ${dateStr}`;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function OwnerDashboard() {
  const [time,      setTime]      = useState(timeNow());
  const [pending,   setPending]   = useState<BookingRow[]>([]);
  const [confirmed, setConfirmed] = useState<BookingRow[]>([]);
  const [todayNet,  setTodayNet]  = useState(0);
  const [weekData,  setWeekData]  = useState([0,0,0,0,0,0,0]);
  const [weekTotal, setWeekTotal] = useState(0);
  const [occPct,    setOccPct]    = useState<number | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [justActed, setJustActed] = useState<Record<string, "confirmed" | "rejected">>({});

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setTime(timeNow()), 30000);
    return () => clearInterval(t);
  }, []);

  // Fetch real bookings + compute week chart + occupancy
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const today    = new Date().toISOString().split("T")[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

      // Get owner's court names for filtering
      let courtNames: string[] = [];
      if (user) {
        const { data: courts } = await supabase
          .from("owner_courts")
          .select("name, slots")
          .eq("owner_id", user.id)
          .is("deleted_at", null);
        courtNames = (courts ?? []).map((c: any) => c.name).filter(Boolean);

        // Occupancy: this month's bookings / available slots
        const monthStart = new Date(); monthStart.setDate(1);
        const monthStartStr = monthStart.toISOString().split("T")[0];
        const totalSlotsPerDay = (courts ?? []).reduce((s: number, c: any) => s + (c.slots?.length ?? 10), 0);
        const daysGone = new Date().getDate();
        const availSoFar = totalSlotsPerDay * daysGone;

        // Sum hours booked (not count) so a 2-hour booking occupies 2 slots
        const { data: bookedRows } = await supabase
          .from("bookings")
          .select("hours")
          .in("court_name", courtNames)
          .in("status", ["confirmed", "paid", "completed"])
          .gte("date", monthStartStr)
          .lte("date", today);

        const bookedHours = (bookedRows ?? []).reduce((s: number, r: any) => s + (r.hours ?? 1), 0);
        setOccPct(availSoFar > 0 ? Math.min(100, Math.round((bookedHours / availSoFar) * 100)) : null);
      }

      // Week boundaries (Mon–Sun)
      const now     = new Date();
      const dowJS   = now.getDay();                  // Sun=0
      const monOff  = (dowJS + 6) % 7;               // days since Monday
      const monDate = new Date(now); monDate.setDate(now.getDate() - monOff); monDate.setHours(0,0,0,0);
      const sunDate = new Date(monDate); sunDate.setDate(monDate.getDate() + 6);
      const monStr  = monDate.toISOString().split("T")[0];
      const sunStr  = sunDate.toISOString().split("T")[0];

      // Week bookings — join payments to get owner_net_amount (net after fees)
      const weekQ = supabase
        .from("bookings")
        .select("date, payments!payment_id(owner_net_amount)")
        .in("status", ["confirmed", "paid", "completed"])
        .gte("date", monStr)
        .lte("date", sunStr);
      const { data: wRows } = courtNames.length > 0
        ? await weekQ.in("court_name", courtNames)
        : await weekQ;

      const wd = [0,0,0,0,0,0,0];
      for (const r of wRows ?? []) {
        const d = new Date((r as any).date + "T12:00:00");
        const i = (d.getDay() + 6) % 7; // Mon=0
        // Use owner net amount from payment record; falls back to 0 if not yet paid
        wd[i] += (r as any).payments?.owner_net_amount ?? 0;
      }
      setWeekData(wd);
      setWeekTotal(wd.reduce((s, v) => s + v, 0));

      // Pending bookings (today + tomorrow)
      const pendQ = supabase
        .from("bookings")
        .select("id, court_name, date, time, players, total_price, status, profiles(name, email)")
        .in("status", ["pending_payment", "pending", "partially_paid"])
        .gte("date", today).lte("date", tomorrow)
        .order("date", { ascending: true }).order("time", { ascending: true }).limit(10);
      const { data: pRows } = courtNames.length > 0
        ? await pendQ.in("court_name", courtNames)
        : await pendQ;

      // Confirmed today
      const confQ = supabase
        .from("bookings")
        .select("id, court_name, date, time, players, total_price, status, profiles(name, email)")
        .in("status", ["confirmed", "paid"])
        .eq("date", today)
        .order("time", { ascending: true }).limit(10);
      const { data: cRows } = courtNames.length > 0
        ? await confQ.in("court_name", courtNames)
        : await confQ;

      // Today's net revenue from payments table
      const { data: payRows } = await supabase
        .from("payments")
        .select("owner_net_amount, paid_at")
        .in("status", ["paid", "confirmed"])
        .gte("paid_at", `${today}T00:00:00.000Z`)
        .lte("paid_at", `${today}T23:59:59.999Z`);

      setPending((pRows ?? []) as BookingRow[]);
      setConfirmed((cRows ?? []) as BookingRow[]);
      setTodayNet((payRows ?? []).reduce((s: number, p: any) => s + (p.owner_net_amount ?? 0), 0));
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // Realtime subscription on bookings changes
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        fetchBookings();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchBookings]);

  const handleConfirm = async (id: string) => {
    setJustActed(prev => ({ ...prev, [id]: "confirmed" }));
    await supabase.from("bookings").update({ status: "confirmed" }).eq("id", id);
    setTimeout(() => fetchBookings(), 600);
  };

  const handleReject = async (id: string) => {
    setJustActed(prev => ({ ...prev, [id]: "rejected" }));
    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
    setTimeout(() => fetchBookings(), 600);
  };

  const maxWeek = Math.max(...weekData, 1);
  const nextBooking = confirmed[0] ?? null;

  return (
    <div style={{ padding: "32px 32px 60px", maxWidth: 1100, margin: "0 auto" }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes liveBlip { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.45;transform:scale(1.6);} }
        @keyframes slideOut { to { opacity:0; transform:translateX(40px); } }
        @keyframes slideIn  { from { opacity:0; transform:translateX(-20px); } to { opacity:1; transform:translateX(0); } }
        .stat-card { transition: transform 0.18s, box-shadow 0.18s; }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
        .action-btn { transition: all 0.16s; }
        .action-btn:hover { opacity: 0.88; transform: scale(1.03); }
        .pending-row { transition: opacity 0.4s, transform 0.4s; }
        .pending-row.acted { opacity: 0; transform: translateX(40px); }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: 32, animation: "fadeUp 0.35s ease both" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{
                width: 7, height: 7, borderRadius: "50%",
                background: "#D7FF00", boxShadow: "0 0 8px rgba(215,255,0,0.8)",
                animation: "liveBlip 2.2s ease-in-out infinite",
              }} />
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(215,255,0,0.65)", letterSpacing: "0.12em" }}>
                EN VIVO · {time}
              </span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.04em", color: "#fff", margin: 0, lineHeight: 1.1 }}>
              Dashboard
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginTop: 4, letterSpacing: "-0.01em" }}>
              {new Date().toLocaleDateString("es-CR", { weekday: "long", day: "numeric", month: "long" })} · Tus instalaciones en tiempo real
            </p>
          </div>
          <Link href="/propietario/reservas" style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "9px 16px", borderRadius: 10,
            background: "#D7FF00", color: "#000",
            textDecoration: "none", fontSize: 12.5, fontWeight: 800,
            letterSpacing: "-0.015em",
            boxShadow: "0 0 20px rgba(215,255,0,0.25)",
          }}>
            <BarChart3 size={13} />
            Ver todas las reservas
          </Link>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12,
        marginBottom: 28, animation: "fadeUp 0.38s 0.05s ease both",
      }}>
        {[
          {
            label: "Ingresos hoy", value: todayNet > 0 ? fmt(todayNet) : "₡0",
            sub: "neto recibido", icon: TrendingUp, color: "#D7FF00",
            bg: "rgba(215,255,0,0.06)", border: "rgba(215,255,0,0.12)",
          },
          {
            label: "Pendientes", value: pending.length.toString(),
            sub: "requieren acción", icon: AlertTriangle, color: "#FACC15",
            bg: "rgba(250,204,21,0.06)", border: "rgba(250,204,21,0.14)",
            urgent: pending.length > 0,
          },
          {
            label: "Confirmadas", value: confirmed.length.toString(),
            sub: "para hoy", icon: CheckCircle2, color: "#34D399",
            bg: "rgba(52,211,153,0.06)", border: "rgba(52,211,153,0.12)",
          },
          {
            label: "Ocupación", value: occPct !== null ? `${occPct}%` : "—",
            sub: occPct !== null ? "del tiempo disponible este mes" : "calculando…", icon: BarChart3, color: "#60A5FA",
            bg: "rgba(96,165,250,0.06)", border: "rgba(96,165,250,0.12)",
          },
        ].map((s, i) => (
          <div key={i} className="stat-card" style={{
            background: s.bg, border: `1px solid ${s.border}`,
            borderRadius: 14, padding: "16px 18px",
            position: "relative", overflow: "hidden",
          }}>
            {s.urgent && (
              <div style={{
                position: "absolute", inset: 0, borderRadius: 14,
                animation: "liveBlip 2s ease-in-out infinite",
                background: "rgba(250,204,21,0.03)",
                pointerEvents: "none",
              }} />
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: "rgba(255,255,255,0.35)", letterSpacing: "0.04em" }}>
                {s.label.toUpperCase()}
              </span>
              <s.icon size={13} color={s.color} style={{ opacity: 0.7 }} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em", color: s.color, lineHeight: 1 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", marginTop: 4, letterSpacing: "-0.01em" }}>
              {s.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── Main grid: pending + week chart ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 320px", gap: 16,
        marginBottom: 16, animation: "fadeUp 0.4s 0.1s ease both",
      }}>

        {/* Pending reservations */}
        <div style={{
          background: "rgba(10,10,10,0.8)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 16, overflow: "hidden",
        }}>
          <div style={{
            padding: "16px 20px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <AlertTriangle size={13} color="#FACC15" />
              <span style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
                Reservas pendientes
              </span>
              {pending.length > 0 && (
                <span style={{
                  background: "#FACC15", color: "#000",
                  fontSize: 9.5, fontWeight: 900, padding: "2px 7px",
                  borderRadius: 99, letterSpacing: "-0.01em",
                }}>
                  {pending.length}
                </span>
              )}
            </div>
            <Link href="/propietario/reservas" style={{
              fontSize: 10.5, fontWeight: 600, color: "rgba(215,255,0,0.5)",
              textDecoration: "none", display: "flex", alignItems: "center", gap: 3,
            }}>
              Ver todas <ChevronRight size={10} />
            </Link>
          </div>

          {pending.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <CheckCircle2 size={28} color="rgba(52,211,153,0.4)" style={{ margin: "0 auto 10px" }} />
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.22)" }}>Todo al día — sin pendientes</p>
            </div>
          ) : (
            <div>
              {pending.map((r, i) => (
                <div
                  key={r.id}
                  className={`pending-row ${justActed[r.id] ? "acted" : ""}`}
                  style={{
                    padding: "14px 20px",
                    borderBottom: i < pending.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    display: "flex", alignItems: "center", gap: 14,
                  }}
                >
                  {/* Court icon */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: "rgba(250,204,21,0.08)", border: "1px solid rgba(250,204,21,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15,
                  }}>
                    ⚽
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", letterSpacing: "-0.015em", lineHeight: 1.2 }}>
                      {r.profiles?.name ?? r.profiles?.email ?? "Jugador"}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                      <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)" }}>{r.court_name}</span>
                      <span style={{ width: 2, height: 2, borderRadius: "50%", background: "rgba(255,255,255,0.15)", flexShrink: 0 }} />
                      <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)" }}>{relativeTime(r.date, r.time)}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)" }}>
                        <Users size={9} style={{ display: "inline", marginRight: 3 }} />{r.players ?? "–"} jugadores
                      </span>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(215,255,0,0.7)" }}>
                        {fmt(r.total_price)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      className="action-btn"
                      onClick={() => handleConfirm(r.id)}
                      style={{
                        padding: "7px 13px", borderRadius: 8, border: "none",
                        background: "rgba(52,211,153,0.12)", color: "#34D399",
                        cursor: "pointer", fontSize: 11, fontWeight: 700,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      Confirmar
                    </button>
                    <button
                      className="action-btn"
                      onClick={() => handleReject(r.id)}
                      style={{
                        padding: "7px 10px", borderRadius: 8, border: "none",
                        background: "rgba(239,68,68,0.10)", color: "rgba(239,68,68,0.7)",
                        cursor: "pointer", fontSize: 11, fontWeight: 700,
                      }}
                    >
                      <XCircle size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weekly revenue chart */}
        <div style={{
          background: "rgba(10,10,10,0.8)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 16, padding: "16px 20px",
        }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.04em", marginBottom: 4 }}>
              INGRESOS SEMANALES
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em", color: "#D7FF00" }}>
              {fmt(weekTotal)}
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>
              {weekTotal > 0 ? "esta semana · reservas confirmadas" : "esta semana · sin reservas aún"}
            </div>
          </div>

          {/* Bar chart */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 90, marginBottom: 8 }}>
            {weekData.map((rev, i) => {
              const h = (rev / maxWeek) * 90;
              const todayDow = (new Date().getDay() + 6) % 7; // Mon=0
              const isToday = i === todayDow;
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                  <div
                    title={`${WEEK_DAYS[i]}: ${fmt(rev)}`}
                    style={{
                      width: "100%", height: Math.max(h, 4),
                      borderRadius: "4px 4px 2px 2px",
                      background: isToday
                        ? "linear-gradient(180deg, #D7FF00, #D7FF0088)"
                        : "rgba(255,255,255,0.08)",
                      boxShadow: isToday ? "0 0 12px rgba(215,255,0,0.3)" : "none",
                      transition: "height 0.4s ease",
                      cursor: "default",
                    }}
                  />
                </div>
              );
            })}
          </div>
          {/* Day labels */}
          <div style={{ display: "flex", gap: 6 }}>
            {WEEK_DAYS.map((d, i) => {
              const todayDow = (new Date().getDay() + 6) % 7;
              return (
                <div key={i} style={{
                  flex: 1, textAlign: "center",
                  fontSize: 9, fontWeight: i === todayDow ? 800 : 500,
                  color: i === todayDow ? "#D7FF00" : "rgba(255,255,255,0.22)",
                }}>
                  {d}
                </div>
              );
            })}
          </div>

          {/* Payments link */}
          <div style={{ marginTop: 16, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 14 }}>
            <Link href="/propietario/pagos" style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              textDecoration: "none",
              padding: "10px 12px", borderRadius: 10,
              background: "rgba(215,255,0,0.04)", border: "1px solid rgba(215,255,0,0.10)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CreditCard size={12} color="#D7FF00" />
                <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(215,255,0,0.7)" }}>Ver pagos ONVO</span>
              </div>
              <ChevronRight size={11} color="rgba(215,255,0,0.5)" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Confirmed today ── */}
      <div style={{
        background: "rgba(10,10,10,0.8)", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16, overflow: "hidden",
        animation: "fadeUp 0.42s 0.15s ease both",
      }}>
        <div style={{
          padding: "14px 20px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <CheckCircle2 size={13} color="#34D399" />
            <span style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
              Confirmadas para hoy
            </span>
          </div>
          <Link href="/propietario/calendario" style={{
            display: "flex", alignItems: "center", gap: 4,
            fontSize: 10.5, color: "rgba(215,255,0,0.5)",
            textDecoration: "none", fontWeight: 600,
          }}>
            <CalendarDays size={10} /> Calendario
          </Link>
        </div>
        {confirmed.length === 0 ? (
          <div style={{ padding: "32px 20px", textAlign: "center" }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.22)" }}>Sin confirmadas para hoy aún</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 0 }}>
            {confirmed.slice(0, 6).map((r, i) => (
              <div key={r.id} style={{
                padding: "13px 18px",
                borderRight: i % 3 < 2 ? "1px solid rgba(255,255,255,0.05)" : "none",
                borderBottom: i < confirmed.slice(0,6).length - 3 ? "1px solid rgba(255,255,255,0.05)" : "none",
                animation: "slideIn 0.3s ease both",
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", letterSpacing: "-0.015em", marginBottom: 3 }}>
                  {r.profiles?.name ?? "Jugador"}
                </div>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>{r.court_name}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.25)" }}>{r.time}</span>
                  <span style={{
                    fontSize: 10.5, fontWeight: 700, color: "rgba(52,211,153,0.7)",
                    background: "rgba(52,211,153,0.06)", padding: "2px 8px",
                    borderRadius: 99, border: "1px solid rgba(52,211,153,0.12)",
                  }}>
                    {fmt(r.total_price)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Quick links row ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 14,
        animation: "fadeUp 0.44s 0.2s ease both",
      }}>
        {[
          { href: "/propietario/canchas",      icon: "🏟️", label: "Gestionar canchas",     sub: "Tus instalaciones"        },
          { href: "/propietario/pagos",        icon: "💳", label: "Pagos ONVO",              sub: "Historial y transferencias" },
          { href: "/propietario/analytics",    icon: "📊", label: "Analytics",               sub: "Ingresos y tendencias"   },
        ].map(q => (
          <Link key={q.href} href={q.href} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "13px 16px", borderRadius: 12, textDecoration: "none",
            background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)",
            transition: "background 0.16s, border-color 0.16s",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.025)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)"; }}
          >
            <span style={{ fontSize: 18 }}>{q.icon}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.65)", letterSpacing: "-0.015em" }}>{q.label}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", marginTop: 1 }}>{q.sub}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}


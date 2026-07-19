"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  CreditCard, TrendingUp, Clock, CheckCircle2,
  AlertCircle, RefreshCw, ChevronRight, Download,
  XCircle, Search,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

interface Payment {
  id:               string;
  status:           string;
  gross_amount:     number;
  platform_fee:     number;
  onvo_fee_estimate: number;
  owner_net_amount: number;
  payment_method:   string | null;
  paid_at:          string | null;
  created_at:       string;
  is_split:         boolean;
  split_count:      number;
  split_paid_count: number;
  failure_reason:   string | null;
  bookings: {
    id:         string;
    court_name: string;
    date:       string;
    time:       string;
  } | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `₡${n.toLocaleString("es-CR")}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CR", {
    day: "numeric", month: "short", year: "numeric",
  });
}

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  pending_payment: { label: "Pendiente",     color: "#F59E0B", bg: "rgba(245,158,11,0.1)"  },
  partially_paid:  { label: "Parcial",       color: "#6366F1", bg: "rgba(99,102,241,0.1)"  },
  paid:            { label: "Pagado",        color: "#34D399", bg: "rgba(52,211,153,0.1)"  },
  confirmed:       { label: "Confirmado",    color: "#3B82F6", bg: "rgba(59, 130, 246,0.08)"  },
  failed:          { label: "Fallido",       color: "#EF4444", bg: "rgba(239,68,68,0.1)"   },
  expired:         { label: "Expirado",      color: "#9CA3AF", bg: "rgba(156,163,175,0.1)" },
  cancelled:       { label: "Cancelado",     color: "#9CA3AF", bg: "rgba(156,163,175,0.1)" },
  refunded:        { label: "Reembolsado",   color: "#818CF8", bg: "rgba(129,140,248,0.1)" },
};

const STATUS_OPTIONS = ["Todos","pending_payment","partially_paid","paid","confirmed","failed","expired","cancelled","refunded"];

// ── Component ──────────────────────────────────────────────────────────────

export default function PagosPage() {
  const [payments,  setPayments]  = useState<Payment[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [statusFlt, setStatusFlt] = useState("Todos");
  const [loadError, setLoadError] = useState("");
  const [stats,     setStats]     = useState({
    totalNet: 0, thisMonth: 0, pending: 0, refunded: 0,
  });

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setPayments([]); return; }

      // Scope to money owed to THIS owner. The payments RLS policy is
      // (auth.uid() = user_id OR auth.uid() = owner_id), so without this filter an
      // owner who has also booked as a player sees their own outgoing payments
      // counted as revenue.
      const { data, error } = await supabase
        .from("payments")
        .select(`
          id, status, gross_amount, platform_fee, onvo_fee_estimate, owner_net_amount,
          payment_method, paid_at, created_at, is_split, split_count, split_paid_count,
          failure_reason,
          bookings:reservation_id (id, court_name, date, time)
        `)
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      const rows = (data ?? []) as unknown as Payment[];
      setPayments(rows);

      // Compute stats
      const now       = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const totalNet  = rows.filter(p => ["paid","confirmed"].includes(p.status))
                           .reduce((s, p) => s + p.owner_net_amount, 0);
      const thisMonth = rows.filter(p => ["paid","confirmed"].includes(p.status) && (p.paid_at ?? "") >= monthStart)
                           .reduce((s, p) => s + p.owner_net_amount, 0);
      const pending   = rows.filter(p => ["pending_payment","partially_paid"].includes(p.status)).length;
      const refunded  = rows.filter(p => p.status === "refunded")
                           .reduce((s, p) => s + p.gross_amount, 0);

      setStats({ totalNet, thisMonth, pending, refunded });
    } catch (e: any) {
      console.error("Pagos fetch error:", e);
      setPayments([]);
      setStats({ totalNet: 0, thisMonth: 0, pending: 0, refunded: 0 });
      setLoadError(e?.message || "No se pudieron cargar los pagos. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  // ── Filter ────────────────────────────────────────────────────────────────

  const filtered = payments.filter(p => {
    const matchStatus = statusFlt === "Todos" || p.status === statusFlt;
    const q = search.toLowerCase();
    const matchSearch = !q
      || p.id.toLowerCase().includes(q)
      || (p.bookings?.court_name ?? "").toLowerCase().includes(q)
      || (p.payment_method ?? "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "32px 32px 60px", maxWidth: 1100, margin: "0 auto" }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);} }
        .pay-row { transition: background 0.13s; }
        .pay-row:hover { background: rgba(255,255,255,0.025) !important; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28, animation: "fadeUp 0.35s ease both" }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 4 }}>Pagos</h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>Historial de transacciones ONVO Pay · Tu ingreso neto</p>
      </div>

      {/* Never show ₡0 as if it were real when the query actually failed */}
      {loadError && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "11px 14px", borderRadius: 10, marginBottom: 16, fontSize: 13,
          background: "rgba(255,59,59,0.07)", color: "#FF6B6B",
          border: "1px solid rgba(255,59,59,0.15)",
        }}>
          <AlertCircle size={15} /> {loadError}
        </div>
      )}

      {/* ── Stat cards ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12,
        marginBottom: 24, animation: "fadeUp 0.38s 0.05s ease both",
      }}>
        {[
          { label: "Total neto",    value: fmt(stats.totalNet),  sub: "todos los tiempos",  icon: TrendingUp,  color: "#3B82F6", bg: "rgba(59, 130, 246,0.06)",   border: "rgba(59, 130, 246,0.12)"   },
          { label: "Este mes",      value: fmt(stats.thisMonth), sub: "neto recibido",       icon: CreditCard,  color: "#34D399", bg: "rgba(52,211,153,0.06)",  border: "rgba(52,211,153,0.12)"  },
          { label: "Pendientes",    value: stats.pending.toString(), sub: "por confirmar",   icon: Clock,       color: "#F59E0B", bg: "rgba(245,158,11,0.06)",  border: "rgba(245,158,11,0.14)"  },
          { label: "Reembolsado",   value: fmt(stats.refunded),  sub: "devuelto",            icon: RefreshCw,   color: "#818CF8", bg: "rgba(129,140,248,0.06)", border: "rgba(129,140,248,0.12)" },
        ].map((s, i) => (
          <div key={i} style={{
            background: s.bg, border: `1px solid ${s.border}`,
            borderRadius: 14, padding: "16px 18px",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: "rgba(255,255,255,0.35)", letterSpacing: "0.04em" }}>
                {s.label.toUpperCase()}
              </span>
              <s.icon size={13} color={s.color} style={{ opacity: 0.7 }} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", color: s.color, lineHeight: 1 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Platform fee explainer ── */}
      <div style={{
        padding: "14px 18px", borderRadius: 12,
        background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.13)",
        marginBottom: 24, animation: "fadeUp 0.4s 0.08s ease both",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <AlertCircle size={14} color="#818CF8" style={{ flexShrink: 0 }} />
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0 }}>
          TuCancha retiene un <strong style={{ color: "rgba(255,255,255,0.6)" }}>8% de comisión de plataforma</strong>.
          ONVO Pay cobra aprox. <strong style={{ color: "rgba(255,255,255,0.6)" }}>2.9% + ₡300</strong> por transacción.
          Tu ingreso neto = Bruto − comisión plataforma − tarifa ONVO.
        </p>
      </div>

      {/* ── Filters ── */}
      <div style={{
        display: "flex", gap: 10, marginBottom: 16,
        animation: "fadeUp 0.4s 0.1s ease both",
        flexWrap: "wrap",
      }}>
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <Search size={13} style={{
            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
            color: "rgba(255,255,255,0.3)", pointerEvents: "none",
          }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por cancha, método, ID…"
            style={{
              width: "100%", padding: "10px 14px 10px 34px",
              borderRadius: 10, fontSize: 13,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "var(--text)", outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {STATUS_OPTIONS.map(s => (
            <button key={s} onClick={() => setStatusFlt(s)} style={{
              padding: "8px 14px", borderRadius: 8, border: "none",
              fontSize: 11.5, fontWeight: 600, cursor: "pointer",
              background: statusFlt === s ? "var(--accent)" : "rgba(255,255,255,0.05)",
              color: statusFlt === s ? "#000" : "rgba(255,255,255,0.45)",
              transition: "all 0.14s",
            }}>
              {s === "Todos" ? "Todos" : (STATUS_LABEL[s]?.label ?? s)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{
        background: "rgba(10,10,10,0.8)", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16, overflow: "hidden",
        animation: "fadeUp 0.42s 0.12s ease both",
      }}>
        {/* Table header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 140px 110px 110px 110px 120px",
          padding: "10px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          fontSize: 10, fontWeight: 700,
          color: "rgba(255,255,255,0.28)", letterSpacing: "0.05em",
        }}>
          <span>RESERVA</span>
          <span>BRUTO</span>
          <span>PLATAFORMA</span>
          <span>ONVO</span>
          <span>NETO TUYO</span>
          <span>ESTADO</span>
        </div>

        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13 }}>
            Cargando pagos…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center" }}>
            <CreditCard size={32} style={{ color: "rgba(255,255,255,0.12)", margin: "0 auto 12px", display: "block" }} />
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)" }}>
              {search || statusFlt !== "Todos" ? "Sin resultados para ese filtro." : "Sin pagos aún."}
            </p>
          </div>
        ) : (
          filtered.map((p, i) => {
            const st = STATUS_LABEL[p.status] ?? { label: p.status, color: "#9CA3AF", bg: "rgba(255,255,255,0.05)" };
            return (
              <div key={p.id} className="pay-row" style={{
                display: "grid",
                gridTemplateColumns: "1fr 140px 110px 110px 110px 120px",
                padding: "13px 18px",
                borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                alignItems: "center",
              }}>
                {/* Reservation */}
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", letterSpacing: "-0.015em" }}>
                    {p.bookings?.court_name ?? "—"}
                  </div>
                  <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                    {p.bookings
                      ? `${p.bookings.date} · ${p.bookings.time}`
                      : fmtDate(p.created_at)}
                    {p.is_split && (
                      <span style={{
                        marginLeft: 8, fontSize: 9.5, fontWeight: 700,
                        color: "#818CF8", background: "rgba(129,140,248,0.1)",
                        padding: "1px 6px", borderRadius: 4,
                      }}>
                        {p.split_paid_count}/{p.split_count} split
                      </span>
                    )}
                  </div>
                </div>

                {/* Gross */}
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{fmt(p.gross_amount)}</div>

                {/* Platform fee */}
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>−{fmt(p.platform_fee)}</div>

                {/* ONVO fee */}
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>−{fmt(p.onvo_fee_estimate)}</div>

                {/* Net */}
                <div style={{
                  fontSize: 13, fontWeight: 800,
                  color: ["paid","confirmed"].includes(p.status) ? "#3B82F6" : "rgba(255,255,255,0.5)",
                }}>
                  {fmt(p.owner_net_amount)}
                </div>

                {/* Status */}
                <div>
                  <span style={{
                    display: "inline-block",
                    padding: "3px 10px", borderRadius: 99,
                    fontSize: 10.5, fontWeight: 700,
                    color: st.color, background: st.bg,
                  }}>
                    {st.label}
                  </span>
                  {p.paid_at && (
                    <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.22)", marginTop: 3 }}>
                      {fmtDate(p.paid_at)}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Footer note ── */}
      <p style={{
        fontSize: 11, color: "rgba(255,255,255,0.18)",
        textAlign: "center", marginTop: 24,
      }}>
        Los montos netos están sujetos a los tiempos de transferencia de ONVO Pay.
        Las tarifas ONVO son estimadas.
      </p>
    </div>
  );
}

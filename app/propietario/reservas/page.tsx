"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  CheckCircle2, XCircle, Clock, Search,
  Users, X, AlertTriangle, RefreshCw,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────── */

type RawStatus = string;

type Booking = {
  id:         string;
  playerName: string;
  phone:      string;
  email:      string;
  courtName:  string;
  sport:      string;
  date:       string;   // YYYY-MM-DD
  time:       string;
  duration:   number;
  players:    number;
  amount:     number;
  notes:      string;
  status:     RawStatus;
  createdAt:  string;   // ISO timestamp
};

type TabFilter = "all" | "pending" | "confirmed" | "rejected";

/* ─── Helpers ────────────────────────────────────────────── */

function normalise(row: Record<string, any>): Booking {
  return {
    id:         String(row.id),
    playerName: row.player_name  ?? row.name        ?? row.user_name
              ?? row.team_name   ?? (row.email ? row.email.split("@")[0] : null)
              ?? "Jugador",
    phone:      row.phone        ?? row.phone_number ?? "—",
    email:      row.email        ?? "—",
    courtName:  row.court_name   ?? row.court        ?? "—",
    sport:      row.sport        ?? row.deporte       ?? "—",
    date:       row.date         ?? "",
    time:       row.time         ?? "—",
    duration:   row.hours        ?? row.duration      ?? 1,
    players:    row.players      ?? row.player_count  ?? 0,
    amount:     row.total_price  ?? row.price         ?? row.amount ?? 0,
    notes:      row.notes        ?? row.note          ?? "",
    status:     row.status       ?? "pending",
    createdAt:  row.created_at   ?? "",
  };
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 1)   return "ahora mismo";
  if (min < 60)  return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24)    return `hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1)   return "ayer";
  return `hace ${d} días`;
}

function displayDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const today = new Date().toISOString().split("T")[0];
  const tom   = new Date(Date.now() + 86_400_000).toISOString().split("T")[0];
  const yest  = new Date(Date.now() - 86_400_000).toISOString().split("T")[0];
  if (dateStr === today) return "Hoy";
  if (dateStr === tom)   return "Mañana";
  if (dateStr === yest)  return "Ayer";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-CR", { day: "numeric", month: "short" });
}

function fmt(n: number) {
  return n >= 1000 ? `₡${(n / 1000).toFixed(0)}k` : `₡${n}`;
}

/** Map raw DB status → which tab it belongs to */
function tabGroup(status: string): TabFilter {
  if (["pending", "pending_payment", "partially_paid"].includes(status)) return "pending";
  if (["confirmed", "paid", "completed"].includes(status))               return "confirmed";
  if (["rejected", "cancelled"].includes(status))                        return "rejected";
  return "pending";
}

/* ─── Status display meta ────────────────────────────────── */

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  pending:         { label: "Pendiente",  color: "#FACC15",            bg: "rgba(250,204,21,0.08)",  border: "rgba(250,204,21,0.18)",  icon: <Clock        size={10} /> },
  pending_payment: { label: "Pendiente",  color: "#FACC15",            bg: "rgba(250,204,21,0.08)",  border: "rgba(250,204,21,0.18)",  icon: <Clock        size={10} /> },
  partially_paid:  { label: "Parcial",    color: "#818CF8",            bg: "rgba(129,140,248,0.08)", border: "rgba(129,140,248,0.18)", icon: <Clock        size={10} /> },
  confirmed:       { label: "Confirmada", color: "#34D399",            bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.15)",  icon: <CheckCircle2 size={10} /> },
  paid:            { label: "Pagada",     color: "#34D399",            bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.15)",  icon: <CheckCircle2 size={10} /> },
  completed:       { label: "Completada", color: "#34D399",            bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.15)",  icon: <CheckCircle2 size={10} /> },
  rejected:        { label: "Rechazada",  color: "rgba(239,68,68,0.7)", bg: "rgba(239,68,68,0.07)",  border: "rgba(239,68,68,0.14)",   icon: <XCircle      size={10} /> },
  cancelled:       { label: "Cancelada",  color: "rgba(255,255,255,0.3)", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)", icon: <XCircle size={10} /> },
};

const STATUS_META_FALLBACK = STATUS_META.pending;

/* ─── Sport colours ──────────────────────────────────────── */

const SPORT_TAG: Record<string, { bg: string; color: string; border: string; icon: string }> = {
  "Fútbol":   { bg: "rgba(215,255,0,0.07)",  color: "rgba(215,255,0,0.75)",  border: "rgba(215,255,0,0.14)",  icon: "⚽" },
  "Fútbol 5": { bg: "rgba(215,255,0,0.07)",  color: "rgba(215,255,0,0.75)",  border: "rgba(215,255,0,0.14)",  icon: "⚽" },
  "Fútbol 8": { bg: "rgba(215,255,0,0.07)",  color: "rgba(215,255,0,0.75)",  border: "rgba(215,255,0,0.14)",  icon: "⚽" },
  "Fútsal":   { bg: "rgba(215,255,0,0.07)",  color: "rgba(215,255,0,0.75)",  border: "rgba(215,255,0,0.14)",  icon: "⚽" },
  "Pádel":    { bg: "rgba(96,165,250,0.08)", color: "rgba(96,165,250,0.80)", border: "rgba(96,165,250,0.16)", icon: "🏓" },
  "Tenis":    { bg: "rgba(96,165,250,0.08)", color: "rgba(96,165,250,0.80)", border: "rgba(96,165,250,0.16)", icon: "🎾" },
  "Básquet":  { bg: "rgba(249,115,22,0.08)", color: "rgba(249,115,22,0.80)", border: "rgba(249,115,22,0.16)", icon: "🏀" },
};

const SPORT_TAG_FALLBACK = { bg: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.30)", border: "rgba(255,255,255,0.08)", icon: "🏟" };

function getSportTag(sport: string) {
  // Fuzzy match
  if (!sport || sport === "—") return SPORT_TAG_FALLBACK;
  const s = sport.toLowerCase();
  if (s.includes("padel") || s.includes("pádel")) return SPORT_TAG["Pádel"];
  if (s.includes("tenis"))                         return SPORT_TAG["Tenis"];
  if (s.includes("básquet") || s.includes("basquet")) return SPORT_TAG["Básquet"];
  if (s.includes("fútsal") || s.includes("futsal"))   return SPORT_TAG["Fútsal"];
  if (s.includes("fútbol") || s.includes("futbol"))   return SPORT_TAG["Fútbol"];
  return SPORT_TAG[sport] ?? SPORT_TAG_FALLBACK;
}

/* ─── Component ──────────────────────────────────────────── */

export default function ReservasPage() {
  const [bookings,   setBookings]  = useState<Booking[]>([]);
  const [loading,    setLoading]   = useState(true);
  const [courtNames, setCourtNames]= useState<string[]>([]);
  const [filter,     setFilter]    = useState<TabFilter>("all");
  const [search,     setSearch]    = useState("");
  const [selected,   setSelected]  = useState<Booking | null>(null);
  const [animating,  setAnimating] = useState<Record<string, "confirming" | "rejecting">>({});
  const [newIds,     setNewIds]    = useState<Set<string>>(new Set());
  const [saving,     setSaving]    = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const prevIdsRef = useRef<Set<string>>(new Set());

  /* ── Load owner's courts + bookings ── */
  const fetchAll = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      /* Get owner's court names */
      const { data: courts } = await supabase
        .from("owner_courts")
        .select("name")
        .eq("owner_id", user.id)
        .eq("active", true)
        .is("deleted_at", null);

      const names = (courts ?? []).map((c: any) => c.name).filter(Boolean) as string[];
      setCourtNames(names);

      /* Fetch bookings for those courts */
      let q = supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (names.length > 0) {
        q = q.in("court_name", names);
      } else {
        /* Owner has no courts yet — no bookings */
        setBookings([]);
        setLoading(false);
        return;
      }

      const { data, error } = await q;
      if (error) { console.error("bookings fetch error:", error); }

      const rows = (data ?? []).map(normalise);

      /* Detect truly new rows (appeared since last fetch) */
      const current = new Set(rows.map(r => r.id));
      const fresh   = new Set<string>();
      current.forEach(id => {
        if (prevIdsRef.current.size > 0 && !prevIdsRef.current.has(id)) fresh.add(id);
      });
      prevIdsRef.current = current;
      if (fresh.size > 0) {
        setNewIds(prev => new Set([...prev, ...fresh]));
        setTimeout(() => setNewIds(prev => {
          const n = new Set(prev); fresh.forEach(id => n.delete(id)); return n;
        }), 4000);
      }

      setBookings(rows);
    } catch (e) {
      console.error("fetchAll error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Realtime subscription ── */
  useEffect(() => {
    const ch = supabase
      .channel("reservas-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        fetchAll();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchAll]);

  /* ── Confirm / Reject actions ── */
  const act = useCallback(async (id: string, action: "confirmed" | "rejected") => {
    setActionError(null);
    setSaving(prev => ({ ...prev, [id]: true }));

    /* Optimistic update */
    setBookings(prev => prev.map(r => r.id === id ? { ...r, status: action } : r));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: action } : null);

    /* Row slide-out animation */
    setAnimating(prev => ({ ...prev, [id]: action === "confirmed" ? "confirming" : "rejecting" }));
    setTimeout(() => setAnimating(prev => { const n = { ...prev }; delete n[id]; return n; }), 400);

    /* Persist */
    const { error } = await supabase
      .from("bookings")
      .update({ status: action })
      .eq("id", id);

    if (error) {
      /* Rollback optimistic update */
      setBookings(prev => prev.map(r => r.id === id ? { ...r, status: "pending" } : r));
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: "pending" } : null);
      setActionError("No se pudo actualizar la reserva. Intenta de nuevo.");
      console.error("act error:", error);
    }

    setSaving(prev => { const n = { ...prev }; delete n[id]; return n; });
  }, [selected]);

  /* ── Filtered results ── */
  const q = search.toLowerCase();
  const filtered = bookings.filter(r => {
    const tabOk   = filter === "all" || tabGroup(r.status) === filter;
    const searchOk = !q
      || r.playerName.toLowerCase().includes(q)
      || r.courtName.toLowerCase().includes(q)
      || r.sport.toLowerCase().includes(q)
      || r.date.includes(q)
      || displayDate(r.date).toLowerCase().includes(q);
    return tabOk && searchOk;
  });

  const pendingCount   = bookings.filter(r => tabGroup(r.status) === "pending").length;
  const confirmedCount = bookings.filter(r => tabGroup(r.status) === "confirmed").length;
  const rejectedCount  = bookings.filter(r => tabGroup(r.status) === "rejected").length;

  const tabCounts: Record<TabFilter, number> = {
    all:       bookings.length,
    pending:   pendingCount,
    confirmed: confirmedCount,
    rejected:  rejectedCount,
  };

  /* ── Empty state: owner has courts but no bookings ── */
  const isEmpty = !loading && bookings.length === 0;

  return (
    <div style={{ padding: "28px 28px 60px", maxWidth: 1020, margin: "0 auto" }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);} }
        @keyframes rowSlide { to { opacity:0; transform:translateX(52px); } }
        @keyframes modalIn { from{opacity:0;transform:scale(0.97) translateY(8px);}to{opacity:1;transform:scale(1) translateY(0);} }
        @keyframes liveBlip { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.4;transform:scale(1.6);} }
        @keyframes newRow { 0%{background:rgba(215,255,0,0.06);} 100%{background:transparent;} }

        .res-row { transition: background 0.16s; cursor: pointer; }
        .res-row:hover { background: rgba(255,255,255,0.028) !important; }
        .res-row.confirming { animation: rowSlide 0.35s ease forwards; }
        .res-row.rejecting  { animation: rowSlide 0.35s ease forwards; }
        .res-row.new-booking { animation: newRow 4s ease forwards; }
        .filter-tab { transition: all 0.15s; cursor: pointer; border: none; }
        .filter-tab:hover { background: rgba(255,255,255,0.05) !important; color: rgba(255,255,255,0.7) !important; }
        .res-action-btn { transition: all 0.15s; }
        .res-action-btn:hover:not(:disabled) { transform: scale(1.07); }
        .res-action-btn:disabled { opacity: 0.5; cursor: default; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: 22, animation: "fadeUp 0.35s ease both" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", color: "#fff", margin: 0 }}>Reservas</h1>
            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
              Gestiona solicitudes y confirmaciones de tus canchas
            </p>
          </div>
          <button
            onClick={() => { setLoading(true); fetchAll(); }}
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, padding: "8px 10px", cursor: "pointer", color: "rgba(255,255,255,0.35)", display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, marginTop: 2 }}
          >
            <RefreshCw size={12} style={{ opacity: loading ? 0.5 : 1, animation: loading ? "spin 1s linear infinite" : "none" }} />
            Actualizar
          </button>
        </div>
      </div>

      {/* ── Pending alert banner ── */}
      {pendingCount > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 16px", borderRadius: 12, marginBottom: 18,
          background: "rgba(250,204,21,0.07)", border: "1px solid rgba(250,204,21,0.20)",
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
            style={{ background: "#FACC15", color: "#000", border: "none", padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 800 }}
          >
            Ver pendientes
          </button>
        </div>
      )}

      {/* ── Action error ── */}
      {actionError && (
        <div style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 14, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", fontSize: 12.5, color: "rgba(239,68,68,0.85)", display: "flex", alignItems: "center", gap: 8 }}>
          <XCircle size={13} />
          {actionError}
          <button onClick={() => setActionError(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit", display: "flex" }}>
            <X size={12} />
          </button>
        </div>
      )}

      {/* ── Controls ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", animation: "fadeUp 0.37s 0.07s ease both" }}>
        {/* Search */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 220,
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10, padding: "8px 12px",
          transition: "border-color 0.18s",
        }}>
          <Search size={12} color="rgba(255,255,255,0.25)" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por jugador, cancha, deporte o fecha..."
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 12.5, color: "#fff" }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.25)", display: "flex" }}>
              <X size={11} />
            </button>
          )}
        </div>

        {/* Status filter tabs */}
        <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 4 }}>
          {(["all", "pending", "confirmed", "rejected"] as const).map(f => {
            const active = filter === f;
            const labels: Record<TabFilter, string> = { all: "Todas", pending: "Pendientes", confirmed: "Confirmadas", rejected: "Rechazadas" };
            const activeColors: Record<TabFilter, string> = { all: "rgba(255,255,255,0.85)", pending: "#FACC15", confirmed: "#34D399", rejected: "rgba(239,68,68,0.7)" };
            return (
              <button
                key={f}
                className="filter-tab"
                onClick={() => setFilter(f)}
                style={{
                  padding: "6px 12px", borderRadius: 7, fontSize: 11.5, fontWeight: 600,
                  letterSpacing: "-0.01em",
                  background: active ? "rgba(255,255,255,0.08)" : "transparent",
                  color: active ? activeColors[f] : "rgba(255,255,255,0.35)",
                }}
              >
                {labels[f]}{" "}
                <span style={{ fontSize: 10, opacity: active ? 0.7 : 0.5, marginLeft: 2 }}>
                  {tabCounts[f]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{
        background: "rgba(10,10,10,0.8)", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16, overflow: "hidden",
        animation: "fadeUp 0.4s 0.1s ease both",
      }}>
        {/* Column headers */}
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

        {/* Loading skeleton */}
        {loading && (
          <div>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 1fr 100px 120px",
                padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)",
                alignItems: "center",
              }}>
                {[60, 45, 38, 26, 52, 32].map((w, j) => (
                  <div key={j} style={{ height: 12, width: `${w}%`, borderRadius: 6, background: "rgba(255,255,255,0.05)", animation: "fadeUp 1.8s ease-in-out infinite" }} />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Empty state — no bookings at all */}
        {!loading && isEmpty && (
          <div style={{ padding: "64px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
            <p style={{ fontSize: 16, fontWeight: 800, color: "rgba(255,255,255,0.72)", marginBottom: 8, letterSpacing: "-0.025em" }}>
              No hay reservas todavía.
            </p>
            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.28)", marginBottom: 28, lineHeight: 1.6 }}>
              Las nuevas solicitudes aparecerán aquí automáticamente.
            </p>
            <Link
              href="/propietario/canchas"
              style={{
                display: "inline-block", padding: "10px 22px", borderRadius: 10,
                background: "#D7FF00", color: "#000", fontWeight: 800, fontSize: 12.5,
                textDecoration: "none", letterSpacing: "-0.01em",
                boxShadow: "0 0 20px rgba(215,255,0,0.22)",
              }}
            >
              Gestionar mis canchas →
            </Link>
          </div>
        )}

        {/* No results for current filter/search */}
        {!loading && !isEmpty && filtered.length === 0 && (
          <div style={{ padding: "48px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🔍</div>
            <p style={{ fontSize: 12.5, fontWeight: 700, color: "rgba(255,255,255,0.40)", marginBottom: 8 }}>
              Sin resultados para este filtro
            </p>
            <button
              onClick={() => { setFilter("all"); setSearch(""); }}
              style={{ fontSize: 11.5, fontWeight: 600, color: "rgba(255,255,255,0.30)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {/* Booking rows */}
        {!loading && filtered.map((r, i) => {
          const meta   = STATUS_META[r.status] ?? STATUS_META_FALLBACK;
          const sTag   = getSportTag(r.sport);
          const anim   = animating[r.id];
          const isNew  = newIds.has(r.id);
          const isSav  = saving[r.id];
          return (
            <div
              key={r.id}
              className={`res-row${anim ? ` ${anim}` : ""}${isNew ? " new-booking" : ""}`}
              onClick={() => setSelected(r)}
              style={{
                display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 1fr 100px 120px",
                padding: "13px 20px", alignItems: "center",
                borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                background: "transparent",
              }}
            >
              {/* Player cell */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: sTag.bg, border: `1px solid ${sTag.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13,
                }}>
                  {sTag.icon}
                </div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", letterSpacing: "-0.015em" }}>
                    {r.playerName}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
                    {r.players > 0 ? `${r.players} jugadores · ` : ""}{timeAgo(r.createdAt)}
                    {isNew && (
                      <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, color: "#D7FF00", letterSpacing: "0.04em" }}>
                        NUEVO
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Court · Sport */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.60)" }}>{r.courtName}</div>
                <div style={{ marginTop: 3 }}>
                  {r.sport !== "—" ? (
                    <span style={{
                      display: "inline-block", fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 5,
                      background: sTag.bg, color: sTag.color, border: `1px solid ${sTag.border}`,
                      letterSpacing: "0.03em",
                    }}>
                      {r.sport}
                    </span>
                  ) : (
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)" }}>—</span>
                  )}
                </div>
              </div>

              {/* Date · Time */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.60)" }}>{r.time}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
                  {displayDate(r.date)}{r.duration > 0 ? ` · ${r.duration}h` : ""}
                </div>
              </div>

              {/* Amount */}
              <div style={{ fontSize: 13, fontWeight: 800, color: "rgba(215,255,0,0.72)", letterSpacing: "-0.02em" }}>
                {r.amount > 0 ? fmt(r.amount) : "—"}
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

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 5 }} onClick={e => e.stopPropagation()}>
                {tabGroup(r.status) === "pending" ? (
                  <>
                    <button
                      className="res-action-btn"
                      disabled={isSav}
                      onClick={() => act(r.id, "confirmed")}
                      style={{
                        padding: "6px 10px", borderRadius: 7, border: "none",
                        background: "rgba(52,211,153,0.12)", color: "#34D399",
                        cursor: "pointer", fontSize: 11, fontWeight: 700,
                      }}
                      title="Confirmar"
                    >✓</button>
                    <button
                      className="res-action-btn"
                      disabled={isSav}
                      onClick={() => act(r.id, "rejected")}
                      style={{
                        padding: "6px 8px", borderRadius: 7, border: "none",
                        background: "rgba(239,68,68,0.10)", color: "rgba(239,68,68,0.65)",
                        cursor: "pointer", fontSize: 11,
                      }}
                      title="Rechazar"
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

      {/* ── Booking count footer ── */}
      {!loading && bookings.length > 0 && (
        <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", letterSpacing: "-0.01em" }}>
            {bookings.length} reserva{bookings.length !== 1 ? "s" : ""} en total
            {courtNames.length > 0 && ` · ${courtNames.length} cancha${courtNames.length !== 1 ? "s" : ""}`}
          </span>
        </div>
      )}

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
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.22)", letterSpacing: "0.08em", marginBottom: 4 }}>
                  DETALLE DE RESERVA · #{selected.id.slice(0, 8).toUpperCase()}
                </div>
                <div style={{ fontSize: 19, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>
                  {selected.playerName}
                </div>
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
              {/* Status + time */}
              <div style={{ marginBottom: 18, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {(() => { const m = STATUS_META[selected.status] ?? STATUS_META_FALLBACK; return (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "5px 12px", borderRadius: 99,
                    background: m.bg, border: `1px solid ${m.border}`,
                    fontSize: 11, fontWeight: 700, color: m.color,
                  }}>
                    {m.icon} {m.label}
                  </span>
                ); })()}
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
                  Solicitado {timeAgo(selected.createdAt)}
                </span>
              </div>

              {/* Info grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                {[
                  { icon: "🏟️", label: "Instalación",  value: `${selected.courtName}${selected.sport !== "—" ? ` · ${selected.sport}` : ""}` },
                  { icon: "📅", label: "Fecha y hora", value: `${displayDate(selected.date)} · ${selected.time}` },
                  { icon: "⏱",  label: "Duración",     value: selected.duration > 0 ? `${selected.duration}h` : "—" },
                  { icon: "👥", label: "Jugadores",    value: selected.players > 0 ? `${selected.players} personas` : "—" },
                  { icon: "💰", label: "Importe",      value: selected.amount > 0 ? fmt(selected.amount) : "—" },
                  { icon: "📞", label: "Teléfono",     value: selected.phone },
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
              {selected.email !== "—" && (
                <div style={{
                  background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 10, padding: "10px 12px", marginBottom: 10,
                }}>
                  <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.22)", letterSpacing: "0.04em", marginBottom: 4 }}>✉️ EMAIL</div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,0.65)" }}>{selected.email}</div>
                </div>
              )}

              {/* Notes */}
              {selected.notes && (
                <div style={{
                  background: "rgba(215,255,0,0.03)", border: "1px solid rgba(215,255,0,0.10)",
                  borderRadius: 10, padding: "10px 12px", marginBottom: 14,
                }}>
                  <div style={{ fontSize: 9.5, color: "rgba(215,255,0,0.4)", letterSpacing: "0.04em", marginBottom: 4 }}>💬 NOTAS DEL JUGADOR</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>{selected.notes}</div>
                </div>
              )}

              {/* Pending actions */}
              {tabGroup(selected.status) === "pending" && (
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button
                    disabled={saving[selected.id]}
                    onClick={() => { act(selected.id, "confirmed"); setSelected(null); }}
                    style={{
                      flex: 1, padding: "13px", borderRadius: 12, border: "none",
                      background: "#D7FF00", color: "#000", cursor: "pointer",
                      fontSize: 13, fontWeight: 900, letterSpacing: "-0.02em",
                      boxShadow: "0 0 20px rgba(215,255,0,0.2)",
                      opacity: saving[selected.id] ? 0.6 : 1,
                      transition: "opacity 0.16s",
                    }}
                  >
                    ✓ Confirmar reserva
                  </button>
                  <button
                    disabled={saving[selected.id]}
                    onClick={() => { act(selected.id, "rejected"); setSelected(null); }}
                    style={{
                      padding: "13px 18px", borderRadius: 12, border: "1px solid rgba(239,68,68,0.2)",
                      background: "rgba(239,68,68,0.07)", color: "rgba(239,68,68,0.75)",
                      cursor: "pointer", fontSize: 13, fontWeight: 700,
                      opacity: saving[selected.id] ? 0.6 : 1,
                      transition: "all 0.16s",
                    }}
                  >
                    ✕ Rechazar
                  </button>
                </div>
              )}

              {/* Confirmed state */}
              {tabGroup(selected.status) === "confirmed" && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "12px 14px", borderRadius: 10,
                  background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.12)",
                }}>
                  <CheckCircle2 size={14} color="#34D399" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(52,211,153,0.8)" }}>
                    Reserva confirmada — el jugador fue notificado
                  </span>
                </div>
              )}

              {/* Rejected state */}
              {tabGroup(selected.status) === "rejected" && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "12px 14px", borderRadius: 10,
                  background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.12)",
                }}>
                  <XCircle size={14} color="rgba(239,68,68,0.6)" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(239,68,68,0.6)" }}>
                    {selected.status === "cancelled" ? "El jugador canceló esta reserva" : "Esta reserva fue rechazada"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

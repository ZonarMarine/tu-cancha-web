"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type TickerEvent = {
  id: string;
  icon: string;
  text: string;
  time: string;
  hot: boolean;
};

function timeAgo(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (diff < 1)  return "ahora";
  if (diff < 60) return `${diff}min`;
  return `${Math.floor(diff / 60)}h`;
}

function retoToEvent(r: any, type: "new" | "accepted"): TickerEvent {
  const loc = r.court_name ?? r.location ?? "";
  const fmt = r.format    ? ` · ${r.format}` : "";
  const when = r.time     ? ` · ${r.time}`   : "";
  if (type === "accepted") {
    return {
      id: `ra-${r.id}`,
      icon: "⚡",
      text: `Reto aceptado${loc ? ` · ${loc}` : ""}${fmt}`,
      time: timeAgo(r.updated_at ?? r.created_at),
      hot: true,
    };
  }
  return {
    id: `rn-${r.id}`,
    icon: "⚽",
    text: `Nuevo reto${loc ? ` · ${loc}` : ""}${when}${fmt}`,
    time: timeAgo(r.created_at),
    hot: false,
  };
}

function bookingToEvent(b: any): TickerEvent {
  return {
    id: `b-${b.id}`,
    icon: "📍",
    text: "Cancha reservada",
    time: timeAgo(b.created_at),
    hot: false,
  };
}

const DURATIONS = [3400, 4200, 2900, 3800, 4500, 3100, 4800];

export default function LiveTicker() {
  const [events, setEvents] = useState<TickerEvent[]>([]);
  const [idx,    setIdx]    = useState(0);
  const [phase,  setPhase]  = useState<"in" | "out">("in");
  const [pulse,  setPulse]  = useState(false);
  const dirRef   = useRef<1 | -1>(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();

    async function load() {
      const [{ data: retos }, { data: bookings }] = await Promise.all([
        supabase
          .from("retos")
          .select("id, status, created_at, updated_at, court_name, time, format, location")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("bookings")
          .select("id, created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(4),
      ]);

      const evts: TickerEvent[] = [];
      for (const r of retos ?? []) {
        evts.push(retoToEvent(r, r.status === "accepted" ? "accepted" : "new"));
      }
      for (const b of bookings ?? []) {
        evts.push(bookingToEvent(b));
      }
      setEvents(evts);
    }

    load();

    const ch = supabase
      .channel("home-ticker")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bookings" },
        ({ new: b }) => setEvents(p => [bookingToEvent(b), ...p].slice(0, 12)))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "retos" },
        ({ new: r }) => setEvents(p => [retoToEvent(r, "new"), ...p].slice(0, 12)))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "retos" },
        ({ new: r }) => {
          if (r.status === "accepted") {
            setEvents(p => [retoToEvent(r, "accepted"), ...p].slice(0, 12));
          }
        })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    if (events.length < 2) return;

    function advance() {
      dirRef.current = dirRef.current === 1 ? -1 : 1;
      setPhase("out");

      timerRef.current = setTimeout(() => {
        setIdx(i => (i + 1) % events.length);
        setPhase("in");
        setPulse(true);
        setTimeout(() => setPulse(false), 700);
        timerRef.current = setTimeout(advance, DURATIONS[idx % DURATIONS.length]);
      }, 300);
    }

    timerRef.current = setTimeout(advance, DURATIONS[0]);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.length]);

  if (events.length === 0) return null;

  const e   = events[Math.min(idx, events.length - 1)];
  const dir = dirRef.current;

  return (
    <>
      <style>{`
        @keyframes tickerPulse {
          0%   { box-shadow: 0 0 0 0 rgba(215,255,0,0.00); }
          30%  { box-shadow: 0 0 0 6px rgba(215,255,0,0.10); }
          100% { box-shadow: 0 0 0 0 rgba(215,255,0,0.00); }
        }
        @keyframes dotPing {
          0%, 100% { transform: scale(1);   opacity: 1;   }
          50%       { transform: scale(1.5); opacity: 0.6; }
        }
      `}</style>

      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "9px 16px", borderRadius: 40,
        backgroundColor: "rgba(255,255,255,0.035)",
        border: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        overflow: "hidden",
        boxShadow: "0 1px 0 rgba(255,255,255,0.03) inset",
        animation: pulse ? "tickerPulse 0.7s ease-out" : "none",
        transition: "border-color 0.3s ease",
        borderColor: pulse ? "rgba(215,255,0,0.14)" : "rgba(255,255,255,0.07)",
      }}>

        {/* Live dot */}
        <span style={{
          width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
          display: "inline-block",
          backgroundColor: e.hot ? "var(--accent)" : "rgba(74,222,128,0.85)",
          boxShadow: e.hot ? "0 0 6px rgba(215,255,0,0.55)" : "0 0 5px rgba(74,222,128,0.45)",
          animation: "dotPing 2s ease-in-out infinite",
          transition: "background-color 0.4s ease, box-shadow 0.4s ease",
        }} />

        {/* Event text */}
        <span style={{
          fontSize: 12, fontWeight: 500, color: "var(--text2)",
          letterSpacing: "-0.005em", whiteSpace: "nowrap",
          overflow: "hidden", textOverflow: "ellipsis",
          flex: 1, minWidth: 0,
          opacity:   phase === "out" ? 0 : 1,
          transform: phase === "out"
            ? `translateY(${dir * 5}px)`
            : "translateY(0)",
          transition: phase === "out"
            ? "opacity 0.22s ease, transform 0.22s ease"
            : "opacity 0.38s ease 0.04s, transform 0.38s cubic-bezier(0.22,0.61,0.36,1) 0.04s",
        }}>
          {e.icon} {e.text}
        </span>

        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.12)", flexShrink: 0 }}>·</span>

        {/* Timestamp */}
        <span style={{
          fontSize: 10.5, color: e.hot ? "rgba(215,255,0,0.55)" : "var(--text3)",
          flexShrink: 0, letterSpacing: "-0.01em", fontWeight: e.hot ? 600 : 400,
          opacity:   phase === "out" ? 0 : 1,
          transition: phase === "out" ? "opacity 0.18s ease" : "opacity 0.32s ease 0.10s",
        }}>
          {e.time}
        </span>
      </div>
    </>
  );
}

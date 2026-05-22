"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Signal = { icon: string; text: string };

export default function HeroLiveStrip() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [idx,     setIdx]     = useState(0);
  const [phase,   setPhase]   = useState<"in" | "out">("in");

  useEffect(() => {
    async function load() {
      const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

      const [retosRes, bookingsRes] = await Promise.all([
        supabase
          .from("retos")
          .select("id", { count: "exact", head: true })
          .eq("status", "open"),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .gte("created_at", since24h),
      ]);

      const openRetos      = retosRes.count   ?? 0;
      const recentBookings = bookingsRes.count ?? 0;

      const sigs: Signal[] = [];
      if (openRetos > 0) {
        sigs.push({
          icon: "⚡",
          text: `${openRetos} equipo${openRetos > 1 ? "s" : ""} buscando rival ahora mismo`,
        });
      }
      if (recentBookings > 0) {
        sigs.push({
          icon: "📍",
          text: `${recentBookings} reserva${recentBookings > 1 ? "s" : ""} confirmada${recentBookings > 1 ? "s" : ""} hoy`,
        });
      }

      setSignals(sigs);
    }

    load();

    const ch = supabase
      .channel("hero-strip")
      .on("postgres_changes", { event: "*",      schema: "public", table: "retos" },    load)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bookings" }, load)
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    if (signals.length < 2) return;
    const id = setInterval(() => {
      setPhase("out");
      setTimeout(() => {
        setIdx(i => (i + 1) % signals.length);
        setPhase("in");
      }, 260);
    }, 3000);
    return () => clearInterval(id);
  }, [signals.length]);

  if (signals.length === 0) return null;

  const s = signals[Math.min(idx, signals.length - 1)];

  return (
    <>
      <style>{`
        @keyframes stripIn  { from{opacity:0;transform:translateY(5px);}to{opacity:1;transform:translateY(0);} }
        @keyframes stripOut { from{opacity:1;transform:translateY(0);}to{opacity:0;transform:translateY(-5px);} }
        @keyframes stripDot { 0%,100%{transform:scale(1);opacity:1;}50%{transform:scale(1.55);opacity:0.55;} }
      `}</style>
      <div style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 16px",
        borderRadius: 99,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        overflow: "hidden",
        maxWidth: 400,
      }}>
        {/* Pulsing live dot */}
        <span style={{
          width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
          display: "inline-block",
          background: "rgba(74,222,128,0.85)",
          boxShadow: "0 0 5px rgba(74,222,128,0.45)",
          animation: "stripDot 2s ease-in-out infinite",
        }} />

        {/* Text — animated in/out */}
        <span style={{
          fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.55)",
          letterSpacing: "-0.005em", whiteSpace: "nowrap",
          overflow: "hidden", textOverflow: "ellipsis",
          animation: phase === "out"
            ? "stripOut 0.22s ease forwards"
            : "stripIn 0.28s ease forwards",
        }}>
          {s.icon} {s.text}
        </span>
      </div>
    </>
  );
}

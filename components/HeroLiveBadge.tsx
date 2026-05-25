"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useSport, SPORT_THEME } from "@/context/SportContext";

type Signal = { text: string };

export default function HeroLiveBadge() {
  const { sport }           = useSport();
  const t                   = SPORT_THEME[sport];
  const [signals, setSignals] = useState<Signal[]>([]);
  const [idx,     setIdx]     = useState(0);
  const [fade,    setFade]    = useState(true);

  const load = useCallback(async () => {
    const today     = new Date().toISOString().split("T")[0];
    const sportVals = sport === "futbol"
      ? ["Fútbol", "Fútsal", "futbol"]
      : ["Pádel", "padel", "Padel"];

    const [retosRes, courtsRes, bookingsRes] = await Promise.all([
      supabase.from("retos").select("id", { count: "exact", head: true }).eq("status", "open").gte("date", today),
      supabase.from("owner_courts").select("id", { count: "exact", head: true }).eq("active", true).is("deleted_at", null).in("sport", sportVals),
      supabase.from("bookings").select("id", { count: "exact", head: true }).in("status", ["confirmed","paid","completed"]).eq("date", today),
    ]);

    const retos    = retosRes.count    ?? 0;
    const courts   = courtsRes.count   ?? 0;
    const bookings = bookingsRes.count ?? 0;

    const sigs: Signal[] = [];
    if (retos    > 0) sigs.push({ text: `${retos} ${sport === "futbol" ? "reto" : "partida"}${retos !== 1 ? "s" : ""} activo${retos !== 1 ? "s" : ""} · Costa Rica` });
    if (courts   > 0) sigs.push({ text: `${courts} cancha${courts !== 1 ? "s" : ""} de ${sport === "futbol" ? "fútbol" : "pádel"} disponible${courts !== 1 ? "s" : ""}` });
    if (bookings > 0) sigs.push({ text: `${bookings} reserva${bookings !== 1 ? "s" : ""} confirmada${bookings !== 1 ? "s" : ""} hoy` });

    setSignals(sigs);
    setIdx(0);
  }, [sport]);

  useEffect(() => { load(); }, [load]);

  /* Realtime */
  useEffect(() => {
    const ch = supabase
      .channel(`hero-badge-${sport}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "retos" },        load)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" },     load)
      .on("postgres_changes", { event: "*", schema: "public", table: "owner_courts" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [sport, load]);

  /* Rotate signals every 3.5s */
  useEffect(() => {
    if (signals.length < 2) return;
    const id = setInterval(() => {
      setFade(false);
      setTimeout(() => { setIdx(i => (i + 1) % signals.length); setFade(true); }, 280);
    }, 3500);
    return () => clearInterval(id);
  }, [signals.length]);

  if (signals.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes badgePulse { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.45;transform:scale(1.55);} }
        .hero-badge-text { transition: opacity 0.24s ease, transform 0.24s ease; }
      `}</style>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "7px 16px", borderRadius: 99, marginBottom: 52,
        background: `${t.bg}`,
        border: `1px solid ${t.border}`,
        fontSize: 11, fontWeight: 600, color: t.accent, letterSpacing: "0.06em",
        transition: "background 0.4s ease, border-color 0.4s ease, color 0.4s ease",
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: "50%",
          background: t.accent, display: "inline-block",
          animation: "badgePulse 2s ease-in-out infinite",
          boxShadow: `0 0 6px ${t.accentGlow}`,
        }} />
        <span
          className="hero-badge-text"
          style={{ opacity: fade ? 1 : 0, transform: fade ? "translateY(0)" : "translateY(-4px)" }}
        >
          {signals[idx % signals.length].text.toUpperCase()}
        </span>
      </div>
    </>
  );
}

"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useSport, SPORT_THEME } from "@/context/SportContext";

type Stat = { label: string; value: number; suffix: string };

function useCountUp(target: number, duration = 900, delay = 0) {
  const [count,   setCount]   = useState(0);
  const [started, setStarted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setStarted(true), delay); return () => clearTimeout(t); }, [delay]);
  useEffect(() => {
    if (!started) return;
    if (target === 0) { setCount(0); return; }
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setCount(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, target, duration]);
  return { count, started };
}

function StatItem({ value, suffix, label, delay }: Stat & { delay: number }) {
  const { count, started } = useCountUp(value, 950, delay);
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      opacity: started ? 1 : 0, transform: started ? "translateY(0)" : "translateY(8px)",
      transition: "opacity 0.5s ease, transform 0.5s ease",
    }}>
      <p style={{ fontWeight: 900, fontSize: 26, letterSpacing: "-0.035em", marginBottom: 5, color: "rgba(255,255,255,0.90)", fontVariantNumeric: "tabular-nums" }}>
        {count}{suffix}
      </p>
      <p style={{ fontSize: 10, color: "var(--text3)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </p>
    </div>
  );
}

export default function HeroStats() {
  const { sport }         = useSport();
  const [stats, setStats] = useState<Stat[]>([]);
  const [animKey, setAnimKey] = useState(0);

  const load = useCallback(async () => {
    // Real aggregate counts via SECURITY DEFINER RPC — the anon client can't
    // count `profiles` directly (own-row RLS), so a plain query reads 0 players.
    const { data } = await supabase.rpc("platform_stats");
    const s = (data ?? {}) as Record<string, number>;
    const courts = sport === "futbol" ? (s.courts_futbol ?? 0) : (s.courts_padel ?? 0);

    setStats([
      { label: "jugadores registrados",                                       value: s.players ?? 0,   suffix: "" },
      { label: sport === "futbol" ? "retos activos"  : "partidas abiertas",  value: s.retos_open ?? 0, suffix: "" },
      { label: sport === "futbol" ? "canchas fútbol" : "canchas pádel",      value: courts,           suffix: "" },
    ]);
    setAnimKey(k => k + 1);
  }, [sport]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel(`hero-stats-${sport}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "retos" },        load)
      .on("postgres_changes", { event: "*", schema: "public", table: "owner_courts" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [sport, load]);

  /* Skeleton while loading */
  if (stats.length === 0) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 48, gap: 0 }}>
      <style>{`@keyframes hsSkPulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }`}</style>
      {[80, 60, 72].map((w, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center" }}>
          {i > 0 && <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.05)", margin: "0 36px" }} />}
          <div style={{ textAlign: "center" }}>
            <div style={{ height: 26, width: w, borderRadius: 6, background: "rgba(255,255,255,0.04)", marginBottom: 5, margin: "0 auto 5px", animation: "hsSkPulse 1.8s ease-in-out infinite" }} />
            <div style={{ height: 10, width: w + 20, borderRadius: 5, background: "rgba(255,255,255,0.025)", margin: "0 auto", animation: `hsSkPulse 1.8s ${i * 0.2}s ease-in-out infinite` }} />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div key={animKey} style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 48 }}>
      {stats.map((s, i) => (
        <div key={`${s.label}-${animKey}`} style={{ display: "flex", alignItems: "center" }}>
          {i > 0 && <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.05)", margin: "0 36px" }} />}
          <StatItem {...s} delay={300 + i * 120} />
        </div>
      ))}
    </div>
  );
}

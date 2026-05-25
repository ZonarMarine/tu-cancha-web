"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Users, MapPin, Zap, Star } from "lucide-react";
import { supabase } from "@/lib/supabase";

type StatDef = { val: number; suffix: string; label: string; Icon: React.ElementType; decimals?: number };

function useCountUp(target: number, duration: number, triggered: boolean, decimals = 0) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!triggered) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setCount(parseFloat(((1 - Math.pow(1 - p, 3)) * target).toFixed(decimals)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [triggered, target, duration, decimals]);
  return count;
}

function StatItem({ val, suffix, label, Icon, triggered, index, decimals = 0 }: StatDef & { triggered: boolean; index: number }) {
  const count = useCountUp(val, 1400 + index * 120, triggered, decimals);
  return (
    <div style={{
      background: "var(--surface)", textAlign: "center", padding: "36px 20px",
      opacity: triggered ? 1 : 0, transform: triggered ? "translateY(0)" : "translateY(12px)",
      transition: `opacity 0.5s ease ${index * 0.09}s, transform 0.5s ease ${index * 0.09}s`,
    }}>
      <Icon size={14} style={{ color: "var(--text3)", display: "block", margin: "0 auto 12px" }} />
      <p style={{ fontWeight: 900, fontSize: "clamp(26px,3vw,36px)", letterSpacing: "-0.02em", marginBottom: 6, fontVariantNumeric: "tabular-nums" }}>
        {decimals > 0 ? count.toFixed(1) : Math.round(count).toLocaleString()}{suffix}
      </p>
      <p style={{ fontSize: 12, color: "var(--text3)" }}>{label}</p>
    </div>
  );
}

export default function StatsCounter() {
  const [triggered, setTriggered] = useState(false);
  const [stats,     setStats]     = useState<StatDef[]>([]);
  const [animKey,   setAnimKey]   = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const thisMonth = new Date();
    thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0);
    const monthStr = thisMonth.toISOString();

    const [usersRes, courtsRes, bookingsRes, ratingRes] = await Promise.all([
      /* total registered players */
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      /* active courts */
      supabase.from("owner_courts").select("id", { count: "exact", head: true }).eq("active", true).is("deleted_at", null),
      /* bookings this month */
      supabase.from("bookings").select("id", { count: "exact", head: true }).gte("created_at", monthStr).in("status", ["confirmed", "paid", "completed"]),
      /* average court rating */
      supabase.from("owner_courts").select("rating").eq("active", true).is("deleted_at", null).gt("rating", 0),
    ]);

    const players   = usersRes.count   ?? 0;
    const courts    = courtsRes.count  ?? 0;
    const bookings  = bookingsRes.count ?? 0;
    const ratings   = (ratingRes.data ?? []) as { rating: number }[];
    const avgRating = ratings.length > 0
      ? parseFloat((ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1))
      : 0;

    const newStats: StatDef[] = [
      { val: players,   suffix: "",  label: "Jugadores registrados", Icon: Users,  decimals: 0 },
      { val: courts,    suffix: "",  label: "Canchas afiliadas",     Icon: MapPin, decimals: 0 },
      { val: bookings,  suffix: "",  label: "Reservas este mes",     Icon: Zap,    decimals: 0 },
    ];

    /* Only show rating if we have real data */
    if (avgRating > 0) {
      newStats.push({ val: avgRating, suffix: "★", label: "Rating promedio", Icon: Star, decimals: 1 });
    }

    setStats(newStats);
    setAnimKey(k => k + 1);
  }, []);

  /* Intersection observer — load + trigger count-up when section scrolls into view */
  useEffect(() => {
    load();
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setTriggered(true); observer.disconnect(); } },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [load]);

  if (stats.length === 0) return (
    <div ref={ref} style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: "var(--border)", borderRadius: 16, overflow: "hidden" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ background: "var(--surface)", padding: "36px 20px", textAlign: "center" }}>
          <div style={{ height: 36, width: 60, borderRadius: 8, background: "rgba(255,255,255,0.04)", margin: "0 auto 8px", animation: "scSkPulse 1.8s ease-in-out infinite" }} />
          <div style={{ height: 12, width: 90, borderRadius: 6, background: "rgba(255,255,255,0.025)", margin: "0 auto", animation: `scSkPulse 1.8s ${i * 0.2}s ease-in-out infinite` }} />
        </div>
      ))}
      <style>{`@keyframes scSkPulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }`}</style>
    </div>
  );

  return (
    <div ref={ref} key={animKey} style={{
      display: "grid", gridTemplateColumns: `repeat(${stats.length},1fr)`,
      gap: 1, background: "var(--border)", borderRadius: 16, overflow: "hidden",
    }}>
      {stats.map((s, i) => (
        <StatItem key={`${s.label}-${animKey}`} {...s} triggered={triggered} index={i} />
      ))}
    </div>
  );
}

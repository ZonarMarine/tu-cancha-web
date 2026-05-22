"use client";
import { useEffect, useRef, useState } from "react";
import { Users, MapPin, Zap, Star } from "lucide-react";

const STATS = [
  { val: 1240, suffix: '+', label: 'Jugadores activos',  Icon: Users  },
  { val: 50,   suffix: '+', label: 'Canchas afiliadas',  Icon: MapPin },
  { val: 320,  suffix: '+', label: 'Partidos este mes',  Icon: Zap    },
  { val: 4.9,  suffix: '★', label: 'Rating promedio',    Icon: Star   },
];

function useCountUp(target: number, duration: number, triggered: boolean, decimals = 0) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!triggered) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(parseFloat((eased * target).toFixed(decimals)));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [triggered, target, duration, decimals]);
  return count;
}

function StatItem({ val, suffix, label, Icon, triggered, index }: {
  val: number; suffix: string; label: string;
  Icon: React.ElementType; triggered: boolean; index: number;
}) {
  const decimals = Number.isInteger(val) ? 0 : 1;
  const count = useCountUp(val, 1400 + index * 120, triggered, decimals);

  return (
    <div style={{
      background: 'var(--surface)', textAlign: 'center',
      padding: '36px 20px',
      opacity: triggered ? 1 : 0,
      transform: triggered ? 'translateY(0)' : 'translateY(12px)',
      transition: `opacity 0.5s ease ${index * 0.09}s, transform 0.5s ease ${index * 0.09}s`,
    }}>
      <Icon size={14} style={{ color: 'var(--text3)', display: 'block', margin: '0 auto 12px' }} />
      <p style={{
        fontWeight: 900,
        fontSize: 'clamp(26px,3vw,36px)',
        letterSpacing: '-0.02em',
        marginBottom: 6,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {decimals > 0 ? count.toFixed(1) : Math.round(count).toLocaleString()}{suffix}
      </p>
      <p style={{ fontSize: 12, color: 'var(--text3)' }}>{label}</p>
    </div>
  );
}

export default function StatsCounter() {
  const [triggered, setTriggered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setTriggered(true); observer.disconnect(); } },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={{
      display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
      gap: 1, background: 'var(--border)',
      borderRadius: 16, overflow: 'hidden',
    }}>
      {STATS.map((s, i) => (
        <StatItem key={s.label} {...s} triggered={triggered} index={i} />
      ))}
    </div>
  );
}

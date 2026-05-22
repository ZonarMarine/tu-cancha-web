"use client";
import { useEffect, useState } from "react";

const STATS = [
  { val: 24,  suffix: '',  label: 'jugadores activos' },
  { val: 6,   suffix: '',  label: 'partidos abiertos' },
  { val: 3,   suffix: '',  label: 'canchas disponibles' },
];

function useCountUp(target: number, duration: number, delay: number) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, target, duration]);

  return { count, started };
}

function StatItem({ val, suffix, label, delay, index }: {
  val: number; suffix: string; label: string; delay: number; index: number;
}) {
  const { count, started } = useCountUp(val, 900, delay);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      opacity: started ? 1 : 0,
      transform: started ? 'translateY(0)' : 'translateY(8px)',
      transition: 'opacity 0.5s ease, transform 0.5s ease',
    }}>
      <p style={{
        fontWeight: 900, fontSize: 26, letterSpacing: '-0.035em',
        marginBottom: 5, color: 'rgba(255,255,255,0.90)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {count}{suffix}
      </p>
      <p style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {label}
      </p>
    </div>
  );
}

export default function HeroStats() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 48 }}>
      {STATS.map((s, i) => (
        <div key={s.label} style={{ display: 'flex', alignItems: 'center' }}>
          {i > 0 && (
            <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.05)', margin: '0 48px' }} />
          )}
          <StatItem {...s} delay={400 + i * 140} index={i} />
        </div>
      ))}
    </div>
  );
}

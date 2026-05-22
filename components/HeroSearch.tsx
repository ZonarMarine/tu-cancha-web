"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

const PLACEHOLDERS = [
  "Buscar cancha, zona o deporte...",
  "Santa Ana · Fútbol 5v5...",
  "Retos activos esta noche...",
  "Twelve Academy · San Rafael...",
  "Torneos abiertos cerca de ti...",
];

export default function HeroSearch() {
  const [query,       setQuery]       = useState("");
  const [focused,     setFocused]     = useState(false);
  const [hovered,     setHovered]     = useState(false);
  const [phIdx,       setPhIdx]       = useState(0);
  const [phVisible,   setPhVisible]   = useState(true);
  const [sweeping,    setSweeping]    = useState(false);
  const sweepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  /* ── Breathing placeholder cycle ── */
  useEffect(() => {
    if (focused || query) return;
    const hold = setInterval(() => {
      setPhVisible(false);
      setTimeout(() => {
        setPhIdx(i => (i + 1) % PLACEHOLDERS.length);
        setPhVisible(true);
      }, 380);
    }, 3200);
    return () => clearInterval(hold);
  }, [focused, query]);

  /* ── Stadium-light sweep every 12s ── */
  useEffect(() => {
    function scheduleSweep() {
      sweepTimer.current = setTimeout(() => {
        setSweeping(true);
        setTimeout(() => { setSweeping(false); scheduleSweep(); }, 1400);
      }, 12000);
    }
    scheduleSweep();
    return () => { if (sweepTimer.current) clearTimeout(sweepTimer.current); };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(query.trim()
      ? `/explorar?q=${encodeURIComponent(query.trim())}`
      : "/explorar");
  };

  const active  = focused || hovered;
  const glowing = focused;

  return (
    <>
      <style>{`
        @keyframes idleGlow {
          0%,100% { box-shadow: 0 0 0 0 rgba(215,255,0,0.00), 0 6px 24px rgba(0,0,0,0.30); }
          50%     { box-shadow: 0 0 22px rgba(215,255,0,0.07), 0 6px 24px rgba(0,0,0,0.30); }
        }
        @keyframes focusGlow {
          0%,100% { box-shadow: 0 0 0 4px rgba(215,255,0,0.07), 0 8px 32px rgba(0,0,0,0.35); }
          50%     { box-shadow: 0 0 0 6px rgba(215,255,0,0.11), 0 8px 32px rgba(0,0,0,0.35); }
        }
        @keyframes stadiumSweep {
          0%   { transform: translateX(-120%) skewX(-18deg); opacity: 0;   }
          8%   { opacity: 0.55; }
          60%  { opacity: 0.30; }
          100% { transform: translateX(520%)  skewX(-18deg); opacity: 0;   }
        }
        @keyframes phFadeIn  { from { opacity:0; transform:translateY(3px); } to { opacity:1; transform:translateY(0); } }
        @keyframes phFadeOut { from { opacity:1; transform:translateY(0);   } to { opacity:0; transform:translateY(-3px); } }
        .hero-search-input::placeholder { color: rgba(255,255,255,0); }
        .hero-search-input:focus        { outline: none; box-shadow: none; }
        .hero-search-input {
          caret-color: #D7FF00;
          -webkit-appearance: none;
          appearance: none;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
          margin: 0 !important;
          line-height: normal;
        }
      `}</style>

      <form
        onSubmit={handleSubmit}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ width: '100%', maxWidth: 520, margin: '0 auto', position: 'relative' }}
      >
        {/* Main bar */}
        <div style={{
          display: 'flex', alignItems: 'center',
          background: active
            ? 'rgba(255,255,255,0.075)'
            : 'rgba(255,255,255,0.042)',
          border: `1.5px solid ${
            glowing  ? 'rgba(215,255,0,0.32)' :
            active   ? 'rgba(215,255,0,0.16)' :
                       'rgba(255,255,255,0.09)'}`,
          borderRadius: 18,
          height: 56,
          padding: '0 6px 0 20px',
          gap: 12,
          animation: glowing ? 'focusGlow 2.4s ease-in-out infinite' : 'idleGlow 4s ease-in-out infinite',
          transition: 'background 0.20s ease, border-color 0.20s ease',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          position: 'relative', overflow: 'hidden',
          /* Depth shadow */
          boxShadow: glowing
            ? '0 0 0 4px rgba(215,255,0,0.07), 0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.25)'
            : 'inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.20), 0 6px 24px rgba(0,0,0,0.30)',
        }}>

          {/* Stadium-light reflection sweep */}
          {sweeping && (
            <div style={{
              position: 'absolute', top: 0, left: 0, bottom: 0,
              width: '35%',
              background: 'linear-gradient(90deg, transparent 0%, rgba(215,255,0,0.06) 40%, rgba(255,255,255,0.09) 55%, rgba(215,255,0,0.04) 70%, transparent 100%)',
              animation: 'stadiumSweep 1.4s ease-in-out forwards',
              pointerEvents: 'none', zIndex: 0,
            }} />
          )}

          {/* Search icon */}
          <Search size={15} style={{
            color: glowing ? '#D7FF00' : active ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.25)',
            flexShrink: 0, transition: 'color 0.20s ease', position: 'relative', zIndex: 1,
            filter: glowing ? 'drop-shadow(0 0 4px rgba(215,255,0,0.50))' : 'none',
          }} />

          {/* Input + floating placeholder */}
          <div style={{ flex: 1, position: 'relative', zIndex: 1, alignSelf: 'stretch', display: 'flex', alignItems: 'center' }}>
            {/* Animated placeholder (only when empty & unfocused) */}
            {!query && !focused && (
              <span style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center',
                fontSize: 14, color: 'rgba(255,255,255,0.28)',
                pointerEvents: 'none', whiteSpace: 'nowrap',
                animation: phVisible ? 'phFadeIn 0.38s ease forwards' : 'phFadeOut 0.28s ease forwards',
                letterSpacing: '-0.01em',
              }}>
                {PLACEHOLDERS[phIdx]}
              </span>
            )}
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className="hero-search-input"
              style={{
                width: '100%', background: 'none', border: 'none',
                color: '#fff', fontSize: 14,
                letterSpacing: '-0.01em',
              }}
            />
          </div>

          {/* Search button */}
          <button
            type="submit"
            style={{
              padding: '11px 24px', borderRadius: 13,
              background: active
                ? 'linear-gradient(135deg, #e8ff3a 0%, #D7FF00 60%, #c8ef00 100%)'
                : 'var(--accent)',
              color: '#000',
              fontWeight: 800, fontSize: 13, border: 'none',
              cursor: 'pointer', flexShrink: 0, letterSpacing: '-0.01em',
              boxShadow: active
                ? '0 0 28px rgba(215,255,0,0.30), 0 2px 8px rgba(0,0,0,0.30)'
                : '0 0 16px rgba(215,255,0,0.14), 0 2px 6px rgba(0,0,0,0.25)',
              transition: 'all 0.18s ease',
              position: 'relative', zIndex: 1,
              transform: active ? 'scale(1.02)' : 'scale(1)',
            }}
          >
            Buscar
          </button>
        </div>
      </form>
    </>
  );
}

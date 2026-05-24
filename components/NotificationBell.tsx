"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
};

/* No seed data — panel shows only real notifications from DB */

const TYPE_META: Record<string, { icon: string; color: string }> = {
  invite_accepted: { icon: '👤', color: '#D7FF00' },
  rival_search:    { icon: '⚔️',  color: '#F97316' },
  club_promoted:   { icon: '🏆', color: '#FFD700' },
  reservation:     { icon: '📅', color: '#60A5FA' },
  tournament:      { icon: '🎯', color: '#A78BFA' },
  chat:            { icon: '💬', color: '#34D399' },
  general:         { icon: '⚡', color: '#D7FF00' },
};

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return 'ahora';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function NotificationBell() {
  const [open,      setOpen]      = useState(false);
  const [notifs,    setNotifs]    = useState<Notif[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [userId,    setUserId]    = useState<string | null>(null);
  const [panelPos,  setPanelPos]  = useState({ top: 0, right: 0 });
  const bellRef  = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = notifs.filter(n => !n.read).length;

  /* Calculate where to pin the panel (fixed coords from bell rect) */
  const updatePos = useCallback(() => {
    if (!bellRef.current) return;
    const r = bellRef.current.getBoundingClientRect();
    setPanelPos({
      top:   r.bottom + 10,
      right: window.innerWidth - r.right,
    });
  }, []);

  /* ── Auth ── */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setUserId(s?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  /* ── Load + realtime ── */
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setNotifs((data ?? []) as Notif[]);
        setLoading(false);
      });

    const ch = supabase
      .channel(`notifs:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'notifications', filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setNotifs(prev => [payload.new as Notif, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  /* ── Click outside + reposition on scroll/resize ── */
  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        bellRef.current  && !bellRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    window.addEventListener('resize', updatePos);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      window.removeEventListener('resize', updatePos);
    };
  }, [open, updatePos]);

  const markAllRead = async () => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    if (userId) {
      await supabase.from('notifications')
        .update({ read: true }).eq('user_id', userId).eq('read', false);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'flex' }}>
      <style>{`
        @keyframes bellPulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:0.45; transform:scale(1.55); }
        }
        @keyframes panelDrop {
          from { opacity:0; transform:translateY(-10px) scale(0.96); }
          to   { opacity:1; transform:translateY(0)    scale(1);    }
        }
        @keyframes skPulse { 0%,100%{opacity:0.5;} 50%{opacity:1;} }
        @keyframes notifIn  { from{opacity:0;transform:translateX(-8px);} to{opacity:1;transform:translateX(0);} }
        .notif-row:hover { background: rgba(255,255,255,0.025) !important; }
      `}</style>

      {/* ── Bell ── */}
      <button
        ref={bellRef}
        onClick={() => { updatePos(); setOpen(o => !o); }}
        aria-label="Notificaciones"
        style={{
          position: 'relative', width: 34, height: 34, borderRadius: 9,
          background: open ? 'rgba(215,255,0,0.08)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${open ? 'rgba(215,255,0,0.22)' : 'rgba(255,255,255,0.07)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.18s ease',
          boxShadow: open ? '0 0 16px rgba(215,255,0,0.10)' : 'none',
        }}
      >
        <Bell
          size={15}
          color={open || unread > 0 ? '#D7FF00' : 'rgba(255,255,255,0.38)'}
          style={{
            filter: open || unread > 0 ? 'drop-shadow(0 0 5px rgba(215,255,0,0.55))' : 'none',
            transition: 'all 0.18s',
          }}
        />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 5, right: 5,
            width: 7, height: 7, borderRadius: '50%',
            background: '#D7FF00',
            boxShadow: '0 0 8px rgba(215,255,0,0.9)',
            animation: 'bellPulse 2s ease-in-out infinite',
            border: '1.5px solid rgba(8,8,8,0.95)',
          }} />
        )}
      </button>

      {/* ── Panel — fixed so it never affects page layout or triggers scroll ── */}
      {open && (
        <div style={{
          position: 'fixed', top: panelPos.top, right: panelPos.right,
          width: 348, zIndex: 9999,
          animation: 'panelDrop 0.22s cubic-bezier(0.34,1.1,0.64,1) both',
          background: 'linear-gradient(165deg, rgba(14,14,14,0.98), rgba(9,9,9,0.98))',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 18,
          boxShadow: '0 0 0 1px rgba(215,255,0,0.03), 0 8px 16px rgba(0,0,0,0.2), 0 24px 80px rgba(0,0,0,0.65)',
          overflow: 'hidden',
          backdropFilter: 'blur(48px)',
          WebkitBackdropFilter: 'blur(48px)',
        }}>
          {/* Lime accent line */}
          <div style={{ height: 2, background: 'linear-gradient(90deg, #D7FF00cc, #D7FF0033, transparent)' }} />

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px 10px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '-0.025em', color: '#fff' }}>
                Actividad
              </span>
              {unread > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 800, color: '#000',
                  background: '#D7FF00', borderRadius: 99, padding: '2px 7px',
                  letterSpacing: '-0.01em',
                }}>
                  {unread} nueva{unread !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 10, fontWeight: 600,
                color: 'rgba(255,255,255,0.28)',
                letterSpacing: '-0.01em', padding: 0,
                transition: 'color 0.16s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(215,255,0,0.65)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.28)')}>
                Marcar leídas
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {loading ? (
              /* Skeleton while fetching */
              <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.05)', flexShrink: 0, animation: 'skPulse 1.4s ease-in-out infinite' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 12, width: '65%', borderRadius: 5, background: 'rgba(255,255,255,0.05)', marginBottom: 7, animation: 'skPulse 1.4s ease-in-out infinite' }} />
                      <div style={{ height: 10, width: '40%', borderRadius: 5, background: 'rgba(255,255,255,0.03)', animation: 'skPulse 1.4s ease-in-out infinite' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px' }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>🔔</div>
                <p style={{ fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.32)', marginBottom: 4 }}>Todo tranquilo por aquí</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)' }}>
                  {userId ? 'Las notificaciones aparecerán cuando haya actividad.' : 'Iniciá sesión para ver tu actividad.'}
                </p>
              </div>
            ) : notifs.map((n, i) => {
              const meta = TYPE_META[n.type] ?? TYPE_META.general;
              return (
                <div key={n.id} className="notif-row" style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '11px 18px',
                  background: n.read ? 'transparent' : 'rgba(215,255,0,0.025)',
                  borderLeft: n.read ? '2px solid transparent' : '2px solid rgba(215,255,0,0.38)',
                  borderBottom: i < notifs.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  cursor: 'default', transition: 'background 0.16s',
                  animation: `notifIn 0.25s ${i * 0.04}s ease both`,
                }}>
                  {/* Icon */}
                  <div style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    background: `${meta.color}12`, border: `1px solid ${meta.color}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, marginTop: 1,
                  }}>
                    {meta.icon}
                  </div>
                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                      <span style={{
                        fontSize: 12.5, fontWeight: n.read ? 500 : 700,
                        color: n.read ? 'rgba(255,255,255,0.50)' : '#fff',
                        letterSpacing: '-0.015em', lineHeight: 1.35,
                      }}>
                        {n.title}
                      </span>
                      <span style={{
                        fontSize: 10, flexShrink: 0, fontWeight: 600,
                        color: n.read ? 'rgba(255,255,255,0.18)' : 'rgba(215,255,0,0.65)',
                      }}>
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                    {n.body && (
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
                        {n.body}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '10px 18px' }}>
            <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.15)', textAlign: 'center', letterSpacing: '0.08em', margin: 0 }}>
              SISTEMA DE ACTIVIDAD · TUCANCHA CR
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

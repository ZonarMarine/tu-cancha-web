"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Send, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Msg = {
  id: string;
  user_id: string;
  author_name: string;
  body: string;
  created_at: string;
};

function buildSeed(): Msg[] {
  return [
    { id: 'seed1', user_id: 'seed', author_name: 'Marco V.',  body: '¿Quién juega esta noche?',   created_at: new Date(Date.now() - 4*3600*1000).toISOString() },
    { id: 'seed2', user_id: 'seed', author_name: 'Diego M.',  body: 'Yo confirmo. Falta portero', created_at: new Date(Date.now() - 3*3600*1000).toISOString() },
    { id: 'seed3', user_id: 'seed', author_name: 'Marco V.',  body: '⚽ ¡Vamos! Nos vemos 7PM',   created_at: new Date(Date.now() - 2*3600*1000).toISOString() },
  ];
}

const QUICK = ['⚽', '✅', '🔥', '⚡', '👊'];

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return 'ahora';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

interface Props {
  teamName:  string;
  teamColor: string;
  userName:  string;
  userId:    string;
}

export default function TeamChat({ teamName, teamColor, userName, userId }: Props) {
  const [open,       setOpen]       = useState(false);
  const [msgs,       setMsgs]       = useState<Msg[]>(buildSeed);
  const [input,      setInput]      = useState('');
  const [sending,    setSending]    = useState(false);
  const [canScrollUp,   setCanScrollUp]   = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const listRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ── updateScrollState used inline by onScroll ── */
  const updateScrollState = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 8);
    setCanScrollDown(el.scrollTop < el.scrollHeight - el.clientHeight - 8);
  }, []);

  /* ── Load + realtime ── */
  useEffect(() => {
    if (!teamName) return;
    supabase
      .from('team_messages')
      .select('id, user_id, author_name, body, created_at')
      .eq('team_name', teamName)
      .order('created_at', { ascending: true })
      .limit(60)
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) setMsgs(data as Msg[]);
      });

    const ch = supabase
      .channel(`chat:${teamName}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'team_messages', filter: `team_name=eq.${teamName}`,
      }, payload => {
        setMsgs(prev => {
          const fresh = payload.new as Msg;
          const withoutTemp = prev.filter(m => !m.id.startsWith('opt_'));
          return [...withoutTemp, fresh];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [teamName]);

  /* ── Scroll helpers — never touch window ── */
  const checkScroll = useCallback(() => {
    // rAF ensures DOM has painted before we read dimensions
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (!el) return;
      setCanScrollUp(el.scrollTop > 8);
      setCanScrollDown(el.scrollTop < el.scrollHeight - el.clientHeight - 8);
    });
  }, []);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
      // Re-check after scroll settles
      setTimeout(checkScroll, 30);
    });
  }, [checkScroll]);

  const nudge = (dir: 'up' | 'down') => {
    const el = listRef.current;
    if (!el) return;
    el.scrollBy({ top: dir === 'up' ? -100 : 100, behavior: 'smooth' });
  };

  // Re-check scroll state whenever open state or message count changes
  useEffect(() => {
    if (!open) return;
    scrollToBottom();          // go to bottom on open
    checkScroll();             // also check immediately in case content < 240px
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open) checkScroll();   // re-check when new messages arrive
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgs.length, open]);

  const handleSend = async (text: string) => {
    const body = text.trim();
    if (!body || sending || !userId) return;
    setSending(true);
    setInput('');
    const optId = `opt_${Date.now()}`;
    setMsgs(prev => [...prev, { id: optId, user_id: userId, author_name: userName, body, created_at: new Date().toISOString() }]);
    scrollToBottom();
    await supabase.from('team_messages').insert({ team_name: teamName, user_id: userId, author_name: userName, body });
    setSending(false);
    inputRef.current?.focus();
  };

  const lastMsg = msgs[msgs.length - 1];
  const preview = lastMsg ? `"${lastMsg.body.slice(0, 30)}${lastMsg.body.length > 30 ? '…' : ''}"` : null;

  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.055)' }}>
      <style>{`
        @keyframes chatIn    { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes commsBlink{ 0%,100%{opacity:0.75;} 48%,52%{opacity:0.22;} }
        @keyframes commsGlow { 0%,100%{text-shadow:none;} 50%{text-shadow:0 0 8px rgba(74,222,128,0.45);} }
        .msg-scroll::-webkit-scrollbar { width: 0px; }
        .qreact-btn:hover { background:rgba(255,255,255,0.10) !important; transform:scale(1.15) !important; }
        .chat-toggle:hover { background:rgba(255,255,255,0.022) !important; }
        .scroll-btn:hover  { background:rgba(255,255,255,0.12) !important; }
      `}</style>

      {/* ── Collapsed header — ambient ticker ── */}
      <button
        className="chat-toggle"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 24px 10px', transition: 'background 0.16s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Ambient blink dot */}
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: '#4ADE80', flexShrink: 0,
            boxShadow: '0 0 4px rgba(74,222,128,0.55)',
            animation: 'commsBlink 3.2s ease-in-out infinite',
          }} />
          <span style={{
            fontSize: 9.5, fontWeight: 700,
            color: 'rgba(255,255,255,0.32)',
            letterSpacing: '0.14em', textTransform: 'uppercase',
            animation: 'commsGlow 4s ease-in-out infinite',
          }}>
            Comms
          </span>
          {!open && preview && (
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.17)', letterSpacing: '-0.01em', fontStyle: 'italic', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {preview}
            </span>
          )}
        </div>
        <span style={{ color: 'rgba(255,255,255,0.16)' }}>
          {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </span>
      </button>

      {/* ── Expanded ── */}
      {open && (
        <div style={{ animation: 'chatIn 0.18s ease both', padding: '2px 16px 16px' }}>

          {/* Message list wrapper — position:relative so scroll buttons can anchor inside */}
          <div style={{ position: 'relative' }}>

            {/* ── Scroll UP button + top fade ── */}
            {canScrollUp && (
              <>
                {/* top gradient mask */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 36,
                  background: 'linear-gradient(to bottom, rgba(14,14,14,0.90), transparent)',
                  zIndex: 2, pointerEvents: 'none', borderRadius: '8px 8px 0 0',
                }} />
                <button
                  className="scroll-btn"
                  onClick={() => nudge('up')}
                  style={{
                    position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)',
                    zIndex: 3, display: 'flex', alignItems: 'center', gap: 4,
                    padding: '3px 10px', borderRadius: 99,
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    cursor: 'pointer', transition: 'background 0.14s',
                  }}
                >
                  <ChevronUp size={11} color="rgba(255,255,255,0.55)" />
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.04em' }}>
                    MÁS ARRIBA
                  </span>
                </button>
              </>
            )}

            {/* ── Message list ── */}
            <div
              ref={listRef}
              className="msg-scroll"
              onScroll={updateScrollState}
              style={{
                height: 240, overflowY: 'scroll',
                display: 'flex', flexDirection: 'column', gap: 8,
                padding: '8px 4px 4px',
              }}
            >
              {msgs.map(msg => {
                const isMe   = msg.user_id === userId;
                const isSeed = msg.id.startsWith('seed');
                const initials = msg.author_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <div key={msg.id} style={{
                    display: 'flex', gap: 8, alignItems: 'flex-end',
                    flexDirection: isMe ? 'row-reverse' : 'row',
                    opacity: isSeed ? 0.6 : 1,
                    flexShrink: 0,
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                      background: isMe ? `${teamColor}28` : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${isMe ? teamColor + '38' : 'rgba(255,255,255,0.08)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 900,
                      color: isMe ? teamColor : 'rgba(255,255,255,0.45)',
                      letterSpacing: '-0.01em', marginBottom: 14,
                    }}>
                      {initials}
                    </div>
                    <div style={{ maxWidth: '74%' }}>
                      {!isMe && (
                        <div style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.28)', marginBottom: 3, letterSpacing: '-0.01em' }}>
                          {msg.author_name}
                        </div>
                      )}
                      <div style={{
                        padding: '7px 11px',
                        borderRadius: isMe ? '11px 11px 3px 11px' : '11px 11px 11px 3px',
                        background: isMe
                          ? `linear-gradient(135deg,${teamColor}28,${teamColor}16)`
                          : 'rgba(255,255,255,0.055)',
                        border: `1px solid ${isMe ? teamColor + '28' : 'rgba(255,255,255,0.07)'}`,
                        fontSize: 12.5, lineHeight: 1.4,
                        color: isMe ? 'rgba(220,255,210,0.85)' : 'rgba(255,255,255,0.60)',
                        fontWeight: 500, letterSpacing: '-0.01em',
                      }}>
                        {msg.body}
                      </div>
                      <div style={{
                        fontSize: 9, marginTop: 3, letterSpacing: '-0.01em',
                        color: 'rgba(255,255,255,0.18)',
                        textAlign: isMe ? 'right' : 'left',
                      }}>
                        {timeAgo(msg.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Scroll DOWN button + bottom fade ── */}
            {canScrollDown && (
              <>
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 36,
                  background: 'linear-gradient(to top, rgba(14,14,14,0.90), transparent)',
                  zIndex: 2, pointerEvents: 'none', borderRadius: '0 0 8px 8px',
                }} />
                <button
                  className="scroll-btn"
                  onClick={() => nudge('down')}
                  style={{
                    position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)',
                    zIndex: 3, display: 'flex', alignItems: 'center', gap: 4,
                    padding: '3px 10px', borderRadius: 99,
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    cursor: 'pointer', transition: 'background 0.14s',
                  }}
                >
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.04em' }}>
                    MÁS ABAJO
                  </span>
                  <ChevronDown size={11} color="rgba(255,255,255,0.55)" />
                </button>
              </>
            )}
          </div>

          {/* Quick reactions */}
          <div style={{ display: 'flex', gap: 6, margin: '8px 4px 8px', alignItems: 'center' }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.20)', letterSpacing: '0.06em', marginRight: 2 }}>RÁPIDO</span>
            {QUICK.map(r => (
              <button
                key={r}
                className="qreact-btn"
                onClick={() => handleSend(r)}
                style={{
                  width: 32, height: 28, borderRadius: 8, flexShrink: 0,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  cursor: 'pointer', fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.14s', transform: 'scale(1)',
                }}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Input row */}
          <div style={{
            display: 'flex', gap: 8, alignItems: 'center',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 12, padding: '8px 10px 8px 14px',
          }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(input); } }}
              placeholder="Escribí algo al equipo..."
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: '#fff', fontSize: 12.5, fontFamily: 'inherit',
                caretColor: teamColor,
              }}
            />
            <button
              onClick={() => handleSend(input)}
              disabled={!input.trim() || sending}
              style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: input.trim() ? teamColor : 'rgba(255,255,255,0.07)',
                border: 'none',
                cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.16s',
                boxShadow: input.trim() ? `0 0 14px ${teamColor}50` : 'none',
              }}
            >
              <Send size={12} color={input.trim() ? '#000' : 'rgba(255,255,255,0.22)'} />
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

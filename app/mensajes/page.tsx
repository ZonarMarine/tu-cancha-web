"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Search, Send, ChevronLeft, UserPlus, Check, MessageCircle } from "lucide-react";

type Prof = { id: string; name: string; team?: string | null; avatar_url?: string | null };
type Msg = { id: string; user_id: string; author_name: string; body: string; created_at: string };
type Convo = { channelId: string; otherId: string; name: string; avatarUrl?: string | null; last: string };

const dmChannelId = (a: string, b: string) => [a, b].sort().join("_");
const initials = (n?: string) => (n || "J").trim().split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
const timeAgo = (iso: string) => {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "ahora"; if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`; return `${Math.floor(d / 86400)}d`;
};

export default function MensajesPage() {
  const router = useRouter();
  const [meId, setMeId] = useState<string | null>(null);
  const [meName, setMeName] = useState("Jugador");
  const [ready, setReady] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Prof[]>([]);
  const [searching, setSearching] = useState(false);
  const [friendStatus, setFriendStatus] = useState<Record<string, "friend" | "outgoing" | "incoming">>({});
  const [incoming, setIncoming] = useState<Prof[]>([]);
  const [convos, setConvos] = useState<Convo[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [active, setActive] = useState<{ otherId: string; name: string; channelId: string } | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // ── Load session + friendships + conversations ──
  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { router.push("/auth?redirect=/mensajes"); return; }
    const uid = session.user.id;
    setMeId(uid);
    const { data: prof } = await supabase.from("profiles").select("name").eq("id", uid).single();
    setMeName(prof?.name || session.user.email?.split("@")[0] || "Jugador");

    const { data: fr } = await supabase.from("friendships").select("requester_id, addressee_id, status");
    const statusMap: Record<string, any> = {}; const incomingIds: string[] = [];
    (fr || []).forEach((f: any) => {
      const other = f.requester_id === uid ? f.addressee_id : f.requester_id;
      if (f.status === "accepted") statusMap[other] = "friend";
      else if (f.requester_id === uid) statusMap[other] = "outgoing";
      else { statusMap[other] = "incoming"; incomingIds.push(f.requester_id); }
    });
    setFriendStatus(statusMap);

    const { data: dmMsgs } = await supabase.from("chat_messages")
      .select("channel_id, body, created_at, user_id").eq("channel_type", "dm")
      .order("created_at", { ascending: false }).limit(200);
    const seen = new Set<string>(); const latest: any[] = [];
    for (const m of (dmMsgs || [])) { if (!seen.has(m.channel_id)) { seen.add(m.channel_id); latest.push(m); } }
    const convoOtherIds = latest.map(m => { const [a, b] = m.channel_id.split("_"); return a === uid ? b : a; });
    const allIds = Array.from(new Set([...incomingIds, ...convoOtherIds]));
    let pmap: Record<string, Prof> = {};
    if (allIds.length) {
      const { data: profs } = await supabase.from("public_profiles").select("id, name, avatar_url").in("id", allIds);
      pmap = Object.fromEntries((profs || []).map((p: any) => [p.id, p]));
    }
    setIncoming(incomingIds.map(id => ({ id, name: pmap[id]?.name || "Jugador", avatar_url: pmap[id]?.avatar_url })));
    setConvos(latest.map(m => {
      const [a, b] = m.channel_id.split("_"); const otherId = a === uid ? b : a; const p = pmap[otherId] || {} as Prof;
      return { channelId: m.channel_id, otherId, name: p.name || "Jugador", avatarUrl: p.avatar_url, last: m.body };
    }));
    setReady(true);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  // ── Search (server API, service role) ──
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search-players?q=${encodeURIComponent(term)}`);
        const data = await res.json();
        setResults((data || []).filter((p: Prof) => p.id !== meId));
      } catch { setResults([]); } finally { setSearching(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [query, meId]);

  // ── Open a DM ──
  const openChat = useCallback(async (other: { id: string; name: string }) => {
    if (!meId) return;
    const chan = dmChannelId(meId, other.id);
    setActive({ otherId: other.id, name: other.name, channelId: chan });
    setMsgs([]);
    const { data } = await supabase.from("chat_messages").select("id, user_id, author_name, body, created_at")
      .eq("channel_type", "dm").eq("channel_id", chan).order("created_at", { ascending: true }).limit(100);
    setMsgs((data as Msg[]) || []);
    supabase.from("chat_reads").upsert({ user_id: meId, channel_type: "dm", channel_id: chan, last_read_at: new Date().toISOString() }).then(() => {});
    setTimeout(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, 40);
  }, [meId]);

  // ── Realtime for the active DM ──
  useEffect(() => {
    if (!active) return;
    const ch = supabase.channel(`dm:${active.channelId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `channel_id=eq.${active.channelId}` },
        (payload: any) => {
          const m = payload.new as Msg & { channel_type?: string };
          if (m.channel_type && m.channel_type !== "dm") return;
          setMsgs(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
          setTimeout(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, 30);
        }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [active]);

  const send = async () => {
    const body = input.trim();
    if (!body || sending || !active || !meId) return;
    setSending(true); setInput("");
    const { data, error } = await supabase.from("chat_messages")
      .insert({ channel_type: "dm", channel_id: active.channelId, user_id: meId, author_name: meName, body })
      .select("id, user_id, author_name, body, created_at").single();
    if (!error && data) setMsgs(prev => prev.some(x => x.id === (data as any).id) ? prev : [...prev, data as Msg]);
    else if (error) setInput(body);
    setSending(false);
    setTimeout(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, 30);
  };

  const sendRequest = async (p: Prof) => {
    setBusyId(p.id);
    try {
      const { data } = await supabase.rpc("send_friend_request", { target_user_id: p.id });
      if (data?.ok === false) { alert(data.error); return; }
      setFriendStatus(prev => ({ ...prev, [p.id]: "outgoing" }));
    } finally { setBusyId(null); }
  };
  const respond = async (requesterId: string, accept: boolean) => {
    setBusyId(requesterId);
    try {
      await supabase.rpc("respond_friend_request", { requester: requesterId, accept });
      setIncoming(prev => prev.filter(r => r.id !== requesterId));
      setFriendStatus(prev => ({ ...prev, [requesterId]: accept ? "friend" : (undefined as any) }));
      if (accept) load();
    } finally { setBusyId(null); }
  };

  const isSearching = query.trim().length >= 2;

  const ActionBtn = ({ p }: { p: Prof }) => {
    const st = friendStatus[p.id];
    if (busyId === p.id) return <span style={S.pill}>…</span>;
    if (st === "friend") return <button onClick={() => openChat(p)} style={{ ...S.pill, ...S.pillGo }}><MessageCircle size={13} /> Mensaje</button>;
    if (st === "outgoing") return <span style={{ ...S.pill, ...S.pillMuted }}>Pendiente</span>;
    if (st === "incoming") return <button onClick={() => respond(p.id, true)} style={{ ...S.pill, ...S.pillGo }}><Check size={13} /> Aceptar</button>;
    return <button onClick={() => sendRequest(p)} style={{ ...S.pill, ...S.pillAdd }}><UserPlus size={13} /> Agregar</button>;
  };

  if (!ready) return <div style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div style={{ width: 26, height: 26, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.07)", borderTopColor: "var(--accent)", animation: "spin 0.7s linear infinite" }} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>;

  const Avatar = ({ url, name, size = 40 }: { url?: string | null; name: string; size?: number }) => url
    ? <img src={url} alt={name} style={{ width: size, height: size, borderRadius: size * 0.3, objectFit: "cover", flexShrink: 0 }} />
    : <div style={{ width: size, height: size, borderRadius: size * 0.3, flexShrink: 0, background: "var(--accent-dark)", border: "1px solid var(--accent-glow)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", fontSize: size * 0.34, fontWeight: 900 }}>{initials(name)}</div>;

  return (
    <div style={{ minHeight: "100svh", paddingTop: 64, background: "var(--bg)" }}>
      <div className="container" style={{ padding: "24px 40px 60px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.03em", marginBottom: 18 }}>Mensajes</h1>
        <div className="msg-grid" style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16, alignItems: "start" }}>

          {/* ── Left: search + list ── */}
          <div style={{ ...S.card, padding: 14, display: active ? undefined : "block" }} className="msg-list">
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 12px", marginBottom: 12 }}>
              <Search size={16} color="var(--text3)" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar un jugador…"
                style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#fff", fontSize: 14, fontFamily: "inherit" }} />
              {searching && <div style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "var(--accent)", animation: "spin 0.7s linear infinite" }} />}
            </div>

            {isSearching ? (
              results.length === 0 && !searching
                ? <p style={S.hint}>Sin resultados para “{query.trim()}”.</p>
                : results.map(p => (
                  <div key={p.id} style={S.row}>
                    <Avatar url={p.avatar_url} name={p.name} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={S.rowName}>{p.name}</div>
                      <div style={S.rowSub}>{p.team ? `Equipo: ${p.team}` : "Jugador"}</div>
                    </div>
                    <ActionBtn p={p} />
                  </div>
                ))
            ) : (
              <>
                {incoming.length > 0 && <>
                  <p style={S.label}>SOLICITUDES</p>
                  {incoming.map(r => (
                    <div key={r.id} style={S.row}>
                      <Avatar url={r.avatar_url} name={r.name} />
                      <div style={{ flex: 1, minWidth: 0 }}><div style={S.rowName}>{r.name}</div><div style={S.rowSub}>Quiere ser tu amigo</div></div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => respond(r.id, true)} style={{ ...S.pill, ...S.pillGo }}>Aceptar</button>
                        <button onClick={() => respond(r.id, false)} style={{ ...S.pill, ...S.pillMuted }}>Ignorar</button>
                      </div>
                    </div>
                  ))}
                  <p style={{ ...S.label, marginTop: 14 }}>CONVERSACIONES</p>
                </>}
                {convos.length === 0
                  ? <p style={S.hint}>Buscá un jugador y agregalo para chatear.</p>
                  : convos.map(c => (
                    <div key={c.channelId} onClick={() => openChat({ id: c.otherId, name: c.name })}
                      style={{ ...S.row, cursor: "pointer", background: active?.channelId === c.channelId ? "var(--accent-dark)" : S.row.background }}>
                      <Avatar url={c.avatarUrl} name={c.name} />
                      <div style={{ flex: 1, minWidth: 0 }}><div style={S.rowName}>{c.name}</div><div style={{ ...S.rowSub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.last}</div></div>
                    </div>
                  ))}
              </>
            )}
          </div>

          {/* ── Right: active chat ── */}
          <div style={{ ...S.card, minHeight: 520, display: "flex", flexDirection: "column" }} className="msg-chat">
            {!active ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--text3)", padding: 40 }}>
                <MessageCircle size={30} color="var(--text3)" />
                <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text2)" }}>Elegí una conversación</p>
                <p style={{ fontSize: 13, textAlign: "center" }}>Buscá un jugador, mandale una solicitud y empezá a chatear.</p>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
                  <button onClick={() => setActive(null)} className="msg-back" style={{ display: "none", background: "none", border: "none", cursor: "pointer" }}><ChevronLeft size={20} color="var(--text)" /></button>
                  <Avatar url={convos.find(c => c.otherId === active.otherId)?.avatarUrl} name={active.name} size={34} />
                  <div><div style={{ fontWeight: 800, fontSize: 15 }}>{active.name}</div><div style={{ fontSize: 11, color: "var(--text3)" }}>Mensaje directo</div></div>
                </div>
                <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8, maxHeight: 440 }}>
                  {msgs.length === 0 && <p style={{ ...S.hint, margin: "auto" }}>Todavía no hay mensajes. ¡Saludá!</p>}
                  {msgs.map(m => {
                    const mine = m.user_id === meId;
                    return (
                      <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                        <div style={{ maxWidth: "72%", padding: "8px 12px", borderRadius: mine ? "13px 13px 4px 13px" : "13px 13px 13px 4px", background: mine ? "var(--accent)" : "var(--surface2)", border: mine ? "none" : "1px solid var(--border)" }}>
                          <div style={{ fontSize: 14, lineHeight: 1.4, color: mine ? "#0c0d06" : "var(--text)", fontWeight: mine ? 600 : 400 }}>{m.body}</div>
                          <div style={{ fontSize: 9.5, marginTop: 3, textAlign: "right", color: mine ? "rgba(12,13,6,0.5)" : "var(--text3)" }}>{timeAgo(m.created_at)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", padding: 12, borderTop: "1px solid var(--border)" }}>
                  <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder="Escribí un mensaje…" style={{ flex: 1, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 22, outline: "none", color: "#fff", fontSize: 14, padding: "11px 16px", fontFamily: "inherit" }} />
                  <button onClick={send} disabled={!input.trim() || sending} style={{ width: 44, height: 44, borderRadius: 22, flexShrink: 0, background: input.trim() ? "var(--accent)" : "var(--surface2)", border: "none", cursor: input.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Send size={17} color={input.trim() ? "#0c0d06" : "var(--text3)"} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 820px) {
          .msg-grid { grid-template-columns: 1fr !important; }
          .msg-list { display: ${active ? "none" : "block"} !important; }
          .msg-back { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  card: { borderRadius: 18, background: "linear-gradient(160deg,#161616,#111111)", border: "1px solid rgba(255,255,255,0.08)" },
  label: { fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: "var(--text3)", margin: "4px 2px 8px" },
  hint: { fontSize: 13, color: "var(--text3)", textAlign: "center", padding: "24px 8px" },
  row: { display: "flex", alignItems: "center", gap: 11, padding: "10px 8px", borderRadius: 12, marginBottom: 4 },
  rowName: { fontSize: 14.5, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  rowSub: { fontSize: 12, color: "var(--text3)", marginTop: 1 },
  pill: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5, fontWeight: 800, padding: "6px 11px", borderRadius: 9, border: "none", cursor: "pointer" },
  pillGo: { background: "var(--accent)", color: "#0c0d06" },
  pillAdd: { background: "var(--accent-dark)", color: "var(--accent)", border: "1px solid var(--accent-glow)" },
  pillMuted: { background: "var(--surface2)", color: "var(--text3)", border: "1px solid var(--border)" },
};

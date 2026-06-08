"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  LogOut, Edit2, Calendar, Clock, MapPin,
  TrendingUp, Shield, Zap, Target, X, Camera, Check, Loader2,
  Users, Plus, ChevronRight, Share2, Copy, ExternalLink, Search,
} from "lucide-react";
import Link from "next/link";
import TeamChat from "@/components/TeamChat";

/* ─── constants ─────────────────────────────────────────── */

const STATUS: Record<string, { label: string; color: string; bg: string; dot: string; border: string }> = {
  confirmed: { label: 'Confirmada', color: '#4ADE80', bg: 'rgba(74,222,128,0.09)',  dot: '#4ADE80', border: 'rgba(74,222,128,0.2)' },
  pending:   { label: 'Pendiente',  color: '#FACC15', bg: 'rgba(250,204,21,0.09)',  dot: '#FACC15', border: 'rgba(250,204,21,0.2)' },
  cancelled: { label: 'Cancelada',  color: '#FF6B6B', bg: 'rgba(255,107,107,0.09)', dot: '#FF6B6B', border: 'rgba(255,107,107,0.2)' },
};

const STATS = [
  { key: 'stat_atk', label: 'Ataque',  Icon: Zap,        color: '#D7FF00' },
  { key: 'stat_def', label: 'Defensa', Icon: Shield,     color: '#60A5FA' },
  { key: 'stat_str', label: 'Fuerza',  Icon: TrendingUp, color: '#F97316' },
  { key: 'stat_skl', label: 'Técnica', Icon: Target,     color: '#A78BFA' },
];

const BOOKING_ICONS   = ['rgba(215,255,0,0.08)', 'rgba(96,165,250,0.08)', 'rgba(249,115,22,0.08)', 'rgba(167,139,250,0.08)'];
const BOOKING_BORDERS = ['rgba(215,255,0,0.15)', 'rgba(96,165,250,0.15)', 'rgba(249,115,22,0.15)', 'rgba(167,139,250,0.15)'];

const CARD = {
  borderRadius: 18,
  background: 'linear-gradient(160deg, #161616 0%, #111111 100%)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 6px 28px rgba(0,0,0,0.35)',
} as const;

/* ─── EditModal ──────────────────────────────────────────── */

function EditModal({
  profile,
  onClose,
  onSave,
}: {
  profile: any;
  onClose: () => void;
  onSave: (updated: any) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [name,         setName]         = useState(profile?.name  ?? '');
  const [team,         setTeam]         = useState(profile?.team  ?? '');
  const [playerStatus, setPlayerStatus] = useState<string>(profile?.player_status ?? 'offline');
  const [statAtk,      setStatAtk]      = useState(String(profile?.stat_atk ?? ''));
  const [statDef,      setStatDef]      = useState(String(profile?.stat_def ?? ''));
  const [statStr,      setStatStr]      = useState(String(profile?.stat_str ?? ''));
  const [statSkl,      setStatSkl]      = useState(String(profile?.stat_skl ?? ''));
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url ?? null);
  const [avatarFile,    setAvatarFile]    = useState<File | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 250);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = ev => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('El nombre no puede estar vacío.'); return; }
    setSaving(true); setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('No session');
      const uid = session.user.id;

      let avatar_url = profile?.avatar_url ?? null;

      /* Upload avatar if a new file was chosen */
      if (avatarFile) {
        const ext  = avatarFile.name.split('.').pop();
        const path = `${uid}/avatar.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true });

        if (upErr) {
          /* Storage bucket may not exist – skip silently and keep preview as base64 */
          console.warn('Avatar upload skipped:', upErr.message);
        } else {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
          avatar_url = urlData.publicUrl;
        }
      }

      const baseUpdates = {
        id: uid,
        name: name.trim(),
        team: team.trim(),
        avatar_url,
        player_status: playerStatus,
      };

      const statsUpdates = {
        stat_atk: statAtk ? Number(statAtk) : null,
        stat_def: statDef ? Number(statDef) : null,
        stat_str: statStr ? Number(statStr) : null,
        stat_skl: statSkl ? Number(statSkl) : null,
      };

      /* Try full upsert first; if stat columns missing, retry without them */
      let { error: dbErr } = await supabase.from('profiles').upsert({ ...baseUpdates, ...statsUpdates });
      if (dbErr?.message?.includes('stat_')) {
        const fallback = await supabase.from('profiles').upsert(baseUpdates);
        if (fallback.error) throw fallback.error;
        onSave({ ...profile, ...baseUpdates });
      } else {
        if (dbErr) throw dbErr;
        onSave({ ...profile, ...baseUpdates, ...statsUpdates });
      }

      handleClose();
    } catch (e: any) {
      setError(e.message ?? 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  /* Derived initials for the preview avatar */
  const initials = name
    ? name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const inputSt: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 11, fontSize: 14,
    background: 'rgba(255,255,255,0.04)', color: 'var(--text)',
    border: '1px solid rgba(255,255,255,0.09)', outline: 'none',
    transition: 'border-color 0.18s',
    boxSizing: 'border-box',
  };

  const statInputSt: React.CSSProperties = {
    ...inputSt,
    padding: '9px 12px', fontSize: 13, textAlign: 'center',
  };

  return (
    <>
      <style>{`
        .modal-input:focus { border-color: rgba(215,255,0,0.35) !important; }
        .modal-stat-input:focus { border-color: rgba(215,255,0,0.35) !important; }
        @keyframes modal-in { from { opacity:0; transform:translateY(12px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.72)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* Modal panel — two-layer: outer positions, inner animates */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', zIndex: 101,
        transform: 'translate(-50%, -50%)',
        width: 'min(480px, calc(100vw - 32px))',
      }}>
        <div style={{
          animation: 'modal-in 0.28s cubic-bezier(0.34,1.56,0.64,1) both',
          borderRadius: 22,
          background: 'linear-gradient(160deg, #1c1c1c 0%, #141414 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 2px 0 rgba(255,255,255,0.06) inset, 0 32px 80px rgba(0,0,0,0.7)',
          overflow: 'hidden',
        }}>

          {/* Header bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px 0',
          }}>
            <div>
              <p style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em', marginBottom: 2 }}>
                Editar perfil
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                Tu identidad en TuCancha
              </p>
            </div>
            <button
              onClick={handleClose}
              style={{
                width: 32, height: 32, borderRadius: 10, border: 'none', cursor: 'pointer',
                background: 'rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.5)',
                transition: 'background 0.15s',
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '20px 0 0' }} />

          {/* Body */}
          <div style={{ padding: '24px' }}>

            {/* Avatar picker */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
              <div style={{ position: 'relative' }}>

                {/* FUT card border — same as profile header */}
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{ cursor: 'pointer', position: 'relative' }}>
                  {/* Outer glow */}
                  <div style={{
                    position: 'absolute', inset: -5, borderRadius: 24,
                    background: 'linear-gradient(145deg, rgba(215,255,0,0.2), rgba(180,220,0,0.04), rgba(215,255,0,0.16))',
                    filter: 'blur(7px)', pointerEvents: 'none',
                  }} />
                  {/* Gold frame */}
                  <div style={{
                    padding: 3, borderRadius: 22,
                    background: 'linear-gradient(145deg, #c8b84a 0%, #f0d96e 30%, #b89c38 52%, #e8cd60 72%, #c0a840 100%)',
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.6), 0 10px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.25)',
                    position: 'relative', zIndex: 1,
                  }}>
                    {/* Inner dark ring */}
                    <div style={{ padding: 2, borderRadius: 19, background: 'linear-gradient(160deg, #1a1a0a, #0c0c06)' }}>
                      {/* Avatar tile */}
                      <div style={{ width: 80, height: 80, borderRadius: 17, overflow: 'hidden', position: 'relative' }}>
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{
                            width: '100%', height: '100%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'linear-gradient(145deg, #1e2d06, #111800)',
                            fontWeight: 900, fontSize: 26, color: 'var(--accent)',
                            letterSpacing: '-0.02em',
                          }}>{initials}</div>
                        )}
                        {/* Camera overlay on hover */}
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: 'rgba(0,0,0,0.5)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          opacity: 0, transition: 'opacity 0.18s',
                        }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                        >
                          <Camera size={20} color="#fff" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Camera badge */}
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{
                    position: 'absolute', bottom: -2, right: -2, zIndex: 3,
                    width: 26, height: 26, borderRadius: 8,
                    background: 'var(--accent)', border: '2px solid #1c1c1c',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}>
                  <Camera size={12} color="#000" />
                </button>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            {/* Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Name */}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.32)', marginBottom: 7, textTransform: 'uppercase' }}>
                  Nombre completo
                </label>
                <input
                  className="modal-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Tu nombre"
                  style={inputSt}
                />
              </div>

              {/* Team */}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.32)', marginBottom: 7, textTransform: 'uppercase' }}>
                  Equipo (opcional)
                </label>
                <input
                  className="modal-input"
                  value={team}
                  onChange={e => setTeam(e.target.value)}
                  placeholder="Ej. Los Clavos FC"
                  style={inputSt}
                />
              </div>

              {/* Player Status */}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.32)', marginBottom: 8, textTransform: 'uppercase' }}>
                  Estado actual
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {([
                    { key: 'online',    label: 'En línea',         color: '#4ADE80' },
                    { key: 'searching', label: 'Buscando partido', color: '#D7FF00' },
                    { key: 'available', label: 'Disponible',       color: '#60A5FA' },
                    { key: 'playing',   label: 'Jugando',          color: '#F97316' },
                    { key: 'offline',   label: 'Fuera de línea',   color: 'rgba(255,255,255,0.30)' },
                  ] as { key: string; label: string; color: string }[]).map(s => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setPlayerStatus(s.key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 12px', borderRadius: 9,
                        border: `1px solid ${playerStatus === s.key ? s.color + '60' : 'rgba(255,255,255,0.09)'}`,
                        background: playerStatus === s.key ? `${s.color}14` : 'rgba(255,255,255,0.03)',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: playerStatus === s.key ? s.color : 'rgba(255,255,255,0.40)', letterSpacing: '-0.01em' }}>
                        {s.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Stats 2×2 */}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.32)', marginBottom: 10, textTransform: 'uppercase' }}>
                  Estadísticas (1–99)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'Ataque',  color: '#D7FF00', val: statAtk, set: setStatAtk },
                    { label: 'Defensa', color: '#60A5FA', val: statDef, set: setStatDef },
                    { label: 'Fuerza',  color: '#F97316', val: statStr, set: setStatStr },
                    { label: 'Técnica', color: '#A78BFA', val: statSkl, set: setStatSkl },
                  ].map(s => (
                    <div key={s.label}>
                      <label style={{
                        display: 'block', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                        color: s.color, marginBottom: 5, textTransform: 'uppercase',
                      }}>{s.label}</label>
                      <input
                        className="modal-stat-input"
                        type="number"
                        min={1} max={99}
                        value={s.val}
                        onChange={e => s.set(e.target.value)}
                        placeholder="–"
                        style={statInputSt}
                      />
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Error */}
            {error && (
              <div style={{
                marginTop: 14, padding: '10px 14px', borderRadius: 10, fontSize: 12,
                background: 'rgba(255,59,59,0.07)', color: '#FF6B6B',
                border: '1px solid rgba(255,59,59,0.15)',
              }}>{error}</div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={handleClose}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                  background: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.5)',
                  border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer',
                  transition: 'background 0.15s',
                }}>
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 2, padding: '12px', borderRadius: 12, fontSize: 13, fontWeight: 700,
                  background: saving ? 'rgba(215,255,0,0.6)' : 'var(--accent)',
                  color: '#000',
                  border: 'none', cursor: saving ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  transition: 'background 0.18s',
                  letterSpacing: '-0.01em',
                }}>
                {saving ? (
                  <><Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> Guardando…</>
                ) : (
                  <><Check size={14} /> Guardar cambios</>
                )}
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

/* ─── CreateTeamModal ───────────────────────────────────── */

const TEAM_FORMATS = ['5v5', '7v7', '11v11'];
const TEAM_LEVELS  = ['Principiante', 'Intermedio', 'Avanzado'];
const TEAM_COLORS  = [
  { hex: '#D7FF00', label: 'Lima'     },
  { hex: '#4ADE80', label: 'Verde'    },
  { hex: '#60A5FA', label: 'Azul'     },
  { hex: '#F97316', label: 'Naranja'  },
  { hex: '#A78BFA', label: 'Violeta'  },
  { hex: '#FF6B6B', label: 'Rojo'     },
];

function CreateTeamModal({
  profile,
  onClose,
  onSave,
}: {
  profile: any;
  onClose: () => void;
  onSave: (teamData: { name: string; format: string; level: string; color: string }) => void;
}) {
  const [name,    setName]    = useState(profile?.team ?? '');
  const [format,  setFormat]  = useState<string>(() => {
    try { return localStorage.getItem('tc_team_format') ?? '5v5'; } catch { return '5v5'; }
  });
  const [level,   setLevel]   = useState<string>(() => {
    try { return localStorage.getItem('tc_team_level') ?? 'Intermedio'; } catch { return 'Intermedio'; }
  });
  const [color,   setColor]   = useState<string>(() => {
    try { return localStorage.getItem('tc_team_color') ?? '#D7FF00'; } catch { return '#D7FF00'; }
  });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 250);
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('El nombre del equipo no puede estar vacío.'); return; }
    setSaving(true); setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('No session');
      const uid = session.user.id;

      /* Save team name to DB (only column that exists in profiles) */
      const { error: dbErr } = await supabase
        .from('profiles')
        .upsert({ id: uid, team: name.trim() });
      if (dbErr) throw dbErr;

      /* Persist format / level / color in localStorage until DB columns are added */
      try {
        localStorage.setItem('tc_team_format', format);
        localStorage.setItem('tc_team_level',  level);
        localStorage.setItem('tc_team_color',  color);
      } catch (_) {}

      onSave({ name: name.trim(), format, level, color });
      handleClose();
    } catch (e: any) {
      setError(e.message ?? 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  /* Initials for preview */
  const initials = name
    ? name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const inputSt: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 11, fontSize: 14,
    background: 'rgba(255,255,255,0.04)', color: 'var(--text)',
    border: '1px solid rgba(255,255,255,0.09)', outline: 'none',
    transition: 'border-color 0.18s', boxSizing: 'border-box',
    fontFamily: 'inherit',
  };

  return (
    <>
      <style>{`
        .team-input:focus  { border-color: rgba(215,255,0,0.35) !important; }
        .color-swatch:hover { transform: scale(1.12); }
        @keyframes modal-in { from { opacity:0; transform:translateY(12px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
      `}</style>

      {/* Backdrop */}
      <div onClick={handleClose} style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        opacity: visible ? 1 : 0, transition: 'opacity 0.25s ease',
      }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', zIndex: 101,
        transform: 'translate(-50%, -50%)',
        width: 'min(460px, calc(100vw - 32px))',
      }}>
        <div style={{
          animation: 'modal-in 0.28s cubic-bezier(0.34,1.56,0.64,1) both',
          borderRadius: 22,
          background: 'linear-gradient(160deg, #1c1c1c 0%, #141414 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 2px 0 rgba(255,255,255,0.06) inset, 0 32px 80px rgba(0,0,0,0.7)',
          overflow: 'hidden',
        }}>

          {/* Accent top line */}
          <div style={{ height: 2, background: 'linear-gradient(90deg, rgba(215,255,0,0.6) 0%, rgba(215,255,0,0.08) 60%, transparent 100%)' }} />

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: `${color}14`, border: `1px solid ${color}28`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s, border-color 0.2s',
              }}>
                <Users size={14} color={color} style={{ transition: 'color 0.2s' }} />
              </div>
              <div>
                <p style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em', marginBottom: 1 }}>
                  {profile?.team ? 'Editar equipo' : 'Crear equipo'}
                </p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)' }}>
                  Tu identidad en la cancha
                </p>
              </div>
            </div>
            <button onClick={handleClose} style={{
              width: 30, height: 30, borderRadius: 9, border: 'none', cursor: 'pointer',
              background: 'rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.4)',
            }}>
              <X size={14} />
            </button>
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '18px 0 0' }} />

          {/* Body */}
          <div style={{ padding: '22px 24px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Preview + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Team avatar preview */}
              <div style={{
                width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                background: `${color}16`, border: `1.5px solid ${color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 900, color: color,
                transition: 'background 0.22s, border-color 0.22s, color 0.22s',
                letterSpacing: '-0.02em',
              }}>
                {initials || <Users size={22} />}
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.30)', marginBottom: 7, textTransform: 'uppercase' }}>
                  Nombre del equipo
                </label>
                <input
                  className="team-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ej. Los Clavos FC"
                  maxLength={36}
                  style={inputSt}
                  autoFocus
                />
              </div>
            </div>

            {/* Format */}
            <div>
              <label style={{ display: 'block', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.30)', marginBottom: 10, textTransform: 'uppercase' }}>
                Formato
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {TEAM_FORMATS.map(f => {
                  const active = format === f;
                  return (
                    <button key={f} type="button" onClick={() => setFormat(f)} style={{
                      flex: 1, padding: '9px 0', borderRadius: 11, cursor: 'pointer', border: 'none',
                      fontSize: 12.5, fontWeight: 700, letterSpacing: '-0.01em',
                      background: active ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                      color:      active ? '#000'           : 'rgba(255,255,255,0.40)',
                      outline:    active ? 'none'           : '1px solid rgba(255,255,255,0.07)',
                      boxShadow:  active ? '0 0 14px rgba(215,255,0,0.14)' : 'none',
                      transition: 'all 0.14s ease',
                    }}>{f}</button>
                  );
                })}
              </div>
            </div>

            {/* Level */}
            <div>
              <label style={{ display: 'block', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.30)', marginBottom: 10, textTransform: 'uppercase' }}>
                Nivel de juego
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {TEAM_LEVELS.map(l => {
                  const active = level === l;
                  return (
                    <button key={l} type="button" onClick={() => setLevel(l)} style={{
                      flex: 1, padding: '8px 0', borderRadius: 11, cursor: 'pointer', border: 'none',
                      fontSize: 11.5, fontWeight: 600, letterSpacing: '-0.01em',
                      background: active ? 'rgba(215,255,0,0.10)' : 'transparent',
                      color:      active ? 'var(--accent)'         : 'rgba(255,255,255,0.35)',
                      outline:    active ? '1px solid rgba(215,255,0,0.22)' : '1px solid rgba(255,255,255,0.06)',
                      transition: 'all 0.14s ease',
                    }}>{l}</button>
                  );
                })}
              </div>
            </div>

            {/* Team color */}
            <div>
              <label style={{ display: 'block', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.30)', marginBottom: 12, textTransform: 'uppercase' }}>
                Color del equipo
              </label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {TEAM_COLORS.map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.label}
                    onClick={() => setColor(c.hex)}
                    className="color-swatch"
                    style={{
                      width: 30, height: 30, borderRadius: '50%', cursor: 'pointer',
                      background: c.hex, border: 'none',
                      outline: color === c.hex ? `3px solid ${c.hex}` : '3px solid transparent',
                      outlineOffset: 2,
                      boxShadow: color === c.hex ? `0 0 12px ${c.hex}55` : 'none',
                      transition: 'transform 0.14s, box-shadow 0.14s, outline-color 0.14s',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 10, fontSize: 12,
                background: 'rgba(255,59,59,0.07)', color: '#FF6B6B',
                border: '1px solid rgba(255,59,59,0.15)',
              }}>{error}</div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleClose} style={{
                flex: 1, padding: '12px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.45)',
                border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer',
              }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} style={{
                flex: 2, padding: '12px', borderRadius: 12, fontSize: 13, fontWeight: 700,
                background: saving ? 'rgba(215,255,0,0.55)' : 'var(--accent)',
                color: '#000', border: 'none', cursor: saving ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                transition: 'background 0.18s', letterSpacing: '-0.01em',
              }}>
                {saving
                  ? <><Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> Guardando…</>
                  : <><Check size={14} /> {profile?.team ? 'Guardar cambios' : 'Crear equipo'}</>
                }
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

/* ─── BookingDetailModal ─────────────────────────────────── */

function BookingDetailModal({
  booking,
  teamName,
  onClose,
}: {
  booking: any;
  teamName: string;
  onClose: () => void;
}) {
  const router  = useRouter();
  const [visible,    setVisible]    = useState(false);
  const [copied,     setCopied]     = useState(false);
  const [canceling,  setCanceling]  = useState(false);
  const [cancelDone, setCancelDone] = useState(false);
  const [retoSaving, setRetoSaving] = useState(false);
  const [retoDone,   setRetoDone]   = useState(false);
  const [retoError,  setRetoError]  = useState('');

  /* ── Edit mode ── */
  const [editMode,    setEditMode]    = useState(false);
  const [editDate,    setEditDate]    = useState(booking.date    ?? '');
  const [editTime,    setEditTime]    = useState(booking.time    ?? '');
  const [editHours,   setEditHours]   = useState(String(booking.hours   ?? 1));
  const [editPlayers, setEditPlayers] = useState(String(booking.players ?? 10));
  const [editSaving,  setEditSaving]  = useState(false);
  const [editError,   setEditError]   = useState('');
  const [editDone,    setEditDone]    = useState(false);

  const handleSaveEdit = async () => {
    setEditSaving(true); setEditError('');
    // If date or time changed → reset to pending (field owner must re-confirm)
    const timeChanged = editDate !== (booking.date ?? '') || editTime !== (booking.time ?? '');
    const { error } = await supabase.from('bookings').update({
      date:    editDate    || null,
      time:    editTime    || null,
      hours:   Number(editHours)   || 1,
      players: Number(editPlayers) || 10,
      ...(timeChanged ? { status: 'pending' } : {}),
    }).eq('id', booking.id);
    setEditSaving(false);
    if (error) { setEditError(error.message ?? 'Error al guardar'); return; }
    setEditDone(true);
    setTimeout(() => { setEditMode(false); setEditDone(false); }, 1400);
  };

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);
  const handleClose = () => { setVisible(false); setTimeout(onClose, 220); };

  const meta   = STATUS[booking.status] ?? STATUS.pending;
  const canAct = booking.status !== 'cancelled';

  const dateStr = booking.date
    ? new Date(booking.date + 'T12:00:00').toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' })
    : '–';

  /* ── Share / invite ── */
  const handleInvite = async () => {
    // Deep link: lands on /unirse — single-click join, no team name required
    const params = new URLSearchParams({
      venue:   booking.court_name ?? '',
      time:    booking.time       ?? '',
      ...(booking.date    ? { date:    booking.date }              : {}),
      ...(booking.players ? { players: String(booking.players) }   : {}),
      ...(booking.hours   ? { hours:   String(booking.hours) }     : {}),
      ...(booking.price   ? { price:   String(booking.price) }     : {}),
    });
    const link = `https://www.tucanchacr.com/unirse?${params.toString()}`;
    const title = `¡Partido en ${booking.court_name}!`;
    const text  = [
      `🏟️ ${booking.court_name}`,
      `📅 ${dateStr} · ${booking.time}`,
      `⏱️ ${booking.hours ?? 1}h · ${booking.players ?? 10} jugadores`,
      `\n¿Te sumás como rival? Reservá acá 👇`,
    ].join('\n');

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: link });
        return;
      } catch {}
    }
    // Fallback: copy full message + link
    await navigator.clipboard.writeText(`${text}\n${link}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2400);
  };

  /* ── Crear reto (publish to homepage) ── */
  const handleCreateReto = async () => {
    setRetoSaving(true); setRetoError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('No session');
      const { error } = await supabase.from('retos').insert({
        user_id:    session.user.id,
        team_name:  teamName || 'Equipo',
        court_name: booking.court_name,
        date:       booking.date,
        time:       booking.time,
        hours:      booking.hours ?? 1,
        players:    booking.players ?? 10,
        price:      booking.total_price ?? 0,
        status:     'open',
      });
      if (error) throw error;
      setRetoDone(true);
    } catch (e: any) {
      setRetoError(e.message ?? 'Error al publicar el reto.');
    } finally {
      setRetoSaving(false);
    }
  };

  /* ── Cancel booking ── */
  const handleCancel = async () => {
    if (!window.confirm('¿Cancelar esta reserva?')) return;
    setCanceling(true);
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id);
    setCancelDone(true);
    setTimeout(handleClose, 1400);
  };

  const ROW: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '11px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.045)',
  };

  return (
    <>
      <style>{`
        @keyframes bk-modal-in { from{opacity:0;transform:translateY(16px) scale(0.96);}to{opacity:1;transform:translateY(0) scale(1);} }
        .bk-action:hover { background: rgba(255,255,255,0.055) !important; transform: translateY(-1px); }
        .bk-action { transition: background 0.14s, transform 0.14s; }
        .bk-cancel:hover { color: #FF6B6B !important; }
      `}</style>

      {/* Backdrop */}
      <div onClick={handleClose} style={{
        position:'fixed',inset:0,zIndex:200,
        background:'rgba(0,0,0,0.80)',backdropFilter:'blur(14px)',
        opacity:visible?1:0,transition:'opacity 0.22s',
      }}/>

      {/* Panel */}
      <div style={{
        position:'fixed',top:'50%',left:'50%',zIndex:201,
        transform:'translate(-50%,-50%)',
        width:'min(480px,calc(100vw - 28px))',
        maxHeight:'calc(100svh - 40px)',overflowY:'auto',
      }}>
        <div style={{
          animation:'bk-modal-in 0.26s cubic-bezier(0.34,1.3,0.64,1) both',
          borderRadius:22,
          background:'linear-gradient(165deg,#1a1a1a 0%,#111111 100%)',
          border:'1px solid rgba(255,255,255,0.10)',
          boxShadow:'0 2px 0 rgba(255,255,255,0.06) inset,0 40px 100px rgba(0,0,0,0.80)',
          overflow:'hidden',
        }}>

          {/* Status accent bar */}
          <div style={{ height:2.5, background:`linear-gradient(90deg,${meta.color}88 0%,${meta.color}22 60%,transparent 100%)` }}/>

          {/* Header */}
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',padding:'18px 20px 0'}}>
            <div>
              <p style={{fontWeight:900,fontSize:17,letterSpacing:'-0.03em',marginBottom:4}}>{booking.court_name}</p>
              <div style={{display:'flex',alignItems:'center',gap:7}}>
                <span style={{
                  display:'inline-flex',alignItems:'center',gap:5,
                  fontSize:10,fontWeight:700,padding:'2px 9px',borderRadius:99,
                  background:meta.bg,color:meta.color,border:`1px solid ${meta.border}`,
                }}>
                  <span style={{width:5,height:5,borderRadius:'50%',background:meta.dot}}/>
                  {meta.label}
                </span>
              </div>
            </div>
            <button onClick={handleClose} style={{
              width:30,height:30,borderRadius:9,background:'rgba(255,255,255,0.05)',
              border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
              color:'rgba(255,255,255,0.40)',
            }}><X size={14}/></button>
          </div>

          {/* Summary card */}
          <div style={{margin:'16px 20px 0',borderRadius:13,overflow:'hidden',border:'1px solid rgba(255,255,255,0.07)'}}>
            {[
              { label:'Fecha',     val: dateStr },
              { label:'Hora',      val: booking.time ?? '–' },
              { label:'Duración',  val: `${booking.hours ?? 1} hora${(booking.hours??1)>1?'s':''}` },
              { label:'Jugadores', val: `${booking.players ?? 10} jugadores` },
              { label:'Total',     val: `₡${Math.round(booking.total_price ?? 0).toLocaleString('es-CR')}`, accent: true },
            ].map((r,i,arr)=>(
              <div key={r.label} style={{
                ...ROW,
                borderBottom: i<arr.length-1 ? '1px solid rgba(255,255,255,0.045)' : 'none',
                background: i%2===0 ? 'rgba(255,255,255,0.018)' : 'transparent',
              }}>
                <span style={{fontSize:11.5,color:'rgba(255,255,255,0.32)',fontWeight:500}}>{r.label}</span>
                <span style={{fontSize:13,fontWeight:800,color:(r as any).accent?'var(--accent)':'rgba(255,255,255,0.82)',letterSpacing:'-0.01em'}}>{r.val}</span>
              </div>
            ))}
          </div>

          {/* ── Edit panel ── */}
          {editMode && (
            <div style={{margin:'14px 20px 0',borderRadius:14,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(215,255,0,0.12)',padding:'16px 16px 14px'}}>
              <p style={{fontSize:12,fontWeight:800,color:'rgba(255,255,255,0.55)',letterSpacing:'0.04em',textTransform:'uppercase',margin:'0 0 12px'}}>Editar reserva</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                {/* Date */}
                <label style={{display:'flex',flexDirection:'column',gap:5}}>
                  <span style={{fontSize:10.5,color:'rgba(255,255,255,0.35)',fontWeight:600}}>Fecha</span>
                  <input type="date" value={editDate} onChange={e=>setEditDate(e.target.value)} style={{
                    background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',
                    borderRadius:9,padding:'9px 10px',color:'#fff',fontSize:13,fontWeight:600,
                    colorScheme:'dark',outline:'none',
                  }}/>
                </label>
                {/* Time */}
                <label style={{display:'flex',flexDirection:'column',gap:5}}>
                  <span style={{fontSize:10.5,color:'rgba(255,255,255,0.35)',fontWeight:600}}>Hora</span>
                  <input type="time" value={editTime} onChange={e=>setEditTime(e.target.value)} style={{
                    background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',
                    borderRadius:9,padding:'9px 10px',color:'#fff',fontSize:13,fontWeight:600,
                    colorScheme:'dark',outline:'none',
                  }}/>
                </label>
                {/* Hours */}
                <label style={{display:'flex',flexDirection:'column',gap:5}}>
                  <span style={{fontSize:10.5,color:'rgba(255,255,255,0.35)',fontWeight:600}}>Duración (h)</span>
                  <select value={editHours} onChange={e=>setEditHours(e.target.value)} style={{
                    background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',
                    borderRadius:9,padding:'9px 10px',color:'#fff',fontSize:13,fontWeight:600,
                    colorScheme:'dark',outline:'none',
                  }}>
                    {['1','1.5','2','2.5','3'].map(h=>(
                      <option key={h} value={h} style={{background:'#1a1a1a'}}>{h} hora{h==='1'?'':'s'}</option>
                    ))}
                  </select>
                </label>
                {/* Players */}
                <label style={{display:'flex',flexDirection:'column',gap:5}}>
                  <span style={{fontSize:10.5,color:'rgba(255,255,255,0.35)',fontWeight:600}}>Jugadores</span>
                  <select value={editPlayers} onChange={e=>setEditPlayers(e.target.value)} style={{
                    background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',
                    borderRadius:9,padding:'9px 10px',color:'#fff',fontSize:13,fontWeight:600,
                    colorScheme:'dark',outline:'none',
                  }}>
                    {[6,8,10,12,14,16,18,20,22].map(p=>(
                      <option key={p} value={p} style={{background:'#1a1a1a'}}>{p} jugadores</option>
                    ))}
                  </select>
                </label>
              </div>
              {editError && <p style={{color:'#FF6B6B',fontSize:11.5,marginTop:10,marginBottom:0}}>{editError}</p>}
              {/* Warn user that changing date/time resets to pending */}
              {(editDate !== (booking.date ?? '') || editTime !== (booking.time ?? '')) && !editDone && (
                <div style={{
                  marginTop:10,padding:'7px 10px',borderRadius:8,
                  background:'rgba(250,204,21,0.07)',border:'1px solid rgba(250,204,21,0.18)',
                  display:'flex',alignItems:'center',gap:7,
                }}>
                  <span style={{fontSize:13}}>⏳</span>
                  <p style={{fontSize:11,color:'rgba(250,204,21,0.80)',margin:0,lineHeight:1.4}}>
                    Cambiar fecha u hora pondrá la reserva en <strong>Pendiente</strong> hasta que el dueño de la cancha confirme el nuevo horario.
                  </p>
                </div>
              )}
              <div style={{display:'flex',gap:8,marginTop:12}}>
                <button onClick={()=>{setEditMode(false);setEditError('');}} style={{
                  flex:1,padding:'10px',borderRadius:10,cursor:'pointer',
                  background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',
                  color:'rgba(255,255,255,0.45)',fontSize:12.5,fontWeight:600,
                }}>Cancelar</button>
                <button onClick={handleSaveEdit} disabled={editSaving||editDone} style={{
                  flex:2,padding:'10px',borderRadius:10,cursor:editSaving||editDone?'default':'pointer',
                  background: editDone ? 'rgba(74,222,128,0.15)' : 'rgba(215,255,0,0.12)',
                  border: `1px solid ${editDone ? 'rgba(74,222,128,0.30)' : 'rgba(215,255,0,0.22)'}`,
                  color: editDone ? '#4ADE80' : '#D7FF00',
                  fontSize:12.5,fontWeight:700,
                  display:'flex',alignItems:'center',justifyContent:'center',gap:6,
                }}>
                  {editDone
                    ? <><Check size={13}/>¡Guardado!</>
                    : editSaving
                    ? <><Loader2 size={13} style={{animation:'spin 0.7s linear infinite'}}/>Guardando…</>
                    : 'Guardar cambios'}
                </button>
              </div>
            </div>
          )}

          {/* Action tiles */}
          {canAct && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,padding:'16px 20px 0'}}>

              {/* Edit */}
              <button className="bk-action" onClick={()=> setEditMode(true)} style={{
                padding:'14px 8px',borderRadius:13,cursor:'pointer',border:'none',
                background:'rgba(255,255,255,0.04)',
                display:'flex',flexDirection:'column',alignItems:'center',gap:7,
              }}>
                <div style={{width:34,height:34,borderRadius:10,background:'rgba(215,255,0,0.09)',border:'1px solid rgba(215,255,0,0.16)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Edit2 size={14} color="var(--accent)"/>
                </div>
                <span style={{fontSize:10.5,fontWeight:700,color:'rgba(255,255,255,0.55)',letterSpacing:'-0.01em'}}>Editar</span>
              </button>

              {/* Invite */}
              <button className="bk-action" onClick={handleInvite} style={{
                padding:'14px 8px',borderRadius:13,cursor:'pointer',border:'none',
                background:'rgba(255,255,255,0.04)',
                display:'flex',flexDirection:'column',alignItems:'center',gap:7,
              }}>
                <div style={{width:34,height:34,borderRadius:10,background:'rgba(96,165,250,0.09)',border:'1px solid rgba(96,165,250,0.18)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {copied
                    ? <Check size={14} color="#60A5FA"/>
                    : <Share2 size={14} color="#60A5FA"/>
                  }
                </div>
                <span style={{fontSize:10.5,fontWeight:700,color:'rgba(255,255,255,0.55)',letterSpacing:'-0.01em'}}>
                  {copied ? '¡Copiado!' : 'Invitar'}
                </span>
              </button>

              {/* Crear reto */}
              <button className="bk-action"
                onClick={retoDone ? undefined : handleCreateReto}
                disabled={retoSaving || retoDone}
                style={{
                  padding:'14px 8px',borderRadius:13,cursor:retoDone?'default':'pointer',border:'none',
                  background: retoDone ? 'rgba(74,222,128,0.06)' : 'rgba(255,255,255,0.04)',
                  display:'flex',flexDirection:'column',alignItems:'center',gap:7,
                  outline: retoDone ? '1px solid rgba(74,222,128,0.20)' : 'none',
                }}>
                <div style={{
                  width:34,height:34,borderRadius:10,
                  background: retoDone ? 'rgba(74,222,128,0.16)' : 'rgba(74,222,128,0.09)',
                  border:`1px solid ${retoDone ? 'rgba(74,222,128,0.35)' : 'rgba(74,222,128,0.18)'}`,
                  display:'flex',alignItems:'center',justifyContent:'center',
                }}>
                  {retoSaving
                    ? <Loader2 size={14} color="#4ADE80" style={{animation:'spin 0.7s linear infinite'}}/>
                    : retoDone
                    ? <Check size={14} color="#4ADE80"/>
                    : <Zap size={14} color="#4ADE80"/>
                  }
                </div>
                <span style={{fontSize:10.5,fontWeight:700,color: retoDone ? '#4ADE80' : 'rgba(255,255,255,0.55)',letterSpacing:'-0.01em',textAlign:'center',lineHeight:1.3}}>
                  {retoDone ? '¡Publicado!' : retoSaving ? 'Publicando…' : 'Crear reto'}
                </span>
              </button>

            </div>
          )}

          {/* Reto published banner */}
          {retoDone && (
            <div style={{
              margin:'12px 20px 0',padding:'11px 14px',borderRadius:12,
              background:'rgba(74,222,128,0.06)',border:'1px solid rgba(74,222,128,0.18)',
              display:'flex',alignItems:'center',gap:9,
            }}>
              <Check size={13} color="#4ADE80" style={{flexShrink:0}}/>
              <div>
                <p style={{fontSize:12,fontWeight:700,color:'#4ADE80',marginBottom:2}}>¡Reto publicado!</p>
                <p style={{fontSize:10.5,color:'rgba(255,255,255,0.35)',lineHeight:1.4}}>
                  Ya aparece en el inicio. Los equipos pueden aceptarlo ahora.
                </p>
              </div>
              <Link href="/" onClick={handleClose} style={{
                marginLeft:'auto',flexShrink:0,fontSize:10.5,fontWeight:700,
                color:'#4ADE80',textDecoration:'none',display:'flex',alignItems:'center',gap:3,
              }}>Ver <ExternalLink size={10}/></Link>
            </div>
          )}
          {retoError && (
            <div style={{margin:'10px 20px 0',padding:'9px 13px',borderRadius:10,fontSize:11.5,background:'rgba(255,59,59,0.07)',color:'#FF6B6B',border:'1px solid rgba(255,59,59,0.13)'}}>
              {retoError}
            </div>
          )}
          {/* Invite hint text */}
          {canAct && !retoDone && (
            <p style={{fontSize:10,color:'rgba(255,255,255,0.20)',textAlign:'center',padding:'10px 20px 0',lineHeight:1.5}}>
              Compartí los detalles con tus compañeros o publicá un reto abierto para buscar rival.
            </p>
          )}

          {/* Cancel + Close */}
          <div style={{display:'flex',gap:8,padding:'14px 20px 20px'}}>
            {canAct && booking.status !== 'cancelled' && (
              <button
                className="bk-cancel"
                onClick={handleCancel}
                disabled={canceling}
                style={{
                  flex:1,padding:'11px',borderRadius:12,cursor:'pointer',
                  background:'rgba(255,107,107,0.05)',
                  border:'1px solid rgba(255,107,107,0.12)',
                  color:'rgba(255,107,107,0.55)',fontSize:12,fontWeight:600,
                  transition:'color 0.14s',
                  display:'flex',alignItems:'center',justifyContent:'center',gap:5,
                }}>
                {cancelDone ? <><Check size={12}/>Cancelada</> : canceling ? <><Loader2 size={12} style={{animation:'spin 0.7s linear infinite'}}/>Cancelando…</> : 'Cancelar reserva'}
              </button>
            )}
            <button onClick={handleClose} style={{
              flex:2,padding:'11px',borderRadius:12,cursor:'pointer',
              background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',
              color:'rgba(255,255,255,0.45)',fontSize:12,fontWeight:600,
            }}>Cerrar</button>
          </div>

        </div>
      </div>
    </>
  );
}

/* ─── InvitePlayersModal ─────────────────────────────────── */

function InvitePlayersModal({
  teamName,
  teamColor,
  onClose,
}: {
  teamName: string;
  teamColor: string;
  onClose: () => void;
}) {
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [invited,  setInvited]  = useState<Set<string>>(new Set());
  const [visible,  setVisible]  = useState(false);

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);
  const handleClose = () => { setVisible(false); setTimeout(onClose, 220); };

  // Debounced search — calls server-side API to bypass RLS
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res  = await fetch(`/api/search-players?q=${encodeURIComponent(query.trim())}`);
        const data = res.ok ? await res.json() : [];
        setResults(Array.isArray(data) ? data : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 320);
    return () => clearTimeout(t);
  }, [query]);

  const handleInvite = async (player: any) => {
    // Share / copy invite link for this player
    const link = `https://www.tucanchacr.com/juegos`;
    const text = `¡Hola ${player.name?.split(' ')[0] ?? ''}! Te invito a unirte a ${teamName} en Tu Cancha CR 🏆 ${link}`;
    if (navigator.share) {
      try { await navigator.share({ title: `Unirse a ${teamName}`, text, url: link }); } catch {}
    } else {
      await navigator.clipboard.writeText(text).catch(() => {});
    }
    setInvited(prev => new Set([...prev, player.id]));
  };

  const initials = (name: string) =>
    name ? name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : '?';

  const level = (p: any) => {
    const avg = ((p.stat_atk ?? 0) + (p.stat_def ?? 0) + (p.stat_str ?? 0) + (p.stat_skl ?? 0)) / 4;
    return avg >= 80 ? 'Élite' : avg >= 60 ? 'Semi-Pro' : avg >= 40 ? 'Intermedio' : 'Amateur';
  };

  return (
    <>
      <style>{`
        @keyframes invite-in { from{opacity:0;transform:translateY(14px) scale(0.97);}to{opacity:1;transform:translateY(0) scale(1);} }
      `}</style>

      {/* Backdrop */}
      <div onClick={handleClose} style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.80)', backdropFilter:'blur(14px)', opacity:visible?1:0, transition:'opacity 0.22s' }}/>

      {/* Panel */}
      <div style={{ position:'fixed', top:'50%', left:'50%', zIndex:201, transform:'translate(-50%,-50%)', width:'min(460px,calc(100vw - 24px))', maxHeight:'calc(100svh - 48px)', display:'flex', flexDirection:'column' }}>
        <div style={{
          animation:'invite-in 0.24s cubic-bezier(0.34,1.2,0.64,1) both',
          borderRadius:22, overflow:'hidden',
          background:'linear-gradient(165deg,#1a1a1a,#111)',
          border:`1px solid ${teamColor}20`,
          boxShadow:`0 0 60px ${teamColor}08, 0 40px 100px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.06)`,
          display:'flex', flexDirection:'column', maxHeight:'calc(100svh - 48px)',
        }}>
          {/* Top bar */}
          <div style={{ height:3, background:`linear-gradient(90deg,${teamColor}cc,${teamColor}22,transparent)`, flexShrink:0 }}/>

          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 20px 0', flexShrink:0 }}>
            <div>
              <p style={{ fontSize:16, fontWeight:900, letterSpacing:'-0.03em', marginBottom:2 }}>Invitar jugadores</p>
              <p style={{ fontSize:11, color:'rgba(255,255,255,0.35)' }}>Buscá jugadores registrados para unirse a <span style={{ color:teamColor, fontWeight:700 }}>{teamName}</span></p>
            </div>
            <button onClick={handleClose} style={{ width:30, height:30, borderRadius:9, background:'rgba(255,255,255,0.05)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.40)' }}>
              <X size={14}/>
            </button>
          </div>

          {/* Search input */}
          <div style={{ padding:'14px 20px 0', flexShrink:0 }}>
            <div style={{
              display:'flex', alignItems:'center', gap:10,
              background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)',
              borderRadius:12, padding:'10px 14px',
              transition:'border-color 0.18s',
            }}>
              <Search size={14} color="rgba(255,255,255,0.30)" style={{ flexShrink:0 }}/>
              <input
                autoFocus
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar por nombre..."
                style={{
                  flex:1, background:'none', border:'none', outline:'none',
                  color:'#fff', fontSize:13, fontFamily:'inherit',
                  caretColor: teamColor,
                }}
              />
              {loading && <Loader2 size={13} color="rgba(255,255,255,0.30)" style={{ animation:'spin 0.7s linear infinite', flexShrink:0 }}/>}
            </div>
          </div>

          {/* Results */}
          <div style={{ overflowY:'auto', padding:'10px 20px 20px', flex:1 }}>
            {!query.trim() && (
              <div style={{ textAlign:'center', padding:'32px 0', color:'rgba(255,255,255,0.22)', fontSize:12 }}>
                Escribí el nombre de un jugador
              </div>
            )}
            {query.trim() && !loading && results.length === 0 && (
              <div style={{ textAlign:'center', padding:'32px 0', color:'rgba(255,255,255,0.22)', fontSize:12 }}>
                Sin resultados para "{query}"
              </div>
            )}
            {results.map(player => {
              const isInvited = invited.has(player.id);
              const lvl = level(player);
              const lvlColor = lvl === 'Élite' ? '#D7FF00' : lvl === 'Semi-Pro' ? '#60A5FA' : lvl === 'Intermedio' ? '#F97316' : 'rgba(255,255,255,0.40)';
              const statusMeta: Record<string, { label: string; color: string; pulse?: boolean }> = {
                online:     { label: 'En línea',          color: '#4ADE80' },
                searching:  { label: 'Buscando partido',  color: '#D7FF00', pulse: true },
                available:  { label: 'Disponible',        color: '#60A5FA' },
                playing:    { label: 'Jugando ahora',     color: '#F97316' },
                offline:    { label: 'Fuera de línea',    color: 'rgba(255,255,255,0.20)' },
              };
              const st = statusMeta[player.player_status ?? 'offline'] ?? statusMeta.offline;
              const hasStatus = player.player_status && player.player_status !== 'offline';
              return (
                <div key={player.id} style={{
                  display:'flex', alignItems:'center', gap:12,
                  padding:'11px 12px', borderRadius:12, marginBottom:6,
                  background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.06)',
                  transition:'background 0.14s',
                }}>
                  {/* Avatar with status ring */}
                  <div style={{ position:'relative', flexShrink:0 }}>
                    <div style={{
                      width:38, height:38, borderRadius:11,
                      background:`linear-gradient(145deg,${teamColor}1a,${teamColor}08)`,
                      border:`1.5px solid ${teamColor}28`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:12, fontWeight:900, color:teamColor,
                    }}>
                      {initials(player.name ?? '')}
                    </div>
                    {/* Status dot */}
                    {hasStatus && (
                      <div style={{
                        position:'absolute', bottom:-1, right:-1,
                        width:10, height:10, borderRadius:'50%',
                        background: st.color,
                        border:'1.5px solid rgba(18,18,18,0.95)',
                        boxShadow:`0 0 6px ${st.color}80`,
                        animation: st.pulse ? 'liveDot 1.6s ease-in-out infinite' : 'none',
                      }}/>
                    )}
                  </div>
                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                      <p style={{ fontSize:13, fontWeight:700, letterSpacing:'-0.02em', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {player.name ?? 'Sin nombre'}
                      </p>
                      {hasStatus && (
                        <span style={{ fontSize:9, color:st.color, fontWeight:600, letterSpacing:'-0.01em', whiteSpace:'nowrap' }}>
                          · {st.label}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize:9, fontWeight:700, padding:'1px 7px', borderRadius:4, background:`${lvlColor}15`, color:lvlColor, border:`1px solid ${lvlColor}25`, letterSpacing:'0.04em' }}>
                      {lvl}
                    </span>
                  </div>
                  {/* Invite button */}
                  <button
                    onClick={() => handleInvite(player)}
                    disabled={isInvited}
                    style={{
                      flexShrink:0, padding:'7px 14px', borderRadius:9,
                      fontSize:11, fontWeight:700, letterSpacing:'-0.01em',
                      cursor: isInvited ? 'default' : 'pointer',
                      background: isInvited ? 'rgba(74,222,128,0.12)' : `${teamColor}14`,
                      border: isInvited ? '1px solid rgba(74,222,128,0.25)' : `1px solid ${teamColor}28`,
                      color: isInvited ? '#4ADE80' : teamColor,
                      transition:'all 0.15s',
                      display:'flex', alignItems:'center', gap:5,
                    }}>
                    {isInvited ? <><Check size={11}/>Enviado</> : 'Invitar'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── PerfilPage ─────────────────────────────────────────── */

export default function PerfilPage() {
  const router = useRouter();
  const [profile,  setProfile]  = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [retos,    setRetos]    = useState<any[]>([]);
  const [cancelingReto, setCancelingReto] = useState<string | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [ready,    setReady]    = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [teamOpen,    setTeamOpen]    = useState(false);
  const [teamCopied,  setTeamCopied]  = useState(false);
  const [inviteOpen,  setInviteOpen]  = useState(false);

  const [hoveredStat,    setHoveredStat]    = useState<string | null>(null);
  const [hoveredBooking, setHoveredBooking] = useState<string | null>(null);
  const [detailBooking,  setDetailBooking]  = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.push('/auth'); return; }
      const [{ data: p }, { data: b }, { data: r }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
        supabase.from('bookings').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('retos').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(10),
      ]);
      setProfile(p ?? { name: session.user.email, team: '' });
      setBookings(b ?? []);
      setRetos(r ?? []);
      setLoading(false);
      requestAnimationFrame(() => setTimeout(() => setReady(true), 40));
    })();
  }, [router]);

  /* ── Cancel a reto the player created ── */
  const handleCancelReto = async (reto: any) => {
    if (cancelingReto) return;
    setCancelingReto(reto.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) throw new Error('Sesión expirada.');
      // Scope to user_id — players can only cancel retos they created
      const { data, error } = await supabase
        .from('retos')
        .update({ status: 'cancelled' })
        .eq('id', reto.id)
        .eq('user_id', uid)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('No se pudo cancelar el reto.');
      // Reflect the cancellation in local state
      setRetos(prev => prev.map(x => x.id === reto.id ? { ...x, status: 'cancelled' } : x));
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert((e as Error).message ?? 'No se pudo cancelar el reto.');
    } finally {
      setCancelingReto(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100svh' }}>
      <div style={{
        width: 26, height: 26, borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.07)',
        borderTopColor: 'var(--accent)',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const avatarUrl  = profile?.avatar_url ?? null;
  const initials   = profile?.name
    ? profile.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';
  const level = bookings.length >= 10 ? 'Pro' : bookings.length >= 5 ? 'Semi-Pro' : 'Jugador';

  return (
    <div style={{
      minHeight: '100svh', paddingTop: 64, background: 'var(--bg)',
      backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(215,255,0,0.03) 0%, transparent 60%)',
      opacity: ready ? 1 : 0, transition: 'opacity 0.4s ease',
    }}>

      <style>{`
        @keyframes spin       { to { transform: rotate(360deg); } }
        @keyframes ring-pulse { 0%,100% { opacity:.55; transform:scale(1); } 50% { opacity:.2; transform:scale(1.14); } }
        @keyframes fade-up    { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }

        .profile-grid { grid-template-columns: 252px 1fr; gap: 18px; }
        @media (max-width: 820px) {
          .profile-grid { grid-template-columns: 1fr !important; gap: 14px !important; }
          .profile-header-inner { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; }
          .profile-actions { align-self: flex-start; }
        }
        @media (max-width: 560px) {
          .profile-header-band { padding: 28px 0 24px !important; }
          .container { padding: 0 20px !important; }
          .profile-main { padding: 20px 20px 48px !important; }
        }
        .stat-row { transition: background 0.15s, border-color 0.15s, transform 0.15s; }
        .stat-row:hover { background: rgba(255,255,255,0.035) !important; border-color: rgba(255,255,255,0.1) !important; transform: translateX(2px); }
        .booking-row { transition: background 0.15s, border-color 0.15s, box-shadow 0.18s, transform 0.15s; }
        .booking-row:hover { border-color: rgba(215,255,0,0.18) !important; transform: translateY(-2px) !important; box-shadow: 0 10px 36px rgba(0,0,0,0.5) !important; background: linear-gradient(145deg,#1c1c1c,#151515) !important; }
        .card-fade { animation: fade-up 0.45s ease both; }
        .btn-edit:hover  { border-color: rgba(215,255,0,0.3) !important; color: var(--text) !important; background: rgba(215,255,0,0.05) !important; }
        .btn-logout:hover { color: rgba(255,255,255,0.55) !important; }
        .section-label { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; color: rgba(255,255,255,0.32); text-transform: uppercase; }
      `}</style>

      {/* ── Edit modal ── */}
      {editOpen && (
        <EditModal
          profile={profile}
          onClose={() => setEditOpen(false)}
          onSave={updated => setProfile(updated)}
        />
      )}

      {/* ── Booking detail modal ── */}
      {detailBooking && (
        <BookingDetailModal
          booking={detailBooking}
          teamName={profile?.team ?? ''}
          onClose={() => setDetailBooking(null)}
        />
      )}

      {/* ── Create / edit team modal ── */}
      {teamOpen && (
        <CreateTeamModal
          profile={profile}
          onClose={() => setTeamOpen(false)}
          onSave={({ name, format, level, color }) =>
            setProfile((p: any) => ({ ...p, team: name, team_format: format, team_level: level, team_color: color }))
          }
        />
      )}

      {/* ── Invite players modal ── */}
      {inviteOpen && (
        <InvitePlayersModal
          teamName={profile?.team ?? ''}
          teamColor={profile?.team_color ?? '#D7FF00'}
          onClose={() => setInviteOpen(false)}
        />
      )}

      {/* ── Account strip — utility layer, intentionally quiet ── */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        padding: '10px 0 11px',
        background: 'rgba(0,0,0,0.18)',
      }}>
        <div className="container" style={{ padding: '0 40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>

            {/* Left: compact identity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              {/* Small avatar */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10, overflow: 'hidden',
                  border: '1.5px solid rgba(215,255,0,0.20)',
                  background: 'linear-gradient(145deg, rgba(215,255,0,0.10), rgba(215,255,0,0.03))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 900, color: 'var(--accent)',
                }}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : initials}
                </div>
                <div style={{
                  position: 'absolute', bottom: -1, right: -1,
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#4ADE80', border: '2px solid #0a0a0a',
                  boxShadow: '0 0 5px rgba(74,222,128,0.65)',
                }} />
              </div>

              {/* Name + context */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.10em', color: 'rgba(255,255,255,0.24)', textTransform: 'uppercase' }}>
                    Capitán
                  </span>
                  <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'inline-block' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.70)', letterSpacing: '-0.025em' }}>
                    {profile?.name ?? 'Usuario'}
                  </span>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: 'rgba(215,255,0,0.07)', color: 'rgba(215,255,0,0.60)', border: '1px solid rgba(215,255,0,0.12)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    {level}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.22)', letterSpacing: '-0.01em' }}>
                    Costa Rica
                  </span>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 4px rgba(74,222,128,0.65)' }} />
                  <span style={{ fontSize: 9.5, color: 'rgba(74,222,128,0.75)', fontWeight: 600 }}>En línea</span>
                </div>
              </div>
            </div>

            {/* Right: utility actions — minimal */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => setEditOpen(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 11px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                  background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.42)',
                  border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer',
                  transition: 'all 0.16s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.75)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.42)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}
              >
                <Edit2 size={10} /> Editar perfil
              </button>
              <button onClick={handleLogout} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '5px 11px', borderRadius: 8, fontSize: 11, fontWeight: 500,
                background: 'none', color: 'rgba(255,255,255,0.22)',
                border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer',
                transition: 'color 0.16s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.50)'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.22)'}>
                <LogOut size={10} /> Salir
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* ── Club Identity Banner — the real page identity ── */}
      <div className="container club-banner-container" style={{ padding: '16px 40px 0', marginBottom: 0 }}>
        {(() => {
          const teamColor  = profile?.team_color ?? '#D7FF00';
          const teamInitials = profile?.team
            ? profile.team.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()
            : '??';
          const division: string = 'Bronce'; // TODO: wire to DB
          const divColor = division === 'Élite' ? '#D7FF00'
                         : division === 'Oro'   ? '#FFD700'
                         : division === 'Plata' ? '#C0C0C0'
                         :                        '#CD7F32';
          const played = bookings.filter((b: any) => b.status === 'confirmed').length;
          // Form: all dashes until real match data exists
          const form: string[] = Array(5).fill('–');

          /* ── No team ── */
          if (!profile?.team) return (
            <div className="card-fade" style={{
              borderRadius: 20, overflow: 'hidden', position: 'relative',
              background: 'linear-gradient(160deg,#141414,#0f0f0f)',
              border: '1px solid rgba(215,255,0,0.08)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.35)',
              marginBottom: 16,
            }}>
              <div style={{ position:'absolute',inset:0,opacity:0.016, backgroundImage:'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize:'22px 22px', pointerEvents:'none' }}/>
              <div style={{ position:'relative', display:'flex', alignItems:'center', gap:24, padding:'28px 28px' }}>
                <div style={{ width:72, height:72, borderRadius:18, flexShrink:0, background:'rgba(215,255,0,0.05)', border:'1.5px dashed rgba(215,255,0,0.20)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Users size={28} color="rgba(215,255,0,0.35)"/>
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:18, fontWeight:900, letterSpacing:'-0.04em', marginBottom:5 }}>Sin club todavía</p>
                  <p style={{ fontSize:12, color:'rgba(255,255,255,0.38)', lineHeight:1.6 }}>
                    Cada leyenda empezó en algún lugar. Creá tu club y construí tu reputación en Costa Rica.
                  </p>
                </div>
                <button onClick={() => setTeamOpen(true)} style={{
                  flexShrink:0, display:'inline-flex', alignItems:'center', gap:7,
                  padding:'13px 24px', borderRadius:13, cursor:'pointer', border:'none',
                  background:'linear-gradient(135deg,#e8ff3a,#D7FF00,#c8ef00)', color:'#000',
                  fontSize:13, fontWeight:800, letterSpacing:'-0.02em',
                  boxShadow:'0 0 28px rgba(215,255,0,0.20)',
                }}>
                  <Plus size={14}/> Crear mi club
                </button>
              </div>
            </div>
          );

          /* ── Team exists: single cinematic scene ── */
          const FormBox = ({ r }: { r: string }) => {
            const isResult = r === 'V' || r === 'E' || r === 'D';
            return (
              <div style={{
                width:20, height:20, borderRadius:5,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:8, fontWeight:900,
                background: r==='V' ? 'rgba(74,222,128,0.12)' : r==='E' ? 'rgba(250,204,21,0.09)' : r==='D' ? 'rgba(255,107,107,0.10)' : 'rgba(255,255,255,0.025)',
                border:     r==='V' ? '1px solid rgba(74,222,128,0.18)' : r==='E' ? '1px solid rgba(250,204,21,0.13)' : r==='D' ? '1px solid rgba(255,107,107,0.15)' : '1px dashed rgba(255,255,255,0.06)',
                color:      r==='V' ? '#4ADE80' : r==='E' ? '#FACC15' : r==='D' ? '#FF6B6B' : 'rgba(255,255,255,0.10)',
                flexShrink: 0,
              }}>{isResult ? r : '–'}</div>
            );
          };

          return (
            <div className="card-fade" style={{
              borderRadius: 20, overflow:'hidden', position:'relative',
              background: `linear-gradient(150deg, #191919 0%, #131313 50%, #0f0f0f 100%)`,
              border: `1px solid ${teamColor}22`,
              boxShadow: `0 0 120px ${teamColor}07, inset 0 1px 0 rgba(255,255,255,0.06), 0 16px 60px rgba(0,0,0,0.55)`,
              marginBottom: 16,
            }}>
              <style>{`
                @keyframes cGlow      { 0%,100%{box-shadow:0 0 0 0 ${teamColor}00,0 0 18px ${teamColor}14;} 50%{box-shadow:0 0 0 10px ${teamColor}04,0 0 38px ${teamColor}22;} }
                @keyframes liveDot    { 0%,100%{transform:scale(1);opacity:1;} 50%{transform:scale(1.7);opacity:0.38;} }
                @keyframes rivalPulse { 0%,100%{box-shadow:0 0 0 0 ${teamColor}00,inset 0 1px 0 rgba(255,255,255,0.05);} 50%{box-shadow:0 0 28px 2px ${teamColor}14,inset 0 1px 0 rgba(255,255,255,0.09);} }
                @keyframes ctaSweep   { 0%,82%,100%{transform:translateX(-120%) skewX(-14deg);opacity:0;} 85%{opacity:0.9;} 96%{transform:translateX(660%) skewX(-14deg);opacity:0;} }
                @keyframes fillShimmer{ 0%{transform:translateX(-100%)} 100%{transform:translateX(400%)} }
                @keyframes edgeBreathe{ 0%,100%{border-color:${teamColor}28;} 50%{border-color:${teamColor}48;} }
                @keyframes commsBlink { 0%,100%{opacity:0.75;} 50%{opacity:0.35;} }
                @keyframes repGlow    { 0%,100%{text-shadow:0 0 6px ${divColor}50;} 50%{text-shadow:0 0 14px ${divColor}90,0 0 24px ${divColor}40;} }
                @keyframes repEdge    { 0%,100%{box-shadow:0 0 4px 1px ${divColor}60,0 0 8px 0 ${divColor}30;} 50%{box-shadow:0 0 8px 2px ${divColor}90,0 0 16px 0 ${divColor}50;} }
                @keyframes slotPulse  { 0%,100%{opacity:0.55;} 50%{opacity:0.28;} }
                .squad-avatar:hover   { transform:scale(1.12) !important; filter:brightness(1.18) !important; }
                .action-cell          { transition: background 0.20s ease, transform 0.20s cubic-bezier(0.34,1.1,0.64,1), box-shadow 0.20s ease !important; }
                .action-cell:hover    { transform: translateY(-1px) !important; }
                .action-cell-primary:hover { background:rgba(215,255,0,0.07) !important; box-shadow:0 4px 18px rgba(215,255,0,0.10) !important; }
                .action-cell-secondary:hover { background:rgba(255,255,255,0.05) !important; }
              `}</style>

              {/* ── Atmosphere layer ── */}
              {/* Color bleed from crest corner */}
              <div style={{ position:'absolute', top:-20, left:-20, width:320, height:240, background:`radial-gradient(ellipse at 15% 15%,${teamColor}0e 0%,transparent 60%)`, pointerEvents:'none' }}/>
              {/* Subtle right-side fade */}
              <div style={{ position:'absolute', top:0, right:0, width:280, height:'100%', background:`radial-gradient(ellipse at 80% 50%,${teamColor}05 0%,transparent 70%)`, pointerEvents:'none' }}/>
              {/* Giant centered watermark */}
              <div style={{
                position:'absolute', left:'50%', top:'50%',
                transform:'translate(-50%,-54%)',
                fontSize:220, fontWeight:900, letterSpacing:'-0.06em', lineHeight:1,
                color:teamColor, opacity:0.007,
                filter:'blur(3.5px)',
                pointerEvents:'none', userSelect:'none',
              }}>{teamInitials}</div>
              {/* Floodlight diagonal */}
              <div style={{ position:'absolute', top:0, left:'22%', width:200, height:'100%', background:`linear-gradient(108deg,transparent 0%,${teamColor}03 46%,rgba(255,255,255,0.018) 52%,transparent 100%)`, pointerEvents:'none' }}/>

              {/* ── Top bar ── */}
              <div style={{ height:3, background:`linear-gradient(90deg,${teamColor}ee 0%,${teamColor}55 35%,transparent 75%)` }}/>

              {/* ── Main scene ── */}
              <div style={{ position:'relative', padding:'26px 28px 0 28px', display:'flex', alignItems:'flex-start', gap:22 }}>

                {/* Crest */}
                <div style={{
                  width:84, height:84, borderRadius:20, flexShrink:0,
                  background:`linear-gradient(145deg,${teamColor}1c,${teamColor}07)`,
                  border:`2px solid ${teamColor}28`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:26, fontWeight:900, color:teamColor, letterSpacing:'-0.03em',
                  animation:'cGlow 4.5s ease-in-out infinite', position:'relative',
                }}>
                  {teamInitials}
                  <span style={{ position:'absolute', bottom:4, right:4, width:10, height:10, borderRadius:'50%', background:'#4ADE80', border:'2px solid #121212', boxShadow:'0 0 8px rgba(74,222,128,0.8)' }}/>
                </div>

                {/* Identity block */}
                <div style={{ flex:1, minWidth:0, paddingTop:2 }}>

                  {/* Ownership label — the key psychological anchor */}
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
                    <span style={{ fontSize:8.5, fontWeight:800, letterSpacing:'0.22em', color:'rgba(255,255,255,0.38)', textTransform:'uppercase' }}>Mi Equipo</span>
                    <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.05)' }}/>
                    {/* Division badge inline */}
                    <span style={{ fontSize:8, fontWeight:800, padding:'2px 7px', borderRadius:4, background:`${divColor}14`, color:divColor, border:`1px solid ${divColor}28`, letterSpacing:'0.06em', textTransform:'uppercase' }}>{division}</span>
                    {profile.team_format && <span style={{ fontSize:8, fontWeight:800, padding:'2px 7px', borderRadius:4, background:`${teamColor}11`, color:teamColor, border:`1px solid ${teamColor}22`, letterSpacing:'0.04em' }}>{profile.team_format}</span>}
                  </div>

                  {/* Club name — primary identity statement */}
                  <h2 style={{ fontWeight:900, fontSize:28, letterSpacing:'-0.055em', lineHeight:0.95, margin:'0 0 5px', color:'#fff' }}>{profile.team}</h2>

                  {/* Subtitle */}
                  <p style={{ fontSize:10.5, color:'rgba(255,255,255,0.24)', margin:'0 0 18px', letterSpacing:'-0.01em', fontStyle: played > 0 ? 'normal' : 'italic' }}>
                    {played > 0 ? 'Costa Rica · Club activo' : 'Costa Rica · Primera partida pendiente'}
                  </p>

                  {/* ── Squad strip — layered overlap ── */}
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    {/* Captain avatar — overlapping stack start */}
                    <div style={{ display:'flex', alignItems:'center' }}>
                      {/* Captain */}
                      <div className="squad-avatar" style={{
                        position:'relative', flexShrink:0, zIndex:5,
                        width:34, height:34, borderRadius:99,
                        background:`linear-gradient(145deg,${teamColor}28,${teamColor}0e)`,
                        border:`2px solid ${teamColor}48`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:10, fontWeight:900, color:teamColor, letterSpacing:'-0.02em',
                        boxShadow:`0 0 6px ${teamColor}14`,
                        cursor:'pointer', transition:'transform 0.16s ease, filter 0.16s ease',
                      }}>
                        {profile?.name ? profile.name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase() : 'TU'}
                        {/* Captain marker */}
                        <div style={{ position:'absolute', top:-3, right:-3, width:11, height:11, borderRadius:'50%', background:'#111', display:'flex', alignItems:'center', justifyContent:'center', fontSize:6, border:`1px solid ${teamColor}38` }}>⭐</div>
                        {/* Online dot — animated */}
                        <div style={{ position:'absolute', bottom:1, right:1, width:7, height:7, borderRadius:'50%', background:'#4ADE80', border:'2px solid #131313', boxShadow:'0 0 6px rgba(74,222,128,0.75)', animation:'liveDot 2.2s ease-in-out infinite' }}/>
                      </div>
                      {/* Empty slots — ghost prestige look */}
                      {[...Array(4)].map((_,i) => (
                        <div key={i} style={{
                          width:26, height:26, borderRadius:99, flexShrink:0,
                          border:'1px solid rgba(255,255,255,0.055)',
                          background:'rgba(255,255,255,0.012)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          marginLeft:-9, zIndex:4-i,
                          animation:`slotPulse ${3.5 + i * 0.4}s ease-in-out infinite`,
                          animationDelay:`${i * 0.25}s`,
                        }}>
                          <Plus size={6} color="rgba(255,255,255,0.09)" />
                        </div>
                      ))}
                    </div>

                    {/* Label — stacked */}
                    <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
                      <div>
                        <span style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.48)' }}>1</span>
                        <span style={{ fontSize:9.5, color:'rgba(255,255,255,0.20)' }}> / 10 jugadores</span>
                      </div>
                      <span style={{ fontSize:8.5, color:'rgba(255,255,255,0.15)', letterSpacing:'-0.01em' }}>Capitán: {profile?.name?.split(' ')[0] ?? 'Tú'}</span>
                    </div>
                  </div>
                </div>

                {/* Edit button — top right, unobtrusive */}
                <button onClick={() => setTeamOpen(true)} style={{
                  width:28, height:28, borderRadius:8, flexShrink:0,
                  background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)',
                  cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                  color:'rgba(255,255,255,0.25)', transition:'all 0.15s',
                }}
                onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(215,255,0,0.09)';(e.currentTarget as HTMLButtonElement).style.color='#D7FF00';}}
                onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,0.04)';(e.currentTarget as HTMLButtonElement).style.color='rgba(255,255,255,0.25)';}}>
                  <Edit2 size={11}/>
                </button>
              </div>

              {/* ── Stats + form strip ── */}
              <div style={{ position:'relative', padding:'22px 28px 16px', display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' }}>
                {/* Broadcast stats — only when played */}
                {played > 0 && (
                  <>
                    {[
                      { label:'PJ', val:played, color:'rgba(255,255,255,0.58)' },
                      { label:'V',  val:0,       color:'#4ADE80' },
                      { label:'E',  val:0,       color:'#FACC15' },
                      { label:'D',  val:0,       color:'#FF6B6B' },
                    ].map((s,i) => (
                      <div key={s.label} style={{ display:'flex', alignItems:'baseline', gap:3 }}>
                        {i > 0 && <span style={{ fontSize:10, color:'rgba(255,255,255,0.08)', marginRight:8 }}>·</span>}
                        <span style={{ fontSize:26, fontWeight:900, color:s.color, letterSpacing:'-0.04em', lineHeight:1 }}>{s.val}</span>
                        <span style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.24)', letterSpacing:'0.04em', marginLeft:2 }}>{s.label}</span>
                      </div>
                    ))}
                    <div style={{ width:1, height:24, background:'rgba(255,255,255,0.07)', flexShrink:0 }}/>
                  </>
                )}

                {/* Form label + boxes */}
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.22)', letterSpacing:'0.07em', textTransform:'uppercase', whiteSpace:'nowrap' }}>Forma</span>
                  <div style={{ display:'flex', gap:3 }}>
                    {form.map((r,i) => <FormBox key={i} r={r}/>)}
                  </div>
                </div>

                {/* Reputation — tier progression */}
                <div style={{ flex:1, minWidth:80 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <span style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.22)', letterSpacing:'0.05em', textTransform:'uppercase' }}>Reputación</span>
                    <span style={{
                      fontSize:8.5, fontWeight:800, color:divColor, letterSpacing:'0.03em',
                      textTransform:'uppercase',
                      animation:'repGlow 2.8s ease-in-out infinite',
                    }}>Bronce I</span>
                  </div>
                  {/* Track — premium progression bar */}
                  <div style={{ position:'relative', height:3, borderRadius:99, background:'rgba(255,255,255,0.055)' }}>
                    <div style={{
                      height:'100%', width:'7%', borderRadius:99,
                      background:`linear-gradient(90deg,${divColor}88,${divColor})`,
                      position:'relative', overflow:'hidden',
                    }}>
                      <div style={{ position:'absolute', inset:0, overflow:'hidden' }}>
                        <div style={{ position:'absolute', top:0, bottom:0, width:'60%', background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.50),transparent)', animation:'fillShimmer 2.8s ease-in-out infinite' }}/>
                      </div>
                    </div>
                    {/* Glowing edge dot at fill terminus */}
                    <div style={{
                      position:'absolute', top:'50%', left:'7%',
                      transform:'translate(-50%,-50%)',
                      width:5, height:5, borderRadius:'50%',
                      background:divColor,
                      animation:'repEdge 2.8s ease-in-out infinite',
                    }}/>
                  </div>
                  <div style={{ fontSize:8, color:'rgba(255,255,255,0.16)', marginTop:4, letterSpacing:'-0.01em' }}>
                    {played > 0 ? `${Math.max(0, 10 - played)} PJ para Bronce I` : '10 PJ para primer rango'}
                  </div>
                </div>
              </div>

              {/* ── Zone divider — stats → actions ── */}
              <div style={{ margin:'0 28px', height:1, background:'rgba(255,255,255,0.05)' }}/>

              {/* ── Action rail ── */}
              <div style={{ position:'relative', padding:'18px 28px 26px', display:'flex', flexDirection:'column', gap:10 }}>

                {/* PRIMARY: Live matchmaking terminal */}
                <Link href="/juegos" style={{
                  display:'flex', alignItems:'center', gap:14,
                  padding:'16px 20px',
                  background:`linear-gradient(135deg,${teamColor}1e 0%,${teamColor}0a 60%,transparent 100%)`,
                  border:`1px solid ${teamColor}30`,
                  borderRadius:14,
                  textDecoration:'none', position:'relative', overflow:'hidden',
                  animation:`rivalPulse 4.5s ease-in-out infinite, edgeBreathe 4.5s ease-in-out infinite`,
                  transition:'border-color 0.25s, background 0.25s, box-shadow 0.25s',
                  boxShadow:`inset 0 1px 0 rgba(255,255,255,0.07), inset 0 0 0 0 transparent, 0 0 40px ${teamColor}07`,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLAnchorElement).style.background = `linear-gradient(135deg,${teamColor}30 0%,${teamColor}18 60%,transparent 100%)`;
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = `${teamColor}55`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLAnchorElement).style.background = `linear-gradient(135deg,${teamColor}1e 0%,${teamColor}0a 60%,transparent 100%)`;
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = `${teamColor}30`;
                }}>
                  {/* Radar sweep */}
                  <div style={{ position:'absolute', inset:0, overflow:'hidden', borderRadius:14, pointerEvents:'none' }}>
                    <div style={{ position:'absolute', top:0, bottom:0, width:'32%', background:`linear-gradient(90deg,transparent 0%,${teamColor}0c 35%,rgba(255,255,255,0.055) 50%,${teamColor}06 65%,transparent 100%)`, animation:'ctaSweep 14s ease-in-out infinite' }}/>
                  </div>

                  {/* Live indicator */}
                  <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background:teamColor, boxShadow:`0 0 12px ${teamColor}`, animation:'liveDot 1.6s ease-in-out infinite' }}/>
                    <span style={{ fontSize:7, fontWeight:800, color:teamColor, letterSpacing:'0.06em' }}>LIVE</span>
                  </div>

                  {/* Text */}
                  <div style={{ flex:1, minWidth:0, position:'relative', zIndex:1 }}>
                    <div style={{ fontSize:14, fontWeight:900, color:'#fff', letterSpacing:'-0.03em', lineHeight:1.1 }}>
                      Buscar rival esta noche
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:3 }}>
                      <span style={{ fontSize:9.5, color:'rgba(255,255,255,0.35)', letterSpacing:'-0.01em' }}>Retos activos · Costa Rica</span>
                      {/* Live counter badge */}
                      <span style={{
                        fontSize:8, fontWeight:800, padding:'1px 7px', borderRadius:99,
                        background:`${teamColor}20`, border:`1px solid ${teamColor}35`,
                        color:teamColor, letterSpacing:'-0.01em',
                      }}>3 equipos activos</span>
                    </div>
                  </div>

                  <ChevronRight size={16} color={teamColor} style={{ opacity:0.60, flexShrink:0, position:'relative', zIndex:1 }}/>
                </Link>

                {/* SECONDARY rail — purpose hierarchy: Invitar > Compartir > Ver retos */}
                <div style={{
                  display:'grid', gridTemplateColumns:'1fr 1fr 1fr',
                  borderRadius:12,
                  border:'1px solid rgba(255,255,255,0.08)',
                  overflow:'hidden',
                  background:'rgba(255,255,255,0.020)',
                }}>
                  {/* ── Invitar — PRIMARY action ── */}
                  <button
                    className="action-cell action-cell-primary"
                    onClick={() => setInviteOpen(true)}
                    style={{
                      background:'rgba(215,255,0,0.038)', border:'none', cursor:'pointer',
                      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:5,
                      padding:'15px 8px',
                    }}
                  >
                    <span style={{ fontSize:16, lineHeight:1, filter:'drop-shadow(0 0 4px rgba(215,255,0,0.35))' }}>👥</span>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:0 }}>
                      <span style={{ fontSize:9.5, fontWeight:800, color:'rgba(215,255,0,0.80)', letterSpacing:'-0.01em', lineHeight:1.4 }}>Invitar</span>
                      <span style={{ fontSize:8, fontWeight:500, color:'rgba(215,255,0,0.42)', letterSpacing:'-0.01em', lineHeight:1.2 }}>jugadores</span>
                    </div>
                  </button>
                  {/* ── Compartir ── */}
                  <button
                    className="action-cell action-cell-secondary"
                    onClick={() => {
                      const link = `https://www.tucanchacr.com/unirse?venue=${encodeURIComponent(profile?.team ?? '')}`;
                      if (navigator.share) navigator.share({ title: profile?.team, url: link }).catch(()=>{});
                      else navigator.clipboard.writeText(link).catch(()=>{});
                    }}
                    style={{
                      background:'none', border:'none', cursor:'pointer',
                      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:5,
                      padding:'15px 8px',
                      borderLeft:'1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <span style={{ fontSize:16, lineHeight:1 }}>🔗</span>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:0 }}>
                      <span style={{ fontSize:9.5, fontWeight:700, color:'rgba(255,255,255,0.44)', letterSpacing:'-0.01em', lineHeight:1.4 }}>Compartir</span>
                      <span style={{ fontSize:8, fontWeight:500, color:'rgba(255,255,255,0.22)', letterSpacing:'-0.01em', lineHeight:1.2 }}>equipo</span>
                    </div>
                  </button>
                  {/* ── Ver retos ── */}
                  <button
                    className="action-cell action-cell-secondary"
                    onClick={() => { window.location.href='/juegos'; }}
                    style={{
                      background:'none', border:'none', cursor:'pointer',
                      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:5,
                      padding:'15px 8px',
                      borderLeft:'1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <span style={{ fontSize:16, lineHeight:1 }}>⚔️</span>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:0 }}>
                      <span style={{ fontSize:9.5, fontWeight:700, color:'rgba(255,255,255,0.44)', letterSpacing:'-0.01em', lineHeight:1.4 }}>Ver</span>
                      <span style={{ fontSize:8, fontWeight:500, color:'rgba(255,255,255,0.22)', letterSpacing:'-0.01em', lineHeight:1.2 }}>retos</span>
                    </div>
                  </button>
                </div>

              </div>

              {/* ── Team Chat ── */}
              {profile?.team && (
                <TeamChat
                  teamName={profile.team}
                  teamColor={teamColor}
                  userName={profile?.name ?? 'Jugador'}
                  userId={profile?.id ?? ''}
                />
              )}

            </div>
          );
        })()}
      </div>

      {/* ── Main content ── */}
      <div className="container profile-main" style={{ padding: '16px 40px 60px' }}>
        <div style={{ display: 'grid', alignItems: 'start' }} className="profile-grid">

          {/* ── Left column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Stats */}
            <div className="card-fade" style={{ ...CARD, padding: '18px 16px', animationDelay: '0.05s' }}>
              <span className="section-label" style={{ display: 'block', marginBottom: 14 }}>Estadísticas</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {STATS.map(s => {
                  const val  = profile?.[s.key];
                  const pct  = val ? Math.min(100, (val / 99) * 100) : 0;
                  const isHov = hoveredStat === s.key;
                  return (
                    <div key={s.key} className="stat-row"
                      onMouseEnter={() => setHoveredStat(s.key)}
                      onMouseLeave={() => setHoveredStat(null)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 11,
                        padding: '9px 10px', borderRadius: 11,
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)', cursor: 'default',
                      }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: `${s.color}10`, border: `1px solid ${s.color}20`,
                        boxShadow: isHov ? `0 0 12px ${s.color}18` : 'none',
                        transition: 'box-shadow 0.18s',
                      }}>
                        <s.Icon size={13} color={s.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>{s.label}</span>
                          <span style={{ fontSize: 13, fontWeight: 900, color: val ? s.color : 'rgba(255,255,255,0.2)', letterSpacing: '-0.01em' }}>
                            {val ?? '—'}
                          </span>
                        </div>
                        <div style={{ height: 2, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 99, width: `${pct}%`,
                            background: val ? `linear-gradient(90deg, ${s.color}70, ${s.color})` : 'transparent',
                            boxShadow: val ? `0 0 8px ${s.color}60` : 'none',
                            transition: 'width 0.7s cubic-bezier(0.25,0.46,0.45,0.94)',
                          }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Activity */}
            <div className="card-fade" style={{ ...CARD, padding: '18px 16px', animationDelay: '0.1s' }}>
              <span className="section-label" style={{ display: 'block', marginBottom: 14 }}>Actividad</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {[
                  { label: 'Partidos jugados', val: String(bookings.filter((b: any) => b.status === 'confirmed').length) || '0', icon: '⚽', accent: false },
                  { label: 'Reservas',          val: String(bookings.length), icon: '📅', accent: bookings.length > 0 },
                  { label: 'Cancha favorita',   val: '–',                    icon: '📍', accent: false },
                ].map((r: any, i, arr) => (
                  <div
                    key={r.label}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '9px 0',
                      borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      cursor: 'default',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <span style={{ fontSize: 13, lineHeight: 1 }}>{r.icon}</span>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)' }}>{r.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: r.accent ? 'var(--accent)' : 'rgba(255,255,255,0.55)' }}>
                        {r.val}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="card-fade" style={{
              borderRadius: 14, padding: '14px 16px', animationDelay: '0.18s',
              background: 'linear-gradient(145deg, rgba(215,255,0,0.055), rgba(215,255,0,0.018))',
              border: '1px solid rgba(215,255,0,0.10)',
            }}>
              <p style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--accent)', marginBottom: 2, letterSpacing: '-0.01em' }}>
                ¿Listo para jugar?
              </p>
              <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', marginBottom: 11, lineHeight: 1.5 }}>
                Encontrá canchas disponibles hoy.
              </p>
              <Link href="/explorar" style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 11, fontWeight: 700, color: '#000',
                background: 'var(--accent)', padding: '6px 13px',
                borderRadius: 7, textDecoration: 'none', letterSpacing: '-0.01em',
              }}>
                Explorar canchas →
              </Link>
            </div>

          </div>

          {/* ── Right column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Reservas */}
            <div className="card-fade" style={{ animationDelay: '0.08s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span className="section-label">Mis Reservas</span>
                {bookings.length > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 99,
                    background: 'rgba(215,255,0,0.07)', color: 'rgba(215,255,0,0.7)',
                    border: '1px solid rgba(215,255,0,0.14)',
                  }}>{bookings.length}</span>
                )}
              </div>

              {bookings.length === 0 ? (
                <div style={{ ...CARD, padding: '36px 24px', textAlign: 'center' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 14, margin: '0 auto 12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                  }}>
                    <Calendar size={20} style={{ color: 'rgba(255,255,255,0.25)' }} />
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.02em' }}>Sin reservas aún</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.32)', marginBottom: 18, lineHeight: 1.55 }}>
                    Explorá canchas disponibles y hacé tu primera reserva.
                  </p>
                  <Link href="/explorar" className="btn-primary" style={{ padding: '8px 20px', fontSize: 12, borderRadius: 9 }}>
                    Explorar canchas →
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {bookings.map((b, idx) => {
                    const meta  = STATUS[b.status] ?? STATUS.pending;
                    const isHov = hoveredBooking === b.id;
                    return (
                      <div key={b.id} className="booking-row"
                        onClick={() => setDetailBooking(b)}
                        onMouseEnter={() => setHoveredBooking(b.id)}
                        onMouseLeave={() => setHoveredBooking(null)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '13px 16px', borderRadius: 13, gap: 12, cursor: 'pointer',
                          background: isHov ? 'linear-gradient(145deg,#1a1a1a,#141414)' : 'linear-gradient(145deg,#161616,#111111)',
                          border: isHov ? '1px solid rgba(215,255,0,0.12)' : '1px solid rgba(255,255,255,0.07)',
                          boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                            background: BOOKING_ICONS[idx % BOOKING_ICONS.length],
                            border: `1px solid ${BOOKING_BORDERS[idx % BOOKING_BORDERS.length]}`,
                          }}>⚽</div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 2, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {b.court_name}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'rgba(255,255,255,0.32)' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={9} /> {b.hours}h</span>
                              <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
                              <span>{b.players ?? 10} jugadores</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                          <p style={{ fontWeight: 800, fontSize: 14, color: 'var(--accent)', letterSpacing: '-0.02em' }}>
                            ₡{Math.round(b.total_price ?? 0).toLocaleString('es-CR')}
                          </p>
                          <div style={{display:'flex',alignItems:'center',gap:5}}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 99,
                              background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`,
                            }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: meta.dot }} />
                              {meta.label}
                            </span>
                            <ChevronRight size={12} color="rgba(255,255,255,0.20)" style={{flexShrink:0}}/>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Mis Retos */}
            {retos.length > 0 && (
              <div className="card-fade" style={{ animationDelay: '0.10s' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span className="section-label">Mis Retos</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 99,
                    background: 'rgba(215,255,0,0.07)', color: 'rgba(215,255,0,0.7)',
                    border: '1px solid rgba(215,255,0,0.14)',
                  }}>{retos.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {retos.map(r => {
                    const st = r.status ?? 'open';
                    const stMeta =
                      st === 'open'      ? { label: 'Abierto',   color: 'var(--accent)', bg: 'rgba(215,255,0,0.08)',  border: 'rgba(215,255,0,0.18)' } :
                      st === 'accepted'  ? { label: 'Aceptado',  color: '#4ADE80',       bg: 'rgba(74,222,128,0.10)', border: 'rgba(74,222,128,0.22)' } :
                      st === 'cancelled' ? { label: 'Cancelado', color: '#FF6B6B',       bg: 'rgba(255,107,107,0.10)',border: 'rgba(255,107,107,0.22)' } :
                                           { label: 'Expirado',  color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)' };
                    const sportEmoji = r.sport === 'Pádel' ? '🎾' : r.sport === 'Básquet' ? '🏀' : '⚽';
                    return (
                      <div key={r.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '13px 16px', borderRadius: 13, gap: 12,
                        background: 'linear-gradient(145deg,#161616,#111111)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
                        opacity: st === 'cancelled' || st === 'expired' ? 0.6 : 1,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                            background: 'rgba(215,255,0,0.06)', border: '1px solid rgba(215,255,0,0.12)',
                          }}>{sportEmoji}</div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 2, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {r.team_name || 'Mi equipo'}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'rgba(255,255,255,0.32)' }}>
                              <span>{r.sport || 'Fútbol'} · {r.format || '5v5'}</span>
                              {r.date && <><span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span><span>{r.date}</span></>}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center',
                            fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 99,
                            background: stMeta.bg, color: stMeta.color, border: `1px solid ${stMeta.border}`,
                          }}>{stMeta.label}</span>
                          {st === 'open' && (
                            <button
                              type="button"
                              onClick={() => handleCancelReto(r)}
                              disabled={cancelingReto === r.id}
                              title="Cancelar reto"
                              style={{
                                width: 28, height: 28, borderRadius: 8, border: 'none',
                                background: 'rgba(255,107,107,0.10)', color: '#FF6B6B',
                                cursor: cancelingReto === r.id ? 'default' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0, transition: 'background 0.15s',
                              }}
                            >
                              {cancelingReto === r.id
                                ? <span style={{ width: 11, height: 11, border: '2px solid rgba(255,107,107,0.3)', borderTopColor: '#FF6B6B', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                                : <X size={14} />
                              }
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Historial */}
            <div className="card-fade" style={{ animationDelay: '0.13s' }}>
              <span className="section-label" style={{ display: 'block', marginBottom: 10 }}>Historial de Partidos</span>
              <div style={{ ...CARD, overflow: 'hidden' }}>
                <div style={{ height: 2, background: 'linear-gradient(90deg, transparent 0%, rgba(215,255,0,0.28) 50%, transparent 100%)' }} />
                <div style={{ padding: '26px 24px', textAlign: 'center' }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 16, margin: '0 auto 14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                    background: 'linear-gradient(145deg, rgba(215,255,0,0.09), rgba(215,255,0,0.02))',
                    border: '1px solid rgba(215,255,0,0.13)',
                    boxShadow: '0 0 28px rgba(215,255,0,0.05)',
                  }}>⚽</div>
                  <p style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 5 }}>Sin partidos aún</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.32)', marginBottom: 18, lineHeight: 1.6, maxWidth: 240, margin: '0 auto 18px' }}>
                    Aceptá un reto y tu historial aparecerá aquí.
                  </p>
                  <div style={{
                    display: 'flex', justifyContent: 'center',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 10, overflow: 'hidden', marginBottom: 18,
                  }}>
                    {[
                      { full: 'Victorias', val: '0', color: '#4ADE80' },
                      { full: 'Empates',   val: '0', color: '#FACC15' },
                      { full: 'Derrotas',  val: '0', color: '#FF6B6B' },
                    ].map((s, i, arr) => (
                      <div key={s.full} style={{
                        flex: 1, padding: '10px 8px', textAlign: 'center',
                        borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      }}>
                        <p style={{ fontWeight: 900, fontSize: 17, letterSpacing: '-0.02em', color: s.color, marginBottom: 2 }}>{s.val}</p>
                        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{s.full}</p>
                      </div>
                    ))}
                  </div>
                  <Link href="/juegos" className="btn-primary" style={{ padding: '8px 20px', fontSize: 12, borderRadius: 9 }}>
                    Ver retos activos →
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

"use client";
import Link from "next/link";
import { MapPin, X, Zap, Users, Clock, CalendarDays, Trophy } from "lucide-react";
import { useState } from "react";
import { fmtColones } from "@/lib/data";
import { supabase } from "@/lib/supabase";

const ACTIVE_STATUSES = [
  "open", "looking_for_rival", "pending_rival",
  "active", "published", "created",
];

// Derive format pill from player count
function deriveFormat(players: number): string {
  if (players >= 18) return '11v11';
  if (players >= 12) return '7v7';
  return '5v5';
}

// Minutes since created
function minsAgo(created_at: string): string {
  const diff = Math.floor((Date.now() - new Date(created_at).getTime()) / 60000);
  if (diff < 1)  return 'ahora';
  if (diff < 60) return `${diff}min`;
  const h = Math.floor(diff / 60);
  return `${h}h`;
}

// Deterministic accent color from team name
const COLORS = ['#3B82F6','#4ADE80','#60A5FA','#F97316','#A78BFA','#FF6B6B','#FACC15'];
function teamColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return COLORS[Math.abs(h) % COLORS.length];
}

interface RetoCardProps {
  reto: {
    id: string;
    team_name: string;
    court_name: string;
    date: string | null;
    time: string | null;
    hours: number | null;
    players: number | null;
    price: number | null;
    status: string;
    created_at: string;
  };
}

function RetoModal({ reto, onClose }: { reto: RetoCardProps['reto']; onClose: () => void }) {
  const [confirmed, setConfirmed] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const players  = reto.players ?? 10;
  const format   = deriveFormat(players);
  const color    = teamColor(reto.team_name);
  const initials = reto.team_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const dateLabel = reto.date
    ? new Date(reto.date + 'T12:00:00').toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' })
    : '–';

  const handleConfirm = async () => {
    setSaving(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Necesitás iniciar sesión para aceptar un reto.');
        setSaving(false);
        return;
      }
      if (user.id === (reto as any).user_id) {
        setError('No podés aceptar tu propio reto.');
        setSaving(false);
        return;
      }
      const { data: updated, error: updateErr } = await supabase
        .from('retos')
        .update({ status: 'accepted' })
        .eq('id', reto.id)
        .in('status', ACTIVE_STATUSES)
        .select('id');
      if (updateErr || !updated || updated.length === 0) {
        setError('Este reto ya fue aceptado por otro equipo. Buscá uno diferente.');
        setSaving(false);
        return;
      }
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'invite_accepted',
        title: 'Reto confirmado ✓',
        body: `Vas a jugar contra ${reto.team_name} en ${reto.court_name}`,
        read: false,
      });
      setConfirmed(true);
    } catch (e: any) {
      setError(e.message ?? 'Error al aceptar el reto. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (confirmed) {
    return (
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.80)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: 'linear-gradient(145deg, #141414 0%, #0f0f0f 100%)',
            border: '1px solid rgba(74,222,128,0.20)',
            borderRadius: 24,
            padding: '48px 40px',
            maxWidth: 420,
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 0 0 1px rgba(74,222,128,0.06) inset, 0 40px 80px rgba(0,0,0,0.6)',
          }}
        >
          <div style={{
            width: 64, height: 64, borderRadius: 20, margin: '0 auto 24px',
            background: 'rgba(74,222,128,0.10)',
            border: '1px solid rgba(74,222,128,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28,
          }}>✓</div>
          <h3 style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em', marginBottom: 10 }}>
            ¡Reto aceptado!
          </h3>
          <p style={{ fontSize: 14, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 8 }}>
            Le avisamos a <strong style={{ color: 'rgba(255,255,255,0.80)' }}>{reto.team_name}</strong> que
            {teamName ? <strong style={{ color: 'rgba(255,255,255,0.80)' }}> {teamName}</strong> : ' tu equipo'} acepta el reto.
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.30)', marginBottom: 32 }}>
            {reto.court_name} · {reto.time ?? '–'} · {dateLabel}
          </p>
          <button
            onClick={onClose}
            style={{
              width: '100%', padding: '13px', borderRadius: 13,
              background: 'rgba(74,222,128,0.10)',
              border: '1px solid rgba(74,222,128,0.18)',
              color: '#4ADE80', fontWeight: 700, fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.78)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(145deg, #141414 0%, #0f0f0f 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 24,
          width: '100%',
          maxWidth: 480,
          overflow: 'hidden',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.03) inset, 0 48px 100px rgba(0,0,0,0.70)',
          position: 'relative',
        }}
      >
        {/* Orange accent top */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, #FF6B35 0%, rgba(255,107,53,0.15) 60%, transparent 100%)' }} />

        <div style={{ padding: '28px 28px 32px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <p style={{ fontSize: 11, color: '#FF6B35', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 6 }}>
                ACEPTAR RETO
              </p>
              <h3 style={{ fontWeight: 900, fontSize: 20, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                {reto.team_name}<br />
                <span style={{ color: 'var(--text3)', fontWeight: 500, fontSize: 14 }}>busca rival esta noche</span>
              </h3>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 34, height: 34, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)', color: 'var(--text3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* VS area */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '20px', borderRadius: 16, marginBottom: 20,
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            {/* Challenger team */}
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                width: 52, height: 52, borderRadius: 15, margin: '0 auto 10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: 18,
                background: color + '18', color,
                border: `1.5px solid ${color}30`,
              }}>
                {initials}
              </div>
              <p style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>{reto.team_name}</p>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{format}</p>
            </div>

            {/* VS */}
            <div style={{
              width: 40, height: 40, borderRadius: 11, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(59, 130, 246,0.06)',
              border: '1px solid rgba(59, 130, 246,0.12)',
            }}>
              <span style={{ fontWeight: 900, fontSize: 12, color: 'var(--accent)' }}>VS</span>
            </div>

            {/* Your team */}
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                width: 52, height: 52, borderRadius: 15, margin: '0 auto 10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, color: 'var(--text3)',
                background: 'var(--surface3)',
                border: '1.5px dashed rgba(255,255,255,0.12)',
              }}>?</div>
              <p style={{ fontWeight: 600, fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>Tu equipo</p>
            </div>
          </div>

          {/* Match details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
            {[
              { Icon: MapPin,      label: 'Cancha',    val: reto.court_name },
              { Icon: CalendarDays,label: 'Fecha',     val: dateLabel },
              { Icon: Clock,       label: 'Hora',      val: `${reto.time ?? '–'} · ${reto.hours ?? 1}h` },
              { Icon: Users,       label: 'Jugadores', val: `${players} por equipo` },
            ].map(({ Icon, label, val }) => (
              <div key={label} style={{
                padding: '12px 14px', borderRadius: 12,
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.055)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <Icon size={10} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{val}</p>
              </div>
            ))}
          </div>

          {/* Price summary */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px', borderRadius: 13, marginBottom: 20,
            background: 'rgba(59, 130, 246,0.04)',
            border: '1px solid rgba(59, 130, 246,0.10)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Trophy size={14} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 13, color: 'var(--text3)' }}>Total por equipo</span>
            </div>
            <span style={{ fontWeight: 900, fontSize: 20, color: 'var(--accent)', letterSpacing: '-0.02em' }}>
              {fmtColones(reto.price ?? 0)}
            </span>
          </div>

          {/* Team name input */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Nombre de tu equipo (opcional)
            </label>
            <input
              type="text"
              placeholder="ej. Los Clavos FC"
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 12,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: '#fff', fontSize: 14, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: 12,
              background: 'rgba(239,68,68,0.07)', color: '#FF6B6B',
              border: '1px solid rgba(239,68,68,0.13)',
            }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1, padding: '13px', borderRadius: 13,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--text3)', fontWeight: 600, fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={saving}
              style={{
                flex: 2, padding: '13px', borderRadius: 13,
                background: saving ? 'rgba(59, 130, 246,0.60)' : 'var(--accent)', color: '#fff',
                fontWeight: 800, fontSize: 14,
                border: 'none', cursor: saving ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                boxShadow: '0 0 24px rgba(59, 130, 246,0.22)',
              }}
            >
              {saving ? 'Confirmando…' : <><Zap size={14} fill="#000" /> Confirmar reto</>}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function RetoCard({ reto }: RetoCardProps) {
  const [hov, setHov] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const players   = reto.players ?? 10;
  const format    = deriveFormat(players);
  const color     = teamColor(reto.team_name);
  const initials  = reto.team_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const postedStr = minsAgo(reto.created_at);
  const timeLabel = reto.time ? `Hoy ${reto.time}` : '–';
  const venueLabel = reto.court_name;

  return (
    <>
      {showModal && <RetoModal reto={reto} onClose={() => setShowModal(false)} />}

      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        className="flex flex-col h-full"
        style={{
          background:   'linear-gradient(145deg, #131313 0%, #0e0e0e 100%)',
          border:       `1px solid ${hov ? 'rgba(59, 130, 246,0.12)' : 'rgba(255,255,255,0.055)'}`,
          borderRadius: 20,
          boxShadow:    hov
            ? '0 0 0 1px rgba(59, 130, 246,0.06), 0 24px 56px rgba(0,0,0,0.55)'
            : '0 2px 12px rgba(0,0,0,0.25)',
          transform:    hov ? 'translateY(-3px)' : 'translateY(0)',
          transition:   'all 0.22s ease',
          overflow:     'hidden',
          cursor:       'pointer',
        }}>

        {/* Orange accent top — live reto */}
        <div style={{ height: 2, background: 'linear-gradient(90deg, #FF6B35 0%, rgba(255,107,53,0.15) 60%, transparent 100%)', flexShrink: 0 }} />

        <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 24, flex: 1 }}>

          {/* Header: format + time posted */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8,
                background: 'var(--accent)', color: '#fff', letterSpacing: '0.02em',
              }}>{format}</span>
              <span style={{
                fontSize: 11, padding: '4px 10px', borderRadius: 8,
                background: 'var(--surface3)', color: 'var(--text3)',
              }}>Abierto</span>
            </div>
            <span style={{ fontSize: 12, color: '#FF6B35', fontWeight: 500 }}>
              ⚡ {postedStr}
            </span>
          </div>

          {/* VS area */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Challenger */}
            <div style={{ flex: 1 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, marginBottom: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: 18,
                background: color + '14',
                color: color,
              }}>
                {initials}
              </div>
              <p style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3, marginBottom: 3 }}>
                {reto.team_name}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text3)' }}>
                {players} jugadores · {reto.hours ?? 1}h
              </p>
            </div>

            {/* VS badge */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(59, 130, 246,0.06)',
              border: '1px solid rgba(59, 130, 246,0.10)',
              flexShrink: 0,
            }}>
              <span style={{ fontWeight: 900, fontSize: 12, color: 'var(--accent)', letterSpacing: '-0.02em' }}>VS</span>
            </div>

            {/* Open spot */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, marginBottom: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, color: 'var(--text3)',
                background: 'var(--surface3)',
                border: '1px dashed rgba(255,255,255,0.10)',
              }}>?</div>
              <p style={{ fontWeight: 500, fontSize: 13, color: 'var(--text3)', textAlign: 'right' }}>¿Tu equipo?</p>
            </div>
          </div>

          {/* Players progress bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ height: 3, borderRadius: 99, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
              <div style={{
                height: '100%', borderRadius: 99,
                width: '50%',
                background: 'var(--accent)',
                transition: 'width 0.4s ease',
              }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>{Math.floor(players / 2)}/{players} jugadores</span>
              <span style={{ fontSize: 12, color: '#FF6B35', fontWeight: 500 }}>Buscando rival</span>
            </div>
          </div>

          {/* Location */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text3)' }}>
            <MapPin size={10} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span>{venueLabel} · {timeLabel}</span>
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingTop: 20, marginTop: 'auto',
            borderTop: '1px solid rgba(255,255,255,0.05)',
          }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>por equipo</p>
              <p style={{ fontWeight: 900, fontSize: 20, color: 'var(--accent)', letterSpacing: '-0.02em' }}>
                {fmtColones(reto.price ?? 0)}
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              style={{
                padding: '10px 20px', fontSize: 13, fontWeight: 800,
                borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'var(--accent)', color: '#fff',
                display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: '0 0 18px rgba(59, 130, 246,0.18)',
              }}
            >
              <Zap size={12} fill="#000" /> Aceptar reto
            </button>
          </div>

        </div>
      </div>
    </>
  );
}

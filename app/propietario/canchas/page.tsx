"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Edit3, Eye, EyeOff, Plus, Trash2, X, Check,
  AlertTriangle, MapPin, DollarSign, Users, Clock,
  Image as ImageIcon, Zap,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────── */

type Court = {
  id: string;
  name: string;
  sport: string;
  format: string | null;
  surface: string | null;
  base_price: number | null;
  location: string | null;
  image_url: string | null;
  active: boolean;
  deleted_at: string | null;
  created_at: string;
  slots: string[] | null;
  max_players: number | null;
};

type FormState = {
  name: string;
  sport: string;
  format: string;
  surface: string;
  base_price: string;
  location: string;
  image_url: string;
  max_players: string;
  active: boolean;
  slots: string[];
};

type Toast = { id: number; text: string; ok: boolean };

/* ─── Constants ──────────────────────────────────────────── */

const SPORTS   = ["Fútbol", "Pádel", "Básquet", "Tenis", "Béisbol", "Otro"];
const FORMATS  = ["5v5", "7v7", "8v8", "11v11", "2v2", "1v1"];
const SURFACES = ["Césped sintético", "Cemento", "Hormigón poroso", "Madera", "Asfalto", "Otro"];
const ALL_SLOTS = [
  "6:00 AM","7:00 AM","8:00 AM","9:00 AM","10:00 AM","11:00 AM",
  "12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM",
  "6:00 PM","7:00 PM","8:00 PM","9:00 PM","10:00 PM",
];

const BLANK_FORM: FormState = {
  name: "", sport: "Fútbol", format: "5v5", surface: "Césped sintético",
  base_price: "", location: "", image_url: "", max_players: "",
  active: true, slots: [],
};

/* ─── Helpers ────────────────────────────────────────────── */

function sportEmoji(sport: string) {
  if (sport === "Pádel" || sport === "Tenis") return "🎾";
  if (sport === "Básquet") return "🏀";
  if (sport === "Béisbol") return "⚾";
  return "⚽";
}

function fmtPrice(n: number | null) {
  if (!n) return "Sin precio";
  return `₡${(n / 1000).toFixed(0)}k / hora`;
}

/* ─── Sub-components ─────────────────────────────────────── */

function ToastItem({ toast, onDone }: { toast: Toast; onDone: (id: number) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDone(toast.id), 3500);
    return () => clearTimeout(t);
  }, [toast.id, onDone]);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "11px 18px", borderRadius: 12, marginBottom: 8,
      background: toast.ok ? "rgba(215,255,0,0.10)" : "rgba(239,68,68,0.10)",
      border: `1px solid ${toast.ok ? "rgba(215,255,0,0.22)" : "rgba(239,68,68,0.22)"}`,
      backdropFilter: "blur(16px)",
      boxShadow: "0 6px 28px rgba(0,0,0,0.45)",
      animation: "toastIn 0.3s cubic-bezier(0.34,1.1,0.64,1) both",
    }}>
      {toast.ok
        ? <Check size={13} color="#D7FF00" strokeWidth={3} />
        : <AlertTriangle size={13} color="#ef4444" strokeWidth={2.5} />}
      <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", letterSpacing: "-0.01em" }}>
        {toast.text}
      </span>
    </div>
  );
}

function Pill({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "7px 14px", borderRadius: 99, cursor: "pointer",
        border: "none", fontSize: 12, fontWeight: 700,
        background: active ? "var(--accent)" : "rgba(255,255,255,0.06)",
        color: active ? "#000" : "rgba(255,255,255,0.42)",
        outline: active ? "none" : "1px solid rgba(255,255,255,0.08)",
        transition: "all 0.13s ease",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.10em",
      color: "rgba(255,255,255,0.28)", textTransform: "uppercase", marginBottom: 8,
    }}>
      {children}
    </p>
  );
}

const inputSt: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 11,
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
  color: "rgba(255,255,255,0.88)", fontSize: 13.5, fontWeight: 500,
  letterSpacing: "-0.01em", outline: "none", boxSizing: "border-box",
  transition: "border-color 0.15s, background 0.15s",
};

/* ─── Court Form Modal ───────────────────────────────────── */

function CourtModal({
  initial, onSave, onClose, saving,
}: {
  initial: FormState;
  onSave: (f: FormState) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [f, setF] = useState<FormState>(initial);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setF(p => ({ ...p, [k]: v }));
  }

  function toggleSlot(s: string) {
    setF(p => ({
      ...p,
      slots: p.slots.includes(s) ? p.slots.filter(x => x !== s) : [...p.slots, s],
    }));
  }

  const isEdit = !!initial.name;
  const valid  = f.name.trim().length >= 2;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9998,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(14px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px 16px",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto",
          borderRadius: 20,
          background: "linear-gradient(160deg, rgba(18,18,18,0.99) 0%, rgba(10,10,10,0.99) 100%)",
          border: "1px solid rgba(255,255,255,0.09)",
          boxShadow: "0 32px 96px rgba(0,0,0,0.70), 0 1px 0 rgba(255,255,255,0.04) inset",
          animation: "modalIn 0.28s cubic-bezier(0.34,1.1,0.64,1) both",
        }}
      >
        {/* Accent top line */}
        <div style={{ height: 2, background: "linear-gradient(90deg, rgba(215,255,0,0.7) 0%, rgba(215,255,0,0.1) 60%, transparent 100%)", borderRadius: "20px 20px 0 0" }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(215,255,0,0.10)", border: "1px solid rgba(215,255,0,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={13} fill="var(--accent)" color="var(--accent)" />
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 900, letterSpacing: "-0.04em", color: "#fff" }}>
              {isEdit ? "Editar cancha" : "Nueva cancha"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: "rgba(255,255,255,0.45)", display: "flex" }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 22 }}>

          {/* Name */}
          <div>
            <Label>Nombre de la cancha</Label>
            <input
              style={inputSt}
              placeholder="Ej: Cancha Principal"
              value={f.name}
              onChange={e => set("name", e.target.value)}
              maxLength={60}
              autoFocus
            />
          </div>

          {/* Sport */}
          <div>
            <Label>Deporte</Label>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {SPORTS.map(s => <Pill key={s} label={s} active={f.sport === s} onClick={() => set("sport", s)} />)}
            </div>
          </div>

          {/* Format */}
          <div>
            <Label>Formato</Label>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {FORMATS.map(s => <Pill key={s} label={s} active={f.format === s} onClick={() => set("format", s)} />)}
            </div>
          </div>

          {/* Surface */}
          <div>
            <Label>Superficie</Label>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {SURFACES.map(s => <Pill key={s} label={s} active={f.surface === s} onClick={() => set("surface", s)} />)}
            </div>
          </div>

          {/* Price + Players */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <Label><DollarSign size={8} style={{ display: "inline", marginRight: 3 }} />Precio por hora (₡)</Label>
              <input
                style={inputSt}
                type="number"
                placeholder="Ej: 14000"
                value={f.base_price}
                onChange={e => set("base_price", e.target.value)}
                min={0}
              />
            </div>
            <div>
              <Label><Users size={8} style={{ display: "inline", marginRight: 3 }} />Jugadores máx.</Label>
              <input
                style={inputSt}
                type="number"
                placeholder="Ej: 10"
                value={f.max_players}
                onChange={e => set("max_players", e.target.value)}
                min={1}
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <Label><MapPin size={8} style={{ display: "inline", marginRight: 3 }} />Ubicación</Label>
            <input
              style={inputSt}
              placeholder="Ej: San José, Santa Ana…"
              value={f.location}
              onChange={e => set("location", e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Image URL */}
          <div>
            <Label><ImageIcon size={8} style={{ display: "inline", marginRight: 3 }} />URL de imagen</Label>
            <input
              style={inputSt}
              placeholder="https://..."
              value={f.image_url}
              onChange={e => set("image_url", e.target.value)}
            />
            {f.image_url && (
              <div style={{ marginTop: 8, borderRadius: 10, overflow: "hidden", height: 100, background: "rgba(255,255,255,0.04)" }}>
                <img
                  src={f.image_url}
                  alt="preview"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            )}
          </div>

          {/* Time slots */}
          <div>
            <Label><Clock size={8} style={{ display: "inline", marginRight: 3 }} />Horarios disponibles</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {ALL_SLOTS.map(s => {
                const on = f.slots.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSlot(s)}
                    style={{
                      padding: "5px 11px", borderRadius: 8, cursor: "pointer",
                      fontSize: 11, fontWeight: 700,
                      background: on ? "rgba(215,255,0,0.12)" : "rgba(255,255,255,0.04)",
                      border: on ? "1px solid rgba(215,255,0,0.30)" : "1px solid rgba(255,255,255,0.07)",
                      color: on ? "var(--accent)" : "rgba(255,255,255,0.35)",
                      transition: "all 0.12s ease",
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            {f.slots.length === 0 && (
              <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.22)", marginTop: 6 }}>
                Seleccioná al menos un horario para que la cancha aparezca públicamente.
              </p>
            )}
          </div>

          {/* Active toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Cancha activa</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.32)", marginTop: 2 }}>
                Las canchas activas aparecen en el sitio público
              </p>
            </div>
            <button
              type="button"
              onClick={() => set("active", !f.active)}
              style={{
                width: 44, height: 24, borderRadius: 99, border: "none", cursor: "pointer",
                position: "relative",
                background: f.active ? "var(--accent)" : "rgba(255,255,255,0.12)",
                transition: "background 0.2s ease",
                flexShrink: 0,
              }}
            >
              <div style={{
                position: "absolute", top: 3, left: f.active ? 23 : 3,
                width: 18, height: 18, borderRadius: "50%",
                background: f.active ? "#000" : "rgba(255,255,255,0.55)",
                transition: "left 0.2s ease, background 0.2s ease",
              }} />
            </button>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: "11px 0", borderRadius: 11, border: "1px solid rgba(255,255,255,0.09)",
                background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.45)",
                fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!valid || saving}
              onClick={() => onSave(f)}
              style={{
                flex: 2, padding: "11px 0", borderRadius: 11, border: "none",
                background: valid && !saving ? "var(--accent)" : "rgba(215,255,0,0.30)",
                color: "#000",
                fontSize: 13, fontWeight: 900, cursor: valid && !saving ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                transition: "background 0.15s",
              }}
            >
              {saving
                ? <><span style={{ width: 12, height: 12, border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "#000", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} /> Guardando…</>
                : <><Check size={13} strokeWidth={3} />{isEdit ? "Guardar cambios" : "Crear cancha"}</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Delete Confirm Modal ───────────────────────────────── */

function DeleteModal({
  court, futureBookings, onConfirm, onClose, saving,
}: {
  court: Court;
  futureBookings: number;
  onConfirm: () => void;
  onClose: () => void;
  saving: boolean;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.80)", backdropFilter: "blur(16px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px 16px",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 420, borderRadius: 20,
          background: "linear-gradient(160deg, rgba(18,18,18,0.99) 0%, rgba(10,10,10,0.99) 100%)",
          border: "1px solid rgba(239,68,68,0.18)",
          boxShadow: "0 32px 96px rgba(0,0,0,0.70)",
          animation: "modalIn 0.26s cubic-bezier(0.34,1.1,0.64,1) both",
        }}
      >
        <div style={{ height: 2, background: "linear-gradient(90deg, rgba(239,68,68,0.60), transparent)", borderRadius: "20px 20px 0 0" }} />

        <div style={{ padding: "24px" }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.18)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Trash2 size={18} color="#ef4444" />
          </div>

          <h3 style={{ fontSize: 17, fontWeight: 900, letterSpacing: "-0.04em", color: "#fff", marginBottom: 8 }}>
            ¿Eliminar "{court.name}"?
          </h3>

          {futureBookings > 0 ? (
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.18)", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <AlertTriangle size={13} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.60)", lineHeight: 1.55 }}>
                  Esta cancha tiene <strong style={{ color: "#fbbf24" }}>{futureBookings} reserva{futureBookings > 1 ? "s" : ""} futura{futureBookings > 1 ? "s" : ""}</strong>. Se ocultará del sitio público pero las reservas existentes se mantendrán intactas.
                </p>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.42)", lineHeight: 1.55, marginBottom: 14 }}>
              La cancha se ocultará del sitio público. Esta acción puede revertirse contactando soporte si es necesario.
            </p>
          )}

          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", marginBottom: 20 }}>
            Se usará eliminación suave (soft delete) — los datos históricos y de reservas se conservan.
          </p>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.09)", background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.45)", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={saving}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
                background: saving ? "rgba(239,68,68,0.40)" : "rgba(239,68,68,0.85)",
                color: "#fff", fontSize: 13, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              }}
            >
              {saving
                ? <span style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                : <Trash2 size={13} />
              }
              {saving ? "Eliminando…" : "Sí, eliminar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */

export default function CanchasPage() {
  const [courts,     setCourts]     = useState<Court[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [toasts,     setToasts]     = useState<Toast[]>([]);
  const [toastId,    setToastId]    = useState(0);

  /* Modal state */
  const [createOpen, setCreateOpen] = useState(false);
  const [editCourt,  setEditCourt]  = useState<Court | null>(null);
  const [delCourt,   setDelCourt]   = useState<Court | null>(null);
  const [futureBook, setFutureBook] = useState(0);
  const [saving,     setSaving]     = useState(false);

  /* ── Toast helper ── */
  function toast(text: string, ok = true) {
    const id = toastId + 1;
    setToastId(id);
    setToasts(p => [...p, { id, text, ok }]);
  }
  const removeToast = useCallback((id: number) => {
    setToasts(p => p.filter(t => t.id !== id));
  }, []);

  /* ── Fetch courts ── */
  const fetchCourts = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("owner_courts")
      .select("id, name, sport, format, surface, base_price, location, image_url, active, deleted_at, created_at, slots, max_players")
      .eq("owner_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (!error && data) setCourts(data as Court[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCourts(); }, [fetchCourts]);

  /* ── Realtime: reflect changes to all connected clients ── */
  useEffect(() => {
    const ch = supabase
      .channel("owner-canchas")
      .on("postgres_changes", { event: "*", schema: "public", table: "owner_courts" }, fetchCourts)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchCourts]);

  /* ── Toggle active ── */
  async function toggleActive(court: Court) {
    const next = !court.active;
    setCourts(p => p.map(c => c.id === court.id ? { ...c, active: next } : c));
    const { error } = await supabase
      .from("owner_courts")
      .update({ active: next })
      .eq("id", court.id);
    if (error) {
      setCourts(p => p.map(c => c.id === court.id ? { ...c, active: !next } : c));
      toast("Error al actualizar", false);
    } else {
      toast(next ? "Cancha activada" : "Cancha desactivada");
    }
  }

  /* ── Create court ── */
  async function handleCreate(f: FormState) {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("owner_courts").insert({
      owner_id:    user?.id,
      name:        f.name.trim(),
      sport:       f.sport,
      format:      f.format || null,
      surface:     f.surface || null,
      base_price:  f.base_price ? parseInt(f.base_price) : null,
      location:    f.location.trim() || null,
      image_url:   f.image_url.trim() || null,
      max_players: f.max_players ? parseInt(f.max_players) : null,
      slots:       f.slots,
      active:      f.active,
    });
    setSaving(false);
    if (error) { toast("Error al crear la cancha", false); return; }
    setCreateOpen(false);
    toast("Cancha creada ✓");
    fetchCourts();
  }

  /* ── Edit court ── */
  function openEdit(court: Court) {
    setEditCourt(court);
  }

  async function handleEdit(f: FormState) {
    if (!editCourt) return;
    setSaving(true);
    const { error } = await supabase.from("owner_courts").update({
      name:        f.name.trim(),
      sport:       f.sport,
      format:      f.format || null,
      surface:     f.surface || null,
      base_price:  f.base_price ? parseInt(f.base_price) : null,
      location:    f.location.trim() || null,
      image_url:   f.image_url.trim() || null,
      max_players: f.max_players ? parseInt(f.max_players) : null,
      slots:       f.slots,
      active:      f.active,
    }).eq("id", editCourt.id);
    setSaving(false);
    if (error) { toast("Error al guardar", false); return; }
    setEditCourt(null);
    toast("Cambios guardados ✓");
    fetchCourts();
  }

  /* ── Delete (soft) ── */
  async function openDelete(court: Court) {
    /* Check for future bookings first */
    const today = new Date().toISOString().split("T")[0];
    const { count } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("owner_court_id", court.id)   // UUID FK — correct type match
      .gte("date", today)
      .eq("status", "confirmed");
    setFutureBook(count ?? 0);
    setDelCourt(court);
  }

  async function handleDelete() {
    if (!delCourt) return;
    setSaving(true);
    const { error } = await supabase
      .from("owner_courts")
      .update({ deleted_at: new Date().toISOString(), active: false })
      .eq("id", delCourt.id);
    setSaving(false);
    if (error) { toast("Error al eliminar", false); return; }
    setCourts(p => p.filter(c => c.id !== delCourt.id));
    setDelCourt(null);
    toast("Cancha eliminada");
  }

  /* ── Convert Court → FormState for edit ── */
  function courtToForm(c: Court): FormState {
    return {
      name:        c.name,
      sport:       c.sport || "Fútbol",
      format:      c.format || "5v5",
      surface:     c.surface || "Césped sintético",
      base_price:  c.base_price ? String(c.base_price) : "",
      location:    c.location || "",
      image_url:   c.image_url || "",
      max_players: c.max_players ? String(c.max_players) : "",
      active:      c.active,
      slots:       c.slots || [],
    };
  }

  /* ── Stats ── */
  const total   = courts.length;
  const activas = courts.filter(c => c.active).length;
  const inaact  = total - activas;

  /* ── Render ── */
  return (
    <div style={{ padding: "28px 28px 80px", maxWidth: 920, margin: "0 auto" }}>

      <style>{`
        @keyframes fadeUp    { from{opacity:0;transform:translateY(10px);} to{opacity:1;transform:translateY(0);} }
        @keyframes modalIn   { from{opacity:0;transform:scale(0.96) translateY(10px);} to{opacity:1;transform:scale(1) translateY(0);} }
        @keyframes toastIn   { from{opacity:0;transform:translateY(12px) scale(0.97);} to{opacity:1;transform:translateY(0) scale(1);} }
        @keyframes spin      { to{transform:rotate(360deg);} }
        @keyframes pulse     { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.22); }
        input:focus, textarea:focus { border-color: rgba(215,255,0,0.30) !important; background: rgba(255,255,255,0.06) !important; }
      `}</style>

      {/* ── Toast stack ── */}
      <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 99999, minWidth: 240 }}>
        {toasts.map(t => <ToastItem key={t.id} toast={t} onDone={removeToast} />)}
      </div>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, animation: "fadeUp 0.35s ease both" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", color: "#fff", margin: 0 }}>
            Canchas
          </h1>
          <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.30)", marginTop: 4 }}>
            Gestioná tus instalaciones, precios y disponibilidad
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "10px 18px", borderRadius: 10, border: "none",
            background: "#D7FF00", color: "#000",
            fontSize: 12.5, fontWeight: 800, cursor: "pointer",
            boxShadow: "0 0 20px rgba(215,255,0,0.24)",
            transition: "box-shadow 0.15s, transform 0.12s",
            flexShrink: 0,
          }}
        >
          <Plus size={13} /> Nueva cancha
        </button>
      </div>

      {/* ── Stats bar ── */}
      {!loading && total > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 22, animation: "fadeUp 0.38s 0.05s ease both" }}>
          {[
            { label: "Total",     value: total,   color: "rgba(255,255,255,0.55)" },
            { label: "Activas",   value: activas, color: "#34D399" },
            { label: "Inactivas", value: inaact,  color: "rgba(255,255,255,0.25)" },
          ].map(s => (
            <div key={s.label} style={{
              padding: "10px 16px", borderRadius: 10,
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ fontSize: 18, fontWeight: 900, color: s.color, letterSpacing: "-0.04em" }}>{s.value}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.28)" }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              height: 90, borderRadius: 16, background: "rgba(255,255,255,0.03)",
              animation: "pulse 1.5s ease-in-out infinite",
              animationDelay: `${i * 0.12}s`,
            }} />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && courts.length === 0 && (
        <div style={{
          textAlign: "center", padding: "60px 24px",
          background: "rgba(255,255,255,0.02)", borderRadius: 18,
          border: "1px dashed rgba(255,255,255,0.08)",
          animation: "fadeUp 0.4s 0.08s ease both",
        }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>🏟️</div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.50)", marginBottom: 6 }}>
            Todavía no tenés canchas registradas
          </p>
          <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.25)", marginBottom: 22 }}>
            Creá tu primera cancha y empezá a recibir reservas.
          </p>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            style={{
              padding: "10px 22px", borderRadius: 10, border: "none",
              background: "#D7FF00", color: "#000", fontSize: 13, fontWeight: 800, cursor: "pointer",
            }}
          >
            <Plus size={13} style={{ display: "inline", marginRight: 6 }} />
            Nueva cancha
          </button>
        </div>
      )}

      {/* ── Court list ── */}
      {!loading && courts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, animation: "fadeUp 0.4s 0.08s ease both" }}>
          {courts.map(c => (
            <div
              key={c.id}
              style={{
                background: "rgba(10,10,10,0.80)",
                border: `1px solid ${c.active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)"}`,
                borderRadius: 16, overflow: "hidden",
                opacity: c.active ? 1 : 0.60,
                transition: "opacity 0.3s, border-color 0.3s",
              }}
            >
              {/* Top colored stripe for active courts */}
              {c.active && (
                <div style={{ height: 1.5, background: "linear-gradient(90deg, rgba(52,211,153,0.35), transparent 60%)" }} />
              )}

              <div style={{
                display: "grid",
                gridTemplateColumns: "58px 1fr auto auto",
                alignItems: "center",
                gap: 16, padding: "16px 20px",
              }}>
                {/* Sport icon */}
                <div style={{
                  width: 54, height: 54, borderRadius: 13, flexShrink: 0,
                  background: c.active ? "rgba(215,255,0,0.06)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${c.active ? "rgba(215,255,0,0.12)" : "rgba(255,255,255,0.06)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                }}>
                  {c.image_url
                    ? <img src={c.image_url} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }} />
                    : sportEmoji(c.sport || "")}
                </div>

                {/* Info */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <span style={{
                      fontSize: 15, fontWeight: 900, color: "#fff",
                      letterSpacing: "-0.03em", overflow: "hidden",
                      textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {c.name}
                    </span>
                    {!c.active && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
                        color: "rgba(255,255,255,0.28)", background: "rgba(255,255,255,0.06)",
                        padding: "2px 7px", borderRadius: 99, flexShrink: 0,
                      }}>
                        INACTIVA
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    {c.sport && (
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                        {c.sport}{c.format ? ` · ${c.format}` : ""}
                      </span>
                    )}
                    {c.surface && (
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{c.surface}</span>
                    )}
                    {c.location && (
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
                        <MapPin size={9} style={{ display: "inline", marginRight: 2 }} />
                        {c.location}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: "rgba(215,255,0,0.60)", fontWeight: 700 }}>
                      {fmtPrice(c.base_price)}
                    </span>
                  </div>
                  {/* Slots preview */}
                  {c.slots && c.slots.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                      {c.slots.slice(0, 5).map(s => (
                        <span key={s} style={{
                          fontSize: 9, fontWeight: 600, padding: "2px 6px",
                          borderRadius: 5, background: "rgba(255,255,255,0.05)",
                          color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.07)",
                        }}>
                          {s}
                        </span>
                      ))}
                      {c.slots.length > 5 && (
                        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.20)", alignSelf: "center" }}>
                          +{c.slots.length - 5} más
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Toggle active */}
                <button
                  type="button"
                  onClick={() => toggleActive(c)}
                  title={c.active ? "Desactivar" : "Activar"}
                  style={{
                    padding: "8px 10px", borderRadius: 9, border: "none",
                    background: c.active ? "rgba(52,211,153,0.10)" : "rgba(255,255,255,0.05)",
                    color: c.active ? "#34D399" : "rgba(255,255,255,0.28)",
                    cursor: "pointer", display: "flex", alignItems: "center",
                    transition: "all 0.16s", flexShrink: 0,
                  }}
                >
                  {c.active ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>

                {/* Actions group */}
                <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => openEdit(c)}
                    title="Editar"
                    style={{
                      padding: "8px 10px", borderRadius: 9, border: "none",
                      background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.50)",
                      cursor: "pointer", display: "flex", alignItems: "center",
                      transition: "all 0.16s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(215,255,0,0.08)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.50)"; }}
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => openDelete(c)}
                    title="Eliminar"
                    style={{
                      padding: "8px 10px", borderRadius: 9, border: "none",
                      background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.30)",
                      cursor: "pointer", display: "flex", alignItems: "center",
                      transition: "all 0.16s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.10)"; (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.30)"; }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create modal ── */}
      {createOpen && (
        <CourtModal
          initial={BLANK_FORM}
          onSave={handleCreate}
          onClose={() => setCreateOpen(false)}
          saving={saving}
        />
      )}

      {/* ── Edit modal ── */}
      {editCourt && (
        <CourtModal
          initial={courtToForm(editCourt)}
          onSave={handleEdit}
          onClose={() => setEditCourt(null)}
          saving={saving}
        />
      )}

      {/* ── Delete modal ── */}
      {delCourt && (
        <DeleteModal
          court={delCourt}
          futureBookings={futureBook}
          onConfirm={handleDelete}
          onClose={() => setDelCourt(null)}
          saving={saving}
        />
      )}
    </div>
  );
}

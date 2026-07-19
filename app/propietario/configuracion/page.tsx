"use client";
import { useState, useEffect, useCallback } from "react";
import { Save, Bell, CreditCard, User, MapPin, Shield } from "lucide-react";
import { supabase } from "@/lib/supabase";

const SECTIONS = [
  { id: "perfil",    icon: User,        label: "Perfil del negocio" },
  { id: "pagos",     icon: CreditCard,  label: "Métodos de pago"   },
  { id: "notifs",    icon: Bell,        label: "Notificaciones"    },
  { id: "ubicacion", icon: MapPin,      label: "Ubicación"         },
  { id: "seguridad", icon: Shield,      label: "Seguridad"         },
];

type NotifKey = "nueva_reserva" | "reserva_confirmada" | "reserva_cancelada" | "recordatorio_2h" | "resumen_semanal" | "resenas_nuevas";

const NOTIF_DEFAULTS: Record<NotifKey, boolean> = {
  nueva_reserva:      true,
  reserva_confirmada: true,
  reserva_cancelada:  true,
  recordatorio_2h:    false,
  resumen_semanal:    true,
  resenas_nuevas:     false,
};

export default function ConfiguracionPage() {
  const [activeSection, setActiveSection] = useState("perfil");
  const [saved,    setSaved]    = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(true);

  // Perfil fields
  const [complexName,  setComplexName]  = useState("");
  const [ownerName,    setOwnerName]    = useState("");
  const [email,        setEmail]        = useState("");
  const [phone,        setPhone]        = useState("");
  const [description,  setDescription]  = useState("");
  const [address,      setAddress]      = useState("");

  // Notifs
  const [notifPrefs, setNotifPrefs] = useState<Record<NotifKey, boolean>>(NOTIF_DEFAULTS);

  // Ubicación — a Waze/Google Maps link per court
  const [courts, setCourts] = useState<{ id: string; name: string; location: string | null; maps_url: string }[]>([]);

  // Load existing data on mount
  const loadProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const meta = user.user_metadata ?? {};
      setComplexName(meta.business_name    ?? "");
      setOwnerName(meta.name               ?? "");
      setEmail(user.email                  ?? "");
      setPhone(meta.phone                  ?? "");
      setDescription(meta.business_description ?? "");
      setAddress(meta.business_address     ?? "");
      if (meta.notif_prefs) {
        setNotifPrefs({ ...NOTIF_DEFAULTS, ...meta.notif_prefs });
      }
      const { data: cs } = await supabase.from("owner_courts")
        .select("id, name, location, maps_url")
        .eq("owner_id", user.id).is("deleted_at", null).order("name");
      setCourts((cs ?? []).map((c: any) => ({ id: c.id, name: c.name, location: c.location, maps_url: c.maps_url ?? "" })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      if (activeSection === "perfil") {
        const { error: updateErr } = await supabase.auth.updateUser({
          email: email.trim() || undefined,
          data: {
            name:                 ownerName.trim(),
            phone:                phone.trim(),
            business_name:        complexName.trim(),
            business_description: description.trim(),
            business_address:     address.trim(),
          },
        });
        if (updateErr) throw updateErr;

        // auth.users metadata is invisible to the rest of the platform — the app and
        // website read names from profiles / public_profiles. Mirror it there too or
        // the owner's rename never shows up anywhere else.
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error: profErr } = await supabase.from("profiles").update({
            name:  ownerName.trim(),
            phone: phone.trim() || null,
          }).eq("id", user.id);
          if (profErr) throw profErr;
        }
      } else if (activeSection === "notifs") {
        const { error: updateErr } = await supabase.auth.updateUser({
          data: { notif_prefs: notifPrefs },
        });
        if (updateErr) throw updateErr;
      } else if (activeSection === "ubicacion") {
        for (const c of courts) {
          const url = c.maps_url.trim();
          if (url && !/^https?:\/\/.+/i.test(url)) {
            throw new Error(`El enlace de "${c.name}" debe empezar con https://`);
          }
          const { error: e } = await supabase.from("owner_courts")
            .update({ maps_url: url || null }).eq("id", c.id);
          if (e) throw e;
        }
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (e: any) {
      setError(e.message ?? "Error al guardar. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const toggleNotif = (key: NotifKey) => {
    setNotifPrefs(p => ({ ...p, [key]: !p[key] }));
  };

  return (
    <div style={{ padding: "28px 28px 60px", maxWidth: 860, margin: "0 auto" }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
        @keyframes savedPop{0%{transform:scale(0.92);opacity:0;}30%{transform:scale(1.04);}100%{transform:scale(1);opacity:1;}}
        .config-input {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 9px; padding: 10px 13px; color: #fff;
          font-size: 13px; outline: none; width: 100%; box-sizing: border-box;
          transition: border-color 0.15s;
        }
        .config-input:focus { border-color: rgba(215,255,0,0.3); }
        .config-input::placeholder { color: rgba(255,255,255,0.22); }
        .section-tab { cursor: pointer; transition: all 0.15s; }
        .section-tab:hover { background: rgba(255,255,255,0.04) !important; }
        .toggle-track { cursor: pointer; transition: background 0.2s; }
      `}</style>

      <div style={{ marginBottom: 24, animation: "fadeUp 0.35s ease both" }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", color: "#fff", margin: 0 }}>Configuración</h1>
        <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>Perfil del negocio, pagos y preferencias</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 14, animation: "fadeUp 0.4s 0.08s ease both" }}>
        {/* Section nav */}
        <div style={{
          background: "rgba(10,10,10,0.8)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14, padding: "10px", display: "flex", flexDirection: "column", gap: 2,
          height: "fit-content",
        }}>
          {SECTIONS.map(s => {
            const Icon = s.icon;
            const active = activeSection === s.id;
            return (
              <button
                key={s.id}
                className="section-tab"
                onClick={() => { setActiveSection(s.id); setError(""); }}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "9px 12px", borderRadius: 9, border: "none",
                  background: active ? "rgba(215,255,0,0.07)" : "transparent",
                  borderLeft: active ? "2px solid rgba(215,255,0,0.4)" : "2px solid transparent",
                  color: active ? "#D7FF00" : "rgba(255,255,255,0.45)",
                  textAlign: "left", cursor: "pointer", fontSize: 12.5, fontWeight: active ? 700 : 500,
                  letterSpacing: "-0.015em",
                }}
              >
                <Icon size={13} />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Content panel */}
        <div style={{
          background: "rgba(10,10,10,0.8)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14, padding: "22px 24px",
        }}>

          {loading && activeSection === "perfil" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ height: 36, borderRadius: 9, background: "rgba(255,255,255,0.04)", animation: "fadeUp 0.5s ease both" }} />
              ))}
            </div>
          )}

          {!loading && activeSection === "perfil" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 18 }}>Perfil del negocio</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 10.5, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>NOMBRE DEL COMPLEJO</label>
                  <input className="config-input" placeholder="Twelve Academy" value={complexName} onChange={e => setComplexName(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 10.5, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>NOMBRE DEL PROPIETARIO</label>
                  <input className="config-input" placeholder="Tu nombre" value={ownerName} onChange={e => setOwnerName(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 10.5, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>CORREO ELECTRÓNICO</label>
                  <input className="config-input" type="email" placeholder="info@complejo.cr" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 10.5, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>TELÉFONO DE CONTACTO</label>
                  <input className="config-input" placeholder="+506 8800-0000" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ fontSize: 10.5, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>DESCRIPCIÓN DEL COMPLEJO</label>
                  <textarea className="config-input" placeholder="Instalaciones premium en San José..." rows={3}
                    value={description} onChange={e => setDescription(e.target.value)}
                    style={{ resize: "none", fontFamily: "inherit" } as any} />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ fontSize: 10.5, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>DIRECCIÓN</label>
                  <input className="config-input" placeholder="San José, Escazú, Trejos Montealegre" value={address} onChange={e => setAddress(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {activeSection === "notifs" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 18 }}>Notificaciones</div>
              {([
                { key: "nueva_reserva"      as NotifKey, label: "Nueva reserva pendiente",  sub: "Recibí un aviso al instante por email" },
                { key: "reserva_confirmada" as NotifKey, label: "Reserva confirmada",        sub: "Confirmación enviada al jugador"      },
                { key: "reserva_cancelada"  as NotifKey, label: "Reserva cancelada",         sub: "Aviso cuando un jugador cancela"      },
                { key: "recordatorio_2h"    as NotifKey, label: "Recordatorio 2h antes",     sub: "Resumen de las canchas del día"       },
                { key: "resumen_semanal"    as NotifKey, label: "Resumen semanal",           sub: "Reporte de ingresos cada lunes"       },
                { key: "resenas_nuevas"     as NotifKey, label: "Reseñas nuevas",            sub: "Cuando alguien califica tus canchas"  },
              ] as const).map(n => (
                <div key={n.key} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,0.65)" }}>{n.label}</div>
                    <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.22)", marginTop: 1 }}>{n.sub}</div>
                  </div>
                  <div
                    className="toggle-track"
                    onClick={() => toggleNotif(n.key)}
                    style={{
                      width: 38, height: 20, borderRadius: 99, flexShrink: 0,
                      background: notifPrefs[n.key] ? "#D7FF00" : "rgba(255,255,255,0.08)",
                      position: "relative",
                    }}
                  >
                    <div style={{
                      position: "absolute", top: 3, left: notifPrefs[n.key] ? "calc(100% - 17px)" : 3,
                      width: 14, height: 14, borderRadius: "50%",
                      background: notifPrefs[n.key] ? "#000" : "rgba(255,255,255,0.35)",
                      transition: "left 0.18s cubic-bezier(0.4,0,0.2,1)",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeSection === "pagos" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 6 }}>Métodos de pago</div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 20 }}>Cómo recibís pagos de los jugadores</p>

              {/* ONVO — active payment processor */}
              <div style={{
                padding: "16px 18px", borderRadius: 12, marginBottom: 12,
                background: "rgba(215,255,0,0.04)", border: "1px solid rgba(215,255,0,0.14)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 20 }}>⚡</span>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>ONVO Pay</div>
                    <div style={{ fontSize: 11, color: "rgba(52,211,153,0.7)", marginTop: 1 }}>Activo · Procesador oficial de pagos</div>
                  </div>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 800, letterSpacing: "0.04em",
                  padding: "4px 10px", borderRadius: 99,
                  background: "rgba(52,211,153,0.08)", color: "rgba(52,211,153,0.8)",
                  border: "1px solid rgba(52,211,153,0.15)",
                }}>CONECTADO</span>
              </div>

              <div style={{
                padding: "14px 16px", borderRadius: 10,
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                fontSize: 11.5, color: "rgba(255,255,255,0.35)", lineHeight: 1.7,
              }}>
                Los jugadores pagan directamente a través de ONVO. Tu ingreso neto (después de la comisión de plataforma del 8% + tarifa ONVO) se transfiere a tu cuenta bancaria según el ciclo de pagos acordado con ONVO.<br />
                Para configurar tu cuenta de desembolso, ingresá al panel de ONVO directamente.
              </div>

              <div style={{
                marginTop: 10, padding: "12px 14px", borderRadius: 10,
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
                fontSize: 11, color: "rgba(255,255,255,0.22)",
              }}>
                💡 Configuración de múltiples métodos de pago (SINPE, efectivo, transferencia) estará disponible próximamente.
              </div>
            </div>
          )}

          {activeSection === "ubicacion" && (
            <div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 20, lineHeight: 1.6 }}>
                Pegá el enlace de <strong style={{ color: "rgba(255,255,255,0.7)" }}>Waze</strong> o{" "}
                <strong style={{ color: "rgba(255,255,255,0.7)" }}>Google Maps</strong> de cada cancha. Los jugadores lo verán
                en el botón "Cómo llegar".
              </p>
              {courts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "36px 0", fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
                  Todavía no tenés canchas. Agregá una en la sección Canchas.
                </div>
              ) : courts.map(c => (
                <div key={c.id} style={{ marginBottom: 18 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(255,255,255,0.28)", textTransform: "uppercase", marginBottom: 8 }}>
                    <MapPin size={11} /> {c.name}{c.location ? ` · ${c.location}` : ""}
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={c.maps_url}
                      onChange={e => setCourts(prev => prev.map(x => x.id === c.id ? { ...x, maps_url: e.target.value } : x))}
                      placeholder="https://maps.app.goo.gl/…  o  https://waze.com/ul/…"
                      style={{
                        flex: 1, padding: "11px 14px", borderRadius: 11,
                        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
                        color: "rgba(255,255,255,0.88)", fontSize: 13.5,
                      }}
                    />
                    {c.maps_url.trim() && (
                      <a href={c.maps_url.trim()} target="_blank" rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", padding: "0 12px", borderRadius: 11, background: "rgba(215,255,0,0.08)", border: "1px solid rgba(215,255,0,0.2)", color: "var(--accent)", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                        Probar
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeSection === "seguridad" && (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🔒</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>Próximamente</div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.2)", marginTop: 4 }}>
                Esta sección estará disponible en la próxima versión
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 9, fontSize: 12, background: "rgba(239,68,68,0.07)", color: "#FF6B6B", border: "1px solid rgba(239,68,68,0.13)" }}>
              {error}
            </div>
          )}

          {/* Save button */}
          {["perfil", "notifs", "pagos", "ubicacion"].includes(activeSection) && (
            <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={handleSave}
                disabled={saving || activeSection === "pagos"}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "10px 20px", borderRadius: 10, border: "none",
                  background: saved
                    ? "rgba(52,211,153,0.15)"
                    : saving
                    ? "rgba(215,255,0,0.50)"
                    : activeSection === "pagos"
                    ? "rgba(215,255,0,0.15)"
                    : "#D7FF00",
                  color: saved ? "#34D399" : "#000",
                  fontSize: 13, fontWeight: 800,
                  cursor: saving || activeSection === "pagos" ? "default" : "pointer",
                  letterSpacing: "-0.015em",
                  transition: "all 0.2s",
                  animation: saved ? "savedPop 0.3s ease both" : "none",
                }}
              >
                <Save size={13} />
                {saved ? "Guardado ✓" : saving ? "Guardando…" : activeSection === "pagos" ? "Próximamente" : "Guardar cambios"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

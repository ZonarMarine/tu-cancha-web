"use client";
import { useState } from "react";
import { Save, Bell, CreditCard, User, MapPin, Shield } from "lucide-react";

const SECTIONS = [
  { id: "perfil",    icon: User,        label: "Perfil del negocio" },
  { id: "pagos",     icon: CreditCard,  label: "Métodos de pago"   },
  { id: "notifs",    icon: Bell,        label: "Notificaciones"    },
  { id: "ubicacion", icon: MapPin,      label: "Ubicación"         },
  { id: "seguridad", icon: Shield,      label: "Seguridad"         },
];

export default function ConfiguracionPage() {
  const [activeSection, setActiveSection] = useState("perfil");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
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
                onClick={() => setActiveSection(s.id)}
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
          {activeSection === "perfil" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 18 }}>Perfil del negocio</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {[
                  { label: "Nombre del complejo", placeholder: "Twelve Academy", full: false },
                  { label: "Nombre del propietario", placeholder: "Diego Morales", full: false },
                  { label: "Correo electrónico", placeholder: "info@twelve.cr", full: false },
                  { label: "Teléfono de contacto", placeholder: "+506 8800-0000", full: false },
                  { label: "Descripción del complejo", placeholder: "Instalaciones premium en San José...", full: true },
                  { label: "Dirección", placeholder: "San José, Escazú, Trejos Montealegre", full: true },
                ].map((f, i) => (
                  <div key={i} style={{ gridColumn: f.full ? "span 2" : "span 1" }}>
                    <label style={{ fontSize: 10.5, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>
                      {f.label.toUpperCase()}
                    </label>
                    {f.full ? (
                      <textarea className="config-input" placeholder={f.placeholder} rows={3}
                        style={{ resize: "none", fontFamily: "inherit" } as any} />
                    ) : (
                      <input className="config-input" placeholder={f.placeholder} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === "notifs" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 18 }}>Notificaciones</div>
              {[
                { label: "Nueva reserva pendiente",  sub: "Recibí un aviso al instante por email", on: true  },
                { label: "Reserva confirmada",        sub: "Confirmación enviada al jugador",        on: true  },
                { label: "Reserva cancelada",         sub: "Aviso cuando un jugador cancela",        on: true  },
                { label: "Recordatorio 2h antes",     sub: "Resumen de las canchas del día",         on: false },
                { label: "Resumen semanal",           sub: "Reporte de ingresos cada lunes",         on: true  },
                { label: "Reseñas nuevas",            sub: "Cuando alguien califica tus canchas",    on: false },
              ].map((n, i) => (
                <ToggleRow key={i} label={n.label} sub={n.sub} defaultOn={n.on} />
              ))}
            </div>
          )}

          {activeSection === "pagos" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 6 }}>Métodos de pago</div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 20 }}>Configurá cómo recibís pagos de los jugadores</p>
              {[
                { icon: "💳", label: "SINPE Móvil",    connected: true,  number: "8800-1234" },
                { icon: "🏦", label: "BAC Credomatic",  connected: false, number: "" },
                { icon: "💰", label: "Pago en efectivo",connected: true,  number: "Habilitado" },
              ].map((m, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "13px 16px", borderRadius: 11, marginBottom: 8,
                  background: "rgba(255,255,255,0.03)", border: `1px solid ${m.connected ? "rgba(52,211,153,0.14)" : "rgba(255,255,255,0.07)"}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 18 }}>{m.icon}</span>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: "rgba(255,255,255,0.75)" }}>{m.label}</div>
                      <div style={{ fontSize: 11, color: m.connected ? "rgba(52,211,153,0.6)" : "rgba(255,255,255,0.25)" }}>
                        {m.connected ? m.number : "No conectado"}
                      </div>
                    </div>
                  </div>
                  <button style={{
                    padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                    background: m.connected ? "rgba(255,255,255,0.05)" : "rgba(215,255,0,0.08)",
                    color: m.connected ? "rgba(255,255,255,0.35)" : "rgba(215,255,0,0.7)",
                    fontSize: 11, fontWeight: 700,
                  }}>
                    {m.connected ? "Editar" : "Conectar"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {(activeSection === "ubicacion" || activeSection === "seguridad") && (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>{activeSection === "ubicacion" ? "📍" : "🔒"}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>
                Próximamente
              </div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.2)", marginTop: 4 }}>
                Esta sección estará disponible en la próxima versión
              </div>
            </div>
          )}

          {/* Save button */}
          {["perfil","notifs","pagos"].includes(activeSection) && (
            <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={handleSave}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "10px 20px", borderRadius: 10, border: "none",
                  background: saved ? "rgba(52,211,153,0.15)" : "#D7FF00",
                  color: saved ? "#34D399" : "#000",
                  fontSize: 13, fontWeight: 800, cursor: "pointer",
                  letterSpacing: "-0.015em",
                  transition: "all 0.2s",
                  animation: saved ? "savedPop 0.3s ease both" : "none",
                }}
              >
                <Save size={13} />
                {saved ? "Guardado ✓" : "Guardar cambios"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, sub, defaultOn }: { label: string; sub: string; defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
    }}>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,0.65)" }}>{label}</div>
        <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.22)", marginTop: 1 }}>{sub}</div>
      </div>
      <div
        className="toggle-track"
        onClick={() => setOn(o => !o)}
        style={{
          width: 38, height: 20, borderRadius: 99, flexShrink: 0,
          background: on ? "#D7FF00" : "rgba(255,255,255,0.08)",
          position: "relative",
        }}
      >
        <div style={{
          position: "absolute", top: 3, left: on ? "calc(100% - 17px)" : 3,
          width: 14, height: 14, borderRadius: "50%",
          background: on ? "#000" : "rgba(255,255,255,0.35)",
          transition: "left 0.18s cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>
    </div>
  );
}

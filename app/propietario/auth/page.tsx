"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Zap, Eye, EyeOff, ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";

export default function OwnerAuthPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      /* 1. Authenticate */
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) throw authErr;

      const userId = data.user?.id;
      if (!userId) throw new Error("No se pudo verificar tu cuenta.");

      /* 2. Check role in profiles table — owners have role = 'owner' */
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (profileErr || !profile) {
        await supabase.auth.signOut();
        throw new Error("No se encontró un perfil asociado a esta cuenta.");
      }

      if (profile.role !== "owner") {
        await supabase.auth.signOut();
        throw new Error(
          "Esta cuenta no tiene acceso al portal de propietarios. " +
          "Si sos propietario de una cancha, contactá a soporte."
        );
      }

      /* 3. All good — go to dashboard */
      router.replace("/propietario");

    } catch (err: any) {
      setError(
        err.message === "Invalid login credentials"
          ? "Correo o contraseña incorrectos."
          : (err.message ?? "Ocurrió un error. Intentá de nuevo.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: "#080808",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-geist-sans, system-ui, sans-serif)",
      padding: "24px",
    }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);} }
        .owner-input {
          width: 100%; padding: 12px 14px;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09);
          border-radius: 10px; color: #fff; font-size: 13.5px;
          outline: none; box-sizing: border-box;
          transition: border-color 0.18s, background 0.18s;
          font-family: inherit;
        }
        .owner-input:focus { border-color: rgba(215,255,0,0.4); background: rgba(255,255,255,0.055); }
        .owner-input::placeholder { color: rgba(255,255,255,0.22); }
        .submit-btn { transition: opacity 0.18s, transform 0.18s; }
        .submit-btn:hover:not(:disabled) { opacity: 0.88; }
        .submit-btn:active:not(:disabled) { transform: scale(0.99); }
      `}</style>

      {/* Subtle radial glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 55% 45% at 50% 0%, rgba(215,255,0,0.055), transparent)",
      }} />

      <div style={{ width: "100%", maxWidth: 400, animation: "fadeUp 0.38s ease both", position: "relative" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <div style={{
              width: 30, height: 30, borderRadius: 9,
              background: "linear-gradient(135deg, rgba(215,255,0,0.15), rgba(215,255,0,0.06))",
              border: "1px solid rgba(215,255,0,0.22)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Zap size={14} fill="#D7FF00" color="#D7FF00" />
            </div>
            <span style={{ fontSize: 19, fontWeight: 900, letterSpacing: "-0.045em", color: "#fff" }}>
              Tu<span style={{ color: "#D7FF00" }}>Cancha</span>
            </span>
          </Link>
          <div style={{
            marginTop: 9, display: "inline-flex", alignItems: "center", gap: 5,
            padding: "3px 11px", borderRadius: 99,
            background: "rgba(215,255,0,0.06)", border: "1px solid rgba(215,255,0,0.14)",
          }}>
            <Building2 size={9} color="rgba(215,255,0,0.6)" />
            <span style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(215,255,0,0.65)", letterSpacing: "0.1em" }}>
              PORTAL DE PROPIETARIOS
            </span>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: "linear-gradient(160deg, rgba(14,14,14,0.99), rgba(9,9,9,0.99))",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20,
          boxShadow: "0 0 0 1px rgba(215,255,0,0.03), 0 24px 80px rgba(0,0,0,0.65)",
          overflow: "hidden",
        }}>
          {/* Accent bar */}
          <div style={{ height: 2, background: "linear-gradient(90deg, #D7FF00cc, #D7FF0033, transparent)" }} />

          <div style={{ padding: "26px 26px 22px" }}>
            <h2 style={{
              fontSize: 17, fontWeight: 900, color: "#fff",
              letterSpacing: "-0.03em", margin: "0 0 4px",
            }}>
              Acceso al portal
            </h2>
            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.3)", margin: "0 0 22px", letterSpacing: "-0.01em" }}>
              Usá las mismas credenciales de tu cuenta de propietario
            </p>

            <form onSubmit={handleSignIn}>
              {/* Email */}
              <div style={{ marginBottom: 14 }}>
                <label style={{
                  fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.3)",
                  letterSpacing: "0.04em", display: "block", marginBottom: 7,
                }}>
                  CORREO ELECTRÓNICO
                </label>
                <input
                  className="owner-input"
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: 22 }}>
                <label style={{
                  fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.3)",
                  letterSpacing: "0.04em", display: "block", marginBottom: 7,
                }}>
                  CONTRASEÑA
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    className="owner-input"
                    type={showPw ? "text" : "password"}
                    placeholder="Tu contraseña"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    style={{
                      position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer",
                      color: "rgba(255,255,255,0.25)", padding: 2, display: "flex",
                    }}
                  >
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  marginBottom: 16, padding: "11px 13px", borderRadius: 9,
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)",
                  fontSize: 12.5, color: "rgba(239,68,68,0.9)", lineHeight: 1.5,
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="submit-btn"
                style={{
                  width: "100%", padding: "13px", borderRadius: 12, border: "none",
                  background: loading ? "rgba(215,255,0,0.45)" : "#D7FF00",
                  color: "#000", fontSize: 14, fontWeight: 900,
                  letterSpacing: "-0.02em",
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: loading ? "none" : "0 0 24px rgba(215,255,0,0.22)",
                }}
              >
                {loading ? "Verificando…" : "Entrar al portal →"}
              </button>
            </form>
          </div>

          {/* Footer note */}
          <div style={{
            padding: "12px 26px 18px",
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}>
            <p style={{
              fontSize: 11.5, color: "rgba(255,255,255,0.2)",
              lineHeight: 1.5, margin: 0, textAlign: "center",
            }}>
              ¿Problemas para entrar? Escribinos a{" "}
              <span style={{ color: "rgba(215,255,0,0.45)" }}>soporte@tucanchacr.com</span>
            </p>
          </div>
        </div>

        {/* Back to player site */}
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <Link href="/" style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: 12, color: "rgba(255,255,255,0.2)",
            textDecoration: "none", transition: "color 0.16s",
          }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
          >
            <ArrowLeft size={11} /> Soy jugador, ir al sitio principal
          </Link>
        </div>
      </div>
    </div>
  );
}

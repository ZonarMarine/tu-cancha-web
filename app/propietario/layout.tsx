"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, CalendarDays, ClipboardList,
  BarChart3, Settings, MapPin, Zap, ArrowLeft,
  ChevronRight, Menu, X, CreditCard,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const NAV = [
  { href: "/propietario",             icon: LayoutDashboard, label: "Dashboard",    sub: "Resumen del día"       },
  { href: "/propietario/reservas",     icon: ClipboardList,   label: "Reservas",     sub: "Gestionar bookings"    },
  { href: "/propietario/pagos",        icon: CreditCard,      label: "Pagos",        sub: "Ingresos ONVO"         },
  { href: "/propietario/calendario",   icon: CalendarDays,    label: "Calendario",   sub: "Disponibilidad"        },
  { href: "/propietario/canchas",     icon: MapPin,          label: "Canchas",      sub: "Tus instalaciones"     },
  { href: "/propietario/analytics",   icon: BarChart3,       label: "Analytics",    sub: "Ingresos y métricas"   },
  { href: "/propietario/configuracion",icon: Settings,       label: "Configuración",sub: "Perfil y pagos"        },
];

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [pending, setPending] = useState(0);

  const isAuthPage = path === "/propietario/auth";

  useEffect(() => {
    let cancelled = false;

    const checkOwner = async (u: any) => {
      if (cancelled) return;

      if (!u) {
        // Not logged in — send to auth page (unless already there)
        setAuthChecked(true);
        if (!isAuthPage) router.replace("/propietario/auth");
        return;
      }

      if (isAuthPage) {
        // Already logged in and on auth page — check if owner and redirect to dashboard
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", u.id)
          .single();
        if (cancelled) return;
        setUser(u);
        setAuthChecked(true);
        if (profile?.role === "owner") {
          router.replace("/propietario");
        }
        return;
      }

      // On a protected owner page — verify ownership
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", u.id)
        .single();

      if (cancelled) return;
      setUser(u);
      setAuthChecked(true);

      if (!profile || profile.role !== "owner") {
        await supabase.auth.signOut();
        router.replace("/propietario/auth");
      }
    };

    // Always reset authChecked when path changes so there's no stale state
    setAuthChecked(false);

    supabase.auth.getSession().then(({ data: { session } }) => {
      checkOwner(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      checkOwner(s?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [isAuthPage, router]);

  // Real pending count — scoped to courts owned by this user
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const fetchPendingCount = async () => {
      // Fetch court IDs for this owner (use owner_court_id FK for accurate scoping)
      const { data: courts } = await supabase
        .from("owner_courts")
        .select("id")
        .eq("owner_id", user.id)
        .is("deleted_at", null);
      if (cancelled) return;

      const courtIds = (courts ?? []).map((c: any) => c.id).filter(Boolean);
      if (courtIds.length === 0) { setPending(0); return; }

      const today = new Date().toISOString().split("T")[0];
      const { count } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .in("owner_court_id", courtIds)
        .in("status", ["pending_payment", "pending", "partially_paid"])
        .gte("date", today);
      if (cancelled) return;
      setPending(count ?? 0);
    };
    fetchPendingCount();
    return () => { cancelled = true; };
  }, [user]);

  // Auth page: show blank while checking (avoids flashing login form for already-logged-in owners)
  if (isAuthPage) {
    if (!authChecked) return <div style={{ position: "fixed", inset: 0, background: "#080808", zIndex: 300 }} />;
    return <>{children}</>;
  }

  // Protected pages: blank screen while verifying ownership
  if (!authChecked) return <div style={{ position: "fixed", inset: 0, background: "#080808", zIndex: 200 }} />;

  const name = user?.user_metadata?.business_name ?? user?.user_metadata?.name ?? user?.email?.split("@")[0] ?? "Propietario";
  const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  const sidebarW = collapsed ? 64 : 240;

  return (
    /* Full-viewport fixed overlay — covers the global Navbar completely */
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "#080808",
      display: "flex", fontFamily: "var(--font-geist-sans, system-ui, sans-serif)",
      overflow: "hidden",
    }}>
      <style>{`
        :root { --owner-accent: #3B82F6; --owner-dim: rgba(59, 130, 246,0.55); }
        .owner-nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px; border-radius: 10px;
          text-decoration: none; cursor: pointer;
          transition: background 0.15s, color 0.15s;
          position: relative;
          white-space: nowrap; overflow: hidden;
        }
        .owner-nav-item:hover { background: rgba(255,255,255,0.04); }
        .owner-nav-active {
          background: rgba(59, 130, 246,0.07) !important;
          border-left: 2px solid rgba(59, 130, 246,0.55);
        }
        .owner-nav-active .nav-label { color: var(--owner-accent) !important; }
        .pending-badge {
          background: #3B82F6; color: #000;
          font-size: 9px; font-weight: 900;
          padding: 1px 5px; border-radius: 99px;
          letter-spacing: -0.01em; flex-shrink: 0;
        }
        .sidebar-toggle { transition: all 0.18s; }
        .sidebar-toggle:hover { background: rgba(255,255,255,0.06) !important; }
        @keyframes pendingPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(59, 130, 246,0.4); }
          50%      { box-shadow: 0 0 0 4px rgba(59, 130, 246,0); }
        }
        .pending-pulse { animation: pendingPulse 2.2s ease-in-out infinite; }
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-toggle   { display: flex !important; }
        }
        @media (min-width: 769px) {
          .mobile-overlay  { display: none !important; }
          .mobile-toggle   { display: none !important; }
        }
      `}</style>

      {/* ── Desktop Sidebar ── */}
      <div className="desktop-sidebar" style={{
        width: sidebarW, flexShrink: 0,
        background: "rgba(10,10,10,0.98)",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        display: "flex", flexDirection: "column",
        transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)",
        overflow: "hidden",
      }}>
        {/* Logo + collapse toggle */}
        <div style={{
          height: 60, display: "flex", alignItems: "center",
          padding: collapsed ? "0 16px" : "0 18px",
          justifyContent: collapsed ? "center" : "space-between",
          borderBottom: "1px solid rgba(255,255,255,0.05)", flexShrink: 0,
        }}>
          {!collapsed && (
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{
                width: 24, height: 24, borderRadius: 7,
                background: "linear-gradient(135deg, rgba(59, 130, 246,0.15), rgba(59, 130, 246,0.06))",
                border: "1px solid rgba(59, 130, 246,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Zap size={12} fill="#3B82F6" color="#3B82F6" />
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 900, letterSpacing: "-0.04em", color: "#fff", lineHeight: 1.1 }}>
                  Tu<span style={{ color: "#3B82F6" }}>Cancha</span>
                </div>
                <div style={{ fontSize: 8.5, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>
                  PORTAL PROPIETARIO
                </div>
              </div>
            </div>
          )}
          {collapsed && (
            <div style={{
              width: 24, height: 24, borderRadius: 7,
              background: "linear-gradient(135deg, rgba(59, 130, 246,0.15), rgba(59, 130, 246,0.06))",
              border: "1px solid rgba(59, 130, 246,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Zap size={12} fill="#3B82F6" color="#3B82F6" />
            </div>
          )}
          <button
            className="sidebar-toggle"
            onClick={() => setCollapsed(c => !c)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(255,255,255,0.25)", padding: 4, borderRadius: 6,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ChevronRight size={13} style={{ transform: collapsed ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.22s" }} />
          </button>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "10px 10px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto", overflowX: "hidden" }}>
          {NAV.map(item => {
            const isActive = item.href === "/propietario" ? path === "/propietario" : path.startsWith(item.href);
            const isReservas = item.href === "/propietario/reservas";
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`owner-nav-item ${isActive ? "owner-nav-active" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  size={16}
                  color={isActive ? "#3B82F6" : "rgba(255,255,255,0.28)"}
                  style={{ flexShrink: 0, transition: "color 0.15s" }}
                />
                {!collapsed && (
                  <>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="nav-label" style={{
                        fontSize: 12.5, fontWeight: isActive ? 700 : 500,
                        color: isActive ? "#3B82F6" : "rgba(255,255,255,0.55)",
                        letterSpacing: "-0.015em", lineHeight: 1.2,
                        transition: "color 0.15s",
                      }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.2)", letterSpacing: "-0.01em" }}>
                        {item.sub}
                      </div>
                    </div>
                    {isReservas && pending > 0 && (
                      <span className="pending-badge pending-pulse">{pending}</span>
                    )}
                  </>
                )}
                {collapsed && isReservas && pending > 0 && (
                  <span style={{
                    position: "absolute", top: 6, right: 6,
                    width: 7, height: 7, borderRadius: "50%",
                    background: "#3B82F6", boxShadow: "0 0 6px rgba(59, 130, 246,0.8)",
                  }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Owner profile + back link */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          padding: collapsed ? "14px 10px" : "14px 14px",
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          {!collapsed && user && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: "linear-gradient(135deg, rgba(59, 130, 246,0.85), rgba(59, 130, 246,0.6))",
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 900,
              }}>
                {initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#fff", letterSpacing: "-0.015em", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {name}
                </div>
                <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(59, 130, 246,0.5)", letterSpacing: "0.06em" }}>PROPIETARIO</div>
              </div>
            </div>
          )}
          <Link href="/" style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "8px 10px", borderRadius: 9,
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
            textDecoration: "none", color: "rgba(255,255,255,0.3)",
            fontSize: 11, fontWeight: 500, letterSpacing: "-0.01em",
            transition: "all 0.16s",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.3)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
          >
            <ArrowLeft size={11} />
            {!collapsed && "Volver al sitio"}
          </Link>
          {!collapsed && (
            <button
              onClick={async () => { await supabase.auth.signOut(); router.replace("/propietario/auth"); }}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "8px 10px", borderRadius: 9, border: "none",
                background: "transparent", color: "rgba(255,255,255,0.18)",
                fontSize: 11, fontWeight: 500, cursor: "pointer",
                letterSpacing: "-0.01em", width: "100%",
                transition: "color 0.16s",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(239,68,68,0.55)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.18)")}
            >
              <span style={{ fontSize: 10 }}>⏻</span> Cerrar sesión
            </button>
          )}
        </div>
      </div>

      {/* ── Mobile: top bar + overlay drawer ── */}
      <div className="mobile-toggle" style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
        height: 54, background: "rgba(10,10,10,0.98)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        display: "none", alignItems: "center",
        padding: "0 16px", gap: 12, flexShrink: 0,
      }}>
        <button onClick={() => setMobileOpen(o => !o)} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(255,255,255,0.55)", padding: 2,
        }}>
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "-0.03em", color: "#fff" }}>
          Tu<span style={{ color: "#3B82F6" }}>Cancha</span>
          <span style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.28)", marginLeft: 6, letterSpacing: "0.06em" }}>PROPIETARIO</span>
        </div>
        {pending > 0 && (
          <span className="pending-badge pending-pulse" style={{ marginLeft: "auto" }}>{pending} pendientes</span>
        )}
      </div>

      {mobileOpen && (
        <div className="mobile-overlay" style={{
          position: "absolute", top: 54, left: 0, bottom: 0, width: "100vw",
          background: "rgba(8,8,8,0.97)", zIndex: 9,
          padding: "12px 12px", display: "none", flexDirection: "column", gap: 2,
        }}>
          {NAV.map(item => {
            const isActive = item.href === "/propietario" ? path === "/propietario" : path.startsWith(item.href);
            const isReservas = item.href === "/propietario/reservas";
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`owner-nav-item ${isActive ? "owner-nav-active" : ""}`}
              >
                <Icon size={16} color={isActive ? "#3B82F6" : "rgba(255,255,255,0.35)"} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="nav-label" style={{
                    fontSize: 14, fontWeight: isActive ? 700 : 500,
                    color: isActive ? "#3B82F6" : "rgba(255,255,255,0.6)",
                  }}>{item.label}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.22)" }}>{item.sub}</div>
                </div>
                {isReservas && pending > 0 && <span className="pending-badge">{pending}</span>}
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Main content ── */}
      <div style={{
        flex: 1, overflowY: "auto",
        background: "#080808",
        /* Offset for mobile top bar — hidden on desktop */
      }}>
        {children}
      </div>
    </div>
  );
}

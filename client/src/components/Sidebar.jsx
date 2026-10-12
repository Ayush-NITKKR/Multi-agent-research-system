import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Sparkles,
  LayoutDashboard,
  History,
  Activity,
  PlusCircle,
  LogOut,
  User,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Sidebar = ({ isMobileOpen, setIsMobileOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Research History", path: "/history", icon: History },
    { label: "Pipeline Status", path: "/status", icon: Activity },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            zIndex: 40,
          }}
        />
      )}

      <aside
        style={{
          width: "280px",
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--border-subtle)",
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          position: "sticky",
          top: 0,
          zIndex: 50,
          transition: "transform var(--transition-normal)",
          transform: isMobileOpen ? "translateX(0)" : undefined,
        }}
        className={isMobileOpen ? "sidebar-mobile-open" : ""}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: "1.5rem 1.25rem",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "var(--radius-sm)",
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: "0 0 15px rgba(99, 102, 241, 0.4)",
            }}
          >
            <Sparkles size={20} />
          </div>
          <div>
            <h1
              style={{
                fontSize: "1.125rem",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "#ffffff",
                lineHeight: 1.2,
              }}
            >
              Research<span style={{ color: "var(--accent-primary)" }}>AI</span>
            </h1>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Multi-Agent Intelligence
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div style={{ padding: "1.25rem" }}>
          <button
            onClick={() => {
              navigate("/dashboard");
              if (setIsMobileOpen) setIsMobileOpen(false);
            }}
            className="btn btn-primary"
            style={{ width: "100%", padding: "0.75rem 1rem" }}
          >
            <PlusCircle size={18} />
            <span>New Research</span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav style={{ flex: 1, padding: "0 0.75rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem 1rem",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: isActive ? "#ffffff" : "var(--text-secondary)",
                  background: isActive ? "rgba(99, 102, 241, 0.12)" : "transparent",
                  border: isActive ? "1px solid rgba(99, 102, 241, 0.25)" : "1px solid transparent",
                  transition: "var(--transition-fast)",
                }}
              >
                <Icon size={18} color={isActive ? "var(--accent-primary)" : "var(--text-muted)"} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Pipeline Architecture Indicator */}
        <div
          style={{
            margin: "0 1rem 1rem 1rem",
            padding: "0.875rem",
            background: "var(--bg-card)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-subtle)",
            fontSize: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Agent Stack Active</span>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.7rem", lineHeight: 1.4 }}>
            Mistral-3B • Tavily • BeautifulSoup • Critic Fact-Check
          </p>
        </div>

        {/* User Profile & Logout */}
        <div
          style={{
            padding: "1rem 1.25rem",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(10, 12, 18, 0.4)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", minWidth: 0 }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-secondary)",
                flexShrink: 0,
              }}
            >
              <User size={16} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user?.name || "Researcher"}
              </p>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "0.375rem",
              borderRadius: "var(--radius-xs)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "color var(--transition-fast)",
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = "var(--color-danger)")}
            onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    </>
  );
};

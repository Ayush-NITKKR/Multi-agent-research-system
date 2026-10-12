import React from "react";
import { Menu, ShieldCheck, Zap } from "lucide-react";

export const Header = ({ onMenuClick, title, subtitle }) => {
  return (
    <header
      style={{
        padding: "1rem 2.5rem",
        borderBottom: "1px solid var(--border-subtle)",
        background: "rgba(14, 17, 26, 0.6)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <button
          onClick={onMenuClick}
          className="btn-ghost"
          style={{
            display: "none",
            padding: "0.5rem",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-subtle)",
            cursor: "pointer",
          }}
          id="mobile-menu-btn"
        >
          <Menu size={20} />
        </button>
        <div>
          {title && (
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-0.01em",
              }}
            >
              {title}
            </h2>
          )}
          {subtitle && (
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.35rem 0.75rem",
            background: "rgba(99, 102, 241, 0.08)",
            border: "1px solid rgba(99, 102, 241, 0.2)",
            borderRadius: "var(--radius-full)",
            fontSize: "0.75rem",
            color: "#a5b4fc",
          }}
        >
          <Zap size={14} color="#818cf8" />
          <span>Mistral AI 3B + Tavily Real-Time</span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.35rem 0.75rem",
            background: "rgba(16, 185, 129, 0.08)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            borderRadius: "var(--radius-full)",
            fontSize: "0.75rem",
            color: "#6ee7b7",
          }}
        >
          <ShieldCheck size={14} color="#10b981" />
          <span>Critic Verified</span>
        </div>
      </div>
    </header>
  );
};

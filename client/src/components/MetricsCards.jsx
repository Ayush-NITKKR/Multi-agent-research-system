import React from "react";
import { Layers, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

export const MetricsCards = ({ metrics = {}, loading = false }) => {
  const { total = 0, completed = 0, inProgress = 0, failed = 0 } = metrics;

  const cards = [
    {
      label: "Total Researches",
      value: total,
      icon: Layers,
      color: "var(--accent-primary)",
      bgColor: "rgba(99, 102, 241, 0.12)",
      borderColor: "rgba(99, 102, 241, 0.25)",
      subtext: "All submitted research queries",
    },
    {
      label: "Completed Reports",
      value: completed,
      icon: CheckCircle2,
      color: "var(--color-success)",
      bgColor: "var(--color-success-bg)",
      borderColor: "rgba(16, 185, 129, 0.25)",
      subtext: `${total > 0 ? Math.round((completed / total) * 100) : 0}% success rate`,
    },
    {
      label: "Active Pipelines",
      value: inProgress,
      icon: Clock,
      color: "var(--color-info)",
      bgColor: "var(--color-info-bg)",
      borderColor: "rgba(6, 182, 212, 0.25)",
      subtext: "Currently executing agents",
    },
    {
      label: "Failed or Retried",
      value: failed,
      icon: AlertTriangle,
      color: failed > 0 ? "var(--color-danger)" : "var(--text-muted)",
      bgColor: failed > 0 ? "var(--color-danger-bg)" : "rgba(255, 255, 255, 0.03)",
      borderColor: failed > 0 ? "rgba(239, 68, 68, 0.25)" : "var(--border-subtle)",
      subtext: "Recoverable via one-click retry",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "1.25rem",
        marginBottom: "2rem",
      }}
    >
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="card"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.875rem",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                {card.label}
              </span>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "var(--radius-sm)",
                  background: card.bgColor,
                  border: `1px solid ${card.borderColor}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: card.color,
                }}
              >
                <Icon size={18} />
              </div>
            </div>

            <div>
              <p
                style={{
                  fontSize: "1.875rem",
                  fontWeight: 800,
                  color: "#ffffff",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                }}
              >
                {loading ? "..." : card.value}
              </p>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
                {card.subtext}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

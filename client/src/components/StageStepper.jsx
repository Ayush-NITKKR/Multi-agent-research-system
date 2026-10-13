import React from "react";
import {
  Clock,
  Search,
  Globe,
  FileText,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";

export const StageStepper = ({ status, currentStage, error, progress = 0 }) => {
  const stages = [
    { key: "queued", label: "Queued", icon: Clock, desc: "Submitted to agent pipeline" },
    { key: "searching", label: "Web Search", icon: Search, desc: "Tavily web discovery & filtering" },
    { key: "scraping", label: "Web Scraping", icon: Globe, desc: "BeautifulSoup deep article reading" },
    { key: "writing", label: "Report Synthesis", icon: FileText, desc: "Writer chain generating structured report" },
    { key: "reviewing", label: "Critic Review", icon: ShieldCheck, desc: "Fact-checker evaluating claims & citations" },
    { key: "revising", label: "Revision", icon: RefreshCw, desc: "Addressing critic feedback (if needed)" },
    { key: "completed", label: "Completed", icon: CheckCircle, desc: "Final report verified and persisted" },
  ];

  const getStageIndex = (currentStatus) => {
    switch (currentStatus) {
      case "queued": return 0;
      case "searching": return 1;
      case "scraping": return 2;
      case "writing": return 3;
      case "reviewing": return 4;
      case "revising": return 5;
      case "needs_rerun": return 5;
      case "completed": return 6;
      case "failed": return -1;
      default: return 0;
    }
  };

  const currentIndex = getStageIndex(status);
  const isNeedsRerun = status === "needs_rerun";

  return (
    <div
      className="card"
      style={{
        padding: "2rem",
        marginBottom: "2rem",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#ffffff" }}>
            Pipeline Execution Flow
          </h3>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
            Current Activity:{" "}
            <strong
              style={{
                color:
                  status === "failed"
                    ? "var(--color-danger)"
                    : isNeedsRerun
                    ? "var(--color-warning)"
                    : status === "completed"
                    ? "var(--color-success)"
                    : "var(--accent-primary)",
              }}
            >
              {currentStage || (isNeedsRerun ? "Quality gate failed - Needs rerun" : status)}
            </strong>
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <span
            style={{
              fontSize: "1.25rem",
              fontWeight: 800,
              color:
                status === "completed"
                  ? "#10b981"
                  : isNeedsRerun
                  ? "#fbbf24"
                  : status === "failed"
                  ? "#f87171"
                  : "var(--accent-primary)",
            }}
          >
            {status === "completed" || isNeedsRerun ? 100 : progress}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          height: "6px",
          width: "100%",
          background: "var(--bg-input)",
          borderRadius: "var(--radius-full)",
          overflow: "hidden",
          marginBottom: "2rem",
          position: "relative",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${status === "completed" ? 100 : progress}%`,
            background: status === "failed"
              ? "var(--color-danger)"
              : "linear-gradient(90deg, #6366f1 0%, #06b6d4 100%)",
            transition: "width 0.4s ease-in-out",
            borderRadius: "var(--radius-full)",
            boxShadow: "0 0 12px rgba(99, 102, 241, 0.5)",
          }}
        />
      </div>

      {/* Stepper items */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "0.75rem",
        }}
      >
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          const isDone = currentIndex > idx || status === "completed";
          const isCurrent = currentIndex === idx && status !== "completed" && status !== "failed";
          const isFailed = status === "failed" && currentIndex === idx;

          let color = "var(--text-muted)";
          let bg = "rgba(255, 255, 255, 0.02)";
          let border = "var(--border-subtle)";

          if (isDone) {
            color = "var(--color-success)";
            bg = "var(--color-success-bg)";
            border = "rgba(16, 185, 129, 0.3)";
          } else if (isCurrent) {
            color = "var(--accent-primary)";
            bg = "rgba(99, 102, 241, 0.12)";
            border = "rgba(99, 102, 241, 0.4)";
          } else if (isFailed) {
            color = "var(--color-danger)";
            bg = "var(--color-danger-bg)";
            border = "rgba(239, 68, 68, 0.4)";
          }

          return (
            <div
              key={stage.key}
              style={{
                padding: "0.875rem 0.75rem",
                borderRadius: "var(--radius-sm)",
                background: bg,
                border: `1px solid ${border}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: "0.5rem",
                transition: "var(--transition-fast)",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: isDone ? "var(--color-success)" : isCurrent ? "var(--accent-primary)" : "var(--bg-input)",
                  color: isDone || isCurrent ? "#ffffff" : "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isCurrent ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Icon size={16} />
                )}
              </div>
              <p
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: isCurrent || isDone ? 600 : 500,
                  color: isDone ? "var(--text-primary)" : color,
                }}
              >
                {stage.label}
              </p>
              <p style={{ fontSize: "0.6875rem", color: "var(--text-muted)", lineHeight: 1.3 }}>
                {stage.desc}
              </p>
            </div>
          );
        })}
      </div>

      {error && (
        <div
          style={{
            marginTop: "1.5rem",
            padding: "1rem",
            borderRadius: "var(--radius-sm)",
            background: "var(--color-danger-bg)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <AlertCircle size={20} color="var(--color-danger)" style={{ flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#fca5a5" }}>
              Pipeline Execution Error
            </p>
            <p style={{ fontSize: "0.8125rem", color: "#f87171" }}>
              {error}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

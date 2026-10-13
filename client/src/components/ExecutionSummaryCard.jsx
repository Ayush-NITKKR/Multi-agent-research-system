import React from "react";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Layers,
  Globe,
  ShieldCheck,
  RefreshCw,
  Award,
} from "lucide-react";

export const ExecutionSummaryCard = ({ job }) => {
  if (!job) {
    return (
      <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "var(--text-secondary)" }}>No execution record available.</p>
      </div>
    );
  }

  const {
    status = "completed",
    sources = [],
    criticFeedback = {},
    revisions = [],
    executionMetadata = {},
    createdAt,
    updatedAt,
    error,
  } = job;

  const score = typeof criticFeedback.score === "number" ? criticFeedback.score : 0;
  const criticalIssues = criticFeedback.critical_issues || [];
  const verdict = criticFeedback.verdict || "UNKNOWN";
  const criteria = criticFeedback.criteria || {
    factual_accuracy: 0,
    source_quality: 0,
    completeness: 0,
    reasoning: 0,
    clarity: 0,
  };

  const isCompleted = status === "completed";
  const isNeedsRerun = status === "needs_rerun";
  const isFailed = status === "failed";

  // Duration formatting
  const durationMs =
    executionMetadata?.duration_ms ||
    (createdAt && updatedAt ? new Date(updatedAt).getTime() - new Date(createdAt).getTime() : 0);
  const durationSec = Math.max(1, Math.round(durationMs / 1000));
  const formattedDuration =
    durationSec > 60
      ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`
      : `${durationSec}s`;

  // Unique domains
  const uniqueDomains = Array.from(
    new Set(
      sources
        .map((s) => {
          if (s.domain) return s.domain;
          try {
            return new URL(s.url).hostname.replace(/^www\./, "");
          } catch {
            return "external-source";
          }
        })
        .filter(Boolean)
    )
  );

  // Revision count
  const revisionCount = executionMetadata?.revision_count || revisions?.length || 0;

  // Stages audit
  const stages = [
    {
      name: "Tavily Web Search",
      desc: `Returned candidate search results from the configured search provider`,
      status: "completed",
    },
    {
      name: "BeautifulSoup Content Ingestion",
      desc: `Scraped readable text after URL safety checks`,
      status: isFailed && !sources.length ? "failed" : "completed",
    },
    {
      name: "Synthesis Writer Chain",
      desc: `Synthesized the current structured research draft`,
      status: isFailed && !job.report ? "failed" : "completed",
    },
    {
      name: "Critic Fact-Checking & Scoring",
      desc: `Evaluated the draft against 5 rubric criteria (${score.toFixed(1)}/10)`,
      status: criticFeedback.score !== undefined ? "completed" : "failed",
    },
    {
      name: "Quality Gate & Revision Loop",
      desc:
        isCompleted
          ? `Gate passed: score >= 8.0 and 0 critical issues (${revisionCount} revisions)`
          : isNeedsRerun
          ? `Gate failed after ${revisionCount} revision(s): score ${score.toFixed(1)}/10 or critical issues remain`
          : `Pipeline interrupted: ${error || "Execution failed"}`,
      status: isCompleted ? "completed" : isNeedsRerun ? "rejected" : "failed",
    },
  ];

  // Why Approved or Rejected narrative
  const getVerdictExplanation = () => {
    if (isCompleted) {
      return {
        badge: "Quality Gate Passed (Approved)",
        badgeClass: "badge-approved",
        icon: <CheckCircle2 size={18} color="var(--color-success)" />,
        bg: "rgba(16, 185, 129, 0.08)",
        border: "rgba(16, 185, 129, 0.35)",
        title: "Report Approved for Publication",
        explanation: `The report satisfied all quality gate requirements: verified weighted score of ${score.toFixed(
          1
        )}/10 meets the minimum 8.0 threshold, 0 critical issues were identified, and the critic returned an ${verdict} verdict.`,
      };
    }
    if (isNeedsRerun) {
      return {
        badge: "Quality Gate Failed (Needs Rerun)",
        badgeClass: "badge-needs-rerun",
        icon: <AlertTriangle size={18} color="#fbbf24" />,
        bg: "rgba(245, 158, 11, 0.08)",
        border: "rgba(245, 158, 11, 0.35)",
        title: "Report Did Not Meet Quality Threshold",
        explanation: `The report failed the quality gate because ${
          score < 8.0 ? `its score of ${score.toFixed(1)}/10 is below the 8.0 requirement` : ""
        }${
          score < 8.0 && criticalIssues.length > 0 ? " and " : ""
        }${
          criticalIssues.length > 0
            ? `${criticalIssues.length} unresolved critical issue(s) remain (${criticalIssues.join("; ")})`
            : ""
        } after exhausting ${revisionCount} permitted revision attempts. A user rerun is required.`,
      };
    }
    return {
      badge: "Pipeline Failed",
      badgeClass: "badge-needs-revision",
      icon: <XCircle size={18} color="var(--color-danger)" />,
      bg: "rgba(239, 68, 68, 0.08)",
      border: "rgba(239, 68, 68, 0.35)",
      title: "Execution Error Encountered",
      explanation: error || "The research workflow encountered an unexpected failure during agent execution.",
    };
  };

  const verdictData = getVerdictExplanation();

  return (
    <div className="card animate-fade-in" style={{ padding: "2rem", background: "var(--bg-surface)" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
          borderBottom: "1px solid var(--border-subtle)",
          paddingBottom: "1.25rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span
              style={{
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontWeight: 700,
                color: "var(--color-info)",
                background: "rgba(6, 182, 212, 0.12)",
                padding: "0.2rem 0.6rem",
                borderRadius: "var(--radius-xs)",
              }}
            >
              System Execution Audit
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <Clock size={12} />
              Total runtime: {formattedDuration}
            </span>
          </div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#ffffff" }}>
            Execution Summary
          </h2>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
            Audit log of sources collected, pipeline stages traversed, critic evaluations, and quality gate rationale.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span className={`badge ${verdictData.badgeClass}`} style={{ fontSize: "0.8125rem", padding: "0.4rem 0.85rem" }}>
            {verdictData.badge}
          </span>
        </div>
      </div>

      {/* 1. Quality Gate Verdict Explanation Banner */}
      <div
        className="card"
        style={{
          background: verdictData.bg,
          border: `1px solid ${verdictData.border}`,
          padding: "1.25rem 1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
          <div style={{ marginTop: "0.15rem" }}>{verdictData.icon}</div>
          <div>
            <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#ffffff", marginBottom: "0.25rem" }}>
              {verdictData.title}
            </h4>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
              {verdictData.explanation}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Top Metric Tiles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "1.75rem",
        }}
      >
        <div className="card" style={{ background: "rgba(14, 17, 26, 0.7)", padding: "1.1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700 }}>
            <Globe size={14} color="var(--color-info)" />
            <span>Sources Ingested</span>
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#ffffff", marginTop: "0.4rem" }}>
            {sources.length}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
            {uniqueDomains.length} unique domains
          </div>
        </div>

        <div className="card" style={{ background: "rgba(14, 17, 26, 0.7)", padding: "1.1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700 }}>
            <Award size={14} color={score >= 8.0 ? "var(--color-success)" : "#fbbf24"} />
            <span>Validated Score</span>
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: score >= 8.0 ? "var(--color-success)" : "#fbbf24", marginTop: "0.4rem" }}>
            {score.toFixed(1)} <span style={{ fontSize: "0.875rem", color: "var(--text-muted)", fontWeight: 500 }}>/ 10</span>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
            Threshold: 8.0 / 10
          </div>
        </div>

        <div className="card" style={{ background: "rgba(14, 17, 26, 0.7)", padding: "1.1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700 }}>
            <RefreshCw size={14} color="var(--accent-primary)" />
            <span>Revisions Run</span>
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#ffffff", marginTop: "0.4rem" }}>
            {revisionCount} <span style={{ fontSize: "0.875rem", color: "var(--text-muted)", fontWeight: 500 }}>/ 2 max</span>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
            {revisions.length > 0 ? `Final draft rev #${revisions.length}` : "Initial draft"}
          </div>
        </div>

        <div className="card" style={{ background: "rgba(14, 17, 26, 0.7)", padding: "1.1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700 }}>
            <Clock size={14} color="var(--color-warning)" />
            <span>Execution Time</span>
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#ffffff", marginTop: "0.4rem" }}>
            {formattedDuration}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
            {createdAt ? new Date(createdAt).toLocaleTimeString() : "N/A"}
          </div>
        </div>
      </div>

      {/* 3. Pipeline Stages Audit & Critic Rubric Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {/* Left: Stages Completed or Failed */}
        <div
          className="card"
          style={{
            background: "rgba(14, 17, 26, 0.5)",
            border: "1px solid var(--border-subtle)",
            padding: "1.35rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <Layers size={16} color="var(--accent-primary)" />
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#ffffff" }}>
              Pipeline Stages Completed or Failed
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {stages.map((stg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  padding: "0.75rem",
                  background: "rgba(255, 255, 255, 0.02)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ marginTop: "0.15rem" }}>
                  {stg.status === "completed" && <CheckCircle2 size={16} color="var(--color-success)" />}
                  {stg.status === "rejected" && <AlertTriangle size={16} color="#fbbf24" />}
                  {stg.status === "failed" && <XCircle size={16} color="var(--color-danger)" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#ffffff" }}>
                      {i + 1}. {stg.name}
                    </span>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        color:
                          stg.status === "completed"
                            ? "var(--color-success)"
                            : stg.status === "rejected"
                            ? "#fbbf24"
                            : "var(--color-danger)",
                      }}
                    >
                      {stg.status}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                    {stg.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Critic Scores & Rubric Breakdown */}
        <div
          className="card"
          style={{
            background: "rgba(14, 17, 26, 0.5)",
            border: "1px solid var(--border-subtle)",
            padding: "1.35rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <ShieldCheck size={16} color="var(--color-success)" />
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#ffffff" }}>
              Critic Rubric & Score Breakdown
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {[
              { key: "factual_accuracy", label: "Factual Accuracy & Evidence", weight: "30%", val: criteria.factual_accuracy },
              { key: "source_quality", label: "Source Quality & Citations", weight: "25%", val: criteria.source_quality },
              { key: "completeness", label: "Completeness of Findings", weight: "20%", val: criteria.completeness },
              { key: "reasoning", label: "Reasoning & Consistency", weight: "15%", val: criteria.reasoning },
              { key: "clarity", label: "Clarity & Dossier Structure", weight: "10%", val: criteria.clarity },
            ].map((crit) => {
              const numVal = typeof crit.val === "number" ? crit.val : 0;
              const pct = Math.min(100, Math.max(0, numVal * 10));
              const barColor =
                numVal >= 8 ? "var(--color-success)" : numVal >= 6 ? "#fbbf24" : "var(--color-danger)";

              return (
                <div key={crit.key}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "0.8125rem",
                      marginBottom: "0.3rem",
                    }}
                  >
                    <span style={{ color: "var(--text-secondary)" }}>
                      {crit.label} <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>({crit.weight})</span>
                    </span>
                    <span style={{ fontWeight: 700, color: "#ffffff" }}>
                      {numVal.toFixed(1)} / 10
                    </span>
                  </div>
                  <div
                    style={{
                      height: "6px",
                      background: "rgba(255, 255, 255, 0.06)",
                      borderRadius: "var(--radius-full)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: barColor,
                        borderRadius: "var(--radius-full)",
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Consulted Domains Chips */}
          {uniqueDomains.length > 0 && (
            <div style={{ marginTop: "1.25rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                Consulted Domains ({uniqueDomains.length})
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.5rem" }}>
                {uniqueDomains.slice(0, 8).map((domain, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: "0.75rem",
                      background: "rgba(99, 102, 241, 0.1)",
                      border: "1px solid rgba(99, 102, 241, 0.25)",
                      color: "#c7d2fe",
                      padding: "0.15rem 0.5rem",
                      borderRadius: "var(--radius-xs)",
                    }}
                  >
                    {domain}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

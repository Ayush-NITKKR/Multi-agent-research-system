import React from "react";
import {
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ListChecks,
  HelpCircle,
  Lightbulb,
  Award,
  History,
  FileText,
} from "lucide-react";

export const CriticFeedbackCard = ({ criticFeedback, revisions = [] }) => {
  if (!criticFeedback || (!criticFeedback.verdict && criticFeedback.score === undefined)) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
        <ShieldCheck size={36} color="var(--text-muted)" style={{ margin: "0 auto 1rem auto" }} />
        <p style={{ color: "var(--text-secondary)", fontWeight: 500 }}>No critic evaluation available yet.</p>
        <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem", marginTop: "0.25rem" }}>
          The fact-checker critic chain runs automatically once the writer drafts the report.
        </p>
      </div>
    );
  }

  const {
    score = 0,
    criteria = {},
    critical_issues = [],
    verdict = "NEEDS REVISION",
    strengths = [],
    issues = [],
    missing_information = [],
    recommendations = [],
    raw_feedback,
  } = criticFeedback;

  const isApproved = verdict === "APPROVED" && score >= 8.0 && critical_issues.length === 0;

  const criterionDefinitions = [
    {
      key: "factual_accuracy",
      label: "Factual Accuracy & Evidence",
      weight: "30%",
      desc: "Supported by collected research without hallucination",
    },
    {
      key: "source_quality",
      label: "Source Quality & Citations",
      weight: "25%",
      desc: "Reputable sources and valid citation support",
    },
    {
      key: "completeness",
      label: "Completeness",
      weight: "20%",
      desc: "Depth and coverage of key topic dimensions",
    },
    {
      key: "reasoning",
      label: "Reasoning & Consistency",
      weight: "15%",
      desc: "Sound logical structure without contradictions",
    },
    {
      key: "clarity",
      label: "Clarity & Structure",
      weight: "10%",
      desc: "Organization, readability, and sectioning",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Overall Score & Verdict Banner */}
      <div
        className="card"
        style={{
          padding: "1.75rem",
          background: isApproved
            ? "linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(14, 17, 26, 0.9) 100%)"
            : "linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(14, 17, 26, 0.9) 100%)",
          border: `1px solid ${isApproved ? "rgba(16, 185, 129, 0.35)" : "rgba(239, 68, 68, 0.35)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1.25rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          {/* Score Badge */}
          <div
            style={{
              minWidth: "72px",
              height: "72px",
              borderRadius: "var(--radius-md)",
              background: isApproved ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
              border: `2px solid ${isApproved ? "var(--color-success)" : "var(--color-danger)"}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "0.25rem",
            }}
          >
            <span
              style={{
                fontSize: "1.5rem",
                fontWeight: 800,
                color: isApproved ? "#34d399" : "#f87171",
                lineHeight: 1,
              }}
            >
              {typeof score === "number" ? score.toFixed(1) : score}
            </span>
            <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginTop: "2px" }}>
              out of 10
            </span>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
                Quality Gate Status
              </span>
              <span className={`badge ${isApproved ? "badge-approved" : "badge-needs-rerun"}`}>
                {isApproved ? "APPROVED (PASS)" : "NEEDS REVISION / RERUN"}
              </span>
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#ffffff", marginTop: "0.35rem" }}>
              {isApproved
                ? "Quality Gate Passed: Report meets 8.0 threshold with 0 critical issues."
                : `Quality Gate Not Passed: ${
                    critical_issues.length > 0
                      ? `${critical_issues.length} critical issue(s) flagged.`
                      : `Score ${score.toFixed(1)}/10 is below the 8.0 requirement.`
                  }`}
            </h3>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              Weighted Rubric: Accuracy (30%) + Sources (25%) + Completeness (20%) + Reasoning (15%) + Clarity (10%)
            </p>
          </div>
        </div>

        {revisions.length > 0 && (
          <div
            style={{
              padding: "0.5rem 0.85rem",
              borderRadius: "var(--radius-sm)",
              background: "rgba(0,0,0,0.4)",
              border: "1px solid var(--border-subtle)",
              fontSize: "0.8125rem",
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <History size={14} color="var(--accent-primary)" />
            <span>Revisions Executed: <strong style={{ color: "#ffffff" }}>{revisions.length}</strong></span>
          </div>
        )}
      </div>

      {/* Critical Issues Section (Highlighted if any) */}
      {critical_issues.length > 0 && (
        <div
          className="card animate-fade-in"
          style={{
            padding: "1.25rem 1.5rem",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
            <AlertTriangle size={20} color="var(--color-danger)" />
            <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#fca5a5" }}>
              Critical Blocking Issues ({critical_issues.length})
            </h4>
          </div>
          <p style={{ fontSize: "0.8125rem", color: "#f87171", marginBottom: "0.75rem" }}>
            These critical findings prevent the report from passing the quality gate:
          </p>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem", paddingLeft: "0" }}>
            {critical_issues.map((issue, idx) => (
              <li
                key={idx}
                style={{
                  fontSize: "0.8125rem",
                  color: "#fecaca",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.5rem",
                  lineHeight: 1.5,
                }}
              >
                <span style={{ color: "var(--color-danger)", fontWeight: 800 }}>✕</span>
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Criterion Breakdown Grid */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
          <Award size={18} color="var(--accent-primary)" />
          <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#ffffff" }}>
            Criterion-Level Score Breakdown
          </h4>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
          }}
        >
          {criterionDefinitions.map((crit) => {
            const rawVal = criteria[crit.key];
            const val = typeof rawVal === "number" ? rawVal : 0;
            const percentage = Math.min(100, Math.max(0, val * 10));
            const barColor =
              val >= 8.0
                ? "var(--color-success)"
                : val >= 6.0
                ? "var(--color-warning)"
                : "var(--color-danger)";

            return (
              <div
                key={crit.key}
                style={{
                  padding: "1rem",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--border-subtle)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#ffffff" }}>
                    {crit.label}
                  </span>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      padding: "0.15rem 0.4rem",
                      borderRadius: "var(--radius-full)",
                      background: "rgba(255, 255, 255, 0.05)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {crit.weight}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem" }}>
                  <span style={{ fontSize: "1.25rem", fontWeight: 800, color: barColor }}>
                    {val.toFixed(1)}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>/ 10</span>
                </div>

                {/* Progress Meter */}
                <div
                  style={{
                    height: "4px",
                    width: "100%",
                    background: "rgba(255, 255, 255, 0.08)",
                    borderRadius: "var(--radius-full)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${percentage}%`,
                      background: barColor,
                      borderRadius: "var(--radius-full)",
                    }}
                  />
                </div>

                <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)", lineHeight: 1.3 }}>
                  {crit.desc}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid of Other Critic Findings */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.25rem" }}>
        {/* Identified Strengths */}
        {strengths.length > 0 && (
          <div className="card" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <CheckCircle2 size={18} color="var(--color-success)" />
              <h4 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#ffffff" }}>
                Identified Strengths
              </h4>
            </div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {strengths.map((str, idx) => (
                <li
                  key={idx}
                  style={{
                    fontSize: "0.8125rem",
                    color: "#cbd5e1",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                    lineHeight: 1.5,
                  }}
                >
                  <span style={{ color: "var(--color-success)", fontWeight: 700 }}>✓</span>
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* General Issues Found */}
        {issues.length > 0 && (
          <div className="card" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <AlertCircle size={18} color="var(--color-warning)" />
              <h4 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#ffffff" }}>
                Issues & Flaws Noted
              </h4>
            </div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {issues.map((iss, idx) => (
                <li
                  key={idx}
                  style={{
                    fontSize: "0.8125rem",
                    color: "#cbd5e1",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                    lineHeight: 1.5,
                  }}
                >
                  <span style={{ color: "var(--color-warning)", fontWeight: 700 }}>•</span>
                  <span>{iss}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Missing Information */}
        {missing_information.length > 0 && (
          <div className="card" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <HelpCircle size={18} color="var(--color-info)" />
              <h4 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#ffffff" }}>
                Missing Information & Gaps
              </h4>
            </div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {missing_information.map((m, idx) => (
                <li
                  key={idx}
                  style={{
                    fontSize: "0.8125rem",
                    color: "#cbd5e1",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                    lineHeight: 1.5,
                  }}
                >
                  <span style={{ color: "var(--color-info)", fontWeight: 700 }}>•</span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="card" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <Lightbulb size={18} color="#a855f7" />
              <h4 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#ffffff" }}>
                Recommended Improvements
              </h4>
            </div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {recommendations.map((rec, idx) => (
                <li
                  key={idx}
                  style={{
                    fontSize: "0.8125rem",
                    color: "#cbd5e1",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                    lineHeight: 1.5,
                  }}
                >
                  <span style={{ color: "#a855f7", fontWeight: 700 }}>•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Revision History Section */}
      {revisions.length > 0 && (
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <History size={18} color="var(--accent-primary)" />
            <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#ffffff" }}>
              Revision History ({revisions.length} Iteration{revisions.length > 1 ? "s" : ""})
            </h4>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {revisions.map((rev, idx) => (
              <div
                key={idx}
                style={{
                  padding: "0.875rem 1rem",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--border-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <FileText size={16} color="var(--text-muted)" />
                  <div>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#ffffff" }}>
                      Draft {rev.revision_number}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                      Verdict: {rev.verdict || "NEEDS REVISION"}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  {typeof rev.score === "number" && (
                    <span
                      style={{
                        fontSize: "0.8125rem",
                        fontWeight: 700,
                        color: rev.score >= 8.0 ? "var(--color-success)" : "var(--color-warning)",
                      }}
                    >
                      Score: {rev.score.toFixed(1)}/10
                    </span>
                  )}
                  {rev.timestamp && (
                    <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>
                      {new Date(rev.timestamp).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw Critic Review Accordion */}
      {raw_feedback && (
        <details
          className="card"
          style={{
            padding: "1rem 1.25rem",
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            cursor: "pointer",
          }}
        >
          <summary style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            View Full Raw Critic Transcript
          </summary>
          <pre
            style={{
              marginTop: "1rem",
              padding: "1rem",
              background: "#0a0c13",
              borderRadius: "var(--radius-sm)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
              color: "#94a3b8",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {raw_feedback}
          </pre>
        </details>
      )}
    </div>
  );
};

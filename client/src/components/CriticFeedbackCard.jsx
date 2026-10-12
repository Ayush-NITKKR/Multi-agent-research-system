import React from "react";
import { ShieldCheck, AlertCircle, CheckCircle2, ListChecks, HelpCircle, Lightbulb } from "lucide-react";

export const CriticFeedbackCard = ({ criticFeedback, revisions = [] }) => {
  if (!criticFeedback || !criticFeedback.verdict) {
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

  const { verdict, strengths = [], issues = [], missing_information = [], recommendations = [], raw_feedback } = criticFeedback;
  const isApproved = verdict === "APPROVED";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Verdict Banner */}
      <div
        className="card"
        style={{
          padding: "1.5rem",
          background: isApproved ? "rgba(16, 185, 129, 0.08)" : "rgba(245, 158, 11, 0.08)",
          border: `1px solid ${isApproved ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: isApproved ? "var(--color-success-bg)" : "var(--color-warning-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isApproved ? "var(--color-success)" : "var(--color-warning)",
            }}
          >
            {isApproved ? <ShieldCheck size={24} /> : <AlertCircle size={24} />}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 600 }}>
                Critic Chain Fact-Check Verdict
              </span>
              <span className={`badge ${isApproved ? "badge-approved" : "badge-needs-revision"}`}>
                {verdict}
              </span>
            </div>
            <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#ffffff", marginTop: "0.25rem" }}>
              {isApproved
                ? "The research report meets quality, factual support, and citation standards."
                : "The critic identified gaps or missing citations that required iterative refinement."}
            </h3>
          </div>
        </div>

        {revisions.length > 0 && (
          <div
            style={{
              padding: "0.4rem 0.75rem",
              borderRadius: "var(--radius-sm)",
              background: "rgba(0,0,0,0.3)",
              border: "1px solid var(--border-subtle)",
              fontSize: "0.75rem",
              color: "var(--text-secondary)",
            }}
          >
            Revisions Completed: <strong style={{ color: "#ffffff" }}>{revisions.length}</strong>
          </div>
        )}
      </div>

      {/* Grid of Critic Findings */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
        {/* Strengths */}
        {strengths.length > 0 && (
          <div className="card" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <CheckCircle2 size={18} color="var(--color-success)" />
              <h4 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#ffffff" }}>
                Identified Strengths
              </h4>
            </div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
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
                  <span style={{ color: "var(--color-success)", fontWeight: 700 }}>•</span>
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Issues Found */}
        {issues.length > 0 && (
          <div className="card" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <AlertCircle size={18} color="var(--color-warning)" />
              <h4 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#ffffff" }}>
                Issues & Vulnerabilities Flagged
              </h4>
            </div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
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
                Missing Information
              </h4>
            </div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
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
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
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

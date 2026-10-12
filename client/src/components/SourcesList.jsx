import React, { useState } from "react";
import { ExternalLink, Copy, Check, Globe } from "lucide-react";

export const SourcesList = ({ sources = [] }) => {
  const [copiedUrl, setCopiedUrl] = useState(null);

  const handleCopyUrl = (url) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  if (!sources || sources.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
        <Globe size={36} color="var(--text-muted)" style={{ margin: "0 auto 1rem auto" }} />
        <p style={{ color: "var(--text-secondary)", fontWeight: 500 }}>No sources linked to this report.</p>
        <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem", marginTop: "0.25rem" }}>
          Sources will appear here once the Tavily search and Reader agents complete.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
          Found <strong>{sources.length}</strong> verified web references & scraped pages:
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
        {sources.map((src, idx) => (
          <div
            key={idx}
            className="card"
            style={{
              padding: "1.25rem",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              transition: "var(--transition-fast)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
              <span
                style={{
                  fontSize: "0.6875rem",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  color: "#818cf8",
                  background: "rgba(99, 102, 241, 0.12)",
                  padding: "0.2rem 0.5rem",
                  borderRadius: "var(--radius-xs)",
                  letterSpacing: "0.05em",
                }}
              >
                {src.domain || "web-source"}
              </span>

              <button
                onClick={() => handleCopyUrl(src.url)}
                title="Copy link"
                style={{
                  background: "transparent",
                  border: "none",
                  color: copiedUrl === src.url ? "var(--color-success)" : "var(--text-muted)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: "0.25rem",
                  transition: "color var(--transition-fast)",
                }}
              >
                {copiedUrl === src.url ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>

            <h4
              style={{
                fontSize: "0.9375rem",
                fontWeight: 600,
                color: "#ffffff",
                lineHeight: 1.4,
              }}
            >
              {src.title || "External Reference"}
            </h4>

            {src.snippet && (
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "var(--text-secondary)",
                  lineHeight: 1.5,
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {src.snippet}
              </p>
            )}

            <div style={{ marginTop: "auto", paddingTop: "0.5rem", borderTop: "1px solid var(--border-subtle)" }}>
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: "0.75rem",
                  color: "var(--accent-primary)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  wordBreak: "break-all",
                }}
              >
                <span>Visit Source</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

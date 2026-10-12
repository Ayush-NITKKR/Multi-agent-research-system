import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { researchApi } from "../services/api";

const EXAMPLE_TOPICS = [
  "Impact of quantum computing on encryption algorithms",
  "Solid-state battery breakthroughs and commercialization in 2026",
  "Agentic AI workflows vs traditional microservice architectures",
  "Recent clinical trial results for mRNA cancer vaccines",
];

export const TopicSubmitForm = ({ onJobCreated }) => {
  const [topic, setTopic] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = topic.trim();
    if (!trimmed) {
      setError("Please enter a research topic to investigate.");
      return;
    }
    if (trimmed.length < 3) {
      setError("Research topic must be at least 3 characters long.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      const response = await researchApi.create(trimmed);
      if (response.success && response.job) {
        if (onJobCreated) onJobCreated(response.job);
        navigate(`/research/${response.job._id}`);
      } else {
        setError(response.error || "Failed to start research job.");
      }
    } catch (err) {
      setError(
        err.response?.data?.error || err.message || "Failed to initiate research pipeline."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="card"
      style={{
        background: "linear-gradient(180deg, #121626 0%, #0e111a 100%)",
        border: "1px solid var(--border-muted)",
        boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5), 0 0 25px -10px rgba(99,102,241,0.2)",
        marginBottom: "2.5rem",
        padding: "2rem",
      }}
    >
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
          <Sparkles size={18} color="var(--accent-primary)" />
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#ffffff" }}>
            Start Deep Agentic Research
          </h2>
        </div>
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
          Our multi-agent system uses Tavily for web search, BeautifulSoup for live scraping,
          Mistral 3B for synthesis, and fact-checking Critic chains.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            background: "var(--bg-input)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "0.5rem 0.625rem 0.5rem 1rem",
            alignItems: "center",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.4)",
          }}
        >
          <Search size={20} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What would you like to investigate? (e.g. Next-generation nuclear energy innovations...)"
            disabled={submitting}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: "var(--text-primary)",
              fontSize: "0.95rem",
              fontFamily: "var(--font-sans)",
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={submitting || !topic.trim()}
            className="btn btn-primary"
            style={{ padding: "0.625rem 1.25rem", borderRadius: "var(--radius-sm)" }}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Dispatching Agents...</span>
              </>
            ) : (
              <>
                <span>Launch Research</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div
          style={{
            marginTop: "0.875rem",
            padding: "0.625rem 0.875rem",
            borderRadius: "var(--radius-sm)",
            background: "var(--color-danger-bg)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#fca5a5",
            fontSize: "0.8125rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Suggested Topics */}
      <div style={{ marginTop: "1.25rem" }}>
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
          Example Inquiries
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {EXAMPLE_TOPICS.map((ex, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setTopic(ex)}
              disabled={submitting}
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-full)",
                padding: "0.35rem 0.75rem",
                color: "var(--text-secondary)",
                fontSize: "0.75rem",
                cursor: "pointer",
                transition: "var(--transition-fast)",
                textAlign: "left",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = "var(--accent-primary)";
                e.currentTarget.style.color = "#ffffff";
                e.currentTarget.style.background = "rgba(99, 102, 241, 0.08)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = "var(--border-subtle)";
                e.currentTarget.style.color = "var(--text-secondary)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
              }}
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

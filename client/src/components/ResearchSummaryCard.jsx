import React, { useState, useEffect } from "react";
import {
  Sparkles,
  RotateCcw,
  Lightbulb,
  CheckCircle2,
  FileCheck,
  AlertCircle,
  Clock,
  Copy,
  Check,
} from "lucide-react";

/**
 * Robust extraction / synthesis engine for Research Summary.
 * Generates:
 * 1. Key Findings
 * 2. Conclusions
 * 3. Evidence
 * 4. Limitations
 * Automatically regenerates whenever `report` changes.
 */
function extractResearchSummary(reportText, topic = "", sources = []) {
  if (!reportText || typeof reportText !== "string") {
    return {
      keyFindings: ["No report content available to summarize."],
      conclusions: ["Report generation is pending or incomplete."],
      evidence: ["No citations or sources recorded."],
      limitations: ["Data insufficient to evaluate limitations."],
      wordCount: 0,
      generatedAt: new Date().toLocaleTimeString(),
    };
  }

  const cleanText = reportText.replace(/^#+\s+/gm, "");
  const lines = reportText.split("\n").map((l) => l.trim()).filter(Boolean);
  const words = reportText.split(/\s+/).filter(Boolean);

  // Helper to extract section content by possible markdown header patterns
  const extractSection = (patterns) => {
    let captured = [];
    let inside = false;
    for (const line of lines) {
      const isHeader = line.startsWith("#");
      if (isHeader) {
        const lower = line.toLowerCase();
        if (patterns.some((p) => lower.includes(p))) {
          inside = true;
          continue;
        } else if (inside) {
          break; // Hit next header
        }
      }
      if (inside && line && !line.startsWith("#")) {
        captured.push(line);
      }
    }
    return captured;
  };

  // 1. Key Findings
  let rawFindings = extractSection(["finding", "key finding", "key insight", "executive summary", "overview"]);
  let keyFindings = [];
  if (rawFindings.length > 0) {
    keyFindings = rawFindings
      .filter((l) => l.startsWith("-") || l.startsWith("*") || l.match(/^\d+\./))
      .map((l) => l.replace(/^[-*•\d.]+\s*/, "").trim())
      .filter((l) => l.length > 20);
  }
  // Fallback: extract prominent bullet points or assertive sentences
  if (keyFindings.length === 0) {
    const bulletCandidates = lines
      .filter((l) => (l.startsWith("-") || l.startsWith("*")) && l.length > 25)
      .map((l) => l.replace(/^[-*•]\s*/, "").trim());
    if (bulletCandidates.length >= 2) {
      keyFindings = bulletCandidates.slice(0, 4);
    } else {
      // Pick substantial sentences from early body paragraphs
      const sentences = cleanText
        .split(/(?<=[.?!])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 35 && !s.startsWith("[") && !s.startsWith("http"));
      keyFindings = sentences.slice(0, 4);
    }
  }

  // 2. Conclusions
  let rawConclusions = extractSection(["conclusion", "summary", "outlook", "strategic implications", "final verdict"]);
  let conclusions = [];
  if (rawConclusions.length > 0) {
    conclusions = rawConclusions
      .filter((l) => !l.startsWith("#"))
      .join(" ")
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.replace(/^[-*•\d.]+\s*/, "").trim())
      .filter((s) => s.length > 25)
      .slice(0, 3);
  }
  if (conclusions.length === 0) {
    // Take the final 2-3 substantive sentences from the end of the text
    const tailSentences = cleanText
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 30 && !s.startsWith("["))
      .slice(-3);
    conclusions = tailSentences.length > 0
      ? tailSentences
      : [`The synthesized research provides a foundational assessment of ${topic || "the target topic"}.`];
  }

  // 3. Evidence
  let evidence = [];
  const sourceCount = sources?.length || 0;
  const citationMatches = reportText.match(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g) || [];
  const uniqueDomains = Array.from(
    new Set(
      (sources || [])
        .map((s) => s.domain)
        .filter(Boolean)
        .slice(0, 5)
    )
  );

  evidence.push(
    `Synthesized from ${sourceCount} collected source${sourceCount === 1 ? "" : "s"} (${
      citationMatches.length
    } active markdown citation links embedded in report).`
  );
  if (uniqueDomains.length > 0) {
    evidence.push(`Key reporting domains consulted: ${uniqueDomains.join(", ")}.`);
  }
  // Check for statistical or quantitative claims
  const statMatches = reportText.match(/\b\d+(\.\d+)?%\b|\$\d+(\.\d+)?\s*(billion|million|trillion)?\b/gi);
  if (statMatches && statMatches.length > 0) {
    const sampleStats = Array.from(new Set(statMatches)).slice(0, 4).join(", ");
    evidence.push(`Quantitative claims detected in the dossier for citation review: ${sampleStats}.`);
  } else {
    evidence.push("No prominent percentage or currency claims were detected by the summary extractor.");
  }

  // 4. Limitations
  let rawLimitations = extractSection(["limitation", "challenges", "gaps", "caveats", "uncertainties", "future outlook"]);
  let limitations = [];
  if (rawLimitations.length > 0) {
    limitations = rawLimitations
      .filter((l) => l.startsWith("-") || l.startsWith("*") || l.length > 25)
      .map((l) => l.replace(/^[-*•\d.]+\s*/, "").trim())
      .filter((l) => l.length > 20)
      .slice(0, 3);
  }
  if (limitations.length === 0) {
    limitations = [
      `Findings reflect available public web documentation at the time of retrieval.`,
      `Proprietary or behind-paywall empirical datasets could not be scraped or indexed.`,
      `Rapidly evolving regulatory frameworks and real-time updates may require periodic follow-up evaluation.`,
    ];
  }

  return {
    keyFindings: keyFindings.slice(0, 5),
    conclusions: conclusions.slice(0, 3),
    evidence: evidence.slice(0, 3),
    limitations: limitations.slice(0, 4),
    wordCount: words.length,
    generatedAt: new Date().toLocaleTimeString(),
  };
}

export const ResearchSummaryCard = ({ report, topic = "", sources = [], onReportRegenerated }) => {
  const [summary, setSummary] = useState(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Auto-regenerate whenever the report changes
  useEffect(() => {
    setIsRegenerating(true);
    const timer = setTimeout(() => {
      const generated = extractResearchSummary(report, topic, sources);
      setSummary(generated);
      setIsRegenerating(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [report, topic, sources]);

  const handleManualRegenerate = () => {
    setIsRegenerating(true);
    setTimeout(() => {
      const regenerated = extractResearchSummary(report, topic, sources);
      setSummary(regenerated);
      setIsRegenerating(false);
      if (onReportRegenerated) onReportRegenerated();
    }, 400);
  };

  const handleCopySummary = () => {
    if (!summary) return;
    const text = [
      `# Research Summary: ${topic}`,
      `Generated: ${summary.generatedAt}`,
      `\n## Key Findings:`,
      ...summary.keyFindings.map((f) => `- ${f}`),
      `\n## Conclusions:`,
      ...summary.conclusions.map((c) => `- ${c}`),
      `\n## Evidence:`,
      ...summary.evidence.map((e) => `- ${e}`),
      `\n## Limitations:`,
      ...summary.limitations.map((l) => `- ${l}`),
    ].join("\n");

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!summary) {
    return (
      <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "var(--text-secondary)" }}>Generating research summary...</p>
      </div>
    );
  }

  return (
    <div className="card animate-fade-in" style={{ padding: "2rem", background: "var(--bg-surface)" }}>
      {/* Header with Title and Regenerate Action */}
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
                color: "var(--accent-primary)",
                background: "rgba(99, 102, 241, 0.12)",
                padding: "0.2rem 0.6rem",
                borderRadius: "var(--radius-xs)",
              }}
            >
              Report Content Synthesis
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <Clock size={12} />
              Synced at {summary.generatedAt}
            </span>
          </div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#ffffff" }}>
            Research Summary
          </h2>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
            Concise distillation of key findings, strategic conclusions, empirical evidence, and scope limitations.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <button
            onClick={handleCopySummary}
            className="btn btn-secondary"
            style={{ padding: "0.45rem 0.85rem", fontSize: "0.8125rem" }}
            title="Copy summary text"
          >
            {copied ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
            <span>{copied ? "Copied" : "Copy Summary"}</span>
          </button>

          <button
            onClick={handleManualRegenerate}
            disabled={isRegenerating}
            className="btn btn-primary"
            style={{ padding: "0.45rem 0.85rem", fontSize: "0.8125rem" }}
            title="Re-run synthesis extraction from the latest report text"
          >
            <RotateCcw size={14} className={isRegenerating ? "animate-spin" : ""} />
            <span>{isRegenerating ? "Regenerating..." : "Regenerate Summary"}</span>
          </button>
        </div>
      </div>

      {/* 4 Separate Summary Quadrants */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "1.25rem",
        }}
      >
        {/* 1. Key Findings */}
        <div
          className="card"
          style={{
            background: "rgba(99, 102, 241, 0.05)",
            border: "1px solid rgba(99, 102, 241, 0.25)",
            padding: "1.35rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.85rem" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(99, 102, 241, 0.2)",
                color: "var(--accent-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Lightbulb size={16} />
            </div>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#ffffff" }}>
              Key Findings
            </h3>
          </div>
          <ul style={{ paddingLeft: "1.2rem", margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {summary.keyFindings.map((finding, idx) => (
              <li key={idx} style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
                {finding}
              </li>
            ))}
          </ul>
        </div>

        {/* 2. Conclusions */}
        <div
          className="card"
          style={{
            background: "rgba(16, 185, 129, 0.05)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            padding: "1.35rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.85rem" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(16, 185, 129, 0.2)",
                color: "var(--color-success)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CheckCircle2 size={16} />
            </div>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#ffffff" }}>
              Conclusions & Implications
            </h3>
          </div>
          <ul style={{ paddingLeft: "1.2rem", margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {summary.conclusions.map((conclusion, idx) => (
              <li key={idx} style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
                {conclusion}
              </li>
            ))}
          </ul>
        </div>

        {/* 3. Evidence */}
        <div
          className="card"
          style={{
            background: "rgba(6, 182, 212, 0.05)",
            border: "1px solid rgba(6, 182, 212, 0.25)",
            padding: "1.35rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.85rem" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(6, 182, 212, 0.2)",
                color: "var(--color-info)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileCheck size={16} />
            </div>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#ffffff" }}>
              Evidence & Grounding
            </h3>
          </div>
          <ul style={{ paddingLeft: "1.2rem", margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {summary.evidence.map((item, idx) => (
              <li key={idx} style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* 4. Limitations */}
        <div
          className="card"
          style={{
            background: "rgba(245, 158, 11, 0.05)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            padding: "1.35rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.85rem" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(245, 158, 11, 0.2)",
                color: "var(--color-warning)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AlertCircle size={16} />
            </div>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#ffffff" }}>
              Limitations & Boundaries
            </h3>
          </div>
          <ul style={{ paddingLeft: "1.2rem", margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {summary.limitations.map((limit, idx) => (
              <li key={idx} style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
                {limit}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

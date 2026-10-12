import React from "react";

export const MarkdownViewer = ({ content = "" }) => {
  if (!content) {
    return <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No content generated yet.</p>;
  }

  // Parse markdown into sections and paragraphs safely
  const renderFormattedMarkdown = (text) => {
    const lines = text.split("\n");
    const elements = [];
    let listBuffer = [];
    let inCodeBlock = false;
    let codeBuffer = [];

    const flushList = () => {
      if (listBuffer.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} style={{ paddingLeft: "1.5rem", marginBottom: "1.25rem" }}>
            {listBuffer.map((item, idx) => (
              <li key={idx} style={{ marginBottom: "0.35rem", color: "#e2e8f0" }}>
                {formatInline(item)}
              </li>
            ))}
          </ul>
        );
        listBuffer = [];
      }
    };

    const flushCode = () => {
      if (codeBuffer.length > 0) {
        elements.push(
          <pre
            key={`code-${elements.length}`}
            style={{
              background: "#0d101b",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "1rem 1.25rem",
              overflowX: "auto",
              marginBottom: "1.25rem",
              fontFamily: "var(--font-mono)",
              fontSize: "0.875rem",
              color: "#a5b4fc",
            }}
          >
            <code>{codeBuffer.join("\n")}</code>
          </pre>
        );
        codeBuffer = [];
      }
    };

    const formatInline = (str) => {
      // Bold **text**
      const parts = [];
      let lastIdx = 0;
      const regex = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g;
      let match;

      while ((match = regex.exec(str)) !== null) {
        if (match.index > lastIdx) {
          parts.push(str.substring(lastIdx, match.index));
        }
        if (match[2]) {
          // **bold**
          parts.push(<strong key={match.index} style={{ color: "#ffffff", fontWeight: 700 }}>{match[2]}</strong>);
        } else if (match[4]) {
          // *italic*
          parts.push(<em key={match.index} style={{ color: "#cbd5e1" }}>{match[4]}</em>);
        } else if (match[6]) {
          // `code`
          parts.push(
            <code
              key={match.index}
              style={{
                fontFamily: "var(--font-mono)",
                background: "#1e2438",
                padding: "0.15rem 0.35rem",
                borderRadius: "4px",
                color: "#e0e7ff",
                fontSize: "0.9em",
              }}
            >
              {match[6]}
            </code>
          );
        } else if (match[8] && match[9]) {
          // [link](url)
          parts.push(
            <a
              key={match.index}
              href={match[9]}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--accent-primary)", textDecoration: "underline" }}
            >
              {match[8]}
            </a>
          );
        }
        lastIdx = regex.lastIndex;
      }
      if (lastIdx < str.length) {
        parts.push(str.substring(lastIdx));
      }
      return parts.length > 0 ? parts : str;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.trim().startsWith("```")) {
        if (inCodeBlock) {
          inCodeBlock = false;
          flushCode();
        } else {
          flushList();
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        continue;
      }

      const trimmed = line.trim();

      // Heading 1
      if (trimmed.startsWith("# ")) {
        flushList();
        elements.push(
          <h1
            key={`h1-${i}`}
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              color: "#ffffff",
              marginTop: "2rem",
              marginBottom: "1rem",
              borderBottom: "1px solid var(--border-subtle)",
              paddingBottom: "0.5rem",
            }}
          >
            {formatInline(trimmed.substring(2))}
          </h1>
        );
      }
      // Heading 2
      else if (trimmed.startsWith("## ")) {
        flushList();
        elements.push(
          <h2
            key={`h2-${i}`}
            style={{
              fontSize: "1.375rem",
              fontWeight: 700,
              color: "#c7d2fe",
              marginTop: "1.75rem",
              marginBottom: "0.75rem",
            }}
          >
            {formatInline(trimmed.substring(3))}
          </h2>
        );
      }
      // Heading 3
      else if (trimmed.startsWith("### ")) {
        flushList();
        elements.push(
          <h3
            key={`h3-${i}`}
            style={{
              fontSize: "1.125rem",
              fontWeight: 600,
              color: "#e2e8f0",
              marginTop: "1.25rem",
              marginBottom: "0.5rem",
            }}
          >
            {formatInline(trimmed.substring(4))}
          </h3>
        );
      }
      // Horizontal rule
      else if (trimmed === "---" || trimmed === "***") {
        flushList();
        elements.push(
          <hr
            key={`hr-${i}`}
            style={{ border: 0, height: "1px", background: "var(--border-subtle)", margin: "2rem 0" }}
          />
        );
      }
      // Blockquote
      else if (trimmed.startsWith("> ")) {
        flushList();
        elements.push(
          <blockquote
            key={`quote-${i}`}
            style={{
              borderLeft: "3px solid var(--accent-primary)",
              background: "rgba(99, 102, 241, 0.06)",
              padding: "0.75rem 1.25rem",
              margin: "1.25rem 0",
              borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
              color: "#cbd5e1",
            }}
          >
            {formatInline(trimmed.substring(2))}
          </blockquote>
        );
      }
      // Unordered list
      else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        listBuffer.push(trimmed.substring(2));
      }
      // Numbered list
      else if (/^\d+\.\s/.test(trimmed)) {
        listBuffer.push(trimmed.replace(/^\d+\.\s/, ""));
      }
      // Normal paragraph
      else if (trimmed.length > 0) {
        flushList();
        elements.push(
          <p key={`p-${i}`} style={{ marginBottom: "1.125rem", color: "#e2e8f0", lineHeight: 1.8 }}>
            {formatInline(trimmed)}
          </p>
        );
      }
    }

    flushList();
    flushCode();

    return elements;
  };

  return <div className="markdown-content">{renderFormattedMarkdown(content)}</div>;
};

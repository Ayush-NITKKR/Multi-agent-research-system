import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Copy,
  Check,
  Download,
  RotateCcw,
  Trash2,
  FileText,
  Globe,
  ShieldCheck,
  Sparkles,
  Activity,
  Code,
  Calendar,
  Clock,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Header } from "../components/Header";
import { MarkdownViewer } from "../components/MarkdownViewer";
import { SourcesList } from "../components/SourcesList";
import { CriticFeedbackCard } from "../components/CriticFeedbackCard";
import { ResearchSummaryCard } from "../components/ResearchSummaryCard";
import { ExecutionSummaryCard } from "../components/ExecutionSummaryCard";
import { researchApi } from "../services/api";

export const ReportViewer = ({ onMenuClick }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const initialTab = searchParams.get("tab") || "research-summary";
  const [activeTab, setActiveTab] = useState(initialTab); // research-summary | execution-summary | report | sources | critic
  const [copiedReport, setCopiedReport] = useState(false);
  const [copiedUrls, setCopiedUrls] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await researchApi.getById(id);
        if (res.success && res.job) {
          setJob(res.job);
        } else {
          setError(res.error || "Report not found.");
        }
      } catch (err) {
        setError(err.response?.data?.error || err.message || "Failed to load report.");
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id]);

  const handleCopyReport = () => {
    if (!job?.report) return;
    navigator.clipboard.writeText(job.report);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  const handleCopyUrls = () => {
    if (!job?.sources?.length) return;
    const urls = job.sources.map((s) => s.url).join("\n");
    navigator.clipboard.writeText(urls);
    setCopiedUrls(true);
    setTimeout(() => setCopiedUrls(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!job?.report) return;
    const element = document.createElement("a");
    const file = new Blob([job.report], { type: "text/markdown" });
    element.href = URL.createObjectURL(file);
    const cleanFilename = job.topic.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 50);
    element.download = `${cleanFilename}_research_report.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this research report?")) return;
    try {
      await researchApi.delete(id);
      navigate("/dashboard");
    } catch (err) {
      alert("Failed to delete report.");
    }
  };

  const handleRetry = async () => {
    try {
      const res = await researchApi.retry(id);
      if (res.success) {
        navigate(`/research/${id}`);
      }
    } catch (err) {
      alert("Failed to restart research.");
    }
  };

  if (loading) {
    return (
      <div className="main-content">
        <Header onMenuClick={onMenuClick} title="Research Report" />
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
          <Loader2 size={36} className="animate-spin" color="var(--accent-primary)" />
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="main-content">
        <Header onMenuClick={onMenuClick} title="Report Not Found" />
        <div className="page-wrapper">
          <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              {error || "Report record could not be loaded."}
            </p>
            <Link to="/dashboard" className="btn btn-secondary">
              <ArrowLeft size={16} />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Word count estimate
  const wordCount = job.report ? job.report.split(/\s+/).filter(Boolean).length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="main-content">
      <Header
        onMenuClick={onMenuClick}
        title="Synthesized Research Dossier"
        subtitle={`Topic: ${job.topic}`}
      />

      <div className="page-wrapper animate-fade-in">
        {/* Top Action Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.5rem",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <button onClick={() => navigate("/dashboard")} className="btn btn-ghost" style={{ padding: "0.5rem" }}>
            <ArrowLeft size={16} />
            <span>Dashboard</span>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <button onClick={handleCopyReport} className="btn btn-secondary" style={{ padding: "0.45rem 0.85rem", fontSize: "0.8125rem" }}>
              {copiedReport ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
              <span>{copiedReport ? "Report Copied" : "Copy Report"}</span>
            </button>

            <button onClick={handleCopyUrls} className="btn btn-secondary" style={{ padding: "0.45rem 0.85rem", fontSize: "0.8125rem" }}>
              {copiedUrls ? <Check size={14} color="var(--color-success)" /> : <ExternalLink size={14} />}
              <span>{copiedUrls ? "URLs Copied" : "Copy URLs"}</span>
            </button>

            <button onClick={handleDownloadMarkdown} className="btn btn-secondary" style={{ padding: "0.45rem 0.85rem", fontSize: "0.8125rem" }}>
              <Download size={14} />
              <span>Download .md</span>
            </button>

            <button onClick={handleRetry} className="btn btn-secondary" style={{ padding: "0.45rem 0.85rem", fontSize: "0.8125rem" }}>
              <RotateCcw size={14} />
              <span>Re-run</span>
            </button>

            <button onClick={handleDelete} className="btn btn-danger" style={{ padding: "0.45rem 0.85rem", fontSize: "0.8125rem" }}>
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Hero Title & Metadata Card */}
        <div
          className="card"
          style={{
            marginBottom: "1.5rem",
            background: "linear-gradient(135deg, #131728 0%, #0c0f18 100%)",
            border: "1px solid var(--border-muted)",
            padding: "2rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
            {job.status === "completed" && <span className="badge badge-completed">Quality Gate Passed</span>}
            {job.status === "needs_rerun" && <span className="badge badge-needs-rerun">Needs Rerun</span>}
            {job.criticFeedback?.score !== undefined && (
              <span
                className={`badge ${
                  job.criticFeedback.score >= 8.0 && (!job.criticFeedback.critical_issues || job.criticFeedback.critical_issues.length === 0)
                    ? "badge-approved"
                    : "badge-needs-revision"
                }`}
              >
                Score: {job.criticFeedback.score.toFixed(1)}/10
              </span>
            )}
            {job.criticFeedback?.verdict && (
              <span className={`badge ${job.criticFeedback.verdict === "APPROVED" ? "badge-approved" : "badge-needs-revision"}`}>
                Verdict: {job.criticFeedback.verdict}
              </span>
            )}
          </div>

          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-0.02em",
              lineHeight: 1.3,
              marginBottom: "1rem",
            }}
          >
            {job.topic}
          </h1>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1.5rem",
              fontSize: "0.8125rem",
              color: "var(--text-muted)",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Calendar size={14} />
              <span>{new Date(job.createdAt).toLocaleDateString()}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Clock size={14} />
              <span>{readingTime} min read (~{wordCount} words)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Globe size={14} />
              <span>{job.sources?.length || 0} Sources Consulted</span>
            </div>
          </div>
        </div>

        {/* Needs Rerun Banner if quality gate failed */}
        {job.status === "needs_rerun" && (
          <div
            className="card animate-fade-in"
            style={{
              marginBottom: "2rem",
              padding: "1.25rem 1.5rem",
              background: "rgba(245, 158, 11, 0.08)",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <div>
              <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#fbbf24", marginBottom: "0.25rem" }}>
                Quality Gate Status: Needs Rerun
              </h4>
              <p style={{ fontSize: "0.8125rem", color: "#cbd5e1" }}>
                This report scored below the 8.0/10 threshold or has critical issues remaining after permitted revisions.
                {job.criticFeedback?.score !== undefined && ` (Current score: ${job.criticFeedback.score.toFixed(1)}/10)`}
              </p>
            </div>
            <button
              onClick={handleRetry}
              className="btn btn-primary"
              style={{ padding: "0.5rem 1.25rem", fontSize: "0.875rem" }}
            >
              <RotateCcw size={16} />
              <span>Rerun Research</span>
            </button>
          </div>
        )}


        {/* Executive Summary Dual-View Quick Bar */}
        <div
          className="card"
          style={{
            marginBottom: "1.75rem",
            padding: "1.25rem 1.5rem",
            background: "linear-gradient(135deg, rgba(19, 23, 37, 0.95) 0%, rgba(14, 17, 26, 0.95) 100%)",
            border: "1px solid var(--border-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
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
                }}
              >
                Dual Executive Overviews
              </span>
            </div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#ffffff" }}>
              Distinct Research & Execution Summaries
            </h3>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
              Inspect synthesized findings or audit the system pipeline execution and quality gate decision.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              onClick={() => setActiveTab("research-summary")}
              className={`btn ${activeTab === "research-summary" ? "btn-primary" : "btn-secondary"}`}
              style={{ padding: "0.5rem 1rem", fontSize: "0.8125rem" }}
            >
              <Sparkles size={15} />
              <span>Research Summary</span>
            </button>

            <button
              onClick={() => setActiveTab("execution-summary")}
              className={`btn ${activeTab === "execution-summary" ? "btn-primary" : "btn-secondary"}`}
              style={{ padding: "0.5rem 1rem", fontSize: "0.8125rem" }}
            >
              <Activity size={15} />
              <span>Execution Summary</span>
            </button>

            <button
              onClick={() => setActiveTab("report")}
              className={`btn ${activeTab === "report" ? "btn-primary" : "btn-secondary"}`}
              style={{ padding: "0.5rem 1rem", fontSize: "0.8125rem" }}
            >
              <FileText size={15} />
              <span>Full Dossier</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            borderBottom: "1px solid var(--border-subtle)",
            marginBottom: "1.5rem",
            overflowX: "auto",
            whiteSpace: "nowrap",
          }}
        >
          <button
            onClick={() => setActiveTab("research-summary")}
            style={{
              padding: "0.75rem 1.25rem",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "research-summary" ? "2px solid var(--accent-primary)" : "2px solid transparent",
              color: activeTab === "research-summary" ? "#ffffff" : "var(--text-secondary)",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "var(--transition-fast)",
            }}
          >
            <Sparkles size={16} />
            <span>Research Summary</span>
          </button>

          <button
            onClick={() => setActiveTab("execution-summary")}
            style={{
              padding: "0.75rem 1.25rem",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "execution-summary" ? "2px solid var(--accent-primary)" : "2px solid transparent",
              color: activeTab === "execution-summary" ? "#ffffff" : "var(--text-secondary)",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "var(--transition-fast)",
            }}
          >
            <Activity size={16} />
            <span>Execution Summary</span>
          </button>

          <button
            onClick={() => setActiveTab("report")}
            style={{
              padding: "0.75rem 1.25rem",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "report" ? "2px solid var(--accent-primary)" : "2px solid transparent",
              color: activeTab === "report" ? "#ffffff" : "var(--text-secondary)",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "var(--transition-fast)",
            }}
          >
            <FileText size={16} />
            <span>Full Dossier</span>
          </button>

          <button
            onClick={() => setActiveTab("sources")}
            style={{
              padding: "0.75rem 1.25rem",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "sources" ? "2px solid var(--accent-primary)" : "2px solid transparent",
              color: activeTab === "sources" ? "#ffffff" : "var(--text-secondary)",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "var(--transition-fast)",
            }}
          >
            <Globe size={16} />
              <span>Collected Sources ({job.sources?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab("critic")}
            style={{
              padding: "0.75rem 1.25rem",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "critic" ? "2px solid var(--accent-primary)" : "2px solid transparent",
              color: activeTab === "critic" ? "#ffffff" : "var(--text-secondary)",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "var(--transition-fast)",
            }}
          >
            <ShieldCheck size={16} />
            <span>Critic Fact-Check</span>
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === "research-summary" && (
          <ResearchSummaryCard
            report={job.report}
            topic={job.topic}
            sources={job.sources}
          />
        )}

        {activeTab === "execution-summary" && (
          <ExecutionSummaryCard job={job} />
        )}

        {activeTab === "report" && (
          <div className="card" style={{ padding: "2.5rem", background: "var(--bg-surface)" }}>
            <MarkdownViewer content={job.report} />
          </div>
        )}

        {activeTab === "sources" && (
          <SourcesList sources={job.sources} />
        )}

        {activeTab === "critic" && (
          <CriticFeedbackCard criticFeedback={job.criticFeedback} revisions={job.revisions} />
        )}
      </div>
    </div>
  );
};
